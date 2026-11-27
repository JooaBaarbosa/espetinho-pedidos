# Pedidos do carrinho de espetinho: design

Data: 2026-11-24
Status: aprovado em conversa (partes 1 e 2); aguardando revisão desta especificação escrita.

## 1. Objetivo

App web simples para controlar a saída de pedidos do carrinho de espetinho do dono.
Mostra quantos pedidos estão em **Preparação**, **Espera**, **Entregue** e **Cancelado**,
com nome do cliente, itens, quantidade e tempo de espera, e um **alerta visual** quando
um pedido passa do tempo máximo de espera.

Sucesso: no carrinho, com um celular anotando e um tablet na churrasqueira, os dois veem
os mesmos pedidos em poucos segundos, anotar um pedido leva menos de 15 segundos e um
pedido atrasado é impossível de não notar.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Uso | Vários aparelhos ao mesmo tempo, com internet |
| Hospedagem | Vercel (projeto Next.js) + Neon Postgres pelo Marketplace da Vercel |
| Stack | Next.js (App Router) + TypeScript, full stack (UI + API no mesmo projeto) |
| Pedido | Nome do cliente + vários itens (sabor + quantidade) |
| Anotação | Lista de sabores com checkbox; cada sabor marcado ganha seletor de quantidade (− 1 +) |
| Fluxo | Preparação → Espera (pronto, aguardando o cliente) → Entregue; Cancelar antes da entrega |
| Tempo de espera | Conta desde a anotação; para na entrega ou no cancelamento |
| Alerta | Pedido em Preparação ou Espera com tempo > tempo máximo configurado (padrão 15 min) |
| Acesso | Senha única do carrinho; cookie lembrado por 30 dias em cada aparelho |
| Sincronização | Consulta a cada 3 s, pausada com a aba em segundo plano |
| Identidade visual | A do projeto Brasamiga (cores, fontes, logo) |
| Cardápio | Arquivo do dono em `conteudo/cardapio/` vira a lista inicial de sabores |

### Versões (estáveis, verificadas no registry em 2026-11-24)

| Tecnologia | Versão |
|---|---|
| Node.js (LTS) | 26.13.1 |
| pnpm | 12.23.0 |
| next | 16.4.6 |
| react / react-dom | 19.3.1 |
| typescript | 7.0.2 |
| drizzle-orm / drizzle-kit | 0.45.4 / 0.31.11 |
| pg (node-postgres) | 8.23.1 |
| zod | 4.6.7 |
| jose | 6.2.18 |
| lucide-react | 1.79.0 |
| vitest | 5.1.1 |
| @playwright/test | 1.65.1 |
| eslint | 10.15.0 |
| Imagem Postgres (dev/teste) | `postgres:19.0-alpine3.24` |

Versões exatas no `package.json` e lockfile commitado. Se o TypeScript 7 não for compatível
com o Next 16.4.6 no typecheck, o plano registra o problema e usa a última versão 6.x estável,
com o motivo anotado no README.

## 3. Telas

Mobile first. A partir de 768 px (tablet), Preparação e Espera aparecem lado a lado.
No celular, elas viram abas.

### 3.1 Topo fixo

- Logo Brasamiga (LOGO-03) pequeno sobre fundo madeira + título "PEDIDOS".
- Quatro contadores: Preparação, Espera, Entregue, Cancelado.
  - Preparação e Espera: pedidos ativos agora (de qualquer dia).
  - Entregue e Cancelado: pedidos finalizados **hoje** (fuso `America/Sao_Paulo`).
- Se houver pedido atrasado, o contador da coluna dele ganha borda e ícone de alerta.
- Botão "Novo pedido" (ícone `Plus`) e acesso a Configurações (ícone `Settings`).

### 3.2 Painel (Preparação e Espera)

Cartões ordenados do mais antigo para o mais novo. Cada cartão mostra:

- nome do cliente (Oswald, caixa alta);
- itens, por exemplo "2 Carne · 1 Frango", e o total de espetinhos;
- cronômetro `mm:ss` desde a anotação (acima de 60 min, `h:mm:ss`);
- ações:
  - Preparação: **Pronto** (vai para Espera) e **Cancelar**;
  - Espera: **Entregue** e **Cancelar**.
