import { Router } from "express";
import { Note } from "../types/note";
import { NotFoundError } from "../errors/AppError";
import { noteCreateSchema, noteUpdateSchema } from "../schemas/note";
import { validate } from "../middlewares/validate";
import { parsePage, sliceByPage } from "../utils/pagination";
import { weakEtag } from "../utils/etag";

const router = Router();
let notes: Note[] = [];
let seq = 1;

router.get("/", (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase();
  const sort = (String(req.query.sort ?? "createdAt") as "createdAt" | "title");
  const order = (String(req.query.order ?? "desc") as "asc" | "desc");
  const page = parsePage(req.query);

    // filter
  let list = notes;
  if (q) {
    list = list.filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.body ?? "").toLowerCase().includes(q)
    );
  }

  // sort
  list = list.sort((a, b) => {
    const va = sort === "createdAt" ? a.createdAt : a.title.toLowerCase();
    const vb = sort === "createdAt" ? b.createdAt : b.title.toLowerCase();
    if (va < vb) return order === "asc" ? -1 : 1;
    if (va > vb) return order === "asc" ? 1 : -1;
    return 0;
  });

  
  const total = list.length;
  const pageItems = sliceByPage(list, page);
  const meta = { ...page, total, hasNext: page.page * page.limit < total };

  res.json({ data: pageItems, meta });
});

router.post("/", validate(noteCreateSchema), (req, res) => {
  const note: Note = { id: seq++, createdAt: Date.now(), ...(req.body as any) };
  notes.push(note);
  res.status(201).json({ note });
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const note = notes.find(n => n.id === id);
  if (!note) throw new NotFoundError("note not found", { id });
  const etag = weakEtag(note);
  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }
  res.setHeader("ETag", etag);
  res.json({ data: note });
});

router.put("/:id", validate(noteUpdateSchema), (req, res) => {
  const id = Number(req.params.id);
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  const data = noteUpdateSchema.parse(req.body); // ← ここでvalidate
  notes[idx] = { ...notes[idx], ...data };
  res.json({ data: notes[idx] });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  notes = notes.filter(n => n.id !== id);
  res.status(204).send();
});

export default router;