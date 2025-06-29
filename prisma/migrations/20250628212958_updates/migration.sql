/*
  Warnings:

  - Added the required column `officerName` to the `Interview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "InterviewStatus" ADD VALUE 'RESCHEDULED';

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "officerName" TEXT NOT NULL,
ADD COLUMN     "scheduler" TEXT,
ADD COLUMN     "schedulerId" TEXT,
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
