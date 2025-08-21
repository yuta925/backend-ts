import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import z, { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// 404: 未マッチのルート
export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Route not found", 404, { code: "NOT_FOUND" }));
}

// RFC7807 Problem+JSON
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
    errors?: unknown;
  }
) {
  res
    .status(status)
    .type("application/problem+json")
    .json({
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
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod → 400
  if (err instanceof ZodError) {
    return problemJson(res, {
      type: "urn:problem:bad-request",
      title: "Bad Request",
      status: 400,
      detail: "Validation failed",
      errors: err.flatten(),
      instance: req.originalUrl,
    });
  }

  // ★ Prisma: 既知のリクエストエラー
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // 代表的なコードだけ拾う。必要に応じて増やせます。
    // P2002: Unique constraint failed -> 409
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | string | undefined) ?? [];
      return problemJson(res, {
        type: "urn:problem:conflict",
        title: "Conflict",
        status: 409,
        detail: "Unique constraint violated",
        errors: { target },
        instance: req.originalUrl,
      });
    }
    // P2025: Record not found -> 404
    if (err.code === "P2025") {
      return problemJson(res, {
        type: "urn:problem:not-found",
        title: "Not Found",
        status: 404,
        detail: (err.meta?.cause as string) ?? "Record not found",
        instance: req.originalUrl,
      });
    }
    // それ以外は500（詳細はログで確認）
    req.log?.error({ err }, "prisma known request error");
    return problemJson(res, {
      type: `urn:problem:prisma:${err.code.toLowerCase()}`,
      title: "Database Error",
      status: 500,
      detail: err.message,
      instance: req.originalUrl,
    });
  }

  // ★ Prisma: バリデーションエラー -> 400
  if (err instanceof Prisma.PrismaClientValidationError) {
    req.log?.warn({ err }, "prisma validation error");
    return problemJson(res, {
      type: "urn:problem:bad-request",
      title: "Bad Request",
      status: 400,
      detail: "Invalid query or parameters for Prisma",
      instance: req.originalUrl,
    });
  }

  // 自前 AppError
  if (err instanceof AppError) {
    return problemJson(res, {
      type: `urn:problem:${(err.code || "internal-error").toLowerCase()}`,
      title: err.code || "Error",
      status: err.status,
      detail: err.message,
      errors: err.details,
      instance: req.originalUrl,
    });
  }

  // 想定外
  req.log?.error({ err }, "unexpected error");
  return problemJson(res, {
    type: "urn:problem:internal-error",
    title: "Internal Server Error",
    status: 500,
    detail: "Unexpected server error",
    instance: req.originalUrl,
  });
}