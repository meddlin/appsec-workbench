-- CreateEnum
CREATE TYPE "RepositoryVisibility" AS ENUM ('public', 'private', 'internal');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('open', 'resolved', 'excepted');

-- CreateEnum
CREATE TYPE "ControlEvaluationStatus" AS ENUM ('pass', 'fail', 'unknown');

-- CreateEnum
CREATE TYPE "ModuleRunStatus" AS ENUM ('running', 'success', 'failed');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "githubId" TEXT,
    "login" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "githubId" TEXT,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "visibility" "RepositoryVisibility" NOT NULL,
    "defaultBranch" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositorySetting" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "hasBranchProtection" BOOLEAN,
    "hasDependabotAlerts" BOOLEAN,
    "hasSecretScanning" BOOLEAN,
    "hasCodeScanning" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositorySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "controlId" TEXT,
    "title" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'open',
    "details" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Control" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlEvaluation" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "moduleRunId" TEXT,
    "status" "ControlEvaluationStatus" NOT NULL,
    "message" TEXT,
    "evidence" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exception" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "controlId" TEXT,
    "findingId" TEXT,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleRun" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "organizationId" TEXT,
    "repositoryId" TEXT,
    "status" "ModuleRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summary" JSONB,
    "error" TEXT,

    CONSTRAINT "ModuleRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_githubId_key" ON "Organization"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_login_key" ON "Organization"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE INDEX "Repository_organizationId_idx" ON "Repository"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RepositorySetting_repositoryId_key" ON "RepositorySetting"("repositoryId");

-- CreateIndex
CREATE INDEX "Finding_repositoryId_idx" ON "Finding"("repositoryId");

-- CreateIndex
CREATE INDEX "Finding_controlId_idx" ON "Finding"("controlId");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Control_key_key" ON "Control"("key");

-- CreateIndex
CREATE INDEX "ControlEvaluation_repositoryId_idx" ON "ControlEvaluation"("repositoryId");

-- CreateIndex
CREATE INDEX "ControlEvaluation_controlId_idx" ON "ControlEvaluation"("controlId");

-- CreateIndex
CREATE INDEX "ControlEvaluation_moduleRunId_idx" ON "ControlEvaluation"("moduleRunId");

-- CreateIndex
CREATE INDEX "Exception_repositoryId_idx" ON "Exception"("repositoryId");

-- CreateIndex
CREATE INDEX "Exception_controlId_idx" ON "Exception"("controlId");

-- CreateIndex
CREATE INDEX "Exception_findingId_idx" ON "Exception"("findingId");

-- CreateIndex
CREATE INDEX "ModuleRun_moduleId_idx" ON "ModuleRun"("moduleId");

-- CreateIndex
CREATE INDEX "ModuleRun_organizationId_idx" ON "ModuleRun"("organizationId");

-- CreateIndex
CREATE INDEX "ModuleRun_repositoryId_idx" ON "ModuleRun"("repositoryId");

-- CreateIndex
CREATE INDEX "ModuleRun_status_idx" ON "ModuleRun"("status");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositorySetting" ADD CONSTRAINT "RepositorySetting_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEvaluation" ADD CONSTRAINT "ControlEvaluation_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEvaluation" ADD CONSTRAINT "ControlEvaluation_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEvaluation" ADD CONSTRAINT "ControlEvaluation_moduleRunId_fkey" FOREIGN KEY ("moduleRunId") REFERENCES "ModuleRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleRun" ADD CONSTRAINT "ModuleRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleRun" ADD CONSTRAINT "ModuleRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;
