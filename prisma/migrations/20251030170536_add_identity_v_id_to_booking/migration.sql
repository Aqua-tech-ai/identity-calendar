/*
  Warnings:

  - A unique constraint covering the columns `[startAt,endAt]` on the table `Slot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Slot_startAt_endAt_key" ON "Slot"("startAt", "endAt");
