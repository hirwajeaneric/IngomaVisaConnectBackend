/*
  Warnings:

  - You are about to drop the column `officerId` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `officerName` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `scheduler` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Interview` table. All the data in the column will be lost.
  - Added the required column `assignedOfficerId` to the `Interview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignedOfficerName` to the `Interview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schedulerName` to the `Interview` table without a default value. This is not possible if the table is not empty.
  - Made the column `schedulerId` on table `Interview` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT "Interview_officerId_fkey";

-- DropForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT "Interview_userId_fkey";

-- DropIndex
DROP INDEX "Interview_officerId_idx";

-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "officerId",
DROP COLUMN "officerName",
DROP COLUMN "scheduler",
DROP COLUMN "userId",
ADD COLUMN     "assignedOfficerId" TEXT NOT NULL,
ADD COLUMN     "assignedOfficerName" TEXT NOT NULL,
ADD COLUMN     "schedulerName" TEXT NOT NULL,
ALTER COLUMN "schedulerId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Interview_assignedOfficerId_idx" ON "Interview"("assignedOfficerId");

-- CreateIndex
CREATE INDEX "Interview_schedulerId_idx" ON "Interview"("schedulerId");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_schedulerId_fkey" FOREIGN KEY ("schedulerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
