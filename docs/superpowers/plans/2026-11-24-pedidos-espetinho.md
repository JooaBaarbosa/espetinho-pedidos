# Pedidos do carrinho de espetinho: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web (Next.js na Vercel) para o carrinho Brasamiga controlar pedidos em Preparação, Espera, Entregue e Cancelado, com cronômetro e alerta visual de atraso, sincronizado entre aparelhos.

**Architecture:** Um projeto Next.js (App Router) com páginas e Route Handlers. Regras de negócio puras em `src/lib/regras.ts`; acesso ao Postgres via Drizzle em funções de repositório (`src/db/*.ts`) que recebem o `db` e o `agora`; a UI é um client component que consulta `/api/pedidos` a cada 3 s e calcula cronômetros localmente com a hora do servidor.

**Tech Stack:** Node 26.13.1, pnpm 12.23.0, Next 16.4.6, React 19.3.1, TypeScript 7.0.2, Drizzle ORM 0.45.4 + drizzle-kit 0.31.11, pg 8.23.1, Zod 4.6.7, jose 6.2.18, lucide-react 1.79.0, sharp 0.35.5, Vitest 5.1.1, Testing Library, Playwright 1.65.1, Postgres 19.0.

**Spec:** `docs/superpowers/specs/2026-11-24-pedidos-espetinho-design.md`

## Global Constraints

- Versões exatas (sem `^`/`~`), verificadas em 2026-11-24: next 16.4.6, react/react-dom 19.3.1, typescript 7.0.2, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg 8.23.1, @types/pg 8.23.1, zod 4.6.7, jose 6.2.18, lucide-react 1.79.0, sharp 0.35.5, vitest 5.1.1, @vitejs/plugin-react 6.3.0, vite-tsconfig-paths 6.1.1, jsdom 31.0.1, @testing-library/react 16.3.3, @testing-library/user-event 14.6.13, @testing-library/jest-dom 8.0.0, @playwright/test 1.65.1, eslint 10.15.0, eslint-config-next 16.4.6, @types/node 26.6.6, @types/react 19.3.0, @types/react-dom 19.3.0, tsx 4.23.15. `packageManager: "pnpm@12.23.0"`, `engines.node: "26.13.1"`.
- Imagens: `node:26.13.1-trixie-slim`, `postgres:19.0-alpine3.24`, `mcr.microsoft.com/playwright:v1.65.1-noble`. Actions: `actions/checkout@v7.0.1`, `actions/setup-node@v7.1.0`, `pnpm/action-setup@v6.1.1`.
- Se o TypeScript 7.0.2 quebrar `next build`/typecheck, usar a última 6.x estável (`npm view typescript@6 version`) e anotar o motivo no README.
- Todos os comandos `pnpm` rodam dentro do container `node` (Smart App Control desta máquina bloqueia binários nativos): `docker compose run --rm node pnpm <script>`. No plano, `$DC` = `docker compose run --rm node`.
- Porta do Postgres no host: **5433** (5432 é usada por outros projetos). Porta do app: 3000.
- Fuso do "dia": `America/Sao_Paulo`.
- Textos da interface em português, **sem travessões** (— ou –), sem emojis; ícones da marca (`public/marca/`) ou `lucide-react`.
- Cantos `--raio: 0.75rem`; nunca botão pílula. Fundo brasa cheio **só** no alerta de atraso.
- Toda animação some com `prefers-reduced-motion: reduce`.
- Nenhum `alert`/`confirm`/`prompt` do navegador.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Toque duplo em "Anotar" com rede lenta**: deve existir um único pedido (botão desabilitado enquanto envia + `id` gerado no aparelho). Teste na Task 8.
2. **Relógio do aparelho errado** (tablet 10 min adiantado): cronômetro e alerta usam a hora do servidor. Teste na Task 7 (`criarRelogio`).
3. **Pedido anotado antes da meia-noite e ainda ativo depois**: continua na coluna e conta em Preparação/Espera; ao ser entregue depois da meia-noite conta em Entregue de hoje. Testes nas Tasks 2 e 3.
4. **Sabor renomeado ou desativado depois do pedido**: o pedido continua mostrando o nome original. Teste na Task 3.
5. **Sessão expirada no meio do uso** (troca de `SESSION_SECRET`): a API responde 401 e o app leva para `/entrar`, em vez de mostrar "Sem conexão" para sempre. Teste na Task 7.

---

## Estrutura de arquivos

