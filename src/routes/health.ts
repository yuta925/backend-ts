import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// Liveness: プロセスが生きているか
router.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness: 依存先（DBなど）に到達できるか
router.get("/readyz", async (_req, res) => {
  try {
    // 軽いDB疎通: SELECT 1
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch (e) {
    res.status(503).json({ status: "not_ready" });
  }
});

export default router;