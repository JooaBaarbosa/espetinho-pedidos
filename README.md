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
3. **Banco Neon.** No projeto da Vercel, aba *Storage* (Marketplace), crie um banco **Neon Postgres** e ligue ao projeto. A integração preenche duas variáveis:
   - `DATABASE_URL`: conexão pelo pooler do Neon, usada pelo app;
   - `DATABASE_URL_UNPOOLED`: conexão direta, usada pelas migrações (`drizzle.config.ts` prefere esta quando existe).
4. **Proteger o banco de produção nos Previews.** Cada push em outro branch gera um deploy de Preview, e o build roda as migrações. Escolha uma das opções:
   - **Recomendado:** na integração do Neon, ative a criação de um branch de banco para cada deploy de Preview. Cada Preview migra e usa a própria cópia, nunca o banco de produção;
   - ou, em *Settings > Environment Variables*, deixe `DATABASE_URL` e `DATABASE_URL_UNPOOLED` só no ambiente **Production**. Nesse caso o build de Preview falha no passo de migração, o que é o esperado: ele nunca toca o banco de produção.
5. **Variáveis de ambiente.** Em *Settings > Environment Variables*, crie:
   - `APP_SENHA`: a senha de acesso ao painel, combinada com quem usa o carrinho. Use uma senha forte (frase longa ou várias palavras aleatórias): ela é a única barreira do app na internet;
   - `SESSION_SECRET`: um segredo longo e aleatório (no mínimo 32 caracteres). Gere com:

     ```bash
     openssl rand -base64 48
     ```

   - `ENABLE_EXPERIMENTAL_COREPACK` com o valor `1`: faz a Vercel usar a versão do pnpm fixada em `packageManager` no `package.json`.

   Não defina `COOKIE_INSEGURO` em produção: ele só existe para os testes em http.
6. **Versão do Node.** O projeto fixa o Node 26.13.1 em `engines.node`. Em *Settings > Build and Deployment > Node.js Version*, escolha 26.x se estiver disponível.
7. **Migrações.** Não é preciso mexer no Build Command: o `vercel.json` já define `pnpm db:migrate && pnpm build`. As migrações (tabelas e sabores iniciais) rodam no Neon a cada deploy, antes do build.
8. **Deploy.** Faça o primeiro deploy e confira se `/entrar` abre e a senha funciona.
9. **Limite de tentativas de senha (opcional).** Em *Firewall > Rules*, crie uma regra de rate limit para o caminho `/api/entrar` (por exemplo, poucas tentativas por minuto por IP). Isso dificulta adivinhar a senha por força bruta.
10. **Domínio próprio.** O endereço `*.vercel.app` não é o endereço final. Compre ou aponte um domínio em *Settings > Domains* e siga as instruções de DNS da Vercel.

### Trocar a senha

Mude `APP_SENHA` nas variáveis de ambiente da Vercel e faça um novo deploy (*Deployments > Redeploy*). Quem já está conectado continua conectado: a sessão vale 30 dias e é renovada sozinha quando o aparelho usa o app depois de 7 dias, então ela só termina se o aparelho passar semanas sem abrir o app ou se alguém tocar em "Sair deste aparelho". Para desconectar todos os aparelhos na hora, troque também o `SESSION_SECRET`.

### Editar sabores e tempo máximo

No app, toque no ícone de engrenagem (Configurações):

- **Sabores:** adicionar um sabor novo, renomear (lápis), mudar a ordem (setas) e desativar ou reativar. Sabor nunca é apagado, para não quebrar pedidos antigos; desativado, ele some do novo pedido.
- **Tempo máximo:** minutos até um pedido contar como atrasado (1 a 120, padrão 15).

## Notas de versão

- TypeScript fica em 6.0.3 (última 6.x estável) em vez de 7.0.2: o `typescript-eslint` 8.73 ainda não suporta o TS 7 e o `eslint` quebra ao carregar. Voltar ao 7 quando o `typescript-eslint` suportar.
- Node 26 não traz mais o corepack; o container o instala na hora de subir e ativa o pnpm fixado em `packageManager`.
- `vite-tsconfig-paths` foi removido: o Vite resolve os `paths` do tsconfig nativamente (`resolve.tsconfigPaths: true` no `vitest.config.ts`) e o plugin avisava que era redundante.
- `pnpm-workspace.yaml` libera os scripts de build do `esbuild` e do `sharp`.
- `sharp` fica em `devDependencies`: só o script `marca` (`scripts/preparar-icones.ts`) o usa. A otimização de imagens do `next/image` usa o `sharp` que o próprio `next` traz como dependência opcional (e, na Vercel, o serviço de imagens da plataforma).
