-- CreateEnum
CREATE TYPE "RequestForDocumentStatus" AS ENUM ('SENT', 'SUBMITTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RequestForDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "additionalDetails" TEXT,
    "status" "RequestForDocumentStatus" NOT NULL DEFAULT 'SENT',
    "officerId" TEXT NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestForDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestForDocument_applicationId_idx" ON "RequestForDocument"("applicationId");

-- CreateIndex
CREATE INDEX "RequestForDocument_officerId_idx" ON "RequestForDocument"("officerId");

-- CreateIndex
CREATE INDEX "RequestForDocument_documentId_idx" ON "RequestForDocument"("documentId");

-- AddForeignKey
ALTER TABLE "RequestForDocument" ADD CONSTRAINT "RequestForDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForDocument" ADD CONSTRAINT "RequestForDocument_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForDocument" ADD CONSTRAINT "RequestForDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
