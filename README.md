# Lumio Dev

Aplicação privada para organizar prospecção, leads, scripts, referências, clientes, projetos e propostas em uma operação comercial individual.

## Stack

React 19, Vite, TypeScript, React Router, Supabase Auth/PostgreSQL/Storage e pnpm.

## Requisitos

- Node.js 20.19+ ou 22.12+.
- pnpm.
- Um projeto Supabase para habilitar autenticação e persistência.

## Desenvolvimento local

```sh
pnpm install
pnpm dev
```

Antes de iniciar o Vite, crie `.env.local` a partir de `.env.example` (`Copy-Item .env.example .env.local` no PowerShell ou `cp .env.example .env.local` em macOS/Linux).

Preencha `.env.local` com as variáveis públicas do projeto Supabase:

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publicavel
```

No terminal PowerShell, o comando para copiar o exemplo é `Copy-Item`; em macOS/Linux, use `cp .env.example .env.local`. As variáveis `VITE_` são incluídas no navegador. Use somente a chave anon/publishable do Supabase; nunca inclua `service_role` ou outros secrets.

No SQL Editor do Supabase, aplique as migrations em ordem cronológica, de `supabase/migrations/20261002000000_profiles.sql` a `supabase/migrations/20261002070000_dashboard.sql`. Depois, reinicie o Vite e crie o usuário autorizado pelo painel do Supabase. O app não oferece cadastro público. Sem as variáveis, a tela de login explica como configurar a conexão e não simula uma sessão.

## Verificação

```sh
pnpm test
pnpm run build
```

Os testes existentes cobrem leitura/mapeamento de importações, scripts e validações da biblioteca. Autenticação, persistência, RLS, Storage e fluxos ponta a ponta precisam de um projeto Supabase configurado com todas as migrations aplicadas. Este repositório não define um script de lint.

## Funcionalidades

- Autenticação privada e proteção das rotas.
- CRM de leads com pesquisa, filtros, status, bloqueio, arquivamento, histórico e interações.
- Importação de planilhas CSV/XLSX com mapeamento, normalização, detecção de duplicidade, revisão e histórico.
- Scripts de prospecção com categorias, nichos, busca, favoritos, cópia e arquivamento.
- Biblioteca de referências com pesquisa, tags, favoritos e screenshots privados.
- Clientes convertidos de leads ganhos e projetos com status e histórico.
- Propostas vinculadas a leads/clientes, pipeline comercial e histórico.
- Dashboard abastecido por consultas Supabase para resumos e atividade recente.

As migrations aplicam RLS por usuário às tabelas privadas e políticas específicas ao bucket privado de screenshots. Essa configuração deve ser validada no projeto Supabase real antes de usar dados de produção.

## Build e Vercel

`pnpm run build` executa a verificação de tipos TypeScript e gera a build em `dist/`. Para pré-visualizar localmente, execute `pnpm preview`.

Na Vercel, use o preset Vite, o comando `pnpm run build`, o diretório de saída `dist` e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto. `vercel.json` encaminha as rotas da SPA para `index.html`. Não faça deploy antes de configurar e validar o Supabase.

## Estrutura

- `src/pages` — telas e fluxos do app.
- `src/components` — componentes de interface e por domínio.
- `src/services` — acesso a dados e validações de domínio.
- `src/lib` — clientes Supabase e autenticação.
- `supabase/migrations` — estrutura, políticas RLS e funções do banco.
- `tests` — testes locais existentes.