```
compose.yaml                     serviços db (Postgres 19) e node (Node 26)
docker/initdb/01-test.sql        cria o banco espetinho_test
.env.example                     DATABASE_URL, APP_SENHA, SESSION_SECRET
drizzle.config.ts
drizzle/                         migrações (schema + seed)
vitest.config.ts                 projetos "unit" (jsdom) e "db" (node)
playwright.config.ts
proxy.ts                         exige sessão
scripts/preparar-icones.ts       gera public/marca/ e src/app/icon.png, apple-icon.png
src/lib/tipos.ts                 Status, Acao, Pedido, PainelResposta...
src/lib/regras.ts                regras puras
src/lib/relogio.ts               hora corrigida pelo servidor
src/lib/sessao.ts                JWT, cookie, senha
src/lib/api.ts                   cliente fetch das rotas
src/db/schema.ts | index.ts | pedidos.ts | sabores.ts | config.ts
src/app/layout.tsx, globals.css, manifest.ts, page.tsx
src/app/entrar/page.tsx, configuracoes/page.tsx, privacidade/page.tsx, termos/page.tsx
src/app/api/...                  route handlers
src/components/                  Painel, Topo, Contadores, CartaoPedido, FormNovoPedido,
                                 SeletorQuantidade, Finalizados, IconeMarca, FaixaConexao
src/hooks/usePainel.ts
tests/unit/ tests/db/ tests/e2e/
.github/workflows/ci.yml
```

---

### Task 1: Base do projeto em Docker

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `compose.yaml`, `docker/initdb/01-test.sql`, `vitest.config.ts`, `src/app/layout.tsx` (mínimo), `src/app/page.tsx` (placeholder), `tests/unit/smoke.test.ts`, `README.md`

**Interfaces:**
- Produces: scripts `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test:unit` (`vitest run --project unit`), `test:db` (`vitest run --project db`), `test:e2e`, `db:generate`, `db:migrate`, `marca`; alias `@/*` → `src/*`.

- [ ] **Step 1:** `compose.yaml`: serviço `db` (`postgres:19.0-alpine3.24`, `POSTGRES_PASSWORD=dev`, `POSTGRES_DB=espetinho`, porta `5433:5432`, volume `./docker/initdb:/docker-entrypoint-initdb.d`, healthcheck `pg_isready`); serviço `node` (`node:26.13.1-trixie-slim`, `working_dir: /app`, volumes `.:/app` e volume nomeado `node_modules:/app/node_modules`, `pnpm_store` em `/root/.local/share/pnpm`, env `DATABASE_URL=postgres://postgres:dev@db:5432/espetinho`, `DATABASE_URL_TEST=postgres://postgres:dev@db:5432/espetinho_test`, `APP_SENHA=dev`, `SESSION_SECRET` de 32+ caracteres de dev, porta `3000:3000`, `depends_on: db (healthy)`, entrypoint que roda `corepack enable` antes do comando). `01-test.sql`: `CREATE DATABASE espetinho_test;`.
- [ ] **Step 2:** `package.json` com as versões exatas das Global Constraints, `packageManager`, `engines`. `.gitignore`: `node_modules`, `.next`, `.env*` (menos `.env.example`), `.claude/worktrees/`, `test-results/`, `playwright-report/`. Next com `src/`, App Router, sem Tailwind (CSS próprio).
- [ ] **Step 3:** `vitest.config.ts` com dois projetos: `unit` (`environment: 'jsdom'`, `include: ['tests/unit/**/*.test.{ts,tsx}']`, setup `@testing-library/jest-dom/vitest`) e `db` (`environment: 'node'`, `include: ['tests/db/**/*.test.ts']`, `fileParallelism: false`). Teste `smoke.test.ts`: `expect(1 + 1).toBe(2)`.
- [ ] **Step 4:** Rodar `$DC pnpm install`, depois `$DC pnpm lint && $DC pnpm typecheck && $DC pnpm test:unit && $DC pnpm build`.
  Expected: todos terminam com código 0; `next build` lista a rota `/`. Se o typecheck falhar por incompatibilidade do TS 7, aplicar a regra das Global Constraints.
- [ ] **Step 5:** README curto: o que é, como rodar (`docker compose up db`, `$DC pnpm dev -H 0.0.0.0`), scripts. Commit `chore: base do projeto Next.js em Docker`.

### Task 2: Regras puras

**Files:**
- Create: `src/lib/tipos.ts`, `src/lib/regras.ts`
- Test: `tests/unit/regras.test.ts`

**Interfaces:**
- Produces (`tipos.ts`):
  ```ts
  type Status = 'preparacao' | 'espera' | 'entregue' | 'cancelado'
  type Acao = 'pronto' | 'entregue' | 'cancelar'
  interface ItemPedido { saborId: number; nomeSabor: string; quantidade: number }
  interface Pedido { id: string; cliente: string; status: Status; criadoEm: string; prontoEm: string | null; finalizadoEm: string | null; itens: ItemPedido[] } // datas ISO
  interface Contadores { preparacao: number; espera: number; entregue: number; cancelado: number }
  interface PainelResposta { agora: string; tempoMaxMin: number; ativos: Pedido[]; finalizadosHoje: Pedido[]; contadores: Contadores }
  interface Sabor { id: number; nome: string; ativo: boolean; ordem: number }
  ```
