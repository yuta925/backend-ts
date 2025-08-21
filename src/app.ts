import "express-async-errors";
import express from "express";
import router from "./routes";
import { notFound, errorHandler } from "./middlewares/error";
import { logger } from "./middlewares/log";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import yaml from "yaml";
import { apiLimiter } from "./middlewares/rateLimit";

export function createApp() {
  const app = express();

  // 逆プロキシ配下でのIP取得（本番/compose対策）
  app.set("trust proxy", 1);

  app.use(express.json());
  app.use(cors());

  // テスト時はログ/レート制限を抑える
  const isTest = process.env.NODE_ENV === "test";
  if (!isTest) app.use(logger);

  // Swagger
  const openapiPath = path.join(__dirname, "../openapi.yaml");
  if (fs.existsSync(openapiPath)) {
    const spec = yaml.parse(fs.readFileSync(openapiPath, "utf8"));
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

  // 乱用されやすいGETにのみレート制限（ただしテストは無効）
  if (!isTest) {
    // ルータ内部での細粒度適用でもOK。簡便にパス単位で。
    app.use("/notes", apiLimiter);
  }

  app.use("/", router);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
