// src/config/env.ts
import dotenvFlow from "dotenv-flow";
import { z } from "zod";

// NODE_ENV に応じて .env.* を自動ロード
dotenvFlow.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url().optional(), // Day4で使う
  JWT_SECRET: z.string().min(32).optional(), // Day8で使う
});

export const env = schema.parse(process.env);