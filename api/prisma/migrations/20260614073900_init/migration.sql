-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteSlug" TEXT NOT NULL,
    "hostTokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "parentUnionId" TEXT,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "photoKey" TEXT,
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
    "birthYear" INTEGER,
    "birthplace" TEXT,
    "currentLocation" TEXT,
    "signatureEmoji" TEXT,
    "signatureDish" TEXT,
    "hiddenTalent" TEXT,
    "song" TEXT,
    "askMeAbout" TEXT,
    "takesAfterId" TEXT,
    "bio" TEXT,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "claimedByDeviceId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Union" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "partnerAId" TEXT NOT NULL,
    "partnerBId" TEXT,
    "unionType" TEXT NOT NULL DEFAULT 'partners',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Union_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edit" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "deviceId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Family_inviteSlug_key" ON "Family"("inviteSlug");

-- CreateIndex
CREATE INDEX "Person_familyId_idx" ON "Person"("familyId");

-- CreateIndex
CREATE INDEX "Person_parentUnionId_idx" ON "Person"("parentUnionId");

-- CreateIndex
CREATE INDEX "Union_familyId_idx" ON "Union"("familyId");

-- CreateIndex
CREATE INDEX "Union_partnerAId_idx" ON "Union"("partnerAId");

-- CreateIndex
CREATE INDEX "Union_partnerBId_idx" ON "Union"("partnerBId");

-- CreateIndex
CREATE INDEX "Device_familyId_idx" ON "Device"("familyId");

-- CreateIndex
CREATE INDEX "Edit_familyId_idx" ON "Edit"("familyId");

-- CreateIndex
CREATE INDEX "Edit_entityId_idx" ON "Edit"("entityId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_parentUnionId_fkey" FOREIGN KEY ("parentUnionId") REFERENCES "Union"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Union" ADD CONSTRAINT "Union_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Union" ADD CONSTRAINT "Union_partnerAId_fkey" FOREIGN KEY ("partnerAId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Union" ADD CONSTRAINT "Union_partnerBId_fkey" FOREIGN KEY ("partnerBId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edit" ADD CONSTRAINT "Edit_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
