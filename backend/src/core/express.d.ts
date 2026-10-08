import type { Session, User } from "./types.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { user: User; session: Session };
    }
  }
}
export {};
