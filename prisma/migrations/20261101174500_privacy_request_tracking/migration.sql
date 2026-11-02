CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'ANONYMIZATION', 'OTHER');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'DECLINED');

CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "requestNote" TEXT,
    "resolutionNote" TEXT,
    "createdById" TEXT,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyRequest_companyId_status_createdAt_idx" ON "PrivacyRequest"("companyId", "status", "createdAt");
CREATE INDEX "PrivacyRequest_companyId_customerId_createdAt_idx" ON "PrivacyRequest"("companyId", "customerId", "createdAt");

ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
