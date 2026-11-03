# Ordexa

Aplicação SaaS multiempresa para gestão de pedidos, clientes e estoque. Inclui painel comercial e administrativo, autenticação com e-mail via Resend configurável, loja pública e checkout recorrente do Ordexa via Mercado Pago (ativado somente com credenciais válidas).

## Requisitos

- Node.js 24.11 ou superior na linha 24 (ou Node.js 22.18 ou superior).
- npm.
- PostgreSQL 14 ou superior.

## Configuração local

1. Copie `.env.example` para `.env` e defina `DATABASE_URL`, `BETTER_AUTH_SECRET` com pelo menos 32 caracteres aleatórios, `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL`. Para ativar recuperação e verificação de e-mail, configure também `RESEND_API_KEY` e `EMAIL_FROM` com um remetente autorizado no Resend. Para cobrar assinaturas, configure `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`.
2. Instale as dependências com `npm install`.
3. Gere o Prisma Client com `npm run db:generate`.
4. Aplique as migrações versionadas com `npm run db:deploy`.
5. Cadastre os planos iniciais com `npm run db:seed`.
6. Inicie com `npm run dev` e acesse `http://localhost:3000`.

O onboarding garante que os três planos iniciais existam e associa o plano gratuito à primeira empresa. Não há usuários, pedidos ou vendas demonstrativos inseridos no banco.

## Administrador da plataforma

O cadastro público cria somente usuários comuns. `platformRole` não é aceito pelo formulário público. Para provisionar o primeiro administrador, cadastre a conta em `/cadastro` e execute `npm run admin:promote -- admin@seudominio.com --confirm-admin` em um terminal confiável conectado ao banco. O comando grava auditoria e não existe como endpoint público. Depois disso, outros administradores podem ser promovidos ou removidos em `/admin/usuarios` (somente por administrador, com auditoria; ninguém pode remover o próprio acesso). O painel administrativo está disponível em `/admin` após provisionar o primeiro administrador e inclui dashboard com MRR, busca/filtros de empresas, usuários e assinaturas, edição de planos, bloqueio de empresas e auditoria filtrável com paginação.

## Arquitetura atual

- Next.js App Router com TypeScript e Tailwind CSS.
- Better Auth para credenciais, sessões e cookies seguros.
- PostgreSQL e Prisma para persistência relacional.
- Zod para validação nos endpoints.
- Cada leitura ou escrita de dados de negócio usa o `companyId` da sessão autorizada no servidor.
- Somente o proprietário tem acesso total implícito; funcionários dependem das permissões atribuídas. Registros antigos com perfil de gerente não mantêm privilégios amplos e devem ser reconfigurados pelo proprietário na tela de equipe.
- As páginas de painel e a navegação verificam permissões no servidor; mutações HTTP exigem origem confiável via proxy, exceto endpoints de autenticação (Better Auth) e webhooks assinados.
- Criação de pedido executa recálculo de preços, verificação e baixa de estoque, histórico e auditoria em transação serializável.
- A cobrança SaaS usa checkout hospedado e consulta o recurso no Mercado Pago antes de alterar acesso/plano. Configure no painel do provedor o webhook público `POST /api/webhooks/mercado-pago` para `subscription_preapproval` e `subscription_authorized_payment`; o proprietário também pode cancelar pelo painel.

## Testes e comandos

- `npm run typecheck`: valida tipos TypeScript.
- `npm run lint`: verifica convenções Next/ESLint.
- `npm test`: testes unitários Vitest.
- `npm run test:concurrency`: teste PostgreSQL concorrente de reserva de estoque. Exige `TEST_DATABASE_URL` apontando para banco isolado cujo nome contenha `test`, migrações aplicadas e `ALLOW_TEST_DATABASE_WRITES=YES`; cria e remove uma empresa de teste.
- `npm run test:e2e`: testes Playwright.
- `npm run build`: gera o Prisma Client e compila a aplicação.

`npm run typecheck`, `npm run lint`, Prisma validate/generate, `npm test` (48 testes), `npm run build`, `npm run db:deploy`, `npm run db:seed` e `npm run test:e2e` (5 testes) passaram. A suíte unitária cobre permissões, origem CSRF, assinatura e validação de identidade de recurso nos webhooks, tratamento de erros da API no cliente, isolamento entre empresas, autorização na edição de pedidos, reserva de estoque e regras comerciais. O teste PostgreSQL de concorrência foi implementado, mas ainda precisa ser executado com `TEST_DATABASE_URL` num banco de teste isolado cujo usuário tenha permissão de `CREATEDB`. A concorrência deve ser verificada num ambiente com esse banco antes da publicação.

## Limitações desta etapa

- Implementados: cadastro/login, criação de empresa, verificação de e-mail e recuperação de senha via Resend configurável, catálogo e categorias, cadastro/edição/exportação/anonimização de clientes, registro auditável de solicitações de privacidade, criação e edição de pedidos, atualização de status, pagamentos e estornos manuais, estoque transacional, entregas, acompanhamento público, loja pública configurável (horários, categorias, modalidades, taxa e formas de pagamento), filtros e relatórios CSV, dashboard com dados reais, limites por plano, gerenciamento administrativo de assinaturas, equipe e auditoria, checkout/cancelamento de assinaturas SaaS Mercado Pago e reconciliação autenticada de eventos/histórico de cobranças.
- O painel de privacidade permite ao proprietário registrar pedidos ligados a clientes, acompanhar etapas e documentar a resolução. Solicitações de anonimização só podem ser concluídas após a remoção dos dados relacionados; exportação e anonimização são auditadas.
- Ainda pendentes: notificações automáticas, definição de política de retenção/consentimentos aplicável a cada negócio e revisão jurídica/segurança antes de produção. A verificação/recuperação por e-mail e a cobrança recorrente exigem credenciais válidas dos provedores.
- Ao atualizar instalações que já tinham usuários como gerente, o proprietário deve reatribuir as permissões dessas contas pela tela Equipe; o perfil legado passa a não ter acesso implícito.
- O link do WhatsApp apenas abre uma conversa preenchida. Os pagamentos dos pedidos e seus estornos são registros manuais; a integração recorrente Mercado Pago é exclusiva para assinaturas SaaS e não processa pagamentos dos pedidos das lojas. O estorno manual não movimenta valores na operadora.
- O rate limiting de autenticação e da loja pública usa PostgreSQL. Recuperação e confirmação de e-mail usam o provedor Resend quando `RESEND_API_KEY` e `EMAIL_FROM` estão configurados; sem eles, os fluxos ficam desativados. Política de retenção/anonimização LGPD, consentimentos e revisão final de segurança precisam ser concluídos antes de produção.
- As migrações versionadas incluem alterações aditivas para estornos, configurações da loja pública, despesas, snapshots de custo, cobrança recorrente Mercado Pago e solicitações de privacidade. Aplique todas nos bancos existentes com `npm run db:deploy`.

## Publicação

Configure `DATABASE_URL` para PostgreSQL de produção, `BETTER_AUTH_SECRET` único e URLs HTTPS do domínio, execute `npm run db:deploy` durante o release e então `npm run build`. Use um provedor de PostgreSQL com conexão adequada para funções serverless e mantenha as credenciais apenas no gerenciador de secrets do ambiente de deploy.
