-- CreateTable
CREATE TABLE "DependabotAlert" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubNumber" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "severity" TEXT,
    "packageName" TEXT,
    "ecosystem" TEXT,
    "manifestPath" TEXT,
    "dependencyScope" TEXT,
    "ghsaId" TEXT,
    "cveId" TEXT,
    "advisorySummary" TEXT,
    "vulnerableVersionRange" TEXT,
    "patchedVersions" TEXT,
    "htmlUrl" TEXT,
    "githubCreatedAt" TIMESTAMP(3),
    "githubUpdatedAt" TIMESTAMP(3),
    "fixedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "raw" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DependabotAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DependabotAlert_repositoryId_githubNumber_key" ON "DependabotAlert"("repositoryId", "githubNumber");

-- CreateIndex
CREATE INDEX "DependabotAlert_repositoryId_idx" ON "DependabotAlert"("repositoryId");

-- CreateIndex
CREATE INDEX "DependabotAlert_state_idx" ON "DependabotAlert"("state");

-- CreateIndex
CREATE INDEX "DependabotAlert_severity_idx" ON "DependabotAlert"("severity");

-- CreateIndex
CREATE INDEX "DependabotAlert_lastSeenAt_idx" ON "DependabotAlert"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "DependabotAlert" ADD CONSTRAINT "DependabotAlert_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
