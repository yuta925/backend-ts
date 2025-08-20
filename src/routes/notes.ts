import { Router } from "express";
import { Note } from "../types/note";
import { NotFoundError } from "../errors/AppError";
import { noteCreateSchema, noteUpdateSchema } from "../schemas/note";
import { validate } from "../middlewares/validate";
import { parsePage, sliceByPage } from "../utils/pagination";
import { weakEtag } from "../utils/etag";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

const router = Router();
let notes: Note[] = [];
let seq = 1;

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

router.post("/", validate(noteCreateSchema), (req, res) => {
  const note: Note = { id: seq++, createdAt: Date.now(), ...(req.body as any) };
  notes.push(note);
  req.log.info({ noteId: note.id }, "note created");
  res.status(201).json({ note });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) throw new NotFoundError("note not found", { id });

  // 304対応（ETag + Last-Modified）
  const etag = weakEtag({
    id: note.id,
    title: note.title,
    body: note.body,
    updatedAt: note.updatedAt,
  });
  if (req.headers["if-none-match"] === etag) return res.status(304).end();

  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", new Date(note.updatedAt).toUTCString());
  res.json({ data: note });
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const input = noteUpdateSchema.parse(req.body);
  const note = await prisma.note
    .update({ where: { id }, data: input })
    .catch(() => null);
  if (!note) throw new NotFoundError("note not found", { id });
  res.json({ data: note });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.note.delete({ where: { id } }).catch(() => {}); // 幂等
  res.status(204).send();
});

export default router;