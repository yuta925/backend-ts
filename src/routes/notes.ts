import { Router } from "express";
import { Note } from "../types/note";
import { NotFoundError } from "../errors/AppError";
import { noteCreateSchema, noteUpdateSchema } from "../schemas/note";
import { validate } from "../middlewares/validate";

const router = Router();
let notes: Note[] = [];
let seq = 1;

router.get("/", (_req, res) => {
  res.json({ notes });
});

router.post("/", validate(noteCreateSchema), (req, res) => {
  const note = { id: seq++, ...(req.body as any) };
  notes.push(note);
  res.status(201).json({ note });
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const note = notes.find(n => n.id === id);
  if (!note) throw new NotFoundError("note not found", { id });
  res.json({ note });
});

router.put("/:id", validate(noteUpdateSchema), (req, res) => {
  const id = Number(req.params.id);
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const data = noteUpdateSchema.parse(req.body); // ← ここでvalidate
  notes[idx] = { id, ...data };
  res.json({ note: notes[idx] });
});

router.delete("/:id", (req, res) => {
  // ここは存在チェック無しで204を返す方針でもOK（幂等性）
  // 無ければ404にしたいなら以下を有効化
  // const id = Number(req.params.id);
  // if (!notes.some(n => n.id === id)) throw new NotFoundError("note not found", { id });
  // notes = notes.filter(n => n.id !== id);
  res.status(204).send();
});

export default router;