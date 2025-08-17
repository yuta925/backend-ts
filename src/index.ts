import "express-async-errors";
import express from "express";
import router from "./routes";
import { notFound, errorHandler } from "./middlewares/error";

import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import yaml from "yaml";
import cors from "cors";

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// --- Swagger UI ( /docs )
const openapiPath = path.join(__dirname, "../openapi.yaml");
if (fs.existsSync(openapiPath)) {
  const spec = yaml.parse(fs.readFileSync(openapiPath, "utf8"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  console.log("📘 OpenAPI docs: http://localhost:3000/docs");
} else {
  console.warn("openapi.yaml not found; /docs will be disabled");
}

// 既存ルーティング
app.use("/", router);
app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`🚀 http://localhost:${port}`);
});