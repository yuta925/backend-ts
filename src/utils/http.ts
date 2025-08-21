export function parseIfMatch(h: string | string[] | undefined): string[] {
  if (!h) return [];
  const raw = Array.isArray(h) ? h.join(",") : h;
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}