- Produces (`regras.ts`):
  - `proximoStatus(atual: Status, acao: Acao): Status | null`
  - `msDecorridos(criadoEm: string, agora: Date): number` (nunca negativo)
  - `estaAtrasado(p: Pick<Pedido,'status'|'criadoEm'>, agora: Date, tempoMaxMin: number): boolean`
  - `minutosAtraso(p, agora, tempoMaxMin): number` (inteiro, arredonda para baixo, 0 se não atrasado)
  - `formatarCronometro(ms: number): string`
  - `inicioDoDiaSP(agora: Date): Date`
  - `contarPedidos(ativos: Pedido[], finalizadosHoje: Pedido[]): Contadores`
  - `novoPedidoSchema` (Zod) e `type NovoPedido = z.infer<typeof novoPedidoSchema>` = `{ id: string(uuid); cliente: string; itens: { saborId: number; quantidade: number }[] }`
  - `resumoItens(itens: ItemPedido[]): string` e `totalEspetinhos(itens): number`

- [ ] **Step 1: Testes que falham** (`tests/unit/regras.test.ts`):
  - `proximoStatus`: `('preparacao','pronto')→'espera'`, `('espera','entregue')→'entregue'`, `('preparacao','cancelar')→'cancelado'`, `('espera','cancelar')→'cancelado'`; `('preparacao','entregue')`, `('espera','pronto')`, `('entregue','cancelar')`, `('cancelado','pronto')` → `null`.
  - `estaAtrasado` com `tempoMaxMin=15`, criado `2026-11-24T20:00:00Z`: em `20:15:00Z` → `false` (igual ao máximo não atrasa); em `20:15:01Z` → `true`; status `entregue` em `21:00Z` → `false`; status `espera` em `21:00Z` → `true`.
  - `minutosAtraso` em `20:19:59Z` → `4`.
  - `formatarCronometro(0)→'00:00'`, `(65_000)→'01:05'`, `(3_600_000)→'1:00:00'`, `(3_725_000)→'1:02:05'`.
  - `msDecorridos` com criado no futuro → `0`.
  - `inicioDoDiaSP(new Date('2026-11-25T02:30:00Z'))` → `2026-11-24T03:00:00.000Z` (23:30 em SP ainda é dia 24); `inicioDoDiaSP(new Date('2026-11-25T03:00:00Z'))` → `2026-11-25T03:00:00.000Z`.
  - `contarPedidos` com 2 preparação + 1 espera ativos e 3 entregues + 1 cancelado finalizados → `{2,1,3,1}`.
  - `novoPedidoSchema`: cliente `'  João  '` → `'João'`; cliente `'   '` falha; 41 caracteres falha, 40 passa; `itens: []` falha; quantidade `0` e `51` falham, `1` e `50` passam; `saborId` repetido falha com mensagem `'Sabor repetido no pedido'`; `id` não UUID falha. Mensagens de erro em português.
  - `resumoItens([{nomeSabor:'Carne',quantidade:2,...},{nomeSabor:'Frango',quantidade:1,...}])` → `'2 Carne · 1 Frango'`; `totalEspetinhos` → `3`.
- [ ] **Step 2:** `$DC pnpm test:unit -- regras` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar. `inicioDoDiaSP` via `Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'})` para pegar a data local e o offset de SP (sem dependência extra).
- [ ] **Step 4:** `$DC pnpm test:unit -- regras` → PASS.
- [ ] **Step 5:** Commit `feat: regras de pedidos, atraso e validação`.

### Task 3: Banco, migrações e repositórios

**Files:**
- Create: `drizzle.config.ts`, `src/db/schema.ts`, `src/db/index.ts`, `src/db/pedidos.ts`, `src/db/sabores.ts`, `src/db/config.ts`, `drizzle/0000_*.sql` (gerada), `drizzle/0001_seed.sql` (custom), `tests/db/setup.ts`
- Test: `tests/db/pedidos.test.ts`, `tests/db/sabores-config.test.ts`

