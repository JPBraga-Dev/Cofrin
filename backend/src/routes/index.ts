import { Router } from "express";
import * as c from "../controllers/controllers.js";
export const api = Router();
api.get("/health", c.health);
api.get("/dashboard", c.dashboard);
api.get("/accounts", c.listAccounts);
api.route("/transactions").get(c.listTransactions).post(c.createTransaction);
api
  .route("/transactions/:id")
  .get(c.getTransaction)
  .put(c.updateTransaction)
  .delete(c.removeTransaction);
api.route("/piggy-banks").get(c.listPiggies).post(c.createPiggy);
api.route("/piggy-banks/:id").get(c.getPiggy).put(c.updatePiggy);
api.post("/piggy-banks/:id/deposits", c.movePiggy);
api.post("/piggy-banks/:id/withdrawals", c.movePiggy);
api.route("/groups").get(c.listGroups).post(c.createGroup);
api.route("/groups/:id").get(c.getGroup).put(c.updateGroup);
api.get("/groups/:id/summary", c.groupSummary);
api.route("/groups/:id/members").get(c.groupMembers).post(c.addGroupMember);
api
  .route("/groups/:id/contributions")
  .get(c.groupContributions)
  .post(c.addGroupContribution);
api.route("/groups/:id/expenses").get(c.groupExpenses).post(c.addGroupExpense);
api.get("/groups/:id/balances", c.groupBalances);
api.get("/groups/:id/settlements", c.groupSettlements);
api.patch("/groups/:id/settlements/:settlementId/pay", c.markSettlementPaid);
api.route("/budgets").get(c.listBudgets).post(c.createBudget);
api.route("/budgets/:id").put(c.updateBudget).delete(c.removeBudget);
api.route("/credit-cards").get(c.listCards).post(c.createCard);
api.get("/credit-cards/:id/invoices", c.invoices);
api.get("/notifications", c.listNotifications);
api.patch("/notifications/:id/read", c.readNotification);
api.route("/profiles/me").get(c.getMyProfile).patch(c.patchMyProfile);
api.get("/profiles/username-availability", c.usernameAvailability);
api.get("/users", c.listUsers);
api.get("/users/:username", c.getUser);
api.get("/friends", c.listFriends);
api.delete("/friends/:id", c.deleteFriend);
api.route("/friend-requests").get(c.listFriendRequests).post(c.createFriendRequest);
api.delete("/friend-requests/:id", c.cancelFriendRequest);
api.patch("/friend-requests/:id/accept", c.acceptFriendRequest);
api.patch("/friend-requests/:id/decline", c.declineFriendRequest);
api.get("/conversations", c.listConversations);
api.post("/conversations/direct", c.createDirectConversation);
api.route("/conversations/:id/messages").get(c.messagesForConversation).post(c.createMessage);
api.patch("/conversations/:id/read", c.markConversationRead);
api.get("/groups/:id/conversation", c.groupConversation);