- "Cancelar" pede confirmação dentro do próprio cartão ("Cancelar pedido de JOÃO?" Sim / Não),
  sem `alert`/`confirm` do navegador.

### 3.3 Alerta de atraso

Quando o tempo do pedido passa do tempo máximo:

- o cartão inteiro fica com fundo brasa (`#A93226`) e texto papel, borda grossa;
- ícone `AlertTriangle` + texto "ATRASADO X MIN";
- uma única transição de cor (200 ms) ao entrar no estado; nada pisca;
- com `prefers-reduced-motion: reduce`, nenhuma transição.

Para o alerta ser inconfundível, o fundo brasa cheio é reservado **só** para atraso.
Botões principais usam madeira; a brasa aparece no restante só como filete e detalhe.

### 3.4 Novo pedido

Painel que abre sobre a tela (folha inferior no celular, lateral no tablet):

- campo "Nome do cliente" (obrigatório, 1 a 40 caracteres);
- lista dos sabores ativos, cada um com checkbox grande (área de toque ≥ 44 px);
- ao marcar um sabor, aparece o seletor de quantidade − 1 + (1 a 50); desmarcar zera;
- resumo "Total: N espetinhos";
- botão **Anotar** (desabilitado sem nome ou sem item). O pedido entra em Preparação.

### 3.5 Finalizados

Aba com os entregues e cancelados de hoje, do mais recente para o mais antigo, mostrando
o tempo total (anotação até a entrega ou o cancelamento). Sem ações nesta versão.

### 3.6 Configurações

- Sabores: adicionar, renomear, desativar ou reativar e mudar a ordem (setas acima/abaixo).
  Sabor nunca é apagado, para não quebrar pedidos antigos.
- Tempo máximo de espera em minutos (1 a 120, padrão 15).
- Botão "Sair deste aparelho".

### 3.7 Entrar

Tela com o logo, campo de senha e botão "Entrar". Senha errada mostra "Senha incorreta".

### 3.8 Páginas obrigatórias

`/privacidade` e `/termos` linkadas no rodapé da tela de entrada e das Configurações.
O app guarda só nome de cliente e itens; sem cookies de rastreamento.

## 4. Identidade visual (Brasamiga)

Tokens copiados de `brasamiga/app/static/css/site.css`:

| Token | Valor | Uso aqui |
|---|---|---|
| `--madeira` | `#1C1512` | Topo, botões principais, texto em botões claros |
| `--papel` | `#F3EBDF` | Fundo da página |
| `--papel-escuro` | `#EADFCE` | Fundo dos cartões em Espera, áreas de destaque leves |
| `--linha` | `#DCCDB9` | Bordas |
| `--brasa` | `#A93226` | Filete sob títulos; fundo cheio só no alerta de atraso |
| `--cobre` | `#B8966A` | Rótulos sobre o escuro, contadores no topo |
| `--tinta` | `#1E1A17` | Texto |
| `--suave` | `#5C524B` | Texto auxiliar |
| `--ok` | `#56703D` | Botão "Entregue" e confirmação |
| `--raio` | `0.75rem` | Cantos (nunca botão pílula) |

Tipografia via `next/font/google`: **Anton** (títulos, caixa alta), **Oswald** (rótulos,
nomes de clientes, contadores), **Lato** (texto). Ícones: `lucide-react` (SVG), sem emojis.

Sem travessões nos textos da interface.

### 4.1 Ícones da marca (`conteudo/icons/`, enviados pelo dono)

Os `DESTAQUES-0x.png` são desenhos brancos sobre fundo brasa (2251x4000). Na implementação,
um script (`scripts/preparar-icones.ts`, com `sharp`) recorta o desenho e gera versões
otimizadas em `public/marca/`:

| Arquivo do dono | Desenho | Uso no app |
|---|---|---|
| `DESTAQUES-01.png` | Cabeça de boi | Favicon e ícones de app (`src/app/icon.png`, `apple-icon.png`, 192 e 512 px do `manifest.ts`), quadrado com fundo brasa |
| `DESTAQUES-02.png` | Espeto | Botão e painel "Novo pedido"; estado vazio "Nenhum pedido em preparação" |
| `DESTAQUES-03.png` | Churrasqueira | Cabeçalho da coluna Preparação e seu contador |
| `DESTAQUES-05.png` | Chama | Marca do alerta de atraso no cartão e no contador (no lugar do `AlertTriangle`) |
| `TAG-PARA-FOTOS-PNG-SEM-FUNDO-01.png` | Logo completo, fundo transparente, texto preto | Tela de entrada (sobre fundo papel) |
| `TAG-PARA-FOTOS-PNG-SEM-FUNDO-02.png` | Tag branca com logo | Não usado na v1 |

Espeto, churrasqueira e chama viram PNG branco com fundo transparente, aplicados como
`mask-image` para herdar a cor do contexto (`currentColor`). Os demais ícones de interface
(mais, menos, configurações, sair, setas, conexão) vêm do `lucide-react`.

O topo usa `conteudo/logo/LOGO-03.png` (logo branco) recortado sobre fundo transparente.

## 5. Dados (Postgres via Drizzle)

```
sabores        id serial PK, nome text único, ativo bool default true, ordem int
pedidos        id uuid PK (gerado no aparelho), cliente text,
               status enum('preparacao','espera','entregue','cancelado'),
               criado_em timestamptz default now(), pronto_em timestamptz null,
               finalizado_em timestamptz null
itens_pedido   id serial PK, pedido_id uuid FK → pedidos, sabor_id int FK → sabores,
               nome_sabor text (cópia do nome no momento do pedido), quantidade int 1..50
config         id int PK = 1, tempo_max_min int default 15
```

Índice em `pedidos(status, criado_em)`. A migração inicial cria a linha de `config` e os
sabores iniciais transcritos de `conteudo/cardapio/CARDAPIO-01.png`, nesta ordem:

1. Carne
2. Frango
3. Linguiça apimentada
4. Misto
5. Kafta sem queijo
6. Kafta com queijo
7. Coração
8. Medalhão de carne
9. Medalhão de frango
10. Queijo coalho

"Medalhão (carne/frango)" vira dois sabores para a churrasqueira saber qual preparar.
Os preços do cardápio não entram na v1 (ver seção 13).

## 6. Regras de negócio (módulo puro `src/lib/regras.ts`)

- Transições permitidas: `preparacao → espera`, `espera → entregue`,
  `preparacao → cancelado`, `espera → cancelado`. Qualquer outra é inválida.
- `minutosDecorridos(criadoEm, agora)` e `estaAtrasado(pedido, agora, tempoMaxMin)`:
  atrasado só em `preparacao`/`espera` e quando decorrido > tempo máximo.
- `contadores(pedidos, agora)`: ativos por status + finalizados no dia de São Paulo.
- `validarNovoPedido`: nome com trim 1..40, ≥ 1 item, quantidades 1..50, sem sabor repetido,
  sabores existentes e ativos.

## 7. API (Route Handlers em `app/api/`)

Todas exigem sessão, menos `POST /api/entrar`. Entradas validadas com Zod.

| Método e rota | Faz |
|---|---|
| `POST /api/entrar` | Confere a senha; grava cookie de sessão |
| `POST /api/sair` | Apaga o cookie |
| `GET /api/pedidos` | Ativos + finalizados de hoje + contadores + `agora` (hora do servidor) + `tempoMaxMin` |
| `POST /api/pedidos` | Cria pedido com `id` gerado no aparelho; repetir o mesmo `id` não duplica |
| `POST /api/pedidos/[id]/pronto` | `preparacao → espera` |
| `POST /api/pedidos/[id]/entregue` | `espera → entregue` |
| `POST /api/pedidos/[id]/cancelar` | `preparacao/espera → cancelado` |
| `GET /api/sabores`, `POST`, `PATCH /api/sabores/[id]` | Lista, cria, edita (nome, ativo, ordem) |
| `GET /api/config`, `PUT /api/config` | Tempo máximo |

Mudança de status: `UPDATE ... WHERE id = $1 AND status = $esperado RETURNING *`.
Sem linha atualizada → `409` (outro aparelho já mexeu); a tela só recarrega os pedidos.
Erros: `400` validação (mensagem em português), `401` sem sessão, `404` pedido inexistente.

