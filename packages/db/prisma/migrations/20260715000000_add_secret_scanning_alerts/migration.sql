-- CreateTable
CREATE TABLE "SecretScanningAlert" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubNumber" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "resolution" TEXT,
    "secretType" TEXT NOT NULL,
    "secretTypeDisplayName" TEXT,
    "providerSlug" TEXT,
    "validity" TEXT,
    "publiclyLeaked" BOOLEAN,
    "multiRepo" BOOLEAN,
    "base64Encoded" BOOLEAN,
    "pushProtectionBypassed" BOOLEAN,
    "path" TEXT,
    "startLine" INTEGER,
    "endLine" INTEGER,
    "startColumn" INTEGER,
    "endColumn" INTEGER,
    "blobSha" TEXT,
    "commitSha" TEXT,
    "htmlUrl" TEXT,
    "githubCreatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "pushProtectionBypassedAt" TIMESTAMP(3),
    "raw" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretScanningAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecretScanningAlert_repositoryId_githubNumber_key" ON "SecretScanningAlert"("repositoryId", "githubNumber");

-- CreateIndex
CREATE INDEX "SecretScanningAlert_repositoryId_idx" ON "SecretScanningAlert"("repositoryId");

-- CreateIndex
CREATE INDEX "SecretScanningAlert_state_idx" ON "SecretScanningAlert"("state");

-- CreateIndex
CREATE INDEX "SecretScanningAlert_validity_idx" ON "SecretScanningAlert"("validity");

-- CreateIndex
CREATE INDEX "SecretScanningAlert_lastSeenAt_idx" ON "SecretScanningAlert"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "SecretScanningAlert" ADD CONSTRAINT "SecretScanningAlert_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
