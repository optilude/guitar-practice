-- AlterTable
ALTER TABLE "GoalTopic" ADD COLUMN     "userProgressionId" TEXT;

-- CreateTable
CREATE TABLE "UserProgression" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL,
    "degrees" TEXT[],
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserProgression_userId_idx" ON "UserProgression"("userId");

-- AddForeignKey
ALTER TABLE "GoalTopic" ADD CONSTRAINT "GoalTopic_userProgressionId_fkey" FOREIGN KEY ("userProgressionId") REFERENCES "UserProgression"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgression" ADD CONSTRAINT "UserProgression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
