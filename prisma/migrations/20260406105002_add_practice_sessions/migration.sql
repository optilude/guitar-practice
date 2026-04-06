-- Fix drift: Routine.durationMinutes was removed from the schema but not via migration
-- The column does not exist in the database, so we use IF EXISTS to be safe
ALTER TABLE "Routine" DROP COLUMN IF EXISTS "durationMinutes";

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "goalTitle" TEXT NOT NULL,
    "routineTitle" TEXT NOT NULL,
    "startedAtLocal" TEXT NOT NULL,
    "endedAtLocal" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotSection" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "durationMinutes" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SnapshotSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotSectionTopic" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "kind" "TopicKind" NOT NULL,
    "subtype" TEXT,
    "displayName" TEXT NOT NULL,
    "keys" TEXT[],
    "practiceMode" "PracticeMode",
    "lessonUrl" TEXT,

    CONSTRAINT "SnapshotSectionTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeSession_userId_localDate_idx" ON "PracticeSession"("userId", "localDate");

-- CreateIndex
CREATE INDEX "PracticeSession_userId_goalId_idx" ON "PracticeSession"("userId", "goalId");

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotSection" ADD CONSTRAINT "SnapshotSection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotSectionTopic" ADD CONSTRAINT "SnapshotSectionTopic_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SnapshotSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
