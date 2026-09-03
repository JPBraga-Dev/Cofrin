import { mockDatabase } from "../data/mockDatabase.js";
import type { Conversation, FriendRequest, Profile } from "../domain/types.js";

export const CURRENT_USER_ID = "u-joao";
const reservedUsernames = new Set(["admin", "api", "login", "register", "settings", "profile", "social", "support", "cofrin", "system"]);
const timestamp = () => new Date().toISOString();
const keyFor = (a: string, b: string) => [a, b].sort().join(":");
const notify = (userId: string, type: "FRIEND_REQUEST" | "FRIEND_ACCEPTED" | "DIRECT_MESSAGE" | "GROUP_MESSAGE", title: string, message: string, actionUrl: string) => mockDatabase.notifications.unshift({ id: crypto.randomUUID(), userId, type, title, message, actionUrl, read: false, createdAt: timestamp() });

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/^@+/, "");
}
export function validateUsername(value: string, excludeId?: string) {
  const username = normalizeUsername(value);
  if (!/^[a-z0-9_.]{3,30}$/.test(username)) throw new Error("Use de 3 a 30 caracteres: letras, números, ponto ou sublinhado.");
  if (reservedUsernames.has(username)) throw new Error("Esse @ não está disponível.");
  if (mockDatabase.profiles.some((profile) => profile.id !== excludeId && profile.username === username)) throw new Error("Esse @ já está em uso.");
  return username;
}
export const profileById = (id: string) => mockDatabase.profiles.find((profile) => profile.id === id);
export const profileByUsername = (username: string) => mockDatabase.profiles.find((profile) => profile.username === normalizeUsername(username));
export const isFriend = (a: string, b: string) => mockDatabase.friendships.some((friendship) => keyFor(friendship.userA, friendship.userB) === keyFor(a, b));
export function relationship(userId: string, otherId: string) {
  if (userId === otherId) return "SELF" as const;
  if (isFriend(userId, otherId)) return "FRIENDS" as const;
  const request = mockDatabase.friendRequests.find((item) => item.status === "PENDING" && ((item.senderId === userId && item.receiverId === otherId) || (item.senderId === otherId && item.receiverId === userId)));
  if (!request) return "NONE" as const;
  return request.senderId === userId ? "SENT" as const : "RECEIVED" as const;
}
export function publicProfile(profile: Profile) {
  return { id: profile.id, displayName: profile.displayName, username: profile.username, bio: profile.bio, avatarUrl: profile.avatarUrl, createdAt: profile.createdAt, updatedAt: profile.updatedAt };
}
export function updateOwnProfile(data: Partial<Pick<Profile, "displayName" | "username" | "bio" | "avatarUrl">>) {
  const profile = profileById(CURRENT_USER_ID)!;
  const username = data.username === undefined ? profile.username : validateUsername(data.username, profile.id);
  profile.displayName = data.displayName?.trim() || profile.displayName;
  profile.username = username;
  profile.bio = data.bio?.trim().slice(0, 160) || undefined;
  profile.avatarUrl = data.avatarUrl?.trim() || undefined;
  profile.updatedAt = timestamp();
  return profile;
}
export function searchProfiles(search = "") {
  const query = normalizeUsername(search);
  if (query.length < 2) return [];
  const normal = search.trim().toLocaleLowerCase("pt-BR");
  return mockDatabase.profiles.filter((profile) => profile.id !== CURRENT_USER_ID && (search.startsWith("@") ? profile.username.includes(query) : `${profile.displayName} ${profile.username}`.toLocaleLowerCase("pt-BR").includes(normal))).map((profile) => ({ ...publicProfile(profile), relationship: relationship(CURRENT_USER_ID, profile.id) }));
}
export function listFriends() {
  return mockDatabase.friendships.filter((item) => item.userA === CURRENT_USER_ID || item.userB === CURRENT_USER_ID).map((item) => profileById(item.userA === CURRENT_USER_ID ? item.userB : item.userA)!).map((profile) => publicProfile(profile));
}
export function listRequests() {
  return mockDatabase.friendRequests.filter((item) => item.status === "PENDING" && (item.senderId === CURRENT_USER_ID || item.receiverId === CURRENT_USER_ID)).map((item) => ({ ...item, profile: publicProfile(profileById(item.senderId === CURRENT_USER_ID ? item.receiverId : item.senderId)!), direction: item.receiverId === CURRENT_USER_ID ? "RECEIVED" : "SENT" }));
}
export function sendRequest(receiverId: string) {
  if (receiverId === CURRENT_USER_ID) throw new Error("Você não pode adicionar a si mesmo.");
  if (!profileById(receiverId)) throw new Error("Pessoa não encontrada.");
  if (isFriend(CURRENT_USER_ID, receiverId)) throw new Error("Vocês já são amigos.");
  const reverse = mockDatabase.friendRequests.find((item) => item.senderId === receiverId && item.receiverId === CURRENT_USER_ID && item.status === "PENDING");
  if (reverse) return acceptRequest(reverse.id);
  const existing = mockDatabase.friendRequests.find((item) => item.senderId === CURRENT_USER_ID && item.receiverId === receiverId && item.status === "PENDING");
  if (existing) return existing;
  const request: FriendRequest = { id: crypto.randomUUID(), senderId: CURRENT_USER_ID, receiverId, status: "PENDING", createdAt: timestamp(), updatedAt: timestamp() };
  mockDatabase.friendRequests.push(request);
  notify(receiverId, "FRIEND_REQUEST", "Nova solicitação de amizade", `${profileById(CURRENT_USER_ID)?.displayName} quer adicionar você.`, "/social?tab=requests");
  return request;
}
export function acceptRequest(id: string) {
  const request = mockDatabase.friendRequests.find((item) => item.id === id && item.receiverId === CURRENT_USER_ID && item.status === "PENDING");
  if (!request) throw new Error("Solicitação não encontrada.");
  request.status = "ACCEPTED";
  request.updatedAt = timestamp();
  if (!isFriend(request.senderId, request.receiverId)) mockDatabase.friendships.push({ id: crypto.randomUUID(), userA: request.senderId, userB: request.receiverId, createdAt: timestamp() });
  notify(request.senderId, "FRIEND_ACCEPTED", "Solicitação aceita", `${profileById(CURRENT_USER_ID)?.displayName} aceitou sua solicitação.`, "/social?tab=friends");
  return request;
}
export function setRequestStatus(id: string, status: "DECLINED" | "CANCELLED") {
  const request = mockDatabase.friendRequests.find((item) => item.id === id && item.status === "PENDING" && (item.senderId === CURRENT_USER_ID || item.receiverId === CURRENT_USER_ID));
  if (!request) throw new Error("Solicitação não encontrada.");
  request.status = status;
  request.updatedAt = timestamp();
  return request;
}
export function removeFriend(userId: string) {
  const index = mockDatabase.friendships.findIndex((item) => keyFor(item.userA, item.userB) === keyFor(CURRENT_USER_ID, userId));
  if (index < 0) throw new Error("Amizade não encontrada.");
  mockDatabase.friendships.splice(index, 1);
}
export function directConversation(otherUserId: string) {
  if (!isFriend(CURRENT_USER_ID, otherUserId)) throw new Error("Converse apenas com pessoas que já são suas amigas.");
  const existing = mockDatabase.conversations.find((conversation) => conversation.type === "DIRECT" && mockDatabase.conversationMembers.filter((member) => member.conversationId === conversation.id).map((member) => member.userId).sort().join(":") === [CURRENT_USER_ID, otherUserId].sort().join(":"));
  if (existing) return existing;
  const conversation: Conversation = { id: crypto.randomUUID(), type: "DIRECT", createdAt: timestamp(), updatedAt: timestamp() };
  mockDatabase.conversations.push(conversation);
  mockDatabase.conversationMembers.push({ conversationId: conversation.id, userId: CURRENT_USER_ID, joinedAt: timestamp(), lastReadAt: timestamp() }, { conversationId: conversation.id, userId: otherUserId, joinedAt: timestamp() });
  return conversation;
}
export function ensureGroupConversation(groupId: string) {
  const existing = mockDatabase.conversations.find((item) => item.type === "GROUP" && item.groupId === groupId);
  if (existing) return existing;
  const group = mockDatabase.groups.find((item) => item.id === groupId);
  if (!group) throw new Error("Grupo não encontrado.");
  const conversation: Conversation = { id: crypto.randomUUID(), type: "GROUP", groupId, createdAt: timestamp(), updatedAt: timestamp() };
  mockDatabase.conversations.push(conversation);
  group.members.filter((member) => member.status === "ACTIVE").forEach((member) => mockDatabase.conversationMembers.push({ conversationId: conversation.id, userId: member.userId, joinedAt: timestamp(), lastReadAt: member.userId === CURRENT_USER_ID ? timestamp() : undefined }));
  return conversation;
}
export function conversationView(conversation: Conversation) {
  const members = mockDatabase.conversationMembers.filter((member) => member.conversationId === conversation.id);
  const latest = mockDatabase.messages.filter((message) => message.conversationId === conversation.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const me = members.find((member) => member.userId === CURRENT_USER_ID);
  const unreadCount = mockDatabase.messages.filter((message) => message.conversationId === conversation.id && message.senderId !== CURRENT_USER_ID && (!me?.lastReadAt || message.createdAt > me.lastReadAt)).length;
  if (conversation.type === "GROUP") { const group = mockDatabase.groups.find((item) => item.id === conversation.groupId); return { ...conversation, title: group?.name ?? "Grupo", subtitle: `${members.length} participantes`, memberIds: members.map((member) => member.userId), lastMessage: latest, unreadCount }; }
  const other = profileById(members.find((member) => member.userId !== CURRENT_USER_ID)?.userId ?? CURRENT_USER_ID)!;
  return { ...conversation, title: other.displayName, subtitle: `@${other.username}`, avatarUserId: other.id, memberIds: members.map((member) => member.userId), lastMessage: latest, unreadCount };
}
export const listConversations = () => mockDatabase.conversations.filter((conversation) => mockDatabase.conversationMembers.some((member) => member.conversationId === conversation.id && member.userId === CURRENT_USER_ID)).map(conversationView).sort((a, b) => (b.lastMessage?.createdAt ?? b.updatedAt).localeCompare(a.lastMessage?.createdAt ?? a.updatedAt));
export function listMessages(conversationId: string) { return mockDatabase.messages.filter((message) => message.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
export function sendMessage(conversationId: string, content: string) { if (!mockDatabase.conversationMembers.some((member) => member.conversationId === conversationId && member.userId === CURRENT_USER_ID)) throw new Error("Você não participa desta conversa."); const text = content.trim(); if (!text || text.length > 2000) throw new Error("A mensagem precisa ter entre 1 e 2000 caracteres."); const message = { id: crypto.randomUUID(), conversationId, senderId: CURRENT_USER_ID, content: text, createdAt: timestamp() }; mockDatabase.messages.push(message); const conversation = mockDatabase.conversations.find((item) => item.id === conversationId)!; conversation.updatedAt = message.createdAt; const group = conversation.groupId ? mockDatabase.groups.find((item) => item.id === conversation.groupId) : undefined; mockDatabase.conversationMembers.filter((member) => member.conversationId === conversationId && member.userId !== CURRENT_USER_ID).forEach((member) => notify(member.userId, conversation.type === "GROUP" ? "GROUP_MESSAGE" : "DIRECT_MESSAGE", conversation.type === "GROUP" ? `Mensagem em ${group?.name ?? "grupo"}` : "Nova mensagem", text.slice(0, 90), conversation.type === "GROUP" ? `/groups/${conversation.groupId}?tab=conversation` : `/social?tab=conversations&conversation=${conversationId}`)); return message; }
export function markRead(conversationId: string) { const member = mockDatabase.conversationMembers.find((item) => item.conversationId === conversationId && item.userId === CURRENT_USER_ID); if (!member) throw new Error("Conversa não encontrada."); member.lastReadAt = timestamp(); return member; }
