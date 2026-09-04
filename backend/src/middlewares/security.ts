import { createHash } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../utils/appError.js";
import { authenticateSession, SESSION_COOKIE } from "../services/sessionService.js";

export const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

class DevelopmentRateLimitStore {
  private readonly buckets = new Map<string, number[]>();
  private operations = 0;
  consume(key: string, max: number, windowMs: number) {
    const now = Date.now();
    const cutoff = now - windowMs;
    const recent = (this.buckets.get(key) ?? []).filter((time) => time > cutoff);
    if (recent.length >= max) return { allowed: false, retryAfterMs: recent[0] + windowMs - now };
    recent.push(now);
    this.buckets.set(key, recent);
    this.operations += 1;
    if (this.operations % 250 === 0)
      for (const [bucketKey, times] of this.buckets)
        if (times.every((time) => time <= cutoff)) this.buckets.delete(bucketKey);
    return { allowed: true, retryAfterMs: 0 };
  }
  reset() { this.buckets.clear(); }
}
// Single-process adapter for local/demo execution. Production deployments should
// replace this with a shared Redis-compatible store before horizontal scaling.
const developmentRateLimitStore = new DevelopmentRateLimitStore();
const clientKey = (req: Request) => createHash("sha256").update(req.ip || req.socket.remoteAddress || "unknown").digest("hex").slice(0, 20);
export function rateLimit(name: string, max: number, windowMs: number): RequestHandler {
  return (req, res, next) => {
    const key = `${name}:${clientKey(req)}`;
    const result = developmentRateLimitStore.consume(key, max, windowMs);
    if (!result.allowed) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil(result.retryAfterMs / 1000)));
      next(new AppError(429, "AUTH_RATE_LIMITED", "Muitas tentativas. Aguarde alguns minutos."));
      return;
    }
    next();
  };
}
export function resetRateLimitsForTests() { developmentRateLimitStore.reset(); }

export const csrfOriginProtection: RequestHandler = (req, _res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin && process.env.NODE_ENV === "test") return next();
  if (!origin || !allowedOrigins.includes(origin)) return next(new AppError(403, "ORIGIN_FORBIDDEN", "Origem da requisição não autorizada."));
  next();
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authenticated = await authenticateSession(req.cookies?.[SESSION_COOKIE]);
    if (!authenticated) throw new AppError(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.");
    req.auth = authenticated;
    next();
  } catch (cause) { next(cause); }
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authenticated = await authenticateSession(req.cookies?.[SESSION_COOKIE]);
    if (authenticated) req.auth = authenticated;
    next();
  } catch (cause) { next(cause); }
};

export const requestAuditLogger: RequestHandler = (req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    if (process.env.NODE_ENV !== "test")
      console.info(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - start) }));
  });
  next();
};

export const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>): RequestHandler =>
  (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
