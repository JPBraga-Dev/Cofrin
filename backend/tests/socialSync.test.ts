import { afterEach, describe, expect, it } from "vitest";
import { mockDatabase } from "../src/data/mockDatabase.js";
import { SEED_USER_IDS } from "../src/data/seedIds.js";
import { acceptRequest, listFriends, listRequests, sendMessage, updateOwnProfile } from "../src/services/socialService.js";

const userId = SEED_USER_IDS.joao;
const profile = () => mockDatabase.profiles.find((item) => item.userId === userId)!;
let profileSnapshot = { ...profile() };
let friendshipCount = 0;
let requestSnapshot = { ...mockDatabase.friendRequests.find((item) => item.id === "fr-maria-joao")! };
let messageCount = 0;
let notificationCount = 0;

function snapshot() {
  profileSnapshot = { ...profile() };
  friendshipCount = mockDatabase.friendships.length;
  requestSnapshot = { ...mockDatabase.friendRequests.find((item) => item.id === "fr-maria-joao")! };
  messageCount = mockDatabase.messages.length;
  notificationCount = mockDatabase.notifications.length;
}
afterEach(() => {
  Object.assign(profile(), profileSnapshot);
  mockDatabase.friendships.splice(friendshipCount);
  Object.assign(mockDatabase.friendRequests.find((item) => item.id === "fr-maria-joao")!, requestSnapshot);
  mockDatabase.messages.splice(messageCount);
  mockDatabase.notifications.splice(0, mockDatabase.notifications.length - notificationCount);
});

describe("social synchronization", () => {
  it("moves an accepted request from requests to friends", () => {
    snapshot();
    expect(listRequests(userId)).toHaveLength(1);
    acceptRequest(userId, "fr-maria-joao");
    expect(listRequests(userId)).toHaveLength(0);
    expect(listFriends(userId).some((item) => item.id === SEED_USER_IDS.maria)).toBe(true);
  });

  it("updates profile identity without copying display name into group membership", async () => {
    snapshot();
    const changed = await updateOwnProfile(userId, { displayName: "João Pedro Braga", username: "joaobraga" });
    expect(changed.displayName).toBe("João Pedro Braga");
    expect(mockDatabase.groups[0].members[0]).not.toHaveProperty("name");
  });

  it("persists a new message in its conversation", () => {
    snapshot();
    const message = sendMessage(userId, "c-direct-lucas", "Mensagem de teste");
    expect(mockDatabase.messages).toContainEqual(message);
  });
});
