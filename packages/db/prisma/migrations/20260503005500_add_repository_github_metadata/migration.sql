ALTER TABLE "Repository"
ADD COLUMN "primaryLanguage" TEXT,
ADD COLUMN "pushedAt" TIMESTAMP(3),
ADD COLUMN "githubCreatedAt" TIMESTAMP(3),
ADD COLUMN "githubUpdatedAt" TIMESTAMP(3);