## 8. Acesso

- Variáveis de ambiente: `APP_SENHA`, `SESSION_SECRET` (≥ 32 bytes), `DATABASE_URL`.
- Senha comparada em tempo constante. Sessão = JWT HS256 (`jose`) com validade de 30 dias,
  em cookie `httpOnly`, `secure`, `sameSite=lax`.
- `proxy.ts` (Next 16) redireciona para `/entrar` quem não tem sessão, exceto `/entrar`,
  `/privacidade`, `/termos`, ícones e arquivos estáticos. As rotas de API respondem `401`.
- Trocar a senha = mudar `APP_SENHA` na Vercel. Trocar `SESSION_SECRET` desloga todos.

## 9. Sincronização e falhas

- O cliente chama `GET /api/pedidos` a cada 3 s; pausa com `visibilitychange` oculto e
  consulta na hora ao voltar.
- O cronômetro roda localmente a cada 1 s usando `agora` do servidor mais o tempo local
  passado desde a resposta, para corrigir relógio errado do aparelho.
- Depois de cada ação o app consulta na hora, sem esperar os 3 s.
- Falha de rede: faixa discreta "Sem conexão. Tentando de novo." e o último estado continua
  na tela. Novo pedido que falhou fica no formulário com "Tentar de novo"; como o `id` é
  gerado no aparelho, reenviar não duplica.

## 10. Estrutura

```
espetinho-pedidos/
  conteudo/cardapio/      cardápio do dono (foto, PDF ou cardapio.txt)
  conteudo/logo/          logos Brasamiga
  conteudo/icons/         ícones da marca enviados pelo dono
  scripts/preparar-icones.ts  gera public/marca/ e os ícones do app a partir de conteudo/
  public/marca/           ícones e logo otimizados (gerados, commitados)
  src/app/                páginas (/, /entrar, /configuracoes, /privacidade, /termos), api/
  src/components/         Topo, Contadores, CartaoPedido, NovoPedido, Finalizados...
  src/lib/regras.ts       regras puras
  src/lib/sessao.ts       JWT e cookie
  src/db/schema.ts        Drizzle
  src/db/index.ts         conexão (pg Pool)
  drizzle/                migrações
  tests/unit/             Vitest (regras)
  tests/api/              Vitest contra Postgres em Docker
  tests/e2e/              Playwright
  docker-compose.test.yml Postgres de teste
  proxy.ts
```

## 11. Testes

- **Unitários (Vitest):** transições, atraso (limite exato: igual ao máximo ainda não atrasa),
  contadores com virada de dia em São Paulo, validação do novo pedido.
- **API (Vitest + Postgres 19 em Docker):** criar pedido, idempotência pelo `id`, fluxo
  completo, `409` em transição repetida, `401` sem sessão, senha errada, sabores e config.
- **Ponta a ponta (Playwright):** entrar, anotar pedido com dois sabores, Pronto, Entregue,
  contadores atualizados; pedido com tempo máximo de 1 min e relógio simulado mostra
  "ATRASADO". Roda na imagem Docker oficial do Playwright, porque o Smart App Control desta
  máquina pode bloquear binários nativos.
- **CI (GitHub Actions):** lint, typecheck, unitários, API (service Postgres) e e2e, com versões
  de actions fixadas e verificadas na hora de escrever o workflow.

## 12. Publicação

1. Repositório no GitHub (privado ou público, o dono decide).
2. Projeto na Vercel ligado ao repositório; Neon Postgres pelo Marketplace (preenche `DATABASE_URL`).
3. `APP_SENHA` e `SESSION_SECRET` nas variáveis de ambiente da Vercel.
4. Migrações no build: `drizzle-kit migrate && next build`.
5. Domínio próprio (ação do dono: comprar ou apontar um domínio; o subdomínio `vercel.app`
   não é o endereço final).

## 13. Fora do escopo (v1)

Preços (existem no cardápio, mas o app não calcula valor), caixa ou pagamento; editar um pedido já anotado (cancela e anota de novo);
desfazer uma entrega; relatórios de dias anteriores; som e notificação push no atraso;
impressão de comanda; vários carrinhos ou usuários com permissões diferentes.