**Interfaces:**
- Consumes: tipos e `novoPedidoSchema`, `inicioDoDiaSP`, `proximoStatus`, `contarPedidos` (Task 2).
- Produces:
  - `type Db` e `getDb(url = process.env.DATABASE_URL!): Db` (Pool `pg` único por URL, `drizzle-orm/node-postgres`).
  - `class ErroValidacao extends Error` (em `src/db/pedidos.ts`).
  - `listarPainel(db: Db, agora: Date): Promise<PainelResposta>`: ativos = status em preparação/espera (qualquer dia), ordem `criado_em` asc; finalizadosHoje = entregue/cancelado com `finalizado_em >= inicioDoDiaSP(agora)`, ordem `finalizado_em` desc; itens por `id` asc.
  - `criarPedido(db, input: NovoPedido): Promise<{ criado: boolean; pedido: Pedido }>`: valida que todos os `saborId` existem e estão ativos (senão `ErroValidacao('Sabor indisponível')`); grava `nome_sabor` copiado; `INSERT ... ON CONFLICT (id) DO NOTHING` em transação; se já existia devolve o existente com `criado:false`.
  - `aplicarAcao(db, id: string, acao: Acao, agora: Date): Promise<{ ok: true; pedido: Pedido } | { ok: false; motivo: 'conflito' | 'nao_encontrado' }>`: lê status, calcula `proximoStatus`; `UPDATE ... WHERE id=$1 AND status=$atual`; seta `pronto_em` na ação `pronto`, `finalizado_em` em `entregue`/`cancelar`.
  - `listarSabores(db, opts?: { incluirInativos?: boolean }): Promise<Sabor[]>` (ordem asc), `criarSabor(db, nome: string): Promise<Sabor>` (ordem = max+1; nome duplicado → `ErroValidacao('Sabor já existe')`), `editarSabor(db, id, campos: Partial<Pick<Sabor,'nome'|'ativo'|'ordem'>>): Promise<Sabor | null>`.
  - `lerConfig(db): Promise<{ tempoMaxMin: number }>`, `salvarConfig(db, { tempoMaxMin }): Promise<void>` (1..120, senão `ErroValidacao`).
- Schema: exatamente as tabelas da seção 5 da spec (`status` como `pgEnum('status_pedido', [...])`, `quantidade` com `check` 1..50, índice `pedidos_status_criado_idx`).

- [ ] **Step 1:** Schema + `drizzle.config.ts`; `$DC pnpm db:generate` gera `0000`. Gerar custom `0001_seed` (`drizzle-kit generate --custom --name seed`) com `INSERT INTO config (id, tempo_max_min) VALUES (1, 15)` e os 10 sabores da spec seção 5, na ordem 1..10, nomes exatos: Carne, Frango, Linguiça apimentada, Misto, Kafta sem queijo, Kafta com queijo, Coração, Medalhão de carne, Medalhão de frango, Queijo coalho.
- [ ] **Step 2:** `tests/db/setup.ts` (setupFiles do projeto `db`): roda `migrate()` do drizzle em `DATABASE_URL_TEST` uma vez; `beforeEach` faz `TRUNCATE pedidos, itens_pedido RESTART IDENTITY CASCADE` e restaura sabores/config ao seed.
- [ ] **Step 3: Testes que falham** (`pedidos.test.ts`, com `agora` fixo):
  - seed: `listarSabores` devolve 10 sabores, o 8º é `'Medalhão de carne'`; `lerConfig` → `{ tempoMaxMin: 15 }`.
  - criar pedido João com Carne×2 + Frango×1 → `criado:true`, status `preparacao`, itens com `nomeSabor`.
  - **idempotência:** criar duas vezes com o mesmo `id` → segundo `criado:false`, `listarPainel` tem 1 ativo.
  - sabor desativado → `criarPedido` rejeita com `ErroValidacao`.
  - fluxo `pronto` → `entregue`: `prontoEm` e `finalizadoEm` preenchidos; contadores `{0,0,1,0}`.
  - `aplicarAcao(id,'pronto')` duas vezes → segunda `{ ok:false, motivo:'conflito' }`; id inexistente → `nao_encontrado`; `entregue` em pedido em preparação → `conflito`.
  - **virada do dia (Review Focus 3):** pedido criado `2026-11-25T02:50:00Z` (23:50 SP), `listarPainel` com agora `2026-11-25T03:10:00Z` → continua em `ativos`; entregue nesse agora → aparece em `finalizadosHoje`; pedido entregue em `2026-11-25T02:59:00Z` não aparece com agora `03:10Z`.
  - **renomear sabor (Review Focus 4):** pedido com Carne, depois `editarSabor(carne,{nome:'Carne bovina', ativo:false})` → `listarPainel` ainda mostra `nomeSabor:'Carne'`.
  - `sabores-config.test.ts`: `criarSabor('Pão de alho')` com ordem 11; duplicado rejeita; `salvarConfig({tempoMaxMin:0})` e `121` rejeitam, `20` grava.
- [ ] **Step 4:** `docker compose up -d db` e `$DC pnpm test:db` → FAIL.
- [ ] **Step 5:** Implementar repositórios.
- [ ] **Step 6:** `$DC pnpm test:db` → PASS. Commit `feat: banco, migrações com sabores do cardápio e repositórios`.

### Task 4: Sessão, proxy e entrar/sair

**Files:**
- Create: `src/lib/sessao.ts`, `proxy.ts`, `src/app/api/entrar/route.ts`, `src/app/api/sair/route.ts`
- Test: `tests/unit/sessao.test.ts`, `tests/unit/proxy.test.ts`, `tests/unit/entrar.test.ts`

**Interfaces:**
- Produces:
  - `COOKIE_SESSAO = 'sessao'`, `VALIDADE_SEG = 60 * 60 * 24 * 30`
  - `criarToken(secret: string, agora?: Date): Promise<string>` (HS256, `exp` = agora + 30 dias)
  - `tokenValido(token: string | undefined, secret: string): Promise<boolean>`
  - `senhaConfere(digitada: string, correta: string): boolean` (`timingSafeEqual` sobre hashes SHA-256 para igualar tamanhos)
  - `proxy(req: NextRequest): Promise<NextResponse>` + `config.matcher` que exclui `_next/static`, `_next/image`, `icon.png`, `apple-icon.png`, `manifest.webmanifest`, `marca/`.
  - Rotas públicas: `/entrar`, `/privacidade`, `/termos`, `/api/entrar`. Sem sessão: `/api/*` → `401 {erro:'Sessão expirada'}`; páginas → redirect `/entrar`.
  - `POST /api/entrar` body `{ senha: string }` → `200` + `Set-Cookie` (`httpOnly`, `secure`, `sameSite=lax`, `path=/`, `maxAge=VALIDADE_SEG`) ou `401 {erro:'Senha incorreta'}`. `POST /api/sair` → apaga cookie, `200`.

- [ ] **Step 1: Testes que falham:** token criado é válido; token com outro secret é inválido; token com `agora` 31 dias atrás é inválido; `undefined` inválido. `senhaConfere('abc','abc')` true, `('abc','abd')` e `('','abc')` false. Proxy: `/` sem cookie → 307 para `/entrar`; `/api/pedidos` sem cookie → 401; `/privacidade` sem cookie → passa; `/` com token válido → passa. `POST /api/entrar` com senha certa → 200 e cookie `sessao` com `HttpOnly`; errada → 401 `'Senha incorreta'`.
- [ ] **Step 2:** `$DC pnpm test:unit -- sessao proxy entrar` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** → PASS. Commit `feat: acesso por senha única com cookie de sessão`.

### Task 5: API de pedidos, sabores e config

**Files:**
- Create: `src/app/api/pedidos/route.ts`, `src/app/api/pedidos/[id]/[acao]/route.ts`, `src/app/api/sabores/route.ts`, `src/app/api/sabores/[id]/route.ts`, `src/app/api/config/route.ts`, `src/app/api/responder.ts`
- Test: `tests/db/api.test.ts`

**Interfaces:**
- Consumes: repositórios da Task 3 (`getDb()` com `DATABASE_URL`; nos testes setar `process.env.DATABASE_URL = process.env.DATABASE_URL_TEST`).
- Produces:
  - `responder.ts`: `json(dados, status=200)`, `erro(mensagem: string, status: number)`, `tratarErro(e: unknown): Response` (ZodError → 400 com a primeira mensagem; `ErroValidacao` → 400; resto → 500 `'Erro inesperado'`).
  - `GET /api/pedidos` → `PainelResposta` (agora = `new Date()`), header `Cache-Control: no-store`.
  - `POST /api/pedidos` body `NovoPedido` → `201` se criado, `200` se já existia; corpo `Pedido`.
  - `POST /api/pedidos/[id]/[acao]` com `acao ∈ {pronto, entregue, cancelar}` (outra → 404) → `200 Pedido`, `409 {erro:'Pedido já foi atualizado em outro aparelho'}`, `404 {erro:'Pedido não encontrado'}`.
  - `GET /api/sabores?todos=1` (inativos incluídos só com `todos=1`), `POST {nome}` → 201, `PATCH /api/sabores/[id] {nome?, ativo?, ordem?}` → 200 / 404.
  - `GET /api/config` → `{tempoMaxMin}`, `PUT {tempoMaxMin}` → 200 / 400.
  - Todas com `export const dynamic = 'force-dynamic'`.

- [ ] **Step 1: Testes que falham**, chamando os handlers exportados com `new Request(...)` e `params: Promise.resolve({...})`: POST pedido → 201; mesmo POST de novo → 200 e GET mostra 1 ativo; body com `itens: []` → 400 com mensagem do schema; `pronto` → 200; `pronto` de novo → 409; ação `voar` → 404; id inexistente → 404; GET reflete contadores; sabores POST/PATCH; config PUT 0 → 400.
- [ ] **Step 2:** `$DC pnpm test:db -- api` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** → PASS. Commit `feat: rotas da API de pedidos, sabores e configuração`.

### Task 6: Identidade visual, ícones e layout

**Files:**
- Create: `scripts/preparar-icones.ts`, `public/marca/{espeto,churrasqueira,chama}.png`, `public/marca/logo-branco.png`, `public/marca/logo-escuro.png`, `src/app/icon.png`, `src/app/apple-icon.png`, `public/marca/icone-192.png`, `public/marca/icone-512.png`, `src/app/manifest.ts`, `src/app/globals.css`, `src/components/IconeMarca.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/unit/marca.test.ts`

