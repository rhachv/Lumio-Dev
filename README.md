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
