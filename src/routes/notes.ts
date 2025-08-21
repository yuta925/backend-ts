import { Router } from "express";
import { BadRequestError, NotFoundError } from "../errors/AppError";
import { noteCreateSchema, noteUpdateSchema } from "../schemas/note";
import { parsePage } from "../utils/pagination";
import { parseIfNoneMatch, weakEtagFromParts } from "../utils/etag";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import z from "zod";
import { parseIfMatch } from "../utils/http";

const router = Router();

router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const sort = String(req.query.sort ?? "createdAt") as "createdAt" | "title";
  const order = String(req.query.order ?? "desc") as "asc" | "desc";
  const { page, limit } = parsePage(req.query);

  // 件数
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { body: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      }
    : {};

  const total = await prisma.note.count({ where });

  // データ
  const data = await prisma.note.findMany({
    where,
    orderBy: { [sort]: order },
    skip: (page - 1) * limit,
    take: limit,
  });

  res.json({
    data,
    meta: { page, limit, total, hasNext: page * limit < total },
  });
});

router.post("/", async (req, res) => {
  const input = noteCreateSchema.parse(req.body);
  const note = await prisma.note.create({ data: input });
  req.log?.info({ noteId: note.id }, "note created");
  res.status(201).json({ data: note });
});

router.get("/:id", async (req, res) => {
  const parsed = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!parsed.success) throw new BadRequestError("invalid id");
  const id = parsed.data;

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) throw new NotFoundError("note not found", { id });

  const etag = weakEtagFromParts(
    note.id,
    note.title,
    note.body,
    note.updatedAt.getTime()
  );
  const inm = parseIfNoneMatch(req.headers["if-none-match"]);

  if (inm.includes("*") || inm.includes(etag)) {
    res.setHeader("ETag", etag);
    res.setHeader("Last-Modified", new Date(note.updatedAt).toUTCString());
    return res.status(304).end();
  }

  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", new Date(note.updatedAt).toUTCString());
  res.json({ data: note });
});

router.put("/:id", async (req, res) => {
  const parsed = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!parsed.success) throw new BadRequestError("invalid id");
  const id = parsed.data;

  // If-Match 必須（前提条件が無ければ 428）
  const ifMatch = parseIfMatch(req.headers["if-match"]);
  if (ifMatch.length === 0) {
    return res.status(428).type("application/problem+json").json({
      type: "https://datatracker.ietf.org/doc/html/rfc6585#section-3",
      title: "Precondition Required",
      status: 428,
      detail: "If-Match header is required for this operation.",
      instance: req.originalUrl,
    });
  }

  // 現在のレコードを取得して ETag を計算
  const current = await prisma.note.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("note not found", { id });
  const currentEtag = weakEtagFromParts(
    current.id,
    current.title,
    current.body,
    current.updatedAt.getTime()
  );

  // If-Match（前提条件）を満たさない場合は 412
  if (
    ifMatch.length > 0 &&
    !ifMatch.includes("*") &&
    !ifMatch.includes(currentEtag)
  ) {
    return res.status(412).type("application/problem+json").json({
      type: "https://datatracker.ietf.org/doc/html/rfc9110#name-if-match",
      title: "Precondition Failed",
      status: 412,
      detail: "ETag precondition failed",
      instance: req.originalUrl,
    });
  }

  const merged = {
    title: req.body?.title ?? current.title,
    body: req.body?.body ?? current.body ?? undefined,
  };

  const input = noteUpdateSchema.parse(merged);

  // --- DBレベルの条件付き更新（updatedAt一致）: 二重ガード
  const prevUpdatedAt = current.updatedAt;
  const upd = await prisma.note.updateMany({
    where: { id, updatedAt: prevUpdatedAt },
    data: input,
  });
  if (upd.count === 0) {
    return res.status(412).type("application/problem+json").json({
      type: "urn:problem:conflict",
      title: "Precondition Failed",
      status: 412,
      detail: "Record was modified by another request.",
      instance: req.originalUrl,
    });
  }
  // 反映後の最新値を返す（ETag/Last-Modified計算のため）
  const fresh = await prisma.note.findUniqueOrThrow({ where: { id } });
  return res.json({ data: fresh });
});

