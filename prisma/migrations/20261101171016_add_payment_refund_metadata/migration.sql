ALTER TABLE "Payment"
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundReference" TEXT,
  ADD COLUMN "refundReason" TEXT;
