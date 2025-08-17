import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import z, { ZodError } from "zod";

// 404: 未マッチのルート
export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Route not found", 404));
}

// メインのエラーハンドラ
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // ★ Zodのバリデーションエラーを400に揃える
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Validation failed",
        details: z.treeifyError(err) // { fieldErrors, formErrors }
      },
    });
  }

  const isAppError = err instanceof AppError;
  const status = isAppError ? err.status : 500;
  const code = isAppError && err.code ? err.code : "INTERNAL_ERROR";
  const message =
    isAppError ? err.message : "Unexpected server error";

  const payload: Record<string, unknown> = {
    error: { code, message },
  };
  if (isAppError && err.details) {
    payload.error = { ...payload.error as object, details: err.details };
  }

  // ログ（必要に応じて pino に置き換え可）
  if (!isAppError) console.error(err);
  res.status(status).json(payload);
}