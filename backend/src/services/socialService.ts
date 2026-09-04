import { mockDatabase } from "../data/mockDatabase.js";
import type { Conversation, FriendRequest, Profile } from "../domain/types.js";
import { audit } from "./auditService.js";
import { avatarUrlFor, coverUrlFor } from "./authService.js";
import { normalizeUsername, requireAvailableUsername, validateUsernameSyntax } from "./identityService.js";
import { AppError } from "../utils/appError.js";

const timestamp = () => new Date().toISOString();
const keyFor = (a: string, b: string) => [a, b].sort().join(":");
const notify = (userId: string, type: "FRIEND_REQUEST" | "FRIEND_ACCEPTED" | "DIRECT_MESSAGE" | "GROUP_MESSAGE", title: string, message: string, actionUrl: string) => mockDatabase.notifications.unshift({ id: crypto.randomUUID(), userId, type, title, message, actionUrl, read: false, createdAt: timestamp() });

export { normalizeUsername };
export const profileById = (userId: string) => mockDatabase.profiles.find((profile) => profile.userId === userId);
export const profileByUsername = (username: string) => mockDatabase.profiles.find((profile) => profile.username === normalizeUsername(username));
export async function validateUsername(value: string, excludeUserId?: string) { return requireAvailableUsername(value, excludeUserId); }
export const isFriend = (a: string, b: string) => mockDatabase.friendships.some((friendship) => keyFor(friendship.userA, friendship.userB) === keyFor(a, b));
export function relationship(userId: string, otherId: string) {
  if (userId === otherId) return "SELF" as const;
  if (isFriend(userId, otherId)) return "FRIENDS" as const;
  const request = mockDatabase.friendRequests.find((item) => item.status === "PENDING" && ((item.senderId === userId && item.receiverId === otherId) || (item.senderId === otherId && item.receiverId === userId)));
  if (!request) return "NONE" as const;
  return request.senderId === userId ? "SENT" as const : "RECEIVED" as const;
}
export function publicProfile(profile: Profile) {
  return { id: profile.userId, displayName: profile.displayName, username: profile.username, bio: profile.bio, avatarUrl: avatarUrlFor(profile.avatarPath, profile.avatarVersion), coverUrl: coverUrlFor(profile.coverPath, profile.coverVersion) };
}
export async function updateOwnProfile(userId: string, data: { displayName?: string; username?: string; bio?: string }) {
  const profile = profileById(userId);
  if (!profile) throw new Error("Perfil não encontrado.");
  const previousUsername = profile.username;
  if (data.displayName !== undefined) profile.displayName = data.displayName;
  if (data.username !== undefined) profile.username = await requireAvailableUsername(data.username, userId);
  if (data.bio !== undefined) profile.bio = data.bio.trim() || undefined;
  profile.updatedAt = timestamp();
  audit(previousUsername === profile.username ? "PROFILE_UPDATED" : "USERNAME_CHANGED", userId);
  return profile;
}
export function searchProfiles(userId: string, search = "") {
  const query = normalizeUsername(search);
  if (query.length < 2) return [];
  const normal = search.trim().toLocaleLowerCase("pt-BR");
  return mockDatabase.profiles.filter((profile) => profile.userId !== userId && (search.startsWith("@") ? profile.username.includes(query) : `${profile.displayName} ${profile.username}`.toLocaleLowerCase("pt-BR").includes(normal))).map((profile) => ({ ...publicProfile(profile), relationship: relationship(userId, profile.userId) }));
}
export function listFriends(userId: string) {
  return mockDatabase.friendships.filter((item) => item.userA === userId || item.userB === userId).map((item) => profileById(item.userA === userId ? item.userB : item.userA)!).filter(Boolean).map(publicProfile);
}
export function listRequests(userId: string) {
  return mockDatabase.friendRequests.filter((item) => item.status === "PENDING" && (item.senderId === userId || item.receiverId === userId)).map((item) => ({ ...item, profile: publicProfile(profileById(item.senderId === userId ? item.receiverId : item.senderId)!), direction: item.receiverId === userId ? "RECEIVED" : "SENT" }));
}
export function sendRequest(userId: string, receiverId: string) {
  if (receiverId === userId) throw new Error("Você não pode adicionar a si mesmo.");
  if (!profileById(receiverId)) throw new Error("Pessoa não encontrada.");
  if (isFriend(userId, receiverId)) throw new Error("Vocês já são amigos.");
  const reverse = mockDatabase.friendRequests.find((item) => item.senderId === receiverId && item.receiverId === userId && item.status === "PENDING");
  if (reverse) return acceptRequest(userId, reverse.id);
  const existing = mockDatabase.friendRequests.find((item) => item.senderId === userId && item.receiverId === receiverId && item.status === "PENDING");
  if (existing) return existing;
  const request: FriendRequest = { id: crypto.randomUUID(), senderId: userId, receiverId, status: "PENDING", createdAt: timestamp(), updatedAt: timestamp() };
  mockDatabase.friendRequests.push(request);
  notify(receiverId, "FRIEND_REQUEST", "Nova solicitação de amizade", `${profileById(userId)?.displayName} quer adicionar você.`, "/social?tab=requests");
  return request;
}
export function acceptRequest(userId: string, id: string) {
  const request = mockDatabase.friendRequests.find((item) => item.id === id && item.receiverId === userId && item.status === "PENDING");
  if (!request) throw new Error("Solicitação não encontrada.");
  request.status = "ACCEPTED"; request.updatedAt = timestamp();
  if (!isFriend(request.senderId, request.receiverId)) mockDatabase.friendships.push({ id: crypto.randomUUID(), userA: request.senderId, userB: request.receiverId, createdAt: timestamp() });
  notify(request.senderId, "FRIEND_ACCEPTED", "Solicitação aceita", `${profileById(userId)?.displayName} aceitou sua solicitação.`, "/social?tab=friends");
  return request;
}
export function setRequestStatus(userId: string, id: string, status: "DECLINED" | "CANCELLED") {
  const request = mockDatabase.friendRequests.find((item) => item.id === id && item.status === "PENDING" && (item.senderId === userId || item.receiverId === userId));
  if (!request) throw new Error("Solicitação não encontrada.");
  request.status = status; request.updatedAt = timestamp(); return request;
}
export function removeFriend(userId: string, otherId: string) {
  const index = mockDatabase.friendships.findIndex((item) => keyFor(item.userA, item.userB) === keyFor(userId, otherId));
  if (index < 0) throw new Error("Amizade não encontrada.");
  mockDatabase.friendships.splice(index, 1);
}
export function directConversation(userId: string, otherUserId: string) {
  if (!isFriend(userId, otherUserId)) throw new Error("Converse apenas com pessoas que já são suas amigas.");
  const existing = mockDatabase.conversations.find((conversation) => conversation.type === "DIRECT" && mockDatabase.conversationMembers.filter((member) => member.conversationId === conversation.id).map((member) => member.userId).sort().join(":") === [userId, otherUserId].sort().join(":"));
  if (existing) return existing;
  const conversation: Conversation = { id: crypto.randomUUID(), type: "DIRECT", createdAt: timestamp(), updatedAt: timestamp() };
  mockDatabase.conversations.push(conversation);
  mockDatabase.conversationMembers.push({ conversationId: conversation.id, userId, joinedAt: timestamp(), lastReadAt: timestamp() }, { conversationId: conversation.id, userId: otherUserId, joinedAt: timestamp() });
  return conversation;
}
export function ensureGroupConversation(groupId: string, userId: string) {
  const group = mockDatabase.groups.find((item) => item.id === groupId && item.members.some((member) => member.userId === userId && member.status === "ACTIVE"));
  if (!group) throw new AppError(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
  const existing = mockDatabase.conversations.find((item) => item.type === "GROUP" && item.groupId === groupId);
  if (existing) return existing;
  const conversation: Conversation = { id: crypto.randomUUID(), type: "GROUP", groupId, createdAt: timestamp(), updatedAt: timestamp() };
  mockDatabase.conversations.push(conversation);
  group.members.filter((member) => member.status === "ACTIVE").forEach((member) => mockDatabase.conversationMembers.push({ conversationId: conversation.id, userId: member.userId, joinedAt: timestamp(), lastReadAt: member.userId === userId ? timestamp() : undefined }));
  return conversation;
}
export function conversationView(conversation: Conversation, userId: string) {
  const members = mockDatabase.conversationMembers.filter((member) => member.conversationId === conversation.id);
  const latest = mockDatabase.messages.filter((message) => message.conversationId === conversation.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const me = members.find((member) => member.userId === userId);
  const unreadCount = mockDatabase.messages.filter((message) => message.conversationId === conversation.id && message.senderId !== userId && (!me?.lastReadAt || message.createdAt > me.lastReadAt)).length;
  if (conversation.type === "GROUP") { const group = mockDatabase.groups.find((item) => item.id === conversation.groupId); return { ...conversation, title: group?.name ?? "Grupo", subtitle: `${members.length} participantes`, memberIds: members.map((member) => member.userId), lastMessage: latest, unreadCount }; }
  const other = profileById(members.find((member) => member.userId !== userId)?.userId ?? userId)!;
  return { ...conversation, title: other.displayName, subtitle: `@${other.username}`, avatarUserId: other.userId, avatarUrl: avatarUrlFor(other.avatarPath, other.avatarVersion), memberIds: members.map((member) => member.userId), lastMessage: latest, unreadCount };
}
export const listConversations = (userId: string) => mockDatabase.conversations.filter((conversation) => mockDatabase.conversationMembers.some((member) => member.conversationId === conversation.id && member.userId === userId)).map((conversation) => conversationView(conversation, userId)).sort((a, b) => (b.lastMessage?.createdAt ?? b.updatedAt).localeCompare(a.lastMessage?.createdAt ?? a.updatedAt));
export function listMessages(userId: string, conversationId: string) {
  if (!mockDatabase.conversationMembers.some((member) => member.conversationId === conversationId && member.userId === userId)) throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
  return mockDatabase.messages.filter((message) => message.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function sendMessage(userId: string, conversationId: string, content: string) {
  if (!mockDatabase.conversationMembers.some((member) => member.conversationId === conversationId && member.userId === userId)) throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada.");
  const text = content.trim(); if (!text || text.length > 2000) throw new Error("A mensagem precisa ter entre 1 e 2000 caracteres.");
  const message = { id: crypto.randomUUID(), conversationId, senderId: userId, content: text, createdAt: timestamp() }; mockDatabase.messages.push(message);
  const conversation = mockDatabase.conversations.find((item) => item.id === conversationId)!; conversation.updatedAt = message.createdAt;
  const group = conversation.groupId ? mockDatabase.groups.find((item) => item.id === conversation.groupId) : undefined;
  mockDatabase.conversationMembers.filter((member) => member.conversationId === conversationId && member.userId !== userId).forEach((member) => notify(member.userId, conversation.type === "GROUP" ? "GROUP_MESSAGE" : "DIRECT_MESSAGE", conversation.type === "GROUP" ? `Mensagem em ${group?.name ?? "grupo"}` : "Nova mensagem", text.slice(0, 90), conversation.type === "GROUP" ? `/groups/${conversation.groupId}?tab=conversation` : `/social?tab=conversations&conversation=${conversationId}`));
  return message;
}
export function markRead(userId: string, conversationId: string) { const member = mockDatabase.conversationMembers.find((item) => item.conversationId === conversationId && item.userId === userId); if (!member) throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversa não encontrada."); member.lastReadAt = timestamp(); return member; }

export function assertUsernameSyntax(value: string) { return validateUsernameSyntax(value); }
