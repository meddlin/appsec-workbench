-- CreateTable
CREATE TABLE "CodeQlAlert" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubNumber" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "githubRuleSeverity" TEXT,
    "ruleId" TEXT,
    "ruleName" TEXT,
    "ruleDescription" TEXT,
    "toolName" TEXT,
    "toolVersion" TEXT,
    "path" TEXT,
    "startLine" INTEGER,
    "endLine" INTEGER,
    "commitSha" TEXT,
    "ref" TEXT,
    "message" TEXT,
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

    CONSTRAINT "CodeQlAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeQlAlert_repositoryId_githubNumber_key" ON "CodeQlAlert"("repositoryId", "githubNumber");

-- CreateIndex
CREATE INDEX "CodeQlAlert_repositoryId_idx" ON "CodeQlAlert"("repositoryId");

-- CreateIndex
CREATE INDEX "CodeQlAlert_state_idx" ON "CodeQlAlert"("state");

-- CreateIndex
CREATE INDEX "CodeQlAlert_severity_idx" ON "CodeQlAlert"("severity");

-- CreateIndex
CREATE INDEX "CodeQlAlert_lastSeenAt_idx" ON "CodeQlAlert"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "CodeQlAlert" ADD CONSTRAINT "CodeQlAlert_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
