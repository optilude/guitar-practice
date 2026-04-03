-- AlterTable: add description to Topic
ALTER TABLE "Topic" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

-- AlterTable: add userLessonId to GoalTopic
ALTER TABLE "GoalTopic" ADD COLUMN "userLessonId" TEXT;

-- CreateTable: UserLesson
CREATE TABLE "UserLesson" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLesson_userId_categoryId_idx" ON "UserLesson"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "UserLesson" ADD CONSTRAINT "UserLesson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLesson" ADD CONSTRAINT "UserLesson_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTopic" ADD CONSTRAINT "GoalTopic_userLessonId_fkey" FOREIGN KEY ("userLessonId") REFERENCES "UserLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
