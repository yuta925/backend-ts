import { Router } from "express";
type Note = { id: number; title: string; body?: string };

const router = Router();
let notes: Note[] = [];
let seq = 1;

router.get("/", (_req, res) => {
  res.json({ notes });
});

router.post("/", (req, res) => {
  const { title, body } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });
  const note = { id: seq++, title, body };
  notes.push(note);
  res.status(201).json({ note });
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const note = notes.find(n => n.id === id);
  if (!note) return res.status(404).json({ error: "not found" });
  res.json({ note });
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  const { title, body } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });
  notes[idx] = { id, title, body };
  res.json({ note: notes[idx] });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = notes.some(n => n.id === id);
  if (!exists) return res.status(404).json({ error: "not found" });
  notes = notes.filter(n => n.id !== id);
  res.status(204).send();
});

export default router;