router.delete("/:id", async (req, res) => {
  const parsed = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!parsed.success) throw new BadRequestError("invalid id");
  const id = parsed.data;

  // If-Match 必須（前提条件が無ければ 428）
  const ifMatch = parseIfMatch(req.headers["if-match"]);
  if (ifMatch.length === 0) {
    return res.status(428).type("application/problem+json").json({
      type: "https://datatracker.ietf.org/doc/html/rfc6585#section-3",
      title: "Precondition Required",
      status: 428,
      detail: "If-Match header is required for this operation.",
      instance: req.originalUrl,
    });
  }

  const current = await prisma.note.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("note not found", { id });
  const currentEtag = weakEtagFromParts(
    current.id,
    current.title,
    current.body,
    current.updatedAt.getTime()
  );
  if (
    ifMatch.length > 0 &&
    !ifMatch.includes("*") &&
    !ifMatch.includes(currentEtag)
  ) {
    return res.status(412).type("application/problem+json").json({
      type: "https://datatracker.ietf.org/doc/html/rfc9110#name-if-match",
      title: "Precondition Failed",
      status: 412,
      detail: "ETag precondition failed",
      instance: req.originalUrl,
    });
  }

  const prevUpdatedAt = current.updatedAt;
  const del = await prisma.note.deleteMany({
    where: { id, updatedAt: prevUpdatedAt },
  });
  if (del.count === 0) {
    return res.status(412).type("application/problem+json").json({
      type: "urn:problem:conflict",
      title: "Precondition Failed",
      status: 412,
      detail: "Record was modified by another request.",
      instance: req.originalUrl,
    });
  }
  return res.status(204).send();
});

router.patch("/:id", async (req, res) => {
  const parsed = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!parsed.success) throw new BadRequestError("invalid id");
  const id = parsed.data;

  // If-Match 必須（前提条件が無ければ 428）
  const ifMatch = parseIfMatch(req.headers["if-match"]);
  if (ifMatch.length === 0) {
    return res.status(428).type("application/problem+json").json({
      type: "https://datatracker.ietf.org/doc/html/rfc6585#section-3",
      title: "Precondition Required",
      status: 428,
      detail: "If-Match header is required for this operation.",
      instance: req.originalUrl,
    });
  }

  // 現在レコード取得 & 現在ETag
  const current = await prisma.note.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("note not found", { id });
  const currentEtag = weakEtagFromParts(
    current.id,
    current.title,
    current.body,
    current.updatedAt.getTime()
  );

  // ETag 不一致 → 412
  if (!ifMatch.includes("*") && !ifMatch.includes(currentEtag)) {
    return res.status(412).type("application/problem+json").json({
      type: "https://datatracker.ietf.org/doc/html/rfc9110#name-if-match",
      title: "Precondition Failed",
      status: 412,
      detail: "ETag precondition failed",
      instance: req.originalUrl,
    });
  }

  // 欠けた値は既存値で補完してからスキーマ検証（スキーマは変更しない）
  const merged = {
    title: req.body?.title ?? current.title,
    body: req.body?.body ?? current.body ?? undefined,
  };
  const input = noteUpdateSchema.parse(merged);

  const prevUpdatedAt = current.updatedAt;
  const upd = await prisma.note.updateMany({
    where: { id, updatedAt: prevUpdatedAt },
    data: input,
  });
  if (upd.count === 0) {
    return res.status(412).type("application/problem+json").json({
      type: "urn:problem:conflict",
      title: "Precondition Failed",
      status: 412,
      detail: "Record was modified by another request.",
      instance: req.originalUrl,
    });
  }
  const fresh = await prisma.note.findUniqueOrThrow({ where: { id } });
  return res.json({ data: fresh });
});

export default router;
