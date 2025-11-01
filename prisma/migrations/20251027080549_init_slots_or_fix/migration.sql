/*
  Warnings:

  - You are about to drop the `Coach` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `capacity` on the `Slot` table. All the data in the column will be lost.
  - You are about to drop the column `coachId` on the `Slot` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Coach";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Slot" ("endAt", "id", "startAt", "status") SELECT "endAt", "id", "startAt", "status" FROM "Slot";
DROP TABLE "Slot";
ALTER TABLE "new_Slot" RENAME TO "Slot";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
