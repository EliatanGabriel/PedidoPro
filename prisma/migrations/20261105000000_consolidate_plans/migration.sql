-- Consolidar planos: Gratuito e Pro apenas
-- O Gratuito herda do antigo Profissional; o Pro herda do antigo Empresarial (preço mantido)

-- Atualizar plano Gratuito se existir
UPDATE "Plan" SET
  "name" = 'Gratuito',
  "priceCents" = 0,
  "monthlyOrderLimit" = 300,
  "productLimit" = 200,
  "userLimit" = 3,
  "features" = '["dashboard_basic","orders","reports","expenses","stock","public_store"]',
  "isActive" = true,
  "updatedAt" = now()
WHERE "code" = 'free';

-- Inserir plano Gratuito se não existir
INSERT INTO "Plan" ("id", "code", "name", "priceCents", "monthlyOrderLimit", "productLimit", "userLimit", "features", "isActive", "createdAt", "updatedAt")
SELECT 'cm' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), 'free', 'Gratuito', 0, 300, 200, 3, '["dashboard_basic","orders","reports","expenses","stock","public_store"]', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Plan" WHERE "code" = 'free');

-- Atualizar plano Pro se existir
UPDATE "Plan" SET
  "name" = 'Pro',
  "priceCents" = 2990,
  "monthlyOrderLimit" = 0,
  "productLimit" = 0,
  "userLimit" = 10,
  "features" = '["dashboard_basic","orders","reports","advanced_reports","expenses","stock","public_store"]',
  "isActive" = true,
  "updatedAt" = now()
WHERE "code" = 'pro';

-- Inserir plano Pro se não existir
INSERT INTO "Plan" ("id", "code", "name", "priceCents", "monthlyOrderLimit", "productLimit", "userLimit", "features", "isActive", "createdAt", "updatedAt")
SELECT 'cm' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), 'pro', 'Pro', 2990, 0, 0, 10, '["dashboard_basic","orders","reports","advanced_reports","expenses","stock","public_store"]', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Plan" WHERE "code" = 'pro');

-- Desativar planos antigos consolidados
UPDATE "Plan" SET "isActive" = false, "updatedAt" = now() WHERE "code" IN ('professional', 'business');
