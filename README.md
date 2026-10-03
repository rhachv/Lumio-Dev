# Lumio Dev

Fundação do Lumio Dev, uma aplicação privada para organizar uma operação comercial.

## Stack

React, Vite, TypeScript, React Router e Supabase Auth/PostgreSQL. A aplicação pode ser publicada na Vercel.

## Desenvolvimento local

1. Instale Node.js 20.19+ ou 22.12+ e npm.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e informe a URL do projeto Supabase e a chave publicável (anon/publishable).
4. Aplique as migrations em ordem no projeto Supabase, começando por `supabase/migrations/20261002000000_profiles.sql` e seguindo os nomes cronológicos.
5. Crie o primeiro usuário pelo painel do Supabase; cadastro público não está habilitado na aplicação.
6. Execute `npm run dev`.

Sem configuração Supabase, a tela de login explica como conectar o serviço e nenhuma sessão é simulada.

## Build e publicação

`npm run build` gera `dist/`; `npm run preview` serve a build localmente. Na Vercel, use o preset Vite e configure as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. As chaves `VITE_` são públicas por definição: nunca use a service role key nelas.

As rotas da aplicação usam o fallback de SPA da Vercel. A configuração atual da Vercel encaminha as rotas ao `index.html`.

## Escopo atual

Inclui login, sessão, proteção de rotas, layout responsivo, dashboard, CRM de leads, importação de listas e scripts pessoais. Clientes, propostas e biblioteca ainda aguardam os respectivos blocos.

## Bloco 2 — CRM / Leads

A migration do Bloco 2 cria `leads`, `nichos`, `lead_interactions`, `lead_status_history` e `lead_activity_history`, com RLS por `auth.uid()`, índices para paginação/filtros, detecção de duplicidade no Postgres e eventos de auditoria gravados por triggers. Aplique as migrations em ordem (`20261002000000_profiles.sql` e depois `20261002010000_leads_crm.sql`) no projeto Supabase antes de testar o CRM.

A lista usa páginas de 25 registros e os filtros ficam na URL. Leads bloqueados ficam fora da visualização ativa padrão; arquivamento permanece separado do bloqueio. O CRM não apaga registros e não cria follow-ups.

## Bloco 3 — Importação Excel / CSV

Aplique as migrations em ordem: `20261002000000_profiles.sql`, `20261002010000_leads_crm.sql` e `20261002020000_lead_imports.sql`. A última migration cria `imports` e `import_rows`, ativa RLS por usuário, preserva a origem informada em `leads.source_detail` e prepara as RPCs de análise e confirmação.

A rota `/importacao` aceita `.xlsx` e `.csv` de até 5 MB e 2.000 linhas. O arquivo é lido no navegador com SheetJS; fórmulas em arquivos Excel são rejeitadas e o arquivo original não é enviado ao servidor. A análise compara WhatsApp, Instagram e empresa/cidade, inclui conflitos e duplicidades do próprio arquivo, e exige confirmação antes de persistir leads. Leads novos começam com status `new`, sem bloqueio ou arquivamento.

O histórico guarda somente as colunas mapeadas e os valores normalizados necessários à comparação. Os detalhes permanecem até a exclusão explícita do histórico na interface; os leads já importados não são removidos por essa exclusão. A confirmação processa as linhas em uma transação no Postgres, registra falhas por linha e conclui com `completed_with_errors` quando necessário.

Execute `pnpm test` para os testes locais de leitura, mapeamento, normalização e análise. O teste de integração com Supabase requer um projeto configurado e migrations aplicadas.

## Bloco 4 — Scripts de Prospecção

Aplique também `supabase/migrations/20261002030000_prospecting_scripts.sql` depois das migrations anteriores. Ela cria `script_categories` e `scripts`, com referências por usuário, índices, políticas RLS e categorias iniciais sem duplicação. Categorias podem ser inativadas e reativadas; scripts vinculados continuam preservados.

A rota `/scripts` oferece busca por título, objetivo e conteúdo; filtros combináveis por categoria, nicho, favoritos e arquivamento; e ordenação por atualização, data mais antiga ou título. Scripts podem ser criados, editados, consultados, copiados, favoritados, arquivados e restaurados. Marcadores entre colchetes, como `[NOME]`, `[EMPRESA]`, `[NICHO]` e `[CIDADE]`, são destacados visualmente. O Lumio apenas guarda e copia os roteiros; não envia mensagens.

Execute `pnpm test` para validar os módulos locais. Testes de autenticação e RLS precisam de um projeto Supabase configurado com as migrations aplicadas.
