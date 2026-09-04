import type { Session, User } from "../domain/types.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { user: User; session: Session };
    }
  }
}
export {};
