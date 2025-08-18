import pinoHttp from "pino-http";
import pino from "pino";
import { randomUUID } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";

const isProd = process.env.NODE_ENV === "production";

export const logger = pinoHttp({
  genReqId: (req, res) => {
    const id =
      (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    res?.setHeader?.("x-request-id", id);
    return id;
  },

  transport: !isProd
    ? {
        target: "pino-pretty",
        options: {
          singleLine: true,
          translateTime: "SYS:standard",
          messageFormat: "{req.method} {req.url} -> {res.statusCode} {msg}",
          ignore: "pid,hostname",
        },
      }
    : undefined,

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
    ],
    censor: "[Redacted]",
  },

  // ★ res/err に型を付け、res が無い時のフォールバックを入れる
  customLogLevel: (_req: IncomingMessage, res: ServerResponse | undefined, err?: Error) => {
    if (err) return "error";
    const status = res?.statusCode ?? 200;
    if (status >= 500) return "error";
    if (status >= 400) return "warn";
    return "info";
  },

  // ↓ 次の項で説明（pino.stdSerializers を使う）
  serializers: { err: pino.stdSerializers.err },
});