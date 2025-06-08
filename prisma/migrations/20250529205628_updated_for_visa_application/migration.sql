/*
  Warnings:

  - You are about to drop the column `previousVisits` on the `TravelInfo` table. All the data in the column will be lost.
  - Added the required column `email` to the `PersonalInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `PersonalInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PersonalInfo" ADD COLUMN     "currentAddress" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "employerDetails" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TravelInfo" DROP COLUMN "previousVisits",
ADD COLUMN     "countriesVisitedOfAfterBurundi" TEXT,
ADD COLUMN     "finalDestination" TEXT,
ADD COLUMN     "portOfEntry" TEXT,
ADD COLUMN     "previousVisitDetails" TEXT;

-- AlterTable
ALTER TABLE "VisaApplication" ADD COLUMN     "fundingSource" TEXT,
ADD COLUMN     "monthlyIncome" DOUBLE PRECISION;
