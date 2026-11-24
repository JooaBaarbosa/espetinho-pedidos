# Pedidos do espetinho

App web para acompanhar os pedidos de um carrinho de espetinho: o atendente registra o pedido e a churrasqueira vê a fila. Interface em português. Next.js 16, TypeScript, Postgres.

## Como rodar

Todos os comandos `pnpm` rodam dentro do container `node` (a máquina de desenvolvimento bloqueia binários nativos no host). Abreviação: `DC="docker compose run --rm node"`.

```bash
docker compose up -d db              # Postgres na porta 5433 do host
docker compose run --rm node pnpm install
docker compose run --rm --service-ports node pnpm dev -H 0.0.0.0   # http://localhost:3000
```

As variáveis de desenvolvimento já estão no `compose.yaml`; `.env.example` mostra os valores para rodar fora do container.

## Scripts

| Script | O que faz |
| --- | --- |
| `dev`, `build` | servidor de desenvolvimento e build de produção |
| `lint`, `typecheck` | ESLint e `tsc --noEmit` |
| `test:unit` | Vitest, projeto `unit` (jsdom) |
| `test:db` | Vitest, projeto `db` (Postgres, banco `espetinho_test`) |
| `test:e2e` | Playwright |
| `db:generate`, `db:migrate` | Drizzle Kit |
| `marca` | prepara os ícones da marca |

## Notas de versão

- TypeScript fica em 6.0.3 (última 6.x estável) em vez de 7.0.2: o `typescript-eslint` 8.73 ainda não suporta o TS 7 e o `eslint` quebra ao carregar. Voltar ao 7 quando o `typescript-eslint` suportar.
- Node 26 não traz mais o corepack; o container o instala na hora de subir e ativa o pnpm fixado em `packageManager`.
- `pnpm-workspace.yaml` libera os scripts de build do `esbuild` e do `sharp` e isenta `lucide-react@1.79.0` da idade mínima de release do pnpm (foi publicada há menos de 1 dia).
