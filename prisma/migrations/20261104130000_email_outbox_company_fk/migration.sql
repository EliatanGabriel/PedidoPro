-- Remove registros órfãos de empresas já excluídas antes de criar a chave estrangeira.
DELETE FROM "EmailOutbox" WHERE "companyId" IS NOT NULL AND "companyId" NOT IN (SELECT "id" FROM "Company");

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "EmailOutbox_companyId_idx" ON "EmailOutbox"("companyId");