**Interfaces:**
- Produces:
  - `<IconeMarca nome="espeto" | "churrasqueira" | "chama" tamanho?={number} />`: `span` com `mask-image: url(/marca/<nome>.png)`, `background-color: currentColor`, `aria-hidden`.
  - Tokens CSS da spec seção 4 em `:root`, fontes `--font-titulo` (Anton), `--font-rotulo` (Oswald), `--font-texto` (Lato) via `next/font/google`.
  - `manifest.ts`: `name: 'Pedidos Brasamiga'`, `short_name: 'Pedidos'`, `display: 'standalone'`, `background_color: '#F3EBDF'`, `theme_color: '#1C1512'`, ícones 192/512.
  - `layout.tsx`: `lang="pt-BR"`, `title: 'Pedidos | Brasamiga'`, `description: 'Controle de pedidos do carrinho de espetinho Brasamiga'`.
- Algoritmo do script (sharp), por não ser óbvio:
  - Espeto/churrasqueira/chama (`DESTAQUES-02/03/05`): ler pixels brutos, alfa = luminância normalizada pelo quanto o pixel se afasta da cor brasa (branco → 255, brasa → 0), RGB = branco; `trim()`; redimensionar para 128 px de lado maior; PNG.
  - Ícone do app (`DESTAQUES-01`): recorte quadrado centrado no boi (`trim` sobre a máscara do desenho, depois `extend` com 18% de margem na cor `#A93226`), saídas 32 (`icon.png`), 180 (`apple-icon.png`), 192 e 512.
  - `logo-branco.png` a partir de `conteudo/logo/LOGO-03.png` (mesma técnica: branco sobre preto → alfa), largura 320; `logo-escuro.png` a partir de `TAG-PARA-FOTOS-PNG-SEM-FUNDO-01.png` com `trim`, largura 480.

- [ ] **Step 1: Teste que falha** (`marca.test.ts`, ambiente node via `// @vitest-environment node`): para cada arquivo gerado, existe, é PNG com canal alfa (exceto ícones do app), lado maior esperado (128, 32, 180, 192, 512, 320, 480); `chama.png` tem pixel do canto com alfa 0.
- [ ] **Step 2:** `$DC pnpm test:unit -- marca` → FAIL.
- [ ] **Step 3:** Implementar o script; `$DC pnpm marca` (`tsx scripts/preparar-icones.ts`); conferir visualmente os PNGs gerados (abrir as imagens).
- [ ] **Step 4:** → PASS. `globals.css`, `layout.tsx`, `manifest.ts`, `IconeMarca`. `$DC pnpm build` → OK. Commit `feat: identidade visual Brasamiga, ícones e manifest`.

### Task 7: Painel (contadores, colunas, cartões, finalizados)

**Files:**
- Create: `src/lib/relogio.ts`, `src/lib/api.ts`, `src/hooks/usePainel.ts`, `src/components/Painel.tsx`, `Topo.tsx`, `Contadores.tsx`, `CartaoPedido.tsx`, `Finalizados.tsx`, `FaixaConexao.tsx`, `Painel.module.css` (e um `.module.css` por componente quando preciso)
- Modify: `src/app/page.tsx`
- Test: `tests/unit/relogio.test.ts`, `tests/unit/api.test.ts`, `tests/unit/CartaoPedido.test.tsx`, `tests/unit/Contadores.test.tsx`

**Interfaces:**
- Consumes: tipos e regras (Task 2), rotas (Task 5), `IconeMarca` (Task 6).
- Produces:
  - `criarRelogio(servidorAgoraISO: string, localNoRecebimento: number): (localAgora?: number) => Date` → `servidor + (localAgora - localNoRecebimento)`.
  - `class SessaoExpirada extends Error`; `buscarPainel(): Promise<PainelResposta>`, `enviarPedido(p: NovoPedido): Promise<Pedido>`, `executarAcao(id: string, acao: Acao): Promise<'ok' | 'conflito'>`; qualquer 401 → lança `SessaoExpirada`.
  - `usePainel(): { dados: PainelResposta | null; agora: Date; semConexao: boolean; recarregar: () => Promise<void> }`: busca na montagem e a cada 3000 ms; pausa com `document.visibilityState === 'hidden'` e busca ao voltar; `agora` atualizado a cada 1000 ms por `criarRelogio`; erro de rede → `semConexao=true` mantendo `dados`; `SessaoExpirada` → `window.location.assign('/entrar')`.
  - `<CartaoPedido pedido agora tempoMaxMin onAcao={(acao: Acao) => Promise<void>} />`
  - `<Contadores contadores atrasadosPreparacao atrasadosEspera />`
- Layout: < 768 px abas `Preparação | Espera | Finalizados`; ≥ 768 px colunas Preparação e Espera lado a lado e Finalizados abaixo. Topo madeira com `logo-branco.png`, título "PEDIDOS", contadores (Oswald, cobre), botões Novo pedido (`IconeMarca espeto`) e Configurações (`Settings`). Coluna Preparação com `IconeMarca churrasqueira`. Estado vazio "Nenhum pedido em preparação" / "Nenhum pedido em espera" com o espeto.
- Cartão: cliente em Oswald caixa alta, `resumoItens`, "Total: N", cronômetro `formatarCronometro`; botões conforme status (Pronto = madeira, Entregue = `--ok`, Cancelar = contorno). Cancelar troca a área de ações por "Cancelar pedido de JOÃO?" com Sim / Não. Atrasado: classe `atrasado` (fundo `--brasa`, texto `--papel`, borda 3 px), `IconeMarca chama` + "ATRASADO X MIN", `role="alert"` só ao entrar no estado; `transition: background-color 200ms` desligada com `prefers-reduced-motion`.
- `Finalizados`: entregues e cancelados de hoje com cliente, resumo, status e tempo total (`formatarCronometro(finalizadoEm - criadoEm)`), sem ações.
- Depois de qualquer ação, `recarregar()` imediato; `conflito` só recarrega.

- [ ] **Step 1: Testes que falham:**
  - `relogio`: servidor `20:00:00Z` recebido em local `1000`, chamado com `61000` → `20:01:00Z` (**Review Focus 2**: independe do `Date.now()` do aparelho).
  - `api`: `fetch` mockado devolvendo 401 → `buscarPainel()` rejeita com `SessaoExpirada` (**Review Focus 5**); 409 em `executarAcao` → `'conflito'`; erro de rede → rejeita com `TypeError` (não `SessaoExpirada`).
  - `CartaoPedido`: pedido em preparação criado há 10 min com máximo 15 → mostra `'10:00'`, botões "Pronto" e "Cancelar", sem "ATRASADO"; criado há 19 min 59 s → texto `'ATRASADO 4 MIN'` e classe `atrasado`; status espera → botão "Entregue", sem "Pronto"; clicar Cancelar mostra `'Cancelar pedido de JOÃO?'` e `onAcao` só é chamado com `'cancelar'` após "Sim"; "Não" volta aos botões sem chamar.
  - `Contadores`: renderiza os quatro números; com `atrasadosPreparacao=1` o contador de Preparação tem a marca de alerta.
- [ ] **Step 2:** `$DC pnpm test:unit` → FAIL.
- [ ] **Step 3:** Implementar componentes, hook e página.
- [ ] **Step 4:** `$DC pnpm test:unit` → PASS; `$DC pnpm build` → OK.
- [ ] **Step 5:** Commit `feat: painel de pedidos com cronômetro e alerta de atraso`.

### Task 8: Novo pedido

**Files:**
- Create: `src/components/FormNovoPedido.tsx`, `src/components/SeletorQuantidade.tsx` (+ CSS)
- Modify: `src/components/Painel.tsx` (abrir/fechar o painel)
- Test: `tests/unit/FormNovoPedido.test.tsx`

**Interfaces:**
- Consumes: `Sabor`, `novoPedidoSchema`, `totalEspetinhos`, `enviarPedido` (Tasks 2 e 7); sabores ativos vêm de `GET /api/sabores`.
- Produces: `<FormNovoPedido sabores: Sabor[] enviar={(p: NovoPedido) => Promise<unknown>} onConcluido={() => void} onFechar={() => void} />`; `<SeletorQuantidade valor min=1 max=50 onChange rotulo />` com botões `−`/`+` (`Minus`/`Plus` do lucide) e `aria-label` "Diminuir {rotulo}" / "Aumentar {rotulo}".
- Comportamento: `id = crypto.randomUUID()` criado ao abrir e mantido em reenvios; checkbox marcado inicia quantidade 1; desmarcar remove o item; "Anotar" desabilitado sem nome (após trim) ou sem item, e **enquanto envia**; sucesso → `onConcluido()` e formulário limpo com novo `id`; falha de rede → mensagem "Não foi possível anotar. Verifique a conexão." e botão "Tentar de novo" que reenvia o **mesmo** `id`. Folha inferior em < 768 px, painel lateral em ≥ 768 px; foco vai para o campo de nome ao abrir; Esc fecha. Checkbox e botões com área de toque mínima de 44 px.

- [ ] **Step 1: Testes que falham:** "Anotar" desabilitado ao abrir; digitar "João" e marcar Carne → seletor aparece com 1 e "Total: 1 espetinho"; "Aumentar Carne" duas vezes e marcar Frango → "Total: 4 espetinhos"; "Diminuir" em 1 fica em 1; "Aumentar" em 50 fica em 50; enviar chama `enviar` com `{id, cliente:'João', itens:[{saborId:1,quantidade:3},{saborId:2,quantidade:1}]}`; **toque duplo (Review Focus 1):** com `enviar` pendente, dois cliques em "Anotar" → `enviar` chamado 1 vez; `enviar` rejeitando → mensagem de erro e "Tentar de novo" chama `enviar` com o mesmo `id`.
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: anotar pedido com sabores e quantidades`.

### Task 9: Entrar, Configurações, Privacidade e Termos

**Files:**
- Create: `src/app/entrar/page.tsx`, `src/components/FormEntrar.tsx`, `src/app/configuracoes/page.tsx`, `src/components/EditorSabores.tsx`, `src/components/EditorTempo.tsx`, `src/components/Rodape.tsx`, `src/app/privacidade/page.tsx`, `src/app/termos/page.tsx`
- Test: `tests/unit/EditorSabores.test.tsx`, `tests/unit/FormEntrar.test.tsx`

**Interfaces:**
- Consumes: rotas `/api/entrar`, `/api/sair`, `/api/sabores`, `/api/config`.
- Produces: `<EditorSabores inicial: Sabor[] api={{ criar(nome), editar(id, campos) }} />`, `<EditorTempo inicial: number salvar={(n) => Promise<void>} />`, `<FormEntrar entrar={(senha) => Promise<boolean>} />`, `<Rodape />` com links "Privacidade" e "Termos".
- Entrar: `logo-escuro.png` sobre papel, título "Pedidos do carrinho Brasamiga", campo senha, botão "Entrar"; falha → "Senha incorreta"; sucesso → `/`. Rodapé.
- Configurações: lista de sabores (ativos e inativos, inativos esmaecidos) com renomear inline, Desativar/Reativar, setas `ChevronUp`/`ChevronDown` que trocam `ordem` com o vizinho; campo "Novo sabor" + Adicionar; tempo máximo (número 1..120, "Salvar"); botão "Sair deste aparelho" (`LogOut`); link "Voltar ao painel"; rodapé.
- Privacidade/Termos: texto curto e verdadeiro: o app guarda nome do cliente e itens do pedido para controle interno do carrinho, sem compartilhamento; cookie único de sessão; contato pelo WhatsApp do cardápio (11 99343-3998). Sem travessões.

- [ ] **Step 1: Testes que falham:** `EditorSabores`: clicar seta para baixo no 1º sabor chama `editar` com as ordens trocadas (1↔2); "Desativar" chama `editar(id,{ativo:false})`; adicionar nome vazio não chama `criar`. `FormEntrar`: `entrar` resolvendo `false` → "Senha incorreta".
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. **Step 4:** → PASS; `$DC pnpm build` → OK.
- [ ] **Step 5:** Commit `feat: telas de entrada, configurações e páginas legais`.

### Task 10: Ponta a ponta, CI e publicação

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/fluxo.spec.ts`, `.github/workflows/ci.yml`
- Modify: `compose.yaml` (serviço `e2e` com `mcr.microsoft.com/playwright:v1.65.1-noble`), `README.md`

**Interfaces:**
- Consumes: app completo. `webServer`: `pnpm build && pnpm start -p 3000` com `DATABASE_URL` = banco de teste migrado (`pnpm db:migrate` antes).

- [ ] **Step 1: Teste e2e** `fluxo.spec.ts`:
  - acesso sem sessão vai para `/entrar`; senha `dev` entra;
  - anotar "Maria" com Carne×2 e Coração×1 → cartão em Preparação, contador Preparação = 1;
  - "Pronto" → cartão em Espera; "Entregue" → contador Entregue = 1, aparece em Finalizados;
  - atraso: em Configurações salvar tempo máximo 1; anotar "Ana"; `page.clock.install()` antes de abrir o painel e `page.clock.fastForward('02:00')` → cartão mostra "ATRASADO 1 MIN";
  - cancelar "Ana" com confirmação → contador Cancelado = 1.
- [ ] **Step 2:** `docker compose run --rm e2e` → PASS (ajustar até passar; falha aqui é bug de app, não de teste, até prova em contrário).
- [ ] **Step 3:** `ci.yml`: em push/PR; job com service `postgres:19.0-alpine3.24`; `pnpm/action-setup@v6.1.1`, `actions/setup-node@v7.1.0` (node 26.13.1, cache pnpm), `pnpm install --frozen-lockfile`, lint, typecheck, `test:unit`, `db:migrate` + `test:db`, `npx playwright install --with-deps chromium`, `test:e2e`.
- [ ] **Step 4:** README: passo a passo de publicação (seção 12 da spec): repositório no GitHub; projeto na Vercel; Neon pelo Marketplace; variáveis `APP_SENHA` e `SESSION_SECRET` (gerar com `openssl rand -base64 48`); Build Command `pnpm db:migrate && pnpm build`; domínio próprio; trocar senha = mudar `APP_SENHA`; como editar sabores. Sem travessões.
- [ ] **Step 5:** Verificação final: `$DC pnpm lint && $DC pnpm typecheck && $DC pnpm test:unit && $DC pnpm test:db && docker compose run --rm e2e` → tudo verde. Abrir o app em `localhost:3000` em largura 390 px e 1024 px e conferir visualmente topo, cartões, alerta e novo pedido.
- [ ] **Step 6:** Commit `test: fluxo ponta a ponta, CI e guia de publicação`.
