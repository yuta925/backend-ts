import rateLimit from "express-rate-limit";

// 1分あたり60リクエスト（必要なら .env で調整）
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_REQ = Number(process.env.RATE_LIMIT_MAX ?? 60);

export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQ,
  standardHeaders: true, // RateLimit-* ヘッダ
  legacyHeaders: false,  // X-RateLimit-* 無効

  // Problem+JSONで返す
  handler: (req, res /*, next*/) => {
    // pino連携（あれば）
    req.log?.warn(
      { ip: req.ip, path: req.originalUrl },
      "rate limit exceeded"
    );

    res
      .status(429)
      .type("application/problem+json")
      .json({
        type: "https://httpstatuses.com/429",
        title: "Too Many Requests",
        status: 429,
        detail: "Rate limit exceeded. Try again later.",
        instance: req.originalUrl,
      });
  },
});