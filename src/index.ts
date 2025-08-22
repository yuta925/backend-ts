// src/index.ts
import { createApp } from "./app";
import { prisma } from "./lib/prisma";

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`🚀 http://localhost:${port}`);
});

const shutdown = async (signal: string) => {
  console.log(`[shutdown] received ${signal}`);
  try {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
    console.log("[shutdown] closed http server and prisma");
    process.exit(0);
  } catch (e) {
    console.error("[shutdown] error during shutdown", e);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));