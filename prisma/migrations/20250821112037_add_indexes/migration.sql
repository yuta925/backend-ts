/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `Note` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Note_title_key" ON "public"."Note"("title");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "public"."Note"("createdAt");

-- CreateIndex
CREATE INDEX "Note_updatedAt_idx" ON "public"."Note"("updatedAt");

-- CreateIndex
CREATE INDEX "Note_title_idx" ON "public"."Note"("title");
