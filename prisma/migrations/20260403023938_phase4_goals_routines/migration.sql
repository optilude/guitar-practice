-- CreateEnum
CREATE TYPE "TopicKind" AS ENUM ('lesson', 'scale', 'chord', 'triad', 'arpeggio', 'progression', 'harmony');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('warmup', 'technique', 'muscle_memory', 'theory', 'lessons', 'songs', 'free_practice');

-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('chromatic_asc', 'chromatic_desc', 'circle_fifths_asc', 'circle_fourths_desc', 'random');

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalTopic" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "kind" "TopicKind" NOT NULL,
    "subtype" TEXT,
    "lessonId" TEXT,
    "defaultKey" TEXT,
    "refKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "durationMinutes" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionTopic" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "goalTopicId" TEXT NOT NULL,
    "keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "practiceMode" "PracticeMode",

    CONSTRAINT "SectionTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoalTopic_goalId_refKey_key" ON "GoalTopic"("goalId", "refKey");

-- CreateIndex
CREATE UNIQUE INDEX "SectionTopic_sectionId_goalTopicId_key" ON "SectionTopic"("sectionId", "goalTopicId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTopic" ADD CONSTRAINT "GoalTopic_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTopic" ADD CONSTRAINT "GoalTopic_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTopic" ADD CONSTRAINT "SectionTopic_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTopic" ADD CONSTRAINT "SectionTopic_goalTopicId_fkey" FOREIGN KEY ("goalTopicId") REFERENCES "GoalTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
