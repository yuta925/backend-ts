import crypto from "crypto";

export function weakEtagFromParts(
  ...parts: Array<string | number | undefined | null>
) {
  // ETagに使う素材を安定化
  const payload = parts.map((v) => v ?? "").join("|");
  const hash = crypto.createHash("sha1").update(payload).digest("hex");
  return `W/"${hash}"`;
}

/** If-None-Match ヘッダを分解して配列に（弱い/強いはここでは区別しない） */
export function parseIfNoneMatch(headerValue: string | string[] | undefined) {
  if (!headerValue) return [];
  const raw = Array.isArray(headerValue) ? headerValue.join(",") : headerValue;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}