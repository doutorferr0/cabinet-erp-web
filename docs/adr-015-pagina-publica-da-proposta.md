# ADR-015 — Fase C do moodboard: quem serve a página pública por token

- **Status:** PROPOSTO — decisão é do user (nível 3). Nada implementado.
- **Data:** 2026-08-26
- **Numeração:** ADR-014 (`cabinet-erp-api/docs/adr-014-impressao-e-pdf.md`) é a última
  escrita; `project-core` @decisoes chega em ADR-013. `015` é o próximo livre, o hub
  confirma no merge.
- **Origem:** `docs/design/moodboard/espec-moodboard.md`, fase C —
  *"**DECISÃO ABERTA (user):** quem serve a página pública (api ou front)."*
- **A espec ainda não está na `main`:** ela vive na PR **#376** (branch `docs/moodboard-espec`).
  Até o merge, lê-se com `git fetch origin docs/moodboard-espec && git show FETCH_HEAD:<caminho>`
  — `grep` no working tree não a acha. A fase A é a issue **#377**.
- **Não decide:** fase B (onde moram os bytes da foto — outra decisão aberta) nem fase D
  (PPTX, que a espec já fixou no front).

---

## 1. O que foi medido, não suposto

| Fato | Onde | Valor |
|---|---|---|
| Publicação do front | memória, PR web#323 (`wrangler pages project list`) | **dois** projetos Pages da MESMA `main`: `cabinet-erp-web` → `cabinetonline.cc` (demo, 100% mock) e `cabinet-erp-app` → `app.cabinetonline.cc` (`VITE_API_URL=https://api.cabinetonline.cc`) |
| Publicação da api | `cabinet-erp-api/deploy/README.md` | `api.cabinetonline.cc` → Cloudflare Tunnel (saída-apenas) → VPS **único**, Docker Compose, Postgres na mesma máquina, nenhuma porta pública além de SSH |
| Fallback de rota do front | `public/_redirects` | `/*  /index.html  200` — **qualquer caminho novo já é servido**, sem tocar em infra |
| Cabeçalhos de segurança do front | `public/` | **nenhum** — só `_redirects`. Sem `_headers`, sem CSP, sem `Referrer-Policy` |
| Peso do shell do SPA | `dist/assets` do build local | entry `393K` → **124K gzip** · CSS `151K` → **26K gzip**. ~150K gzip antes do chunk da rota e das fontes |
| Origem das rotas da api | `src/core/http/servidor.ts` | **todas** vêm do `fastify-openapi-glue` a partir de `contracts/openapi-v1.json`. Rota fora do contrato não existe; operação sem handler responde **501** |
| Tipos de resposta no contrato | `contracts/openapi-v1.json`, 145 caminhos | `application/json` · `application/problem+json` · `application/pdf`. **Zero `text/html`** |
| Operações sem sessão | mesmo arquivo + `src/data/security-do-contrato.test.ts` | **7**, lista fechada e testada: `Health`, `HealthDb`, `AuthLogin`, `AuthLogout`, `AuthForgotPassword`, `AuthCredentialToken`, `AuthSetPassword` |
| Precedente de token opaco | descrição de `AuthCredentialToken` no contrato | existe, e **decidiu o contrário do link**: é `POST` de propósito, *"em GET ele viajaria na URL e ficaria no log de acesso do servidor, no histórico do navegador e no `Referer`"* |
| Como o tenant é estabelecido | `src/core/http/borda.ts` (`preHandler`) | `session.activeTenantId` → `BEGIN` + `declararEmpresa` (GUC `app.current_tenant`) → `poderNoVinculo`. **Sem sessão não há tenant, e sem tenant o RLS não recorta nada** |
| Cookie de sessão | `servidor.ts` | `cabinet_sessao`, opaco, `httpOnly`, `sameSite: 'lax'`, `secure` em produção, `path: '/'`, 12h |
| CORS | `ORIGENS_PERMITIDAS` | lista fechada de 4, `credentials: true`. `app.` e `api.` são **same-site** (mesmo rótulo registrável) — o comentário do arquivo diz isso em voz alta |
| Rate limit / helmet / static na api | `git grep` em `origin/main` | **zero dos três**. Deps: `@fastify/cookie`, `@fastify/cors`, `@fastify/session`, `argon2`, `drizzle-orm`, `fastify`, `fastify-openapi-glue`, `fastify-plugin`, `pg`, `playwright-core` |
| Rastro | `migrations/0001_fundacao.sql` | `audit_log(tenant_id NOT NULL, employee_id **nullable**, table_name, row_id, action, payload)`, `GRANT SELECT, INSERT` e mais nada — **append-only por privilégio** |
| Rastro em `GET` | `src/modules/impressao/rotas.ts` | já existe precedente: `PrintQuote` chama `auditar(...)` explícito porque `GET` não passa pelo `onSend` de mutação |
| Permissão fina em `GET` | mesmo arquivo | `orcamento:imprimir` é conferida **no handler**, não na `MATRIZ` — porque a matriz governa escrita por família de caminho |
| Guarda de rota do front | `src/routes/__root.tsx` | allowlist de `pathname`: só `/login` e `/trocar-senha` escapam de `RequireSession`. **Fail-closed** — caminho novo nasce exigindo sessão |
| Template do moodboard | issue #377 (fase A) | está sendo escrito **na api**, HTML+CSS ao lado do template atual, consumido pelo Chromium |

