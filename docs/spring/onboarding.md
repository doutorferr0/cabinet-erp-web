# Onboarding — o backend Spring do Cabinet

**Para quem:** dev Java/Spring assumindo o backend do Cabinet. É o único documento de entrada;
tudo o mais está linkado daqui.

**Estado:** medido em **2026-08-29** contra o [`contracts/openapi-v1.json`](../../contracts/openapi-v1.json)
deste repositório e contra o `cabinet-erp-api` na `main` = `ac00bb9` (2026-08-26).

> **Este arquivo não roda, então envelhece calado.** Todo número aqui vem com o comando que o
> remede ao lado. Não copie número daqui para lugar nenhum sem rodar o comando: o repositório já
> perdeu 27 declarações de ausência que ficaram verdes por 48 horas porque ninguém as remediu.
> Quando o comando e o texto divergirem, **o comando está certo**.

---

## 1. O essencial, antes de qualquer código

O **Cabinet** é um ERP para o setor de iluminação, substituindo o **Softlux** (Delphi + SQL
Server) que o cliente usa hoje. São três peças:

| peça | repositório | estado |
| --- | --- | --- |
| **Front** — React SPA e **dono do contrato** | `cabinet-erp-web` (este) | vivo, em desenvolvimento diário |
| **Contrato** — `contracts/openapi-v1.json` | dentro deste repo | vivo, muda só por PR **aqui** |
| **Backend** — Node/Fastify | [`cabinet-erp-api`](https://github.com/doutorferr0/cabinet-erp-api) | **CONGELADO em `ac00bb9`** |

Cinco frases que mudam como você lê o resto:

1. **O contrato é a lei, e ele não é seu.** `contracts/openapi-v1.json` é a especificação de
   **entrada** que o backend precisa implementar — não um artefato que o servidor gera. Ele muda
   por PR neste repositório, nunca por código Java. Isso é [decisão de projeto, registrada e não
   renegociável](../../CLAUDE.md).
2. **A api Node está congelada e é referência, não alvo.** Ela implementa a maior parte do
   contrato e passa uma bateria de testes contra Postgres real. Leia-a como resposta a "o que
   exatamente esta rota faz?" — não a porte linha a linha.
3. **A virada é big-bang** (decisão do user, 2026-08-28): o Spring substitui a api Node inteira,
   não convive com ela. Motivo: o time domina Spring, e time pesa mais que stack.
4. **O front funciona sem backend nenhum.** Existe uma camada de mock (MSW) que responde o
   contrato inteiro no navegador. É assim que `cabinetonline.cc` fica de pé. Você pode ver o
   produto rodando hoje, em cinco minutos, sem escrever uma linha de Java (§6).
5. **As travas de §4 não são preferências.** Elas são o que sobrou de decisões já pagas — cada
   uma tem um teste ou um incidente atrás. Elas valem em qualquer linguagem, e a §4 é a parte
   deste documento que existe para ser lida antes de a primeira classe ser escrita.

---

## 2. Por onde começar — ordem lógica, não calendário

1. **Veja o produto.** `pnpm install && pnpm dev` neste repo, abra `localhost:5173`. Modo mock é
   o padrão; o autologin cai direto no app. Navegue por Orçamento, Pedido, Produto, Parceiro.
   Sem isso, o contrato é uma lista de substantivos.
2. **Leia a §4 deste documento inteira.** É o que é proibido.
3. **Leia [`docs/integracao.md` §Semânticas inegociáveis](../integracao.md)** (linhas 14–65): o
   envelope de listagem, paginação, ordenação, `PUT` que substitui inteiro. São as regras que o
   contrato pressupõe mas não consegue escrever em JSON Schema.
4. **Suba o par local** com a api Node congelada (§6) e olhe o console do `pnpm dev`: ele imprime,
   a cada boot, quem serve o quê. É a foto executável do estado.
5. **Rode `pnpm e2e`.** É o fluxo `login → parceiro → produto → orçamento → pedido` contra
   Postgres real, zero mock ([`e2e/fluxo-vivo.spec.ts`](../../e2e/fluxo-vivo.spec.ts)). **É o
   critério de aceitação do seu backend**: o que passar nisso pode assumir as rotas.
6. **Só então gere código.** `openapi-generator` a partir do contrato, produzindo **interfaces**
   que você implementa. O gerador nunca é dono do contrato — ele o consome, como o front faz com
   o Orval.
7. **Implemente nesta ordem, porque é a ordem das dependências:** `/health` → `/auth/login` +
   cookie → `/auth/me` → `/auth/tenants` → `/auth/active-tenant` → primeiro recurso de domínio.
   Sem sessão e sem empresa ativa, toda operação de domínio responde 401 ou 403 — não há como
   testar nada depois delas.

---

## 3. Mapa contrato → módulos

**Medido em 29/08:** o contrato tem **149 caminhos** e **205 operações**. Para remedir:

```bash
python3 -c "
import json,collections
d=json.load(open('contracts/openapi-v1.json'))
ops=[(p,m) for p,i in d['paths'].items() for m in i if m in ('get','post','put','patch','delete')]
print(len(d['paths']),'caminhos ·',len(ops),'operacoes')
"
```

### 3.1 As operações por tag

| ops | tag | raízes de caminho | módulo do core |
| ---: | --- | --- | --- |
| 31 | `vendas` | `/api/quotes` · `/api/orders` · `/api/deliveries` · `/api/picking-queue` · `/api/payment-terms` · `/api/installment-policy` | Vendas |
| 20 | `compras` | `/api/purchase-requests` · `/api/purchase-orders` · `/api/purchases` · `/api/goods-receipts` | Compras |
| 17 | `crm` | `/api/crm` | CRM |
| 15 | `financeiro` | `/api/financial-titles` · `/api/financial-installments` · `/api/financial-settlements` · `/api/cash-*` · `/api/bank-accounts` · `/api/payment-modes` | Financeiro |
| 13 | `comissoes` | `/api/commissions` · `/api/technical-reserves` · (+ sub-rotas de `employees`, `orders`, `partners`) | Vendas / Financeiro |
| 12 | `catalogo` | `/api/products` · `/api/services` · `/api/catalog-lookups` | Catálogo |
| 11 | `impressao` | `/api/labels` · `/api/label-layouts` · `/api/print-settings` · `/api/company-letterhead` · (+ sub-rotas de `quotes`, `orders`) | — |
| 10 | `acesso` | `/api/roles` · `/api/permissions` · `/api/tenants` · (+ vínculos de `employees`) | Empresas + Permissões |
| 10 | `relatorios` | `/api/reports` | — |
| 9 | `auth` | `/auth/*` | Identidade |
| 8 | `parceiros` | `/api/partners` | (mestre da organização) |
| 8 | `cadastros` | `/api/employees` | Identidade |
| 7 | `dashboard` | `/api/dashboard` · `/api/tasks` · `/api/todos` | Tarefas |
| 6 | `estoque` | `/api/stock-locations` · `/api/variants` | Estoque |
| 5 | `suporte` | `/api/platform/support-grants` | (superfície administrativa) |
| 5 | `precos` | `/api/cost-profiles` | Preços |
| 5 | `produtos` | `/api/price-indexes` · `/api/table-prices` | Preços |
| 4 | `obras` | `/api/works` | Vendas |
| 4 | `tarefas` | `/api/activities` | Tarefas |
| 3 | `planner` | `/api/projects` | Tarefas |
| 2 | `health` | `/health` · `/health/db` | infra |

Os **13 módulos** que o core do projeto define são: Identidade · Empresas · Permissões ·
Catálogo · Estoque · Preços · Vendas · CRM · Fiscal · Financeiro · Tarefas · Auditoria ·
Notificações — **mais Compras**, que o legado expôs como fluxo próprio e não estava nos 12
originais. Monólito modular, DDD, porta pública por módulo. Microsserviços foram rejeitados
(custo insustentável para 2 devs).

### 3.2 Três coisas que este mapa revela, e que custam caro se descobertas depois

**(a) A tag NÃO é a fronteira de pacote.** Quatro raízes de caminho são servidas por mais de uma
tag:

| raiz | tags |
| --- | --- |
| `/api/employees` | `acesso` · `cadastros` · `comissoes` |
| `/api/orders` | `comissoes` · `impressao` · `vendas` |
| `/api/partners` | `comissoes` · `parceiros` |
| `/api/quotes` | `impressao` · `vendas` |

Gerar um controller por tag produz três controllers disputando `/api/employees`. A tag diz o
**assunto**, o caminho diz o **recurso** — e é o recurso que tem dono.

**(b) Fiscal, Auditoria e Notificações não têm NENHUMA operação no contrato hoje.** Os três são
módulos do core e o contrato ainda não os alcançou. Não os procure: eles não estão lá. Auditoria
aparece uma única vez, e só dentro do suporte-da-plataforma
(`/api/platform/support-grants/{id}/audit`). Isso não quer dizer que o produto dispense trilha de
auditoria — quer dizer que a superfície HTTP dela ainda não foi escrita, e que escrevê-la é PR
**neste** repositório antes de ser código no seu.

**(c) `precos` e `produtos` estão cruzadas.** A tag `precos` cobre `/api/cost-profiles`, e a tag
`produtos` cobre `/api/price-indexes` + `/api/table-prices`. Ambas são o módulo Preços. Não
conclua o módulo pela tag.

---

## 4. As travas inegociáveis

Estas valem em qualquer linguagem e **não se renegociam com o time novo**. Cada uma existe porque
a alternativa já custou alguma coisa.

### 4.1 A garantia multi-tenant mora no BANCO, não no código

Este é o item que, se você errar, corrompe dado de cliente sem fazer barulho.

São **dois níveis** de isolamento:

- **Nível 1 — organização (cliente): banco Postgres dedicado.** Um banco por organização, mais um
  **banco de controle** separado (registry `organização → DSN`, resolução do login, `sessions`,
  metadados de plataforma; nada de dado operacional de cliente). A resolução do DSN acontece em
  **um ponto único** (login/middleware) e é proibida em qualquer outro lugar, com teste de
  arquitetura cobrando isso. Nenhuma query monta DSN. Pool por organização.
- **Nível 2 — empresa/CNPJ, dentro do banco da organização: RLS.** O pacote completo, sem exceção
  e sem "depois eu ajusto":

  1. Chave primária composta `(tenant_id, id)` e FK composta `(tenant_id, fk_id)` entre tabelas
     com tenant. *(Ressalva medida em 18/08: o schema não tem hoje nenhuma FK composta — depois
     que produto e parceiro viraram mestres da organização, não há cruzamento entre empresas a
     proibir. A regra vale por vacuidade, e há teste cobrando a volta dela.)*
  2. **`FORCE ROW LEVEL SECURITY`** na tabela + política **negando por omissão**: conexão sem
     empresa definida devolve **zero linha**, nunca "todas".
  3. **A aplicação NUNCA conecta como dono da tabela nem como superusuário** — os dois ignoram
     RLS. São **três identidades de banco**, não duas: `cabinet_owner` (NOSUPERUSER
     NOBYPASSRLS, migra) · `cabinet_app` (papel de grupo NOLOGIN, criado pela migração) ·
     `cabinet_runtime` (login pendurado nele). Tabela nascida sob superusuário não é alcançada
     por `FORCE`, e a sabotagem `sem-force` passaria sem provar nada.
  4. **`SET LOCAL` por transação** (compatível com pool em modo transação), resolvido em um ponto
     único. Em Spring: interceptor de `DataSource`.
  5. Índice com `tenant_id` como **primeira** coluna em toda tabela com tenant.
  6. Política = **predicado simples** (`tenant_id = current_setting('app.current_tenant',
     true)::uuid`). Função na política sem embrulhar em `(SELECT ...)` roda **por linha** → seq
     scan. Nunca lógica na política.

**O modo de falhar é o que torna isso aceitável:** esquecer o filtro produz **tela vazia**, não
dado do vizinho. Erro visível e inofensivo em vez de invisível e grave.

**E a bateria precisa saber ficar VERMELHA — a prova negativa.** Esta é a nona exigência, e é
mensurável. A bateria de isolamento roda **duas vezes** contra bancos sabotados de jeitos
diferentes, e conta quantos casos ficam vermelhos:

| modo | o que desliga |
| --- | --- |
| `rls-off` | a política: `DISABLE ROW LEVEL SECURITY` em toda tabela por empresa |
| `sem-force` | a política na prática: tabelas só com `ENABLE`, e a app conectando como **dono do schema** |

Verde nos dois lados = a bateria não prova nada. É **job próprio de CI**, não ritual de sessão. A
cobertura é descoberta no **catálogo do Postgres** (quem tem `tenant_id` cobra `ENABLE` + `FORCE`
+ 4 políticas), nunca em lista escrita à mão. O piso é **medido, nunca calculado** — no Node ele
valia 76 (`rls-off`) e 103 (`sem-force`).

**Leia antes de criar a primeira tabela:**
[`docs/prova-negativa-piso.md`](https://github.com/doutorferr0/cabinet-erp-api/blob/ac00bb9/docs/prova-negativa-piso.md)
· [`tests/isolamento.test.ts`](https://github.com/doutorferr0/cabinet-erp-api/blob/ac00bb9/tests/isolamento.test.ts)
· [`scripts/prova-negativa.mjs`](https://github.com/doutorferr0/cabinet-erp-api/blob/ac00bb9/scripts/prova-negativa.mjs).
Em Spring isso vira JUnit + Testcontainers, com a bateria **reescrita** — não portada.

**Consequência que se esquece:** **zero caminho de escrita global na aplicação ERP.** Operação em
massa sobre várias organizações = job que itera org por org, cada uma em transação escopada e
auditada. Suporte a cliente = sessão break-glass, uma organização por vez, com prazo e motivo
registrado (é o que `/api/platform/support-grants` serve).

### 4.2 Dinheiro em centavos, inteiro. Float é proibido

Todo valor monetário trafega como **inteiro de centavos**, em campo com sufixo `Cents`, tipado
`integer` / `format: int64` — em Java, **`long`**. Nunca `double`, nunca `float`, nunca
`BigDecimal` serializado como número no JSON. A formatação em R$ acontece só na borda de
exibição, no front.

Medido em 29/08: **57 nomes de campo `*Cents` distintos**, em **138 posições** do contrato, todas
`int64`. `format: double` aparece 66 vezes e **nenhuma delas é dinheiro** — são quantidades
(`quantity`, `qtyOnHand`, `minStock`…) e dimensões em milímetros de layout de etiqueta.

```bash
# remedir: nenhuma linha de saída com "double" pode ter nome terminado em Cents
python3 -c "
import json,collections
d=json.load(open('contracts/openapi-v1.json')); t=collections.Counter()
def w(n,k=None):
    if isinstance(n,dict):
        if str(k).endswith('Cents'): t[(json.dumps(n.get('type')),n.get('format'))]+=1
        [w(v,kk) for kk,v in n.items()]
    elif isinstance(n,list): [w(v,k) for v in n]
w(d); print(t)
"
```

Quantidade vai até **3 casas**; percentual, até **4**. A regra de conversão do legado (o Softlux
guarda `money`/`float`) está em
[`docs/harvest/migracao-softlux.md`](../harvest/migracao-softlux.md) — leia antes de escrever o
ETL, porque `round(valor * 100)` sobre `float` é exatamente a armadilha que ela descreve.

### 4.3 Erro é problem+json, com vocabulário FECHADO

Toda resposta 4xx/5xx é **RFC 9457 Problem Details**, servida como `application/problem+json`,
apontando para o schema `ProblemDetails`. `type`, `title` e `status` são **obrigatórios**.

- **`type` é o discriminador de máquina.** Vem do enum fechado `ProblemType`: **55 valores**
  medidos em 29/08 — `about:blank` mais **54 URNs `urn:cabinet:erro:*`**. As mesmas 54 aparecem
  em `src/` do front, porque é por elas que a tela decide o que mostrar.
- **`title` é o rótulo canônico do tipo**, em PT-BR, estável entre ocorrências. Não há camada de
  tradução: a tela imprime o `title` como veio. Cada `type` tem **um** título — o da tabela dentro
  do próprio schema `ProblemType`.
- **`detail` é a frase daquela ocorrência**, e é a única parte acionável. A tela mostra o que veio,
  nunca "algo deu errado".
- **Extensões:** a RFC permite membros extras e o contrato usa **dois** — `fields` (validação por
  campo, com `path` no formato do **corpo da requisição**: `code`, `variants.0.priceCents`, nunca
  nome de coluna do banco) e `existingPartnerId` (no 409 de documento repetido, que é o que
  habilita a tela a oferecer "vincular ao cadastro que já existe"). **Membro não declarado é
  apagado na borda** — inventar um campo novo na resposta de um caminho só não chega ao cliente.
- **Não existe 422.** Validação é sempre **400**.
- **URN nova é PR neste repositório.** Servidor que inventa `type` fora da lista responde o que a
  tela não tem como tratar.

**Onde está o catálogo:** dentro do contrato, no `description` do schema `ProblemType`, com tabela
`type | status | title | quando`. Não há cópia em `docs/` — [E5 (#424)](https://github.com/doutorferr0/cabinet-erp-web/issues/424)
é a issue que vai extraí-la para `docs/spring/erros.md`. A mecânica e o porquê estão em
[`docs/integracao.md` §Problem Details](../integracao.md) (linhas 117–237). No front:
[`src/lib/erros.ts`](../../src/lib/erros.ts) e [`src/mocks/api/problema.ts`](../../src/mocks/api/problema.ts).

```bash
# as 55 entradas do vocabulário
python3 -c "
import json; d=json.load(open('contracts/openapi-v1.json'))
e=d['components']['schemas']['ProblemType']['enum']; print(len(e)); print('\n'.join(e))
"
```

### 4.4 Rota que existe no contrato e você ainda não implementou responde **501**, nunca 404

Esta é a trava que mantém a dívida visível, e ela tem uma razão exata: **404 é ambíguo**. Ele
significa tanto "este caminho não existe no contrato que eu conheço" quanto "não achei este id".
501 significa uma coisa só: *o caminho é meu, o handler não existe ainda*.

- `components/responses/NaoImplementado` está no contrato para isso.
- Cuidado ao ler o contrato: **só 6 operações declaram 501 explicitamente** (as escritas de
  `partners`, `quotes` e `orders`). O 501 é **convenção de runtime para o contrato inteiro**, não
  um status enumerado operação a operação. Não conclua, do contrato, que as outras 199 estão
  implementadas.
- Do outro lado, o front trata isso: a rota que o servidor não serve continua respondida pela
  camada de mock, e o registry ([§6.3](#63-o-registry--quem-serve-o-quê)) diz qual é qual.

### 4.5 Sessão é cookie opaco. JWT é proibido

- Esquema `sessaoCabinet`: `type: apiKey`, `in: cookie`, `name: cabinet_sessao`. É como o OpenAPI
  expressa isso — não existe tipo `cookieSession`, e descrever como `http`/`bearer` descreveria
  outro mecanismo.
- **O cookie carrega um identificador e nada mais.** Papel, empresa ativa e validade moram no
  servidor, **onde podem ser revogados de um lado só**. É o ponto inteiro da decisão (ADR-010): um
  JWT com papel embutido continua valendo depois de o papel mudar.
- A tabela `sessions` vive no **banco de controle**. Na virada: adaptar a ela, ou relogin geral.
- **O cliente não lê nem monta o cookie.** O navegador o envia sozinho; o front pede com
  `credentials: 'include'` ([`src/api/cliente.ts`](../../src/api/cliente.ts)).
- **Operação nova NASCE exigindo sessão.** O `security` do topo do documento vale por herança;
  abrir exceção é declarar `security: []` na operação **e** justificar na guarda
  [`src/data/security-do-contrato.test.ts`](../../src/data/security-do-contrato.test.ts).
- **Ordem de recusa: 401 → 403, sem 400.** E os dois têm significado único:
  - **401 = sem sessão** (ausente, expirada, encerrada). É o *único* significado nas operações de
    domínio. A exceção declarada é o 401 do `POST /auth/login`, que diz "credencial inválida" com
    mensagem genérica de propósito e tipo `about:blank` — mandar `sem-sessao` ali põe o cliente
    em laço de relogin.
  - **403 = autenticado e barrado**, em três casos: `mustChangePassword` (a credencial vale, falta
    um passo — 401 aqui derrubaria a sessão recém-criada), **empresa ativa sem vínculo** (403 e
    não 404, porque `tenantId` não é segredo: ele viaja em `GET /auth/tenants`), e **papel sem a
    permissão** da operação.
  - **404 continua sendo "não encontrado nesta empresa"** — dizer "existe, mas não é sua"
    confirmaria um registro da empresa vizinha.
- **Hashes de senha são argon2id** e são verificáveis pelo `Argon2PasswordEncoder` do
  `spring-security-crypto`. **Os usuários não perdem a senha na virada.**
- **Vínculo ≠ contexto.** A sessão é: employee global + `available_tenants[]` (vínculos, plural) +
  `active_tenant_id` (contexto, singular, trocável **sem relogin**). O papel é **por empresa**
  (`employee_company`), nunca global.
- **Papéis (decisão de 22/08):** `owner` e `admin` são fixos de sistema; os demais são **criados
  pelo admin** sobre um catálogo de permissões **por ação**. Ver
  [`docs/catalogo-de-permissoes.md`](https://github.com/doutorferr0/cabinet-erp-api/blob/ac00bb9/docs/catalogo-de-permissoes.md).

**Medido em 29/08 — divergência para conferir:** o `description` do `sessaoCabinet` diz que "as
quatro" operações sem sessão são `Health`, `HealthDb`, `AuthLogin`, `AuthLogout`. São **sete**:
as três do ciclo da credencial (`POST /auth/forgot-password`, `POST /auth/credential-token`,
`POST /auth/set-password`) entraram depois e a frase não acompanhou. O que vale é o
`security: []` de cada operação, não a prosa. [E4 (#423)](https://github.com/doutorferr0/cabinet-erp-web/issues/423)
é a issue que documenta a sessão como espec testável.

```bash
python3 -c "
import json; d=json.load(open('contracts/openapi-v1.json'))
print([f'{m.upper()} {p}' for p,i in d['paths'].items() for m,o in i.items()
       if isinstance(o,dict) and o.get('security')==[]])
"
```

### 4.6 JPA/Hibernate NUNCA gera DDL, nem é dono do modelo

Mesmo critério que rejeitou Prisma, Django ORM e Adonis — a regra não é sobre Java.

- **No máximo query-only** (o mesmo recorte que o Drizzle recebeu no Node). `ddl-auto` fica em
  `none`, sempre.
- **Migrations continuam SQL cru.** O Flyway aceita as existentes e o sha256 por arquivo já é o
  modelo dele — editar migração aplicada tem de dar erro explícito. O Node tem **59 arquivos
  `.sql`** em `migrations/`, que são o ponto de partida e a documentação executável do schema.
- **Toda tabela nova com `tenant_id` nasce com o pacote completo** de §4.1, incluindo caso próprio
  na bateria de isolamento. Sem exceção.
- **Contract-first via `openapi-generator`**, gerando **interfaces** que você implementa. Código
  nunca é dono do contrato.
- **Procedência de modelagem é verificável:** cabeçalho no `CREATE TABLE` dizendo de onde a
  decisão veio (tela do legado, transcrição, decisão do user).

**As peças Java restantes são decisão de vocês**, dentro dessas travas. Ninguém aqui vai opinar
sobre Spring Boot vs. Spring Modulith, MapStruct, ou como vocês organizam os testes.

### 4.7 Proibido, em lista

| proibido | por quê |
| --- | --- |
| **rota que não está no contrato** | o front não a chama, e ela vira superfície sem dono |
| **`float`/`double` para dinheiro** | §4.2 |
| **JWT** | §4.5 — papel embutido não se revoga |
| **`ddl-auto` diferente de `none`** | §4.6 |
| **app conectando como dono do schema ou superusuário** | §4.1 — passa por cima do RLS *e* do `GRANT` |
| **`type` de erro fora do enum `ProblemType`** | §4.3 |
| **404 no lugar de 501** | §4.4 |
| **caminho de escrita global (várias organizações numa transação)** | §4.1 |
| **fork por cliente** | versão única para todos; customização é configuração |

---

## 5. Onde mora cada fonte

| fonte | onde | serve para |
| --- | --- | --- |
| **O contrato** (a lei) | [`contracts/openapi-v1.json`](../../contracts/openapi-v1.json) | o que implementar. Muda só por PR **aqui** |
| **Semânticas que o JSON Schema não escreve** | [`docs/integracao.md`](../integracao.md) | envelope de listagem, paginação, ordenação, filtro estruturado, erros |
| **Regras do repo e do trabalho** | [`CLAUDE.md`](../../CLAUDE.md) | 501 vs 404, comandos, passagem mock↔HTTP |
| **Implementação de referência** | [`cabinet-erp-api@ac00bb9`](https://github.com/doutorferr0/cabinet-erp-api/tree/ac00bb9) | "o que exatamente esta rota faz?" — 59 migrações SQL, 77 arquivos de teste contra Postgres real |
| **A prova negativa** | [`api/docs/prova-negativa-piso.md`](https://github.com/doutorferr0/cabinet-erp-api/blob/ac00bb9/docs/prova-negativa-piso.md) | como o isolamento é provado, e por que verde não basta |
| **Catálogo de permissões** | [`api/docs/catalogo-de-permissoes.md`](https://github.com/doutorferr0/cabinet-erp-api/blob/ac00bb9/docs/catalogo-de-permissoes.md) | as ações que compõem um papel |
| **O legado Softlux — o norte funcional** | [`docs/legado/`](../legado/README.md) | o que o produto precisa fazer, medido no sistema em uso |
| **Migração de dado do legado** | [`docs/harvest/migracao-softlux.md`](../harvest/migracao-softlux.md) | conversão de tipos, centavos, armadilhas do ETL |
| **Paridade com o Softlux** | [`docs/fluxo-paridade-softlux.md`](../fluxo-paridade-softlux.md) | o fluxo de negócio de ponta a ponta |
| **As telas, campo a campo** | [`softlux-telas-transcricao.md`](../../softlux-telas-transcricao.md) | de onde vem o nome de cada campo — **não invente campo** |
| **Aceitação** | [`e2e/fluxo-vivo.spec.ts`](../../e2e/fluxo-vivo.spec.ts), hoje | o fluxo que o backend novo tem de passar |
| **CI e guardas** | [`docs/ci-qualidade.md`](../ci-qualidade.md), [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | o que reprova um PR |
| **Produto** | [`PRODUCT.md`](../../PRODUCT.md) | o que o Cabinet é, para quem |

### 5.1 Sobre o legado: o que existe e o que não existe

O material de engenharia reversa do Softlux está em [`docs/legado/`](../legado/README.md) — duas
rodadas de extração (10/08, do SQL Server de produção; 11/08, do binário `SOFTLUX.exe`), **só
leitura**, e nada dali vira código automaticamente:

- [`docs/legado/schema/`](../legado/schema) — dumps do catálogo de 3 bancos (colunas, índices,
  FKs, contagem de linhas, gatilhos, rotinas). O arquivo que mais importa é
  `bdprincipal-rotinas.sql`: 44 rotinas, incluindo `CalcularProduto`/`CalcularPorProduto`, que é
  **a formação de preço do legado**.
- [`docs/legado/config/`](../legado/config) — 12 CSVs da configuração **real** do negócio,
  incluindo `custo.csv`, `indice_preco.csv` e as tabelas de permissão em produção
  (`sispermissao*.csv`, `usuarios_por_grupo.csv`).
- [`docs/legado/exe/`](../legado/exe) — `mapa-telas.md` com **713 telas** e 142 dumps de
  formulário. *Cuidado ao medir: os 142 DFMs cobrem ~20% das telas; "nenhuma tela faz X" medido só
  em `formularios/` é uma afirmação sobre um quinto do produto.*
- [`docs/legado/dbml/`](../legado/dbml) — 10 diagramas por domínio, e HTMLs navegáveis na raiz da
  pasta (`softlux-er.html`, 359 tabelas).

**O `comparativo-softlux` não está neste repositório.** Se alguém o mencionar como fonte: ele vive
numa pasta compartilhada fora do git, e o substituto versionado é exatamente o `docs/legado/`
acima, mais os dois documentos de paridade e migração da tabela de §5. Não perca tempo procurando
o arquivo — ele não existe aqui.

### 5.2 A aceitação

O critério é executável, não uma lista de requisitos: **o backend que passar na suíte pode assumir
as rotas.** Hoje ela é [`e2e/fluxo-vivo.spec.ts`](../../e2e/fluxo-vivo.spec.ts) — um caso
encadeado (`login → parceiro → produto → orçamento → pedido`) contra Postgres real, zero mock,
onde cada elo é um id que atravessou HTTP e RLS. O primeiro passo do teste prova que quem responde
é o servidor e não a camada de mock.

Ela ainda está acoplada ao par local. [E3 (#422)](https://github.com/doutorferr0/cabinet-erp-web/issues/422)
é a issue que a extrai para uma suíte `conformidade/` parametrizada por `CABINET_API_URL` — e é
essa que vocês vão apontar para o Spring. **Quando ela existir, é ela que manda**; até lá, use o
`fluxo-vivo` como espelho.

---

## 6. Rodar o front — e apontá-lo para o seu backend

Pré-requisitos: **Node 22** e **pnpm 10** (é o que o CI usa; o repo não declara `engines` nem
`.nvmrc`). O workspace fixa `minimumReleaseAge: 10080` (7 dias) — é
obrigatório, pós-incidente de supply chain, e não é para ser removido.

```bash
pnpm install
```

### 6.1 Os três modos

```bash
# 1. MOCK PURO — o padrão. Nada sai da origem; o MSW responde o contrato inteiro
#    no navegador. É o modo do site demo (cabinetonline.cc) e o de quem não
#    subiu backend nenhum.
pnpm dev

# 2. PASSTHROUGH POR ROTA — o modo de desenvolvimento contra backend real.
#    As operações que o servidor serve saem do mock e atravessam o proxy do
#    Vite; todo o resto continua mockado, e a tela não sabe a diferença.
VITE_API_PROXY=http://localhost:8080 pnpm dev
```

**`VITE_API_PROXY` é a única chave da passagem.** Não há flag por família, por rota ou por
módulo, e não deve haver: quem escolhe o que sai é a lista em
[`src/mocks/rotas-do-backend.ts`](../../src/mocks/rotas-do-backend.ts), conferida contra o contrato
pelo CI. Uma segunda autoridade sobre a mesma decisão seria a que ninguém testa.

Ela governa **duas** coisas de uma vez, de propósito: o proxy do dev server
([`vite.config.ts`](../../vite.config.ts)) e o passthrough do MSW. Duas variáveis poderiam
divergir, e a divergência é silenciosa — passthrough sem proxy faz `/api` cair no fallback da SPA
e a tela recebe `index.html` **com status 200**.

O terceiro modo é o de implantação: `VITE_API_URL` aponta uma base absoluta (é o que
`app.cabinetonline.cc` usa). Todas as variáveis estão documentadas em
[`.env.example`](../../.env.example) — copie para `.env.local`, que é gitignored.

### 6.2 Por que proxy e não base absoluta

Por causa do **cookie**. Atravessando o Vite, `/api` e `/auth` saem da **mesma origem** da página
e `cabinet_sessao` viaja sozinho. Apontar o front direto para a porta do backend tornaria tudo
cross-origin e exigiria `SameSite=None; Secure` mais CORS só em dev — configuração que só existe
para o ambiente de desenvolvimento e que mascara problemas de produção.

Com backend real o **autologin do mock não roda** (`VITE_MOCK_AUTOLOGIN` é ignorada): quem diz se
há sessão é o servidor. Semear o store abriria uma sessão que só existe no navegador.

### 6.3 O registry — quem serve o quê

[`src/mocks/rotas-do-backend.ts`](../../src/mocks/rotas-do-backend.ts) é a lista que decide, por
operação, se ela sai para a rede ou fica no mock. **Medido em 29/08:** 168 declaradas servidas +
37 declaradas no mock = 205, que é exatamente o total do contrato. A guarda
[`src/mocks/rotas-do-backend.test.ts`](../../src/mocks/rotas-do-backend.test.ts) reprova se alguma
operação do contrato ficar sem declaração.

**Aquelas 168 foram medidas contra a api Node, que agora está congelada.** Enquanto o Spring não
existir, nenhuma das 37 muda de lado. [E2 (#421)](https://github.com/doutorferr0/cabinet-erp-web/issues/421)
é a issue que acrescenta o campo `servidor: 'node-congelado' | 'spring-pendente'` para que o
registry passe a dizer *qual época* uma rota está esperando.

O campo `natureza` já distingue os dois tipos de ausência, e errar isso manda alguém para o
repositório errado:

| natureza | o servidor responde | próximo passo |
| --- | --- | --- |
| `sem-handler` | **501** — o contrato dele conhece o caminho | implementar o handler |
| `sem-contrato` | **404** `Este caminho não existe no contrato` | sincronizar a cópia do contrato **primeiro** |

### 6.4 O par local com a api Node congelada

Vale a pena subir uma vez, para ver o alvo funcionando:

```bash
pnpm par:semear   # o api cria papel dono + unaccent, migra e semeia
pnpm e2e          # sobe api + Vite e roda o fluxo no navegador
pnpm par:ao-vivo  # a fronteira em Node, com o par já de pé
```

`CABINET_API_DIR` aponta o checkout do api (padrão `../cabinet-erp-api`);
`CABINET_API_PORT`/`CABINET_APP_PORT` movem as portas. Credencial do par local:
`demo@vertz.dev` / `senha-de-desenvolvimento` — **não** é a do site demo.

### 6.5 Comandos do repo

```bash
pnpm dev            # Vite (5173)
pnpm check          # biome check --write   (lint + format)
pnpm check-types    # tsc -b
pnpm test           # vitest run
pnpm build
pnpm codegen        # regera src/api/gerado/ a partir do contrato
```

Se você mexer no contrato (por PR aqui, §4), **rode `pnpm codegen` e commite `src/api/gerado/` no
mesmo PR** — o CI tem um passo `Codegen is up to date` que refaz o codegen e reprova se o gerado
divergir.

---

## 7. Três armadilhas de medição, todas já pagas aqui

Elas custaram sessões inteiras neste projeto. Vão custar as suas também, do mesmo jeito.

1. **`curl` no front (`:5173`) não prova o que o backend faz.** O mock vive no **navegador**;
   `curl` atravessa o proxy e recebe a resposta do servidor em rota que, na tela, o mock
   responderia. E o inverso: medir o backend de dentro de um processo com o MSW ligado devolve a
   resposta do **mock**, porque os padrões do mock começam com `*` e casam qualquer origem —
   inclusive a porta do backend. O resultado parece integração.
2. **Escrita com corpo vazio mede errado.** A validação de schema responde **400 antes** do 501.
   Só corpo **válido** distingue "implementado" de "no contrato, sem servidor".
3. **Processo velho serve contrato velho.** Um servidor sem watch nascido quatro minutos antes do
   último checkout já responde como o código de antes. A medida não é a idade absoluta: é
   comparar o nascimento do processo com o `mtime` do ref do repositório.

E a regra que governa as três: **declaração de ausência não tem quem a invalide.** "Esta rota não
é servida" fica verde para sempre depois que passa a ser servida. O que tira do silêncio é
remedir, não reler.

---

## 8. O que ainda não existe

Este documento é o **E8** de uma leva de oito. Os outros sete estão abertos, e cada um produz uma
peça que este documento hoje só descreve:

| issue | entrega | onde vai morar |
| --- | --- | --- |
| [E1 · #420](https://github.com/doutorferr0/cabinet-erp-web/issues/420) | baseline do contrato congelada + `pnpm contrato:delta` | `contracts/baseline-spring-2026-08.json` · `docs/spring/contrato.md` |
| [E2 · #421](https://github.com/doutorferr0/cabinet-erp-web/issues/421) | registry marca a época: `node-congelado` × `spring-pendente` | `src/mocks/rotas-do-backend.ts` |
| [E3 · #422](https://github.com/doutorferr0/cabinet-erp-web/issues/422) | **suíte de conformidade** parametrizada por URL — a aceitação | `conformidade/` |
| [E4 · #423](https://github.com/doutorferr0/cabinet-erp-web/issues/423) | espec de sessão e auth, derivada de comportamento medido | `docs/spring/sessao.md` |
| [E5 · #424](https://github.com/doutorferr0/cabinet-erp-web/issues/424) | catálogo problem+json com exemplo real de cada URN | `docs/spring/erros.md` |
| [E6 · #425](https://github.com/doutorferr0/cabinet-erp-web/issues/425) | escritas mockadas recusam como o servidor recusa | `src/mocks/` |
| [E7 · #426](https://github.com/doutorferr0/cabinet-erp-web/issues/426) | semente do mock vira Softlux-like | `src/mocks/semente/` |

**Enquanto durar o regime só-front** (decisão do user, 2026-08-28): a api Node está congelada e
nenhum trilho a toca. Lacuna de servidor vira mock MSW mais rota marcada no registry. O contrato
continua evoluindo aqui — o que significa que o alvo do Spring **cresce** enquanto vocês
implementam, e é por isso que o E1 existe.

---

## 9. Vocabulário

O dado usa **inglês** (é o que o contrato publica); a conversa e a interface usam **PT-BR**.
Traduzir um `accessorKey` de coluna quebra a ordenação com 400, porque o nome tem de bater com a
whitelist de `sortBy` do servidor.

| PT-BR | contrato | nota |
| --- | --- | --- |
| organização | *(não viaja em rota)* | o cliente. Nível 1 do isolamento — banco dedicado |
| empresa / tenant | `tenant` | o CNPJ. Nível 2 — RLS. `tenantId` não é segredo |
| colaborador | `employee` | identidade dentro da organização |
| vínculo | `employee_company` | papel **por empresa** |
| parceiro | `partner` | uma tabela, três papéis (cliente, fornecedor, profissional), filtro `role` |
| orçamento | `quote` | |
| pedido de venda | `order` | |
| separação / entrega | `picking` / `delivery` | |
| obra | `work` | |
| produto / variante | `product` / `variant` | preço e estoque vivem na **variante** |
| lista de apoio | `catalog-lookup` | |
| título / parcela / baixa | `financial-title` / `installment` / `settlement` | |
| centavos | `*Cents` | `int64`, sempre |

---

## 10. Se você lembrar de uma coisa só deste documento

**O contrato é a lei, a garantia de isolamento mora no banco, e nenhuma afirmação sobre o estado
do sistema vale sem ter sido medida hoje.** O resto se descobre lendo o código de referência.

Dúvida sobre uma decisão? Ela está registrada — pergunte antes de reabri-la. Decisão nova, ou
mudança de contrato, é PR **neste** repositório, com o motivo escrito.
