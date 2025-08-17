import { z } from "zod";

export const noteCreateSchema = z.object({
  title: z.string().min(1, "title is required").max(100, "title too long"),
  body: z.string().max(1000, "body too long").optional(),
});

export const noteUpdateSchema = z.object({
  title: z.string().min(1, "title is required").max(100, "title too long"),
  body: z.string().max(1000, "body too long").optional(),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;