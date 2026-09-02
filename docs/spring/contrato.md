# O contrato para quem vai escrever o Spring

Este documento existe para uma pessoa que chega hoje, não conhece o histórico e precisa saber
**o que implementar, e o que nunca vai mudar debaixo dela**. Ele responde cinco perguntas, nesta
ordem:

1. Qual é o alvo? (a versão `1.0.0`, congelada e com nome)
2. O que pode mudar no contrato enquanto você implementa — e o que é proibido mudar?
3. O que já tem implementação de referência em Node, que dá para ler antes de escrever?
4. O que não tem, e o Spring escreve do zero?
5. Como uma versão nova sai, e como o seu CI se prende a ela?

Tudo abaixo foi **medido**, não lembrado — os números de contrato e de registry em 2026-09-02, os
do servidor Node em 2026-08-29. O método de cada um está na última seção, que existe para o dia em
que alguém duvidar de um deles.

---

## 1. O problema: o contrato não parou quando a api parou

Duas coisas se moveram em ritmos diferentes, e é daí que vem a confusão que este documento
desfaz.

**A api Node congelou.** `doutorferr0/cabinet-erp-api` está na main `ac00bb9` (2026-08-26) e não
recebe mais trabalho: o regime só-front, decidido em 2026-08-28, proíbe que qualquer trilho a
toque. Ela não é mais o backend em construção — virou **implementação de referência**, um corpo de
código parado que diz como cada regra foi resolvida uma vez.

**O contrato NÃO congelou.** `contracts/openapi-v1.json` é a especificação de entrada e este
repositório é o dono dela: telas novas continuam publicando operação nova por PR daqui, como
sempre. Isso é deliberado e não vai mudar.

A consequência é que "implementar o contrato" não tinha, sozinho, significado estável — o alvo se
movia debaixo de quem mira. **A versão é o que dá nome à parte parada**, e a regra aditiva (§3) é
o que garante que a parte que anda nunca invalide o que você já escreveu.

## 2. A versão 1.0.0 — os arquivos e o que cada um significa

| arquivo | o que é | muda? |
|---|---|---|
| `contracts/openapi-v1.json` | o contrato VIVO: a especificação de entrada, editada por PR neste repo | sim, toda semana — só por ADIÇÃO (§3) |
| `contracts/baseline/v1.0.0.json` | a versão **1.0.0**: cópia byte a byte do vivo no dia da publicação | **nunca** |
| `contracts/baseline/v1.0.0.sha256` | a soma da linha acima, no formato do `sha256sum` | nunca |
| tag `contrato/v1.0.0` | o mesmo arquivo, endereçável por Git a partir do repositório do Spring | nunca |
| `contracts/openapi-v1.json` **no repo do api**, em `ac00bb9` | a cópia que a api congelada conhece | não — a api parou |

A 1.0.0 tem **205 operações em 149 caminhos**, `info.version = "1.0.0"`, sha256 `08967c3c…` — o
valor inteiro está em `contracts/baseline/v1.0.0.sha256`, e é ele que os dois lados conferem:
`pnpm contrato:delta` aqui, o CI do Spring lá (§9). O hash não está repetido em prosa neste
arquivo de propósito: duas cópias de um hash divergem, e a que ninguém confere é a que ganha.

**A baseline não se edita.** Nem para corrigir, nem para acompanhar o contrato vivo: o valor dela
é ser o mesmo arquivo amanhã, e uma versão que se move não é versão. Se `pnpm contrato:delta`
reclamar que ela mudou, o conserto é `git checkout contracts/baseline/v1.0.0.json`, não uma soma
nova no `.sha256`. Contrato novo não reescreve a 1.0.0: ele **nasce como 1.1.0** (§7).

> **Implemente a TAG, nunca a `main`.** A `main` deste repositório é o contrato vivo, e ele muda
> várias vezes por semana. `git show contrato/v1.0.0:contracts/baseline/v1.0.0.json` é estável por
> definição.

## 3. A regra aditiva — o que pode e o que não pode mudar em 1.x

Decisão de projeto (2026-09-02): **em 1.x, o contrato só cresce.** É o que permite o front
continuar publicando enquanto o Spring implementa, sem que nenhuma das duas pontas tenha de
esperar a outra.

**PODE** (é adição — o cliente velho continua funcionando):

