-- CreateEnum
CREATE TYPE "Role" AS ENUM ('APPLICANT', 'OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUBMITTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "department" TEXT,
    "title" TEXT,
    "permissions" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "VisaType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "processingTime" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "requirements" TEXT[],
    "eligibleCountries" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VisaType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaApplication" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visaTypeId" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "VisaApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "OTP_email_idx" ON "OTP"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VisaApplication_applicationNumber_key" ON "VisaApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "VisaApplication_userId_idx" ON "VisaApplication"("userId");

-- CreateIndex
CREATE INDEX "VisaApplication_status_idx" ON "VisaApplication"("status");

-- AddForeignKey
ALTER TABLE "OTP" ADD CONSTRAINT "OTP_email_fkey" FOREIGN KEY ("email") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_visaTypeId_fkey" FOREIGN KEY ("visaTypeId") REFERENCES "VisaType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
