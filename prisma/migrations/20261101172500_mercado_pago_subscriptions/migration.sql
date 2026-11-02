ALTER TABLE "Subscription" ADD COLUMN "checkoutUrl" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "pendingPlanId" TEXT;

CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionInvoice_providerPaymentId_key" ON "SubscriptionInvoice"("providerPaymentId");
CREATE INDEX "SubscriptionInvoice_subscriptionId_createdAt_idx" ON "SubscriptionInvoice"("subscriptionId", "createdAt");
CREATE UNIQUE INDEX "ProviderWebhookEvent_provider_eventId_key" ON "ProviderWebhookEvent"("provider", "eventId");
CREATE INDEX "ProviderWebhookEvent_provider_processedAt_idx" ON "ProviderWebhookEvent"("provider", "processedAt");
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
