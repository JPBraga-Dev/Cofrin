import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { avatarStorageRoot, coverStorageRoot } from "./services/avatarStorage.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { allowedOrigins, csrfOriginProtection, requestAuditLogger } from "./middlewares/security.js";
import { api } from "./routes/index.js";
import { AppError } from "./utils/appError.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], imgSrc: ["'self'", "data:"], styleSrc: ["'self'"], scriptSrc: ["'self'"], connectSrc: ["'self'", ...allowedOrigins] } },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use((_req, res, next) => { res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"); next(); });
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new AppError(403, "ORIGIN_FORBIDDEN", "Origem da requisição não autorizada."));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));
app.use(cookieParser());
app.use(express.json({ limit: "32kb" }));
app.use(requestAuditLogger);
app.use(csrfOriginProtection);
app.use("/avatars", express.static(avatarStorageRoot, { fallthrough: false, immutable: true, maxAge: "1y", index: false, dotfiles: "deny" }));
app.use("/covers", express.static(coverStorageRoot, { fallthrough: false, immutable: true, maxAge: "1y", index: false, dotfiles: "deny" }));
app.use("/api", api);
app.use(errorHandler);
