# Lumio Dev

Fundação do Lumio Dev, uma aplicação privada para organizar uma operação comercial.

## Stack

React, Vite, TypeScript, React Router e Supabase Auth/PostgreSQL. A aplicação pode ser publicada na Vercel.

## Desenvolvimento local

1. Instale Node.js 20.19+ ou 22.12+ e npm.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e informe a URL do projeto Supabase e a chave publicável (anon/publishable).
4. Aplique `supabase/migrations/20261002000000_profiles.sql` ao projeto Supabase.
5. Crie o primeiro usuário pelo painel do Supabase; cadastro público não está habilitado na aplicação.
6. Execute `npm run dev`.

Sem configuração Supabase, a tela de login explica como conectar o serviço e nenhuma sessão é simulada.

## Build e publicação

`npm run build` gera `dist/`; `npm run preview` serve a build localmente. Na Vercel, use o preset Vite e configure as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. As chaves `VITE_` são públicas por definição: nunca use a service role key nelas.

As rotas da aplicação usam o fallback de SPA da Vercel. A configuração atual da Vercel encaminha as rotas ao `index.html`.

## Escopo atual

Inclui login, sessão, proteção de rotas, layout responsivo, dashboard vazio e páginas de navegação preparadas. Leads, clientes, propostas, scripts, biblioteca e importação ainda não têm funcionalidades de negócio.

## Bloco 2 — CRM / Leads

A migration do Bloco 2 cria `leads`, `nichos`, `lead_interactions`, `lead_status_history` e `lead_activity_history`, com RLS por `auth.uid()`, índices para paginação/filtros, detecção de duplicidade no Postgres e eventos de auditoria gravados por triggers. Aplique as migrations em ordem (`20261002000000_profiles.sql` e depois `20261002010000_leads_crm.sql`) no projeto Supabase antes de testar o CRM.

A lista usa páginas de 25 registros e os filtros ficam na URL. Leads bloqueados ficam fora da visualização ativa padrão; arquivamento permanece separado do bloqueio. O CRM não apaga registros e não cria follow-ups.