**Estimado, não medido** (dívida de medição, não fato): peso das fotos da fase B por proposta ·
latência de render da página pública sob carga · quantos destinatários um link real recebe.
Nenhum desses números muda a escolha do §5.

## 2. O achado: a api serve a metade cara em qualquer opção

A espec pede três saídas do mesmo snapshot — página web, PDF paginado, PPTX. Repare em quem
serve cada uma **antes** de escolher:

- **O dado** sai do Postgres atrás do RLS. Só a api o alcança. Não há segunda opção.
- **O PDF público** — o item "PDF paginado" do menu de exportações — é o template da fase A,
  que roda no Chromium do VPS. `GET /api/quotes/{id}/print` exige sessão **e**
  `orcamento:imprimir`; um cliente com token não tem nem um nem outro. Logo a fase C precisa
  de um caminho público de PDF **servido pela api**, opção nenhuma escapa disso.
- **O PPTX** a espec já fixou no front (`pptxgenjs`, dependência só de lá).

Sobra **uma peça em disputa: o shell HTML da página**. E a pergunta que parecia decidir tudo
— "api ou front?" — decide só ela.

**Corolário que desarma o argumento mais forte a favor da api.** A ADR-014 §5 fechou com
*"no dia em que houver duas cópias do layout, esta ADR falhou"*. Seria natural concluir que
a fase C tem de nascer na api para não abrir a segunda cópia. Não tem: a segunda cópia já
existe **por meio, não por escolha**. A folha da fase A é papel paginado (`@page`, quebra por
altura, cabeçalho em margem de página, sem interação); a página compartilhável é responsiva,
tem toggle de valores, menu de exportações e um botão que grava aceite. São o mesmo conteúdo
em dois meios, não o mesmo artefato — e a fase D obriga o front a saber compor o moodboard de
qualquer jeito, para montar o PPTX. A regra da ADR-014 continua valendo onde ela foi escrita:
**um único template de PAPEL**, na api, servindo impressão interna e PDF público.

Com isso fora do caminho, o que resta a decidir é o que a §7 trata: **de qual origem estranhos
entram, e onde o token repousa.**

## 3. A pergunta que a ADR responde

> **Quem serve o HTML que o cliente abre — a Cloudflare Pages do front ou o Fastify do VPS —
> e qual origem passa a receber tráfego de quem nunca fez login?**

Ela importa porque três regras deste projeto cortam o espaço de solução, e nenhuma é opinião:

1. **Rota que não está no contrato não existe** (`CLAUDE.md`, REGRA DA FASE). Qualquer coisa
   servida pela api começa com PR de contrato neste repo — e o contrato só conhece JSON,
   `problem+json` e PDF.
2. **Operação nova nasce exigindo sessão** e a exceção se declara em
   `src/data/security-do-contrato.test.ts`, com justificativa. As 7 públicas de hoje são
   prova de vida e o fluxo de credencial. A fase C acrescenta as primeiras públicas **de
   domínio** — as primeiras que devolvem dado de uma empresa a quem não tem vínculo.
3. **A borda estabelece tenant a partir da sessão.** `session.activeTenantId` →
   `declararEmpresa` → GUC do RLS. Uma rota pública não tem sessão, logo o **token tem de
   ser a segunda fonte de tenant**, e a borda ganha um caminho que hoje não existe. Esse
   custo é idêntico nas três opções — não é critério de escolha, é pré-requisito (§6.1).

## 4. As opções

