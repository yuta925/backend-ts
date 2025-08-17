// src/middlewares/validate.ts
import { RequestHandler } from "express";
import { ZodObject } from "zod";

export const validate =
  (schema: ZodObject<any>): RequestHandler =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(parsed.error);
    // req.body をパース後の型安全なデータに差し替えたい場合：
    req.body = parsed.data as any;
    next();
  };