ALTER TABLE "OrderItem" ADD COLUMN "unitCostCents" INTEGER;

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "createdById" TEXT,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "Expense_companyId_occurredAt_idx" ON "Expense"("companyId", "occurredAt");
CREATE INDEX "Expense_companyId_category_occurredAt_idx" ON "Expense"("companyId", "category", "occurredAt");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Plan"
SET "features" = "features" || '["expenses"]'::jsonb
WHERE "code" IN ('professional', 'business') AND NOT ("features" ? 'expenses');