Nas três, a api serve o dado e o PDF público. O que muda é quem entrega o HTML.

### A — O front serve a página; a api entrega JSON por token

Rota `/p/$token` no TanStack Router, fora de `RequireSession`, publicada por
`cabinet-erp-app` (`app.cabinetonline.cc`). Contrato ganha `GET /public/proposals/{token}`
(JSON do snapshot), `POST /public/proposals/{token}/accept` e
`GET /public/proposals/{token}/pdf`, as três com `security: []`.

**A favor**
- **Custo de infra zero.** `_redirects` já serve `/*`; nenhum arquivo de deploy muda.
- **Uma composição, três consumidores**: a página pública, o PPTX da fase D e a prévia
  interna do vendedor saem do mesmo componente React. Em B, a prévia e o PPTX continuam
  precisando dele — a api não os serve.
- Design system, tokens e fontes já estão lá. Iteração visual em segundos, não em ciclo de
  deploy de VPS.
- **O VPS não recebe estranhos no HTML.** O tráfego anônimo que chega à api é só
  `fetch` de JSON, com corpo pequeno e sem render de página.
- Aceite é `POST` JSON — exatamente o que o contrato e o cliente gerado já sabem fazer.
- Peso real medido: **~150K gzip** de shell. Numa proposta que a fase B enche de fotos de
  produto, o JS deixa de ser o item dominante do carregamento.

**Contra**
- **A página pública passa a morar na MESMA origem do app.** XSS ali é XSS em
  `app.cabinetonline.cc`. O cookie é `httpOnly` (não vaza por script), mas `app.` e `api.`
  são same-site com `sameSite: 'lax'`: script naquela origem chama a API **autenticado**
  como quem estiver logado. É o item de segurança que a §7.4 trata.
- Carrega um SPA inteiro para mostrar um documento. Desproporcional em princípio, mesmo com
  o número acima desarmando o argumento na prática.
- Mexe no `__root.tsx`, que é a guarda fail-closed de todas as telas. Mudança pequena, lugar
  caro — pede teste que prove que a rota nova **não** exige sessão e que nenhuma outra
  deixou de exigir.
- Um endpoint JSON público é a superfície mais fácil de automatizar (§7.2).

### B — A api renderiza a página inteira

`GET /public/proposals/{token}` devolve `text/html` montado no servidor, com o dado embutido,
reusando o motor de `src/core/impressao/`.

**A favor**
- **Uma folha, dois meios.** Máxima proximidade entre a página e o PDF — se o requisito for
  "o que o cliente vê é o que ele assina", é aqui que se consegue.
- Página de um documento: dezenas de KB, sem framework, abre instantâneo no celular.
- **O dado nunca sai como JSON.** Não há endpoint público que devolva catálogo e preços em
  formato de máquina; quem raspar, raspa HTML.
- O front não ganha rota pública nenhuma — a guarda continua uma allowlist de duas linhas.

**Contra**
- **Primeira rota `text/html` do contrato**, num documento que hoje só conhece JSON e PDF.
  O Orval geraria hook para uma página que tela nenhuma consome — ruído no gerado, que é
  commitado e conferido pelo CI.
- **O VPS único passa a servir front para estranhos.** Postgres mora ao lado. Hoje só
  chega ali quem tem sessão; depois disso chega qualquer link circulando por WhatsApp.
  E a api **não tem `@fastify/static`, nem helmet, nem rate limit** (medido).
- **O aceite fica torto.** `POST` JSON de dentro de uma página server-side precisa de JS na
  página; `<form>` HTML puro precisaria de `x-www-form-urlencoded` no contrato, que é a
  segunda quebra do "só JSON" na mesma fase.
