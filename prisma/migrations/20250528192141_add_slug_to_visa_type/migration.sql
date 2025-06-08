/*
  Warnings:

  - You are about to drop the `oTP` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[personalInfoId]` on the table `VisaApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[travelInfoId]` on the table `VisaApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymentId]` on the table `VisaApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `VisaType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `VisaType` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_SUBMITTED', 'APPLICATION_STATUS_UPDATED', 'INTERVIEW_SCHEDULED', 'PAYMENT_COMPLETED', 'DOCUMENT_REQUIRED', 'SYSTEM_ALERT');

-- DropForeignKey
ALTER TABLE "oTP" DROP CONSTRAINT "oTP_email_fkey";

-- AlterTable
ALTER TABLE "VisaApplication" ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "personalInfoId" TEXT,
ADD COLUMN     "travelInfoId" TEXT;

-- AlterTable
ALTER TABLE "VisaType" ADD COLUMN     "slug" TEXT NOT NULL;

-- DropTable
DROP TABLE "oTP";

-- CreateTable
CREATE TABLE "OTP" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "passportIssueDate" TIMESTAMP(3) NOT NULL,
    "passportExpiryDate" TIMESTAMP(3) NOT NULL,
    "passportIssuingCountry" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "maritalStatus" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,

    CONSTRAINT "PersonalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelInfo" (
    "id" TEXT NOT NULL,
    "purposeOfTravel" TEXT NOT NULL,
    "intendedEntryDate" TIMESTAMP(3) NOT NULL,
    "intendedExitDate" TIMESTAMP(3) NOT NULL,
    "accommodationDetails" TEXT,
    "travelItinerary" TEXT,
    "previousVisits" TEXT,
    "hostDetails" TEXT,

    CONSTRAINT "TravelInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "visaTypeId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentStatus" "PaymentStatus" NOT NULL,
    "stripePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "refundStatus" "RefundStatus",
    "refundReason" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "status" "InterviewStatus" NOT NULL,
    "notes" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OTP_email_idx" ON "OTP"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalInfo_userId_key" ON "PersonalInfo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalInfo_passportNumber_key" ON "PersonalInfo"("passportNumber");

-- CreateIndex
CREATE INDEX "PersonalInfo_userId_idx" ON "PersonalInfo"("userId");

-- CreateIndex
CREATE INDEX "PersonalInfo_passportNumber_idx" ON "PersonalInfo"("passportNumber");

-- CreateIndex
CREATE INDEX "TravelInfo_id_idx" ON "TravelInfo"("id");

-- CreateIndex
CREATE INDEX "Document_applicationId_idx" ON "Document"("applicationId");

-- CreateIndex
CREATE INDEX "Document_documentTypeId_idx" ON "Document"("documentTypeId");

-- CreateIndex
CREATE INDEX "Document_verificationStatus_idx" ON "Document"("verificationStatus");

-- CreateIndex
CREATE INDEX "DocumentType_name_idx" ON "DocumentType"("name");

-- CreateIndex
CREATE INDEX "DocumentRequirement_visaTypeId_idx" ON "DocumentRequirement"("visaTypeId");

-- CreateIndex
CREATE INDEX "DocumentRequirement_documentTypeId_idx" ON "DocumentRequirement"("documentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON "Payment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_paymentStatus_idx" ON "Payment"("paymentStatus");

-- CreateIndex
CREATE INDEX "Payment_stripePaymentId_idx" ON "Payment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Interview_applicationId_idx" ON "Interview"("applicationId");

-- CreateIndex
CREATE INDEX "Interview_officerId_idx" ON "Interview"("officerId");

-- CreateIndex
CREATE INDEX "Interview_status_idx" ON "Interview"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_applicationId_idx" ON "Notification"("applicationId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "VisaApplication_personalInfoId_key" ON "VisaApplication"("personalInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "VisaApplication_travelInfoId_key" ON "VisaApplication"("travelInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "VisaApplication_paymentId_key" ON "VisaApplication"("paymentId");

-- CreateIndex
CREATE INDEX "VisaApplication_applicationNumber_idx" ON "VisaApplication"("applicationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VisaType_slug_key" ON "VisaType"("slug");

-- AddForeignKey
ALTER TABLE "OTP" ADD CONSTRAINT "OTP_email_fkey" FOREIGN KEY ("email") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_personalInfoId_fkey" FOREIGN KEY ("personalInfoId") REFERENCES "PersonalInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_travelInfoId_fkey" FOREIGN KEY ("travelInfoId") REFERENCES "TravelInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalInfo" ADD CONSTRAINT "PersonalInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_visaTypeId_fkey" FOREIGN KEY ("visaTypeId") REFERENCES "VisaType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
