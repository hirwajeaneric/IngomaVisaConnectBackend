/*
  Warnings:

  - Added the required column `entryDate` to the `TravelInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exitDate` to the `TravelInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `previousVisits` to the `TravelInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TravelInfo" ADD COLUMN     "entryDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "exitDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "previousVisits" BOOLEAN NOT NULL;