- Iteração visual longe do design system, em repo com CI parado por cobrança (issue #377).
- O front continua precisando da composição do moodboard para a fase D. B não a evita —
  adia.

### C — Origem própria para a página pública

A de A, publicada num terceiro projeto Pages (`proposta.cabinetonline.cc`), com a origem
acrescentada em `ORIGENS_PERMITIDAS`.

**A favor**
- Separa o bundle público do app: dá para servir um build enxuto, sem as telas internas.
- XSS na página pública não roda na origem do app.

**Contra**
- **Não isola o cookie.** `proposta.cabinetonline.cc` continua com o mesmo rótulo
  registrável, logo continua same-site, logo o cookie `lax` continua viajando. Isolamento de
  verdade exigiria **outro domínio registrável** — decisão de compra, não de código.
- Terceiro projeto Pages, terceira env de painel, terceira origem no CORS (que por decisão
  do api muda **só por PR**, nunca por `.env`).
- Build enxuto separado é configuração de Vite que hoje não existe; sem ela, C é A com uma
  origem a mais para manter.

## 5. Recomendação

**A — o front serve a página, a api entrega JSON por token e o PDF público.** C só quando
houver domínio registrável próprio; B se a resposta à pergunta 9.1 for "a página tem de ser o
PDF".

O motivo não é preferência de camada, é o §2: a api já serve as duas metades caras (o dado e
o papel) e o front já precisa da composição por causa da fase D. A entrega a peça que falta
sem infra nova, sem tipo novo de resposta no contrato e sem pôr render de HTML anônimo ao
lado do Postgres. B compraria fidelidade página↔papel que a espec não pediu — ela pede
página responsiva com interação, que é justamente o que o template de papel não é.

Sequência lógica (ordem, não calendário):

1. **Fase A fecha** (issue #377). O template de papel existe, e é ele que o PDF público
   reusa. Antes disso a fase C não tem o que exportar.
2. **Modelo do token** (§6.1) — tabela, entropia, expiração, revogação, e o **segundo
   caminho de tenant na borda**. É a peça estrutural, e a única que precisa de teste
   próprio antes de qualquer tela.
3. **PR de contrato neste repo**: criar/revogar link (com sessão, permissão
   `orcamento:compartilhar`) + as três públicas por token, com `security: []` justificado no
   `security-do-contrato.test.ts`. Codegen commitado no mesmo PR.
4. **Api implementa**; até lá as operações respondem 501, e o front vê isso sem mentir.
5. **Rota `/p/$token` no front**, com a composição do moodboard como componente — o mesmo
   que a fase D consome.
6. **`public/_headers` com CSP e `Referrer-Policy: no-referrer`, e fontes self-hosted**
   (§7.1). Isto **não é polimento posterior**: o mockup carrega fontes de quatro CDNs, e
   cada uma delas receberia o token no `Referer`.

**O que me faria mudar de recomendação:** se a página compartilhável tiver de ser fiel ao
PDF a ponto de o cliente reconhecer "é o mesmo documento" (pergunta 9.1), B deixa de ser o
caminho caro e passa a ser o único que entrega isso sem duas folhas divergindo.

**Risco assumido, dito na cara:** A põe a página de estranhos na origem do app logado. O que
o torna aceitável é uma regra, não uma esperança — **o handler público ignora a sessão**
(§7.4). No dia em que uma rota `/public/*` olhar `req.session` para decidir qualquer coisa,
esta ADR falhou.

## 6. O que bloqueia QUALQUER opção

### 6.1 Sem sessão não há tenant — e o RLS depende dele

Medido: a borda abre a transação e chama `declararEmpresa(cliente, empresa)` com
`session.activeTenantId`. Handler nenhum abre conexão própria, e um teste de arquitetura
reprova quem tentar. Uma rota pública não tem sessão, então **o token tem de resolver
`tenant_id` antes do `BEGIN`**, e a borda precisa de um segundo caminho de estabelecimento de
contexto ao lado do atual.

Isso é a mudança mais pesada da fase C e ela é igual nas três opções. Exigências:

- a leitura do token acontece **fora** do contexto de tenant (é ela que o descobre) e por
  isso vive numa consulta explicitamente sem RLS, com escopo de uma linha por token;
- o `activeTenantId` da sessão, se houver uma, **não participa** — ver §7.4;
- token inválido, vencido ou revogado responde igual em todos os casos, para não virar
  oráculo de existência (§7.2).

### 6.2 O token vai na URL, e o contrato já decidiu o contrário uma vez

`AuthCredentialToken` é `POST` para o token não ficar em log, histórico e `Referer` — está
escrito na descrição da operação. **Link compartilhável não tem essa saída**: a URL *é* o
produto. A fase C, portanto, não herda aquela decisão; ela abre uma exceção, e a exceção
precisa vir com as mitigações da §7.1 escritas junto, não depois.

### 6.3 Não há rate limit em lugar nenhum

Medido: nenhuma das duas metades tem. Enquanto tudo exigia sessão, a força bruta esbarrava no
login. A primeira rota pública de domínio muda isso. Onde o teto mora — Cloudflare na borda
(Tunnel/Pages) ou plugin no Fastify — é decisão de operação, mas **é pré-requisito da fase C,
não melhoria**.

### 6.4 Foto continua sendo o gap dominante

A fase B não está resolvida e a espec a marca como decisão aberta. Uma página pública com
placeholders SVG é apresentação de proposta sem as peças — e a restrição da ADR-014 §4-B
vale igual aqui: **o renderizador recebe bytes prontos, nunca busca URL** (SSRF). Numa
página servida pelo front a variante do risco muda de nome mas não some: `<img src>` para
host arbitrário vaza o `Referer` com o token para esse host.

## 7. Consequências de segurança

### 7.1 O token no `Referer`, no log e no histórico

O que a URL carrega vaza por três caminhos, e cada um tem um remédio próprio:

- **`Referer` para terceiros.** Toda requisição que a página fizer para outra origem leva a
  URL — **com o token dentro**. O mockup da espec carrega fontes de `fontsource`, Google
  Fonts, `unpkg` e `jsDelivr`: quatro terceiros recebendo o token de cada proposta aberta.
  Remédio: **fontes e assets self-hosted** na página pública, `Referrer-Policy: no-referrer`
  no `_headers`, e CSP que recuse origem externa. Com a fase B, a foto tem de vir da mesma
  origem pelo mesmo motivo.
- **Log de acesso.** Cloudflare registra a URL nos dois lados. Se a api servir (B), o token
  entra também no log do Pino via `req.url`, que hoje sai inteiro. Remédio: redação do
  caminho `/public/proposals/:token` no logger, e ciência de que o log da CDN está fora do
  alcance do código.
- **Histórico e encaminhamento.** Irremediável por construção: quem recebe o link pode
  repassá-lo. Remédio é de escopo, não de transporte — expiração casada com a validade da
  proposta (já na espec), revogação explícita, e o token autorizando **uma** proposta e nada
  mais.

### 7.2 Enumeração e oráculo

Token com menos de 128 bits de entropia, ou derivado de qualquer coisa previsível (id do
orçamento, número do documento, timestamp), é varredura. Some a isso a ausência de rate
limit (§6.3) e a superfície é real, não teórica. Três regras:

- token de fonte criptográfica, ≥128 bits, comparado em tempo constante;
- **resposta única** para inválido, vencido, revogado e inexistente — 404 para todos. Um 410
  "expirado" distinguiria token que existiu de token que nunca existiu;
- teto de requisição por IP e por token antes de a fase entrar no ar.

Em A há um agravante honesto: o endpoint devolve **JSON**, que é o formato que um raspador
prefere. O escopo do token (uma proposta) é o que limita o dano — não o formato.

### 7.3 O aceite é compromisso comercial a partir de posse de link

A espec liga o aceite global à conversão orçamento→pedido, que é operação explícita do
sistema. Isso significa que **posse de um link encaminhável passa a poder disparar
compromisso**. O token prova posse, não identidade — não há autenticação do cliente em lugar
nenhum deste desenho.

Duas consequências que precisam de decisão, não de código:

- **quem aprovou?** Se a resposta for "quem tinha o link", isso tem de estar dito na
  própria página, no momento do aceite, e no rastro. Se não puder ser, o aceite precisa de
  um segundo fator (código enviado ao e-mail do cliente) — e aí a fase C cresce.
- **o aceite converte sozinho?** Recomendação implícita: **não**. Marcar a proposta como
  aprovada e deixar a conversão como ato de um humano com vínculo mantém o compromisso do
  lado de dentro. É a pergunta 9.2.

### 7.4 Confusão de autoridade: o cookie viaja junto

`app.cabinetonline.cc` e `api.cabinetonline.cc` são **same-site**, e o cookie é
`sameSite: 'lax'`. Um vendedor logado que abra o próprio link de teste manda a sessão junto
no `fetch` da página pública. Sem regra explícita, dois defeitos nascem no mesmo dia:

- o handler público "funciona melhor" com sessão e ninguém percebe que o caminho anônimo
  está quebrado até um cliente de verdade abrir o link;
- o `audit_log` registra a visita e o aceite com o `employee_id` de quem estava logado —
  **"o cliente aprovou" vira "o vendedor aprovou"**, num registro que é append-only e não
  pode ser corrigido depois.

A regra: **rota `/public/*` não lê `req.session`.** Autoriza só pelo token, e o rastro sai
com `employee_id NULL` — a coluna já é nullable (`0001_fundacao.sql`), então isso cabe sem
migração. Vale para as três opções; em A ela é obrigatória.

### 7.5 O rastro não pode carregar dado pessoal do visitante

`audit_log` recebeu `GRANT SELECT, INSERT` e mais nada: é append-only por privilégio, e o
comentário de `registro.ts` diz o que isso implica — *"o pior lugar possível para dado
pessoal: um CPF que entrasse no `payload` ficaria fora do alcance de qualquer pedido de
exclusão"*. IP e user-agent do visitante são exatamente esse tipo de dado.

Então "registrar quem abriu o link" **colide com a tabela onde o registro naturalmente
moraria**. Ou o rastro guarda só o ato (`token_id`, `at`, `action`), ou os dados de acesso
vão para uma tabela própria, com retenção e exclusão — que é decisão de produto, não de
implementação. É a pergunta 9.4.

### 7.6 A página pública é a primeira superfície sem CSP

Medido: `public/` tem `_redirects` e nada mais. Nenhuma origem do front declara CSP,
`X-Frame-Options` ou `Referrer-Policy` hoje. Enquanto tudo exigia login, a exposição era
interna. A fase C é o gatilho para escrever `public/_headers` — e como o arquivo vale para o
projeto Pages inteiro, ele protege o app junto, de graça.

Sem `frame-ancestors`, a página pública é embutível em qualquer site. Com preço, nome de
cliente e ambientes dentro.

### 7.7 Vazamento por escopo, não por falha

Um link que mostra preço, cliente e ambientes é encaminhável por desenho. O toggle "valores"
da espec é decisão de produto, não controle de acesso: quem tem o token vê o que o token
autoriza, e um toggle de tela não muda isso. Se a "versão sem preço que o arquiteto circula"
for requisito de verdade, ela é **escopo do token** — dois links por proposta, um com valores
e um sem —, nunca um botão. É a pergunta 9.3.

## 8. Consequências

**Aceitando a recomendação (A):** nenhuma mudança de infra · nenhum tipo novo de resposta no
contrato · uma PR de contrato neste repo com 3 operações públicas de domínio, as primeiras a
existir · a lista de `security-do-contrato.test.ts` sai de 7 para 10, com justificativa · a
borda da api ganha o segundo caminho de tenant (§6.1) · `public/_headers` nasce · a guarda
`__root.tsx` ganha a terceira exceção da vida dela · fontes do mockup deixam de vir de CDN ·
uma dívida nomeada: a página pública mora na origem do app, e a regra do §7.4 é o que a
segura.

**Recusando e indo ao B:** o contrato ganha `text/html` e o gerado ganha hook órfão · o VPS
com Postgres ao lado passa a servir HTML para estranhos, sem helmet, sem static e sem rate
limit · o aceite exige JS na página ou um segundo formato de corpo no contrato · a
composição do moodboard é escrita duas vezes assim mesmo, porque a fase D continua no front ·
em troca, fidelidade página↔papel e nenhum endpoint JSON público.

**Recusando e indo ao C:** tudo de A, mais um projeto Pages, mais uma origem no CORS (que muda
só por PR no api) e mais um build a manter — **sem** isolar o cookie, que é o que se estava
comprando. Só vale com domínio registrável próprio.

**Adiando a fase C inteira:** a fase A entrega PDF por e-mail, que é o fluxo de hoje com
melhor cara. Nada quebra. O que não acontece é o tracking de visualização e o aceite online,
que são o motivo de a espec citar Qwilr/PandaDoc/Papermark.

## 9. Perguntas que só o user responde

1. **A página compartilhável precisa ser reconhecivelmente o MESMO documento do PDF**, ou é
   outra peça (responsiva, interativa) que só compartilha o dado? É a pergunta que separa A
   de B.
2. **O aceite converte o orçamento em pedido sozinho**, ou marca "aprovado" e deixa a
   conversão para alguém com vínculo? (§7.3)
3. **Um link por proposta, ou um por destinatário?** Se "a versão sem valores que o arquiteto
   circula" é requisito, ela é escopo do token, não toggle de tela. (§7.7)
4. **Visita e aceite guardam IP/user-agent?** Se sim, não podem ir no `audit_log`, e isso
   pede tabela própria com retenção. (§7.5)
5. **Validade do token**: a espec diz "casada com a validade da proposta" — e quando a
   proposta não tem validade preenchida, o link vale quanto tempo?
6. **Quem revoga?** Só quem criou, ou qualquer vínculo com `orcamento:compartilhar`?
