/*
  Warnings:

  - You are about to drop the column `documentTypeId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `fileType` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the `DocumentRequirement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentType` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `documentType` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_documentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRequirement" DROP CONSTRAINT "DocumentRequirement_documentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRequirement" DROP CONSTRAINT "DocumentRequirement_visaTypeId_fkey";

-- DropIndex
DROP INDEX "Document_documentTypeId_idx";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "documentTypeId",
DROP COLUMN "fileType",
ADD COLUMN     "documentType" TEXT NOT NULL;

-- DropTable
DROP TABLE "DocumentRequirement";

-- DropTable
DROP TABLE "DocumentType";
