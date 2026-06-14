-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "editPinHash" TEXT;

-- CreateTable
CREATE TABLE "PersonAdmin" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "duesStatus" TEXT NOT NULL DEFAULT 'none',
    "duesAmount" INTEGER,
    "note" TEXT,
    "contact" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonAdmin_personId_key" ON "PersonAdmin"("personId");

-- CreateIndex
CREATE INDEX "PersonAdmin_familyId_idx" ON "PersonAdmin"("familyId");

-- AddForeignKey
ALTER TABLE "PersonAdmin" ADD CONSTRAINT "PersonAdmin_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