- operação nova, em caminho novo ou em caminho existente (`POST /api/goods-receipts/{id}/reopen`)
- campo **opcional** novo num DTO de resposta ou de requisição (`ProductDto.familyName`)
- valor novo num enum de **resposta** (uma situação de documento a mais)
- parâmetro de query **opcional** novo (`?warehouseId=`)
- resposta de erro nova documentada numa operação que já a poderia devolver

**NÃO PODE**, em operação que já existe na versão publicada:

- renomear campo (`tradeName` → `tradingName`) — é remoção mais adição, e o cliente velho quebra
- remover campo, parâmetro, operação ou caminho
- mudar tipo (`string` → `integer`; `number` → `string`)
- tornar obrigatório o que era opcional — em requisição, quebra quem já chamava
- mudar código de status (`201` → `200`), ou trocar o schema de uma resposta existente
- estreitar um enum de requisição (tirar um valor que o cliente podia mandar)

**Quebrou de propósito?** Então não é edição: é **operação nova** ao lado da velha (com
`operationId` novo), e a velha fica marcada `deprecated: true` até alguém decidir a `/v2`. Nunca
edite a existente "porque ninguém usa ainda" — o Spring usa, e é justamente quem não está na
mesma sala para avisar.

**A regra é executada, não confiada.** O job `contrato-compat` do CI
([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) roda o `oasdiff` comparando
`contracts/openapi-v1.json` contra `contracts/baseline/v1.0.0.json` com `fail-on: ERR`, e reprova
a PR. Enquanto isto era prosa em documento, dependia de alguém lembrar; medido em 2026-09-02,
renomear `PartnerDto.tradeName` acusa cinco erros `response-required-property-removed`, um por
operação afetada — inclusive nas quatro em que o nome do campo não aparece, porque ele chega lá
por `$ref`.

## 4. O que a api congelada SERVE: 163 operações

O contrato que a api conhece tem **199 operações** — subconjunto exato do contrato vivo, sem
nenhuma operação própria. Dessas, **163 têm handler** e respondem de verdade.

Estas 163 são o que o Spring pode **portar em vez de inventar**: existe código Node lendo o mesmo
Postgres, com as regras de negócio já resolvidas e com testes ao lado. Elas cobrem o miolo do
produto:

| família | ops | família | ops |
|---|---|---|---|
| CRM (`/api/crm`) | 17 | catálogo, variantes, serviços | 12 |
| pedido de venda (`/api/orders`) | 15 | atividades, tarefas, A fazer | 9 |
| compras (requisição + pedido + ordem) | 14 | sessão (`/auth/*`) e saúde | 8 |
| preços, tabelas, prazos, índices | 15 | papéis, permissões, dashboard | 7 |
| parceiros (`/api/partners`) | 10 | obra, projeto, planner | 6 |
| relatórios (`/api/reports`) | 10 | entrega (`/api/deliveries`) | 6 |
| colaborador (`/api/employees`) | 8 | comissões (`/api/commissions`) | 4 |
| orçamento (`/api/quotes`) | 8 | listas de apoio (`/api/catalog-lookups`) | 3 |
| estoque: depósitos e reservas | 6 | impressão: timbre e ajustes | 4 |
| separação (`/api/picking-queue`) | 1 | | |

Soma 163. A tabela agrupa para dar a forma — forma agrupada é o que serve para planejar; nome
exato se mede, e o método está na §11.

## 5. O que a api congelada NÃO serve: 42 operações

São as 205 da versão 1.0.0 menos as 163 acima. **Para o Spring, todas as 42 são trabalho do
zero** — não há Node de referência para nenhuma. O que muda entre elas é apenas por que faltam, e
essa distinção importa só para quem for ler o repositório do api e não achar o código:

- **36 respondem `501`.** O contrato de lá conhece o caminho, o mapa de handlers de
  `src/core/http/servidor.ts` não tem entrada. Elas estão nomeadas na allowlist
  `AINDA_SEM_HANDLER` de `tests/cobertura-do-contrato.test.ts`, no api.
- **6 respondem `404 Este caminho não existe no contrato`.** São operações publicadas neste repo
  depois do último `sync:contract` do api. Como a api congelou, esse sync não vai mais acontecer:
  a diferença entre `501` e `404` aqui é histórica, não uma dívida com dono.

| operação | rota | api congelada |
|---|---|---|
| `ListBankAccounts` | GET /api/bank-accounts | 501 |
| `ListCashMovements` | GET /api/cash-movements | 501 |
| `CreateCashMovement` | POST /api/cash-movements | 501 |
| `ReconcileCashMovement` | POST /api/cash-movements/{id}/reconcile | 501 |
| `ListCashRegisters` | GET /api/cash-registers | 501 |
| `CreateCashTransfer` | POST /api/cash-transfers | 501 |
| `ListPaymentModes` | GET /api/payment-modes | 501 |
| `ListFinancialTitles` | GET /api/financial-titles | 501 |
| `CreateFinancialTitle` | POST /api/financial-titles | 501 |
| `GetFinancialTitle` | GET /api/financial-titles/{id} | 501 |
| `UpdateFinancialTitle` | PUT /api/financial-titles/{id} | 501 |
| `CancelFinancialTitle` | POST /api/financial-titles/{id}/cancel | 501 |
| `ListFinancialInstallments` | GET /api/financial-installments | 501 |
| `SettleInstallment` | POST /api/financial-installments/{id}/settlements | 501 |
| `SettleBatch` | POST /api/financial-settlements/batch | 501 |
| `ListGoodsReceipts` | GET /api/goods-receipts | 501 |
| `CreateGoodsReceipt` | POST /api/goods-receipts | 501 |
| `GetGoodsReceipt` | GET /api/goods-receipts/{id} | 501 |
| `UpdateGoodsReceipt` | PUT /api/goods-receipts/{id} | 501 |
| `CheckGoodsReceipt` | POST /api/goods-receipts/{id}/check | 501 |
| `PostGoodsReceipt` | POST /api/goods-receipts/{id}/post | 501 |
| `ListLabelLayouts` | GET /api/label-layouts | 501 |
| `CreateLabelLayout` | POST /api/label-layouts | 501 |
| `GetLabelLayout` | GET /api/label-layouts/{id} | 501 |
| `UpdateLabelLayout` | PUT /api/label-layouts/{id} | 501 |
| `PrintProductLabels` | GET /api/labels/products/print | 501 |
| `ListSupportGrants` | GET /api/platform/support-grants | 501 |
| `OpenSupportGrant` | POST /api/platform/support-grants | 501 |
| `GetSupportGrant` | GET /api/platform/support-grants/{id} | 501 |
| `ListSupportGrantAudit` | GET /api/platform/support-grants/{id}/audit | 501 |
| `RevokeSupportGrant` | POST /api/platform/support-grants/{id}/revoke | 501 |
| `InviteEmployee` | POST /api/employees/{id}/invite | 501 |
| `ResetEmployeePassword` | POST /api/employees/{id}/reset-password | 501 |
| `AuthForgotPassword` | POST /auth/forgot-password | 501 |
| `AuthCredentialToken` | POST /auth/credential-token | 501 |
| `AuthSetPassword` | POST /auth/set-password | 501 |
| `ListEmployeeLinks` | GET /api/employees/{id}/links | 404 |
| `ReschedulePlanItem` | PATCH /api/projects/{projectId}/plan/items/{itemId} | 404 |
| `ListTenants` | GET /api/tenants | 404 |
| `CreateTenant` | POST /api/tenants | 404 |
| `GetTenant` | GET /api/tenants/{id} | 404 |
| `UpdateTenant` | PUT /api/tenants/{id} | 404 |

**Nem tudo aqui está sem chão.** A tesouraria (as 15 primeiras) tem TABELA no Postgres do api — a
fase A do G7 criou `financial_titles`, `financial_installments`, `financial_settlements`,
`cash_movements`, `cash_transfers`, `bank_accounts`, `cash_registers` e `payment_modes`. O que
nunca existiu foi o módulo HTTP. Para o Spring isso é uma vantagem concreta: o modelo de dados já
está desenhado e migrado, e é a parte cara. As de etiqueta, credencial e suporte da plataforma não
têm nem tabela.

## 6. O delta: `pnpm contrato:delta`

```
pnpm contrato:delta          relatório em texto
pnpm contrato:delta --json   o mesmo, para outro programa ler
```

Ele confere a soma da baseline, compara-a com o contrato vivo e imprime três listas:

- **NOVAS** — publicadas depois da 1.0.0. Entram na próxima versão; o Spring ainda não as viu.
- **REMOVIDAS** — saíram do contrato. Em 1.x isto é proibido (§3): se aparecer aqui, a PR que o
  fez já está vermelha no `contrato-compat`.
- **ALTERADAS** — mesmo `operationId`, outro significado. **É a razão de o script existir.**

A terceira lista é a que não se vê a olho nu. Uma operação do OpenAPI é uma casca: o significado
mora em `components/`, atrás de `$ref`. Mudar `PartnerWriteRequest` altera o que sete operações
aceitam sem tocar num byte dentro de `paths`, e uma comparação por nome diria "nada mudou" no dia
em que mais mudou. Por isso o script compara o **fechamento transitivo** de cada operação: o nó
dela, todo componente alcançável por `$ref`, e o que ela herda sem declarar — os parâmetros do
path item e o `security` do topo do documento.

**O delta e o `contrato-compat` respondem perguntas diferentes**, e é por isso que os dois
existem: o job diz *"esta mudança é compatível?"* (e reprova se não for); o delta diz *"quanta
coisa nova acumulou desde a versão publicada?"* — que é a conta que decide quando sai a 1.1.0.

No dia do merge desta PR o delta é **zero nas três listas**, porque a baseline acabou de ser
tirada do contrato vivo. Ele vira útil no primeiro merge de contrato depois disso.

## 7. Como sai uma versão nova

Versão não sai por operação; sai por **lote**. O caminho, na ordem:

1. **Acumule.** As adições entram no contrato vivo por PR, como sempre. `pnpm contrato:delta`
   mostra o que já se juntou.
2. **`info.version` → `1.1.0`** em `contracts/openapi-v1.json`, e `pnpm codegen` (o job `check`
   cobra `src/api/gerado` em dia).
3. **Nova baseline:** `contracts/baseline/v1.1.0.json`, cópia byte a byte do vivo, mais
   `contracts/baseline/v1.1.0.sha256`. **A `v1.0.0.json` fica onde está, intocada** — ela é o que
   uma versão do Spring já em produção implementa.
4. **O job aponta para a nova:** `base:` do `contrato-compat` passa a `contracts/baseline/v1.1.0.json`.
   A partir daí a compatibilidade é medida contra a 1.1.0, que já contém a 1.0.0 por construção
   (só houve adição entre as duas — foi o job que garantiu).
5. **Entrada no changelog** [`contrato-changelog.md`](contrato-changelog.md): versão, data, total
   de operações, sha256 e o que entrou.
6. **Tag `contrato/v1.1.0`** no commit de merge na `main`. **Na `main`, nunca na branch:** este
   repositório mergeia por squash, e o sha da branch deixa de existir.

**Quebra de compatibilidade não é 1.x.** Se um dia for inevitável, o caminho é `/v2` em caminho
próprio, com a 1.x servida em paralelo — decisão de projeto, não de PR.

## 8. Rota nova nasce `spring-pendente`

Enquanto o Spring não serve, o front continua funcionando: existe um mock (MSW) que responde o
contrato inteiro no navegador, e é o que mantém `cabinetonline.cc` de pé. O registry
[`src/mocks/rotas-do-backend.ts`](../../src/mocks/rotas-do-backend.ts) é quem diz, operação por
operação, quem responde.

Toda entrada que fica no mock declara `servidor`, e o valor separa duas coisas que pareciam uma:

- **`node-congelado`** — a lacuna nasceu quando o alvo era o Node. A `natureza` (`sem-handler` →
  501, `sem-contrato` → 404) descreve o buraco naquele servidor, que **não vai mais ser fechado**.
- **`spring-pendente`** — a lacuna nasceu depois do congelamento. Nenhum servidor jamais conheceu
  a rota; quem vai fechá-la é o Spring.

**Rota publicada no contrato a partir de agora nasce `spring-pendente`** e assim fica até o Spring
servi-la; o recenseamento de `rotas-do-backend.test.ts` reprova quem a declarar `node-congelado`.
Medido em 2026-09-02: **168 operações na passagem** (saem para a rede) e **37 no mock**, todas as
37 ainda `node-congelado` — a primeira `spring-pendente` aparece no próximo caminho publicado.

Para o Spring, a leitura prática é: **essa divisão não é o seu mapa de trabalho.** Ela responde
*"o que o navegador manda para o servidor hoje?"*, e o seu mapa é a §5. A diferença medida entre as
duas listas são cinco operações — `ListLabelLayouts`, `CreateLabelLayout`, `GetLabelLayout`,
`UpdateLabelLayout` e `PrintProductLabels` estão na passagem, e a api congelada responde 501
nelas. É dívida do front, com dono em `rotas-do-backend.ts`; está registrada aqui porque quem ler
as duas listas lado a lado vai tropeçar nela.

## 9. Como o Spring consome esta versão

Dois passos, e o segundo é o que impede a primeira divergência silenciosa.

**1. Gere as interfaces a partir da TAG.** O contrato é a fonte dos tipos também do lado Java —
`openapi-generator` com `spring` e `interfaceOnly`, apontando para o arquivo da tag, e o controller
implementando a interface gerada. Assim, campo que muda no contrato vira **erro de compilação** no
Spring, que é o momento certo de descobrir:

```
git -C ../cabinet-erp-web show contrato/v1.0.0:contracts/baseline/v1.0.0.json > contrato/v1.0.0.json
# openapi-generator: generatorName=spring, library=spring-boot,
#   interfaceOnly=true, useTags=true, useSpringBoot3=true
```

**2. Confira a soma no CI de vocês.** Mesmo modelo do `check:contract` que a api Node tinha: um
passo que baixa o arquivo da tag, recalcula o `sha256sum` e compara com
`contracts/baseline/v1.0.0.sha256`. Se a cópia local do contrato divergir da tag, o CI reprova
**antes** de alguém implementar contra um arquivo editado à mão. A regra que isto executa é a de
sempre: **o contrato não se edita do lado do servidor** — nem para "corrigir um typo", nem para
"acrescentar um campo que faltou". Falta de campo é PR neste repositório.

Uma versão nova (§7) é, para vocês: trocar a tag no comando acima, regerar as interfaces, compilar
e implementar as operações que o compilador apontar como novas. Nada do que já estava compilado
quebra — é isso que a regra aditiva compra.

## 10. As travas que valem em qualquer linguagem

Não estão aqui: estão em [`onboarding.md` §4](onboarding.md), e são pré-requisito para a primeira
classe. Em uma linha cada, para você saber se precisa voltar lá: isolamento multi-tenant mora no
**banco** (RLS), não no código · dinheiro é **centavos inteiros**, float é proibido · erro é
**problem+json** com vocabulário fechado ([`erros.md`](erros.md)) · rota do contrato ainda não
implementada responde **501**, nunca 404 · sessão é **cookie opaco**, JWT é proibido · JPA nunca
gera DDL.

## 11. Como estes números foram medidos (e o que os falsearia)

**Contrato e registry (2026-09-02):** as 205 operações e a divisão 168/37 saem de
`pnpm contrato:delta` e de `src/mocks/rotas-do-backend.ts` lido em código, neste repositório. A
compatibilidade do `oasdiff` com **OpenAPI 3.1.1** — que é a versão deste documento — foi
verificada rodando o binário `oasdiff 1.30.0` contra os dois arquivos: sem mudanças no par
idêntico, cinco erros no par com um campo renomeado.

**Servidor Node (2026-08-29):** a medição foi **estática**, nenhum servidor foi levantado. O
`CLAUDE.md` avisa, com razão, que conferência estática não substitui sonda ao vivo — a diferença
aqui é que **a api está congelada**, então a leitura de código não envelhece. Foi por isso que se
pôde medir assim, e é a única circunstância em que se pode. Foram duas fontes independentes, e
elas concordaram exatamente:

1. **A allowlist `AINDA_SEM_HANDLER`** de `tests/cobertura-do-contrato.test.ts`, no api. Ela não é
   prosa: o CI de lá reprova nos dois sentidos — nome que o contrato não declara (lixo de
   renomeação) e nome que **já ganhou handler** e continua na lista. É uma declaração de ausência
   com quem a invalide, que é raro o bastante para merecer confiança.
2. **Um grep independente** pelas chaves do mapa de handlers, restrito às raízes que
   `src/core/http/servidor.ts` compõe (`src/modules/**` mais `src/core/auth/rotas.ts`). A restrição
   importa: varrer `src/` inteiro casaria com `contrato.ts`, que é tipo gerado e contém os 199
   nomes — daria "199 de 199 implementadas", que é falso e parece ótimo.

As duas deram os mesmos 36 nomes, sem divergência em nenhuma direção. **E o conjunto de operações
não mudou desde então:** os 205 `operationId` de hoje são exatamente os de `d846259`, o commit em
que a medição foi feita — conferido por comparação de conjuntos, não por contagem, que não
distinguiria uma troca de mesmo tamanho.

**O que falsearia as §4 e §5:** descongelar a api. Qualquer commit em `cabinet-erp-api` depois de
`ac00bb9` invalida as duas de uma vez, e aí não há remedição estática que valha — teria que voltar
a sonda ao vivo (`pnpm par:ao-vivo`). As §2, §3, §6 e §7 sobrevivem: elas falam do contrato, não do
servidor.
