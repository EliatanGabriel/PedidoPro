# Ordexa

Aplicação SaaS multiempresa para gestão de pedidos, clientes e estoque. Inclui painel comercial e administrativo, autenticação com e-mail via Resend configurável, loja pública e checkout recorrente do Ordexa via Mercado Pago (ativado somente com credenciais válidas).

## Requisitos

- Node.js 24.11 ou superior na linha 24 (ou Node.js 22.18 ou superior).
- npm.
- PostgreSQL 14 ou superior.

## Configuração local

1. Copie `.env.example` para `.env` e defina `DATABASE_URL`, `BETTER_AUTH_SECRET` com pelo menos 32 caracteres aleatórios, `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL`. Para ativar recuperação e verificação de e-mail, configure também `RESEND_API_KEY` e `EMAIL_FROM` com um remetente autorizado no Resend. Para cobrar assinaturas, configure `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`. Defina `CRON_SECRET` para proteger o reprocessamento da fila de e-mails.
2. Instale as dependências com `npm install`.
3. Gere o Prisma Client com `npm run db:generate`.
4. Aplique as migrações versionadas com `npm run db:deploy`.
5. Cadastre os planos iniciais com `npm run db:seed`.
6. Valide a configuração com `npm run env:check` (use `npm run env:check:strict` no release).
7. Inicie com `npm run dev` e acesse `http://localhost:3000`.

O onboarding garante que os três planos iniciais existam e associa o plano gratuito à primeira empresa. Não há usuários, pedidos ou vendas demonstrativos inseridos no banco.

## Administrador da plataforma

O cadastro público cria somente usuários comuns. `platformRole` não é aceito pelo formulário público. Para provisionar o primeiro administrador, cadastre a conta em `/cadastro` e execute `npm run admin:promote -- admin@seudominio.com --confirm-admin` em um terminal confiável conectado ao banco. Como alternativa quando não há acesso ao shell do provedor, defina `ADMIN_BOOTSTRAP_EMAIL` com o e-mail da conta já cadastrada e acesse `/admin`: a conta é promovida automaticamente com auditoria (`platform.admin_bootstrapped`). Remova a variável e faça redeploy após o primeiro acesso. Para criar a conta administradora já com senha (sem passar pelo cadastro), rode `npm run admin:bootstrap -- admin@seudominio.com 'SenhaForte' --confirm-admin` apontando `DATABASE_URL` para o banco desejado; a senha é gravada com o mesmo hash do Better Auth e o e-mail já fica verificado. Ao entrar, administradores são redirecionados para `/admin` e veem o link "Admin da plataforma" no painel. O comando e a variável não existem como endpoint público. Depois disso, outros administradores podem ser promovidos ou removidos em `/admin/usuarios` (somente por administrador, com auditoria; ninguém pode remover o próprio acesso). O painel administrativo está disponível em `/admin` após provisionar o primeiro administrador e inclui dashboard com MRR, busca/filtros de empresas, usuários e assinaturas, detalhe da empresa com uso do plano, equipe, pedidos, faturas e auditoria, edição de planos, bloqueio de empresas, operações (fila de e-mails com reenvio, solicitações LGPD, webhooks e diagnóstico) e auditoria filtrável com paginação.

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

## Notificações por e-mail

- Novos pedidos (painel e loja pública) e mudanças de status enfileiram e-mails transacionais na tabela `EmailOutbox` dentro da mesma transação do pedido. O envio é feito após a resposta via `after()`, sem bloquear a requisição.
- Falhas são reprocessadas até 5 vezes; registros concluídos são removidos após 30 dias. O endpoint `GET|POST /api/cron/email-outbox` reprocessa a fila e exige `Authorization: Bearer $CRON_SECRET` (comparação em tempo constante). Agende-o no provedor de cron a cada poucos minutos.
- Sem `RESEND_API_KEY` e `EMAIL_FROM`, a fila continua sendo gravada, mas o envio fica desativado e o `env:check` emite aviso.
- O proprietário pode excluir a própria conta em `/painel/conta`. A exclusão remove o usuário e, quando ele é o único membro, a empresa e os dados vinculados (cascade). Contas com outros membros ou assinatura Mercado Pago ativa são bloqueadas até a regularização; a operação é auditada.

## Testes e comandos

- `npm run typecheck`: valida tipos TypeScript.
- `npm run lint`: verifica convenções Next/ESLint.
- `npm test`: testes unitários Vitest.
- `npm run test:concurrency`: teste PostgreSQL concorrente de reserva de estoque. Exige `TEST_DATABASE_URL` apontando para banco isolado cujo nome contenha `test`, migrações aplicadas e `ALLOW_TEST_DATABASE_WRITES=YES`; cria e remove uma empresa de teste.
- `npm run test:e2e`: testes Playwright. Defina `E2E_DATABASE_URL` para um banco isolado (nome contendo `test` ou `e2e`); o Playwright aplica migrações, roda o seed, sobe o app e executa o fluxo crítico de cadastro, empresa, produto, pedido, loja, acompanhamento e exclusão de conta.
- `npm run build`: gera o Prisma Client e compila a aplicação.
- `npm run env:check`: valida as variáveis de ambiente e avisa sobre integrações desativadas.
- `npm run db:backup`: gera um dump compactado com `pg_dump` em `./backups`.

