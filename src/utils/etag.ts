import crypto from "crypto";
export function weakEtag(obj: unknown) {
  const json = JSON.stringify(obj);
  const hash = crypto.createHash("sha1").update(json).digest("hex");
  return `W/"${hash}"`;
}