import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 既存を消すなら（開発用）：await prisma.note.deleteMany();

  const titles = ["alpha", "beta", "gamma", "delta", "epsilon"];
  for (const t of titles) {
    await prisma.note.create({
      data: { title: t, body: `seeded: ${t}` },
    });
  }
  console.log("✅ seed completed");
}

main().finally(() => prisma.$disconnect());
