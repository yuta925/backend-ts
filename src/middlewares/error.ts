import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import z, { ZodError } from "zod";

// 404: 未マッチのルート
export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Route not found", 404, { code: "NOT_FOUND" }));
}

// RFC7807 Problem Details を返すユーティリティ
function problemJson(
  res: Response,
  {
    type = "about:blank",
    title,
    status,
    detail,
    instance,
    errors,
  }: {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    errors?: unknown; // 追加情報
  }
) {
  res.status(status).type("application/problem+json").json({
    type,
    title,
    status,
    detail,
    ...(instance ? { instance } : {}),
    ...(errors ? { errors } : {}),
  });
}

// メインのエラーハンドラ
export function errorHandler(
  err: unknown,
  _req: Request,
  _res: Response,
  _next: NextFunction
) {
  // ★ Zodのバリデーションエラーを400に揃える
  if (err instanceof ZodError) {
    return problemJson(_res, {
      type: "urn:problem:bad-request",
      title: "Bad Request",
      status: 400,
      detail: "Validation failed",
      errors: z.treeifyError(err) ,
      instance: _req.originalUrl,
    });
  }

  // 自前の AppError
  if (err instanceof AppError) {
    return problemJson(_res, {
      type: `urn:problem:${(err.code || "internal-error").toLowerCase()}`,
      title: err.code || "Error",
      status: err.status,
      detail: err.message,
      errors: err.details,
      instance: _req.originalUrl,
    });
  }

  // 想定外
  // ログはpinoに任せてOK: req.log?.error(err)
  return problemJson(_res, {
    type: "urn:problem:internal-error",
    title: "Internal Server Error",
    status: 500,
    detail: "Unexpected server error",
    instance: _req.originalUrl,
  });
}