import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/appError.js";
import { audit } from "../services/auditService.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Dados inválidos." } });
    return;
  }
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({ error: { code: tooLarge ? "AVATAR_TOO_LARGE" : "AVATAR_INVALID", message: tooLarge ? "A imagem deve ter no máximo 5 MB." : "Não foi possível processar o arquivo." } });
    return;
  }
  if (error instanceof AppError) {
    if (error.status === 403) audit("AUTHORIZATION_DENIED", _req.auth?.user.id, { method: _req.method, path: _req.path });
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (typeof error === "object" && error !== null && "status" in error && error.status === 413) {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "A requisição excede o tamanho permitido." } });
    return;
  }
  console.error(error instanceof Error ? { name: error.name, message: error.message } : { error: "unknown" });
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação." } });
};
