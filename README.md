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

## Testes ponta a ponta

```bash
docker compose up -d db
docker compose run --rm e2e      # sobe o app de produção (app-e2e) e roda o Playwright
docker compose rm -sf app-e2e    # derruba o app; na próxima rodada ele é migrado e compilado de novo
```

- O serviço `app-e2e` roda `pnpm db:migrate && pnpm build && pnpm start -p 3000` no banco `espetinho_test`. O build vai para um volume próprio montado em `/app/.next` (`next_e2e`), então não mexe no `.next` do `pnpm dev`.
- O serviço `e2e` usa a imagem `mcr.microsoft.com/playwright:v1.65.1-noble` e divide a rede do `app-e2e`: o app fica em `http://localhost:3000`, que o navegador trata como contexto seguro (igual ao https de produção).
- Com o `app-e2e` já no ar, `docker compose run --rm e2e` reaproveita o build anterior. Depois de mudar o código, derrube o `app-e2e` antes de rodar de novo.
- Cada teste reinicia o banco (`tests/e2e/apoio.ts`): apaga os pedidos e volta sabores e configuração ao seed.
- `tests/e2e/telas.spec.ts` salva capturas do painel, do novo pedido, da entrada e das configurações em 390 px e 1024 px em `test-results/screenshots/` (fora do git), com pedidos de demonstração.
- No CI (`.github/workflows/ci.yml`) não há `BASE_URL`: o próprio Playwright sobe o app com `webServer`.

## Publicação

1. **GitHub.** Crie um repositório (privado ou público) e envie o código.
2. **Vercel.** Em vercel.com, *Add New > Project*, importe o repositório. O framework é detectado como Next.js.
3. **Banco Neon.** No projeto da Vercel, aba *Storage* (Marketplace), crie um banco **Neon Postgres** e ligue ao projeto. A integração preenche `DATABASE_URL` nos ambientes.
4. **Variáveis de ambiente.** Em *Settings > Environment Variables*, crie:
   - `APP_SENHA`: a senha de acesso ao painel, combinada com quem usa o carrinho;
   - `SESSION_SECRET`: um segredo longo e aleatório (no mínimo 32 caracteres). Gere com:

     ```bash
     openssl rand -base64 48
     ```

   Não defina `COOKIE_INSEGURO` em produção: ele só existe para os testes em http.
5. **Build Command.** Em *Settings > Build and Deployment*, troque o Build Command para:

   ```bash
   pnpm db:migrate && pnpm build
   ```

   Assim as migrações (tabelas e sabores iniciais) rodam no Neon a cada deploy, antes do build.
6. **Deploy.** Faça o primeiro deploy e confira se `/entrar` abre e a senha funciona.
7. **Domínio próprio.** O endereço `*.vercel.app` não é o endereço final. Compre ou aponte um domínio em *Settings > Domains* e siga as instruções de DNS da Vercel.

### Trocar a senha

Mude `APP_SENHA` nas variáveis de ambiente da Vercel e faça um novo deploy (*Deployments > Redeploy*). Quem já está conectado continua conectado até a sessão expirar (30 dias) ou até usar "Sair deste aparelho". Para desconectar todos os aparelhos na hora, troque também o `SESSION_SECRET`.

### Editar sabores e tempo máximo

No app, toque no ícone de engrenagem (Configurações):

- **Sabores:** adicionar um sabor novo, renomear (lápis), mudar a ordem (setas) e desativar ou reativar. Sabor nunca é apagado, para não quebrar pedidos antigos; desativado, ele some do novo pedido.
- **Tempo máximo:** minutos até um pedido contar como atrasado (1 a 120, padrão 15).

## Notas de versão

- TypeScript fica em 6.0.3 (última 6.x estável) em vez de 7.0.2: o `typescript-eslint` 8.73 ainda não suporta o TS 7 e o `eslint` quebra ao carregar. Voltar ao 7 quando o `typescript-eslint` suportar.
- Node 26 não traz mais o corepack; o container o instala na hora de subir e ativa o pnpm fixado em `packageManager`.
- `vite-tsconfig-paths` foi removido: o Vite resolve os `paths` do tsconfig nativamente (`resolve.tsconfigPaths: true` no `vitest.config.ts`) e o plugin avisava que era redundante.
- `pnpm-workspace.yaml` libera os scripts de build do `esbuild` e do `sharp` e isenta `lucide-react@1.79.0` da idade mínima de release do pnpm (foi publicada há menos de 1 dia).
