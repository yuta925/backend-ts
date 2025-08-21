import { beforeEach, afterAll } from "vitest";
import { prisma } from "../lib/prisma";

beforeEach(async () => {
  // 依存関係があるモデルが増えたら順序に注意
  await prisma.note.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