`npm run typecheck`, `npm run lint`, Prisma validate/generate, `npm test` (67 testes), `npm run build`, `npm run db:deploy`, `npm run db:seed` e `npm run test:e2e` (6 testes) passaram. A suíte unitária cobre permissões, origem CSRF, assinatura e validação de identidade de recurso nos webhooks, tratamento de erros da API no cliente, isolamento entre empresas, autorização na edição de pedidos, reserva de estoque, configuração de ambiente, identificação de IP atrás de proxy, conteúdo de e-mails transacionais e regras comerciais. O E2E cobre o fluxo crítico completo contra PostgreSQL real. O teste PostgreSQL de concorrência passou contra um PostgreSQL real (uma reserva aceita, a outra abortada e estoque final consistente) e roda no job `concurrency` do CI a cada push/PR.

## Operação em produção

- `GET /api/healthcheck` consulta o banco de verdade (`SELECT 1`) e retorna 503 quando o PostgreSQL está indisponível; use-o no monitoramento/load balancer. O endpoint também informa se e-mail e cobrança estão configurados.
- `/admin` é uma área separada do painel da empresa, protegida por `platformRole` no servidor; usuários comuns recebem redirecionamento e as APIs `/api/admin/*` respondem 403. As páginas de administração e do painel enviam `noindex`, e `/robots.txt` bloqueia `/admin`, `/painel`, `/api` e rotas privadas.
- `/robots.txt` e `/sitemap.xml` são gerados a partir de `NEXT_PUBLIC_APP_URL`; faça o build com a URL pública de produção para que os endereços fiquem corretos.
- Logs são emitidos em JSON por `src/lib/logger.ts`; erros não tratados de requisições passam por `src/instrumentation.ts` (`onRequestError`). Encaminhe stdout/stderr para o coletor de logs do provedor.
- `npm run env:check:strict` falha se faltarem variáveis obrigatórias ou se e-mail/proxy não estiverem configurados; rode no pipeline antes do deploy.
- Defina `TRUST_PROXY=true` somente quando a aplicação estiver atrás de um proxy confiável (Nginx, load balancer ou plataforma) que sobrescreve `X-Forwarded-For`. Com `false`, o rate limit da loja pública usa um único balde compartilhado.
- Faça backup antes de cada release e teste a restauração periodicamente: `npm run db:backup` e depois `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/ordexa-<data>.dump`.
- Mantenha um ambiente de staging com banco separado para validar migrações antes da produção.

## Limitações desta etapa

- Implementados: cadastro/login, criação de empresa, verificação de e-mail e recuperação de senha via Resend configurável, catálogo e categorias, cadastro/edição/exportação/anonimização de clientes, registro auditável de solicitações de privacidade, criação e edição de pedidos, atualização de status, pagamentos e estornos manuais, estoque transacional, entregas, acompanhamento público, loja pública configurável (horários, categorias, modalidades, taxa e formas de pagamento), filtros e relatórios CSV, dashboard com dados reais, limites por plano, gerenciamento administrativo de assinaturas, equipe e auditoria, checkout/cancelamento de assinaturas SaaS Mercado Pago, reconciliação autenticada de eventos/histórico de cobranças, notificações transacionais por e-mail com fila/retentativa e exclusão self-service de conta/empresa.
- O painel de privacidade permite ao proprietário registrar pedidos ligados a clientes, acompanhar etapas e documentar a resolução. Solicitações de anonimização só podem ser concluídas após a remoção dos dados relacionados; exportação e anonimização são auditadas.
- Ainda pendentes: definição de política de retenção/consentimentos aplicável a cada negócio e revisão jurídica/segurança antes de produção. A verificação/recuperação por e-mail e a cobrança recorrente exigem credenciais válidas dos provedores. O reprocessamento da fila de e-mails depende do agendamento de `/api/cron/email-outbox` com `CRON_SECRET`.
- A CSP mantém `'unsafe-inline'` em `script-src` por compatibilidade com os scripts inline do Next.js. Revisar nonce/hash antes de elevar o nível de segurança. Os logs são estruturados, mas ainda não há provedor externo de error tracking/alertas.
- Ao atualizar instalações que já tinham usuários como gerente, o proprietário deve reatribuir as permissões dessas contas pela tela Equipe; o perfil legado passa a não ter acesso implícito.
- O link do WhatsApp apenas abre uma conversa preenchida. Os pagamentos dos pedidos e seus estornos são registros manuais; a integração recorrente Mercado Pago é exclusiva para assinaturas SaaS e não processa pagamentos dos pedidos das lojas. O estorno manual não movimenta valores na operadora.
- O rate limiting de autenticação e da loja pública usa PostgreSQL. Recuperação e confirmação de e-mail usam o provedor Resend quando `RESEND_API_KEY` e `EMAIL_FROM` estão configurados; sem eles, os fluxos ficam desativados. Política de retenção/anonimização LGPD, consentimentos e revisão final de segurança precisam ser concluídos antes de produção.
- As migrações versionadas incluem alterações aditivas para estornos, configurações da loja pública, despesas, snapshots de custo, cobrança recorrente Mercado Pago, solicitações de privacidade e fila de e-mails. Aplique todas nos bancos existentes com `npm run db:deploy`.

## Publicação

Configure `DATABASE_URL` para PostgreSQL de produção, `BETTER_AUTH_SECRET` único e URLs HTTPS do domínio, rode `npm run env:check:strict`, execute `npm run db:deploy` durante o release e então `npm run build`. Use um provedor de PostgreSQL com conexão adequada para funções serverless e mantenha as credenciais apenas no gerenciador de secrets do ambiente de deploy. O endpoint `/api/healthcheck` deve ser usado no monitoramento e o backup (`npm run db:backup`) deve rodar antes de cada release. Defina `CRON_SECRET` e agende `GET /api/cron/email-outbox` (com `Authorization: Bearer $CRON_SECRET`) para reprocessar a fila de e-mails.
