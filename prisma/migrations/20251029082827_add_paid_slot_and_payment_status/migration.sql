-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL DEFAULT 'PRACTICE',
    "playerName" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "cancelToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("bookingType", "cancelToken", "createdAt", "discordId", "id", "notes", "playerName", "slotId", "status") SELECT "bookingType", "cancelToken", "createdAt", "discordId", "id", "notes", "playerName", "slotId", "status" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_slotId_key" ON "Booking"("slotId");
CREATE TABLE "new_Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPaidSlot" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Slot" ("createdAt", "endAt", "id", "startAt", "status") SELECT "createdAt", "endAt", "id", "startAt", "status" FROM "Slot";
DROP TABLE "Slot";
ALTER TABLE "new_Slot" RENAME TO "Slot";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
