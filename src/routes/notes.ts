import { Router } from "express";
import { BadRequestError, NotFoundError } from "../errors/AppError";
import { noteCreateSchema, noteUpdateSchema } from "../schemas/note";
import { parsePage } from "../utils/pagination";
import { parseIfNoneMatch, weakEtagFromParts } from "../utils/etag";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import z from "zod";

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

  const input = noteUpdateSchema.parse(req.body);
  const note = await prisma.note.update({ where: { id }, data: input });
  res.json({ data: note });
});

router.delete("/:id", async (req, res) => {
  const parsed = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!parsed.success) throw new BadRequestError("invalid id");
  const id = parsed.data;

  await prisma.note.delete({ where: { id } });
  res.status(204).send();
});

export default router;
