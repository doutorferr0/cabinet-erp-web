# Varredura de código — cabinet-erp-web

**Data:** 2026-09-07 · **Base:** `main` @ `5e44e32` · **Escopo:** 689 arquivos, 150.081 linhas (fora `src/api/gerado/`)

**Como foi medido.** `npx tsc -p tsconfig.app.json --noEmit` (verde), `npx biome check src` (verde, 696 arquivos),
`pnpm build` (verde), `pnpm test` em duas versões de Node, cruzamento programático de `contracts/openapi-v1.json`
contra os chamadores, e detecção de exports/arquivos sem referência. Nenhum número aqui é estimado — cada um
tem o comando que o produziu.

**O que a varredura NÃO cobriu:** o par ao vivo contra o `cabinet-erp-api` (exige servidor de pé), acessibilidade
visual, e o e2e do Playwright.

---

## Sumário

| # | Achado | Classe | Gravidade |
|---|---|---|---|
| 1 | Suite quebra inteira em Node 24 (1.247 falhas); versão do Node não é fixada em lugar nenhum | bug/ambiente | **crítica** |
| 2 | `catch` do transporte converte erro de programação em "rede fora" | bug | **alta** |
| 3 | `formatDateBR` sobre campo `date-time` em 3 pontos — data ilegível na tela | bug | **alta** |
| 4 | Participação do pedido tem duas chaves de cache; nenhuma invalidação cruza | bug | **alta** |
| 5 | Busca de CEP falha em silêncio e roda mock em produção | bug | média |
| 6 | Seleção da DataTable por identidade de referência sobrevive ao refetch | bug | média |
| 7 | `listar<T>` duplicado; bloco de paginação replicado em 17 mocks | duplicidade | média |
| 8 | `variacao()` e `variacaoDoMes()` — mesma conta, fórmulas divergentes | duplicidade | média |
| 9 | Três formatadores reimplementados fora de `lib/formatters.ts` | duplicidade | baixa |
| 10 | `chip-de-agrupamento.tsx` reimplementado inline na barra de filtros | duplicidade | baixa |
| 11 | 8 hooks e 4 arquivos (610 linhas) sem nenhum consumidor | código morto | média |
| 12 | 4 dependências órfãs no `package.json` | código morto | baixa |
| 13 | `renderLinha` recalcula células duas vezes por linha | desempenho | baixa |
| 14 | ~67 kB de fixtures de mock no bundle de produção | desempenho | baixa |
| 15 | `useMemo` sem efeito em `useBuscaDeRegistro` | desempenho | baixa |
| 16 | `VITE_DEMO_PASS` embutido no bundle público | segurança | informativa |

---

> **RESOLVIDO em 2026-09-07, na branch `chore/node-24-e-deps`.** O repositório passou a
> Node 24 (`.nvmrc`, `engines.node`, os dois jobs do CI lendo o `.nvmrc`) e às versões estáveis
> mais recentes de todas as dependências, exceto uma. O que fechou a janela foi o **vitest 4** —
> isolado em teste mínimo: com vitest 3 o defeito persiste mesmo no jsdom 30; com vitest 4 some
> mesmo no jsdom 26. Resultado em Node 24: **3.173 testes passando, 0 falhas**. Ver a seção 17.

## 1. A suite inteira quebra em Node 24 — e nada no repo fixa a versão

**Gravidade: crítica.** É o achado que precede todos os outros: quem clona o repo hoje e roda `pnpm test`
com Node 24 vê 1.247 testes vermelhos que não têm relação nenhuma com o código.

Medição, mesma árvore, mesmo commit:

| Node | Test Files | Tests |
|---|---|---|
| v24.19.0 (local, `nvm`) | 137 falharam / 131 passaram | **1.247 falharam** / 1.927 passaram |
| v18.19.1 (`/usr/bin/node`) | 1 falhou / 267 passaram | **7 falharam** / 3.167 passaram |
| v22 (CI, `.github/workflows/ci.yml:38`) | verde | verde |

**Causa-raiz**, isolada em teste mínimo sob `environment: jsdom`:

```
AbortSignal.timeout ctor: AbortSignal
controller.signal ctor:   AbortSignal
mesma classe?             true true
node:                     v24.19.0
controller.signal RECUSADO: TypeError: RequestInit: Expected signal ("AbortSignal {}")
                            to be an instance of AbortSignal
timeout signal   RECUSADO: (idem)
```

O `AbortSignal` global que o jsdom instala não é o que o `undici` (dono do `fetch`/`Request` do Node) aceita.
`src/api/http.ts` passou a montar `new Request(..., { signal })` na `#409` (`dc4db5d`, o relógio de 45s), então
**toda** requisição do cliente gerado lança `TypeError` no construtor — em qualquer teste, de qualquer tela.

Agravantes:

- O `package.json` não declara `engines`, não há `.nvmrc`, não há `packageManager`. Nada avisa qual Node usar.
- O `ci.yml` usa **Node 22** no job principal (linha 38) e **Node 24** no job `ao-vivo` (linha 192), com o
  comentário: *"O Vite 8 e a suíte deste repo rodam nos dois"*. Essa frase está falsa desde a `#409`.
- Com Node 18 sobram 7 falhas reais, todas em `src/features/planner/planner.test.tsx` (o gantt do SVAR não
  renderiza). Ou seja: **as duas pontas falham por motivos opostos e só o 22 do CI passa** — a janela é estreita
  e ninguém a documentou.

**Correções, em ordem:**

1. Fixar a versão: `engines.node` no `package.json` + `.nvmrc` com `22`. É a correção que impede a próxima
   pessoa de perder a tarde.
2. Alinhar o job `ao-vivo` (ou anotar por que ele diverge, agora que "roda nos dois" não é verdade).
3. Investigar se o `signal` pode ser omitido sob jsdom, ou trocar a composição por um `AbortController` puro
   (que também é recusado — logo, a saída é não passar `signal` ao `Request` e sim ao `fetch(url, init)`,
   ou fixar o `environment` de `http.test.ts` em `node`).

---

## 2. O `catch` do transporte transforma erro de programação em "rede fora"

**Gravidade: alta.** É a razão de o achado #1 ser mudo.

`src/api/http.ts:249-257`:

```ts
} catch {
  if (relogio.expirou()) return respostaQueExpirou(url) as T
  return { data: undefined, status: 0, headers: new Headers(), url } as T
}
```

O `catch` não distingue **falha de rede** (para a qual `status: 0` é a resposta certa e documentada) de
**erro de programação** — `TypeError` do construtor `Request`, corpo não serializável, header inválido.
No achado #1, 1.240 testes reportaram "a requisição nem saiu" quando o defeito real era um `TypeError`
lançado três linhas acima, com nome e mensagem prontos.

O mesmo vale em produção: um bug de montagem de request vira "servidor não respondeu" na tela do operador,
que vai reclamar de rede.

**Correção:** capturar o erro (`catch (erro)`) e, quando ele não for `TypeError` de rede nem `AbortError`,
relançar — ou ao menos anexá-lo ao corpo sintético, como já é feito em `respostaQueNaoEDaApi` e
`respostaQueExpirou`. O arquivo já tem a convenção de "falha nomeada"; falta o terceiro nome.

---

## 3. `formatDateBR` sobre campo `date-time` — a tela mostra `08T14:30:00.000Z/09/2026`

**Gravidade: alta** (o operador lê lixo onde deveria ler uma data).

`formatDateBR` PARTE a string em `-` e remonta (`lib/formatters.ts:57-61`). Dado `date` (`2026-09-08`) sai
`08/09/2026`. Dado `date-time` (`2026-09-08T14:30:00.000Z`) sai **`08T14:30:00.000Z/09/2026`**. O próprio
arquivo documenta o risco no comentário de `formatInstanteBR` — mas três chamadores caíram nele.

Cruzando o `format` de cada campo em `contracts/openapi-v1.json` com os 39 chamadores de `formatDateBR`:

| Local | Campo | `format` no contrato | Correção |
|---|---|---|---|
| `src/features/acesso/tela-de-acesso.tsx:197` | `InvitationDto.expiresAt` | `date-time` | `formatInstanteBR` |
| `src/features/vendas/acoes-do-ciclo.tsx:387` | `OrderProfessionalAssignmentDto.startedAt` | `date-time` | `formatInstanteBR` |
| `src/features/vendas/acoes-do-ciclo.tsx:388` | `OrderProfessionalAssignmentDto.endedAt` | `date-time` | `formatInstanteBR` |

O de `tela-de-acesso` é o mais visível: é o **recibo do convite** — a frase que diz ao administrador até quando
o link vale. Os outros dois são a trilha de indicação do pedido.

Os 36 chamadores restantes estão corretos (campos `date`, ou já passam por `diaDoInstante`/`.slice(0,10)`).

**Correção estrutural além dos três reparos:** `formatDateBR` poderia detectar o `T` e delegar, em vez de
produzir texto sem sentido — a mesma defesa que `formatInstanteBR` já tem para ISO inválido ("volta inteiro
em vez de virar Invalid Date").

Nota lateral: `features/tarefas/quadro.tsx:297` faz `formatDateBR(tarefa.dueOn.slice(0, 10))` e
`features/tarefas/lista.tsx:99` faz `formatDateBR(tarefa.dueOn)` — `TaskDto.dueOn` é `date`, então os dois
funcionam, mas a divergência sugere que ninguém tinha certeza. Vale uniformizar.

---

## 4. A participação do pedido tem duas fronteiras e duas chaves de cache — a invalidação nunca cruza

**Gravidade: alta.** É duplicidade que virou bug de dado velho na tela.

A **mesma** operação do contrato (`listOrderParticipants`) é consultada por dois hooks, em dois arquivos,
sob chaves de cache diferentes:

| Hook | Arquivo | `queryKey` |
|---|---|---|
| `useParticipantes` | `src/data/comissoes-api.ts:317` | `['pedido-venda', id, 'participacao']` |
| `useParticipantesDoPedido` | `src/data/pedidos-venda-api.ts:645` | `['pedido-venda-participantes', id]` |

E cada escrita invalida só o lado que conhece:

- `useGravarParticipantes` (`comissoes-api.ts:332`) invalida `['pedido-venda', id, 'participacao']`.
  **O painel de vendas (`features/vendas/participacao-do-pedido.tsx`) não é atualizado** — segue mostrando
  a participação anterior até o `staleTime` de 30 s vencer ou a rota remontar.
- `useTransferirProfissional` (`pedidos-venda-api.ts:597`) invalida `['pedido-venda-participantes']`.
  **A grade de comissões não é atualizada** — segue mostrando o profissional que saiu.

O comentário em `pedidos-venda-api.ts:126` afirma: *"Quem a invalida é a TRANSFERÊNCIA, e só ela — é a única
operação desta fronteira que mexe na grade"*. A frase é verdadeira **dentro daquele arquivo** e falsa no
sistema: a gravação de comissões mexe na mesma grade, por outra porta.

**Correção:** uma chave só para o recurso, num arquivo só. A regra do repo ("trocar mock→HTTP mexe em
`src/data/`, não na tela") supõe uma porta por recurso; aqui há duas.

---

## 5. A busca de CEP falha em silêncio, e é mock rodando em produção

**Gravidade: média.** Dois defeitos somados no mesmo botão.

`src/components/cabinet/blocks.tsx:52-62`:

```ts
async function buscarCep() {
  const cep = (watch(`${prefix}.cep`) as string | null) ?? ''
  const result = await fetchCep(cep)
  if (!result) return          // ← nada acontece, e ninguém fica sabendo
  ...
}
```

1. **Falha silenciosa.** CEP não encontrado devolve `null` e o `return` encerra sem aviso, sem foco, sem nada.
   O operador clica na lupa e a tela não reage — indistinguível de botão quebrado.
2. **É mock, e roda em produção.** `fetchCep` vem de `src/mocks/ceps.ts`, cuja base tem **três CEPs**
   (Av. Francisco Glicério, Av. Albert Einstein, Av. Paulista). O import é direto do mock, num componente
   compartilhado — não passa por `src/data/`, então **não depende do modo da API**: em
   `app.cabinetonline.cc`, com backend real, é essa base de três CEPs que responde. Na prática, ~100 % dos
   CEPs digitados caem no ramo silencioso.

Além disso viola a regra explícita do `CLAUDE.md`: *"tela NUNCA importa `fetch*` de `src/mocks/`"* — este é
o único descumprimento encontrado na varredura (todos os outros imports de `src/mocks/` em telas são
`import type` ou tabela de apoio estática, o que a regra permite).

**Correção mínima e imediata:** avisar quando não achar (a `regiao-de-avisos` já existe). **Correção real:**
publicar o caminho no contrato e mover para `src/data/`, como manda a regra da fase.

---

## 6. A seleção da DataTable é por identidade de referência e sobrevive ao refetch

**Gravidade: média.**

`src/components/cabinet/data-table.tsx:878` e `:1370`:

```ts
atuais.includes(linha)              // alternarLinha
const isSelected = selecionadas.includes(row.original)   // renderLinha
```

`selecionadas` guarda os **objetos** das linhas e compara por referência. Toda mudança de consulta limpa a
seleção (`updateState`), o que cobre o caso comum — mas um refetch que **não** passa por ali (invalidação
por mutação em outra parte da tela, `placeholderData: keepPreviousData` trocando as linhas) devolve objetos
novos e equivalentes. Resultado: a barra de lote diz "3 selecionadas" enquanto os três checkboxes aparecem
desmarcados, e a ação de lote age sobre objetos que não estão mais na tela.

**Correção:** guardar a chave da linha (`row.id`, que a tabela já usa como identidade no FLIP) em vez do objeto.

---

## 7. `listar<T>` duplicado, e o bloco de listagem replicado em 17 mocks

**Gravidade: média** (o mock é o que serve `cabinetonline.cc` inteiro).

`src/mocks/api/handlers.ts:161` e `src/mocks/api/crm.ts:90` definem `listar<T>` — 40 linhas praticamente
byte-a-byte iguais (valida paginação → valida `sortBy` → filtra `q` → aplica filtros → ordena → pagina).
A única diferença é a origem dos parâmetros: um recebe `ConsultaDeLista` pronta, o outro lê da `URL`.

O mesmo bloco, sem função nenhuma, está copiado à mão em mais 15 arquivos — `Paginação inválida: page é
1-based e pageSize vai até 100` aparece em **17** arquivos de `src/mocks/api/`, e o par
`sortBy` + `linhas.sort((a,b) => String(a[chave] ?? '').localeCompare(...))` aparece em 13.

Consequência prática: a semântica de listagem do contrato tem 17 implementações. Uma mudança na convenção
(um operador novo, `NULLS LAST` como padrão, um teto diferente) precisa ser aplicada 17 vezes, e a que
ficar para trás só aparece na tela daquele módulo.

**Correção:** promover um `listar` único (o de `handlers.ts`, que já recebe consulta parseada) para um
módulo compartilhado de `src/mocks/api/`, e migrar os handlers por família. `entrega.ts` já extraiu
metade disso em `ordenarPor` — é o começo do caminho.

---

## 8. `variacao()` e `variacaoDoMes()` — a mesma conta, com fórmulas diferentes

**Gravidade: média** (dois KPIs podem discordar sobre o mesmo dado).

```ts
// src/data/agregados-api.ts:129 — 6 usos (hub de módulo, 3 listagens)
export function variacao(valor: number, base: number): number | null {
  if (base === 0) return null
  return Math.round(((valor - base) / Math.abs(base)) * 100)
}

// src/data/dashboard-api.ts:179 — 1 uso (indicadores do dashboard)
export function variacaoDoMes(resumo: DashboardSummaryDto): number | null {
  if (resumo.previousMonthSalesCents === 0) return null
  const razao = (resumo.monthSalesCents - resumo.previousMonthSalesCents)
              / resumo.previousMonthSalesCents
  return Math.round(razao * 100)
}
```

As duas respondem "quanto variou contra o mês anterior", sobre o mesmo par de campos (`*Cents` /
`previousMonth*Cents`), e desenham o mesmo `delta` no mesmo componente de KPI. **Divergem no `Math.abs`:**
com base negativa (estorno acumulado no mês anterior), `variacao` devolve o sinal certo e `variacaoDoMes`
devolve o oposto. Os dois comentários explicam com cuidado a mesma decisão sobre base zero — sinal de que a
segunda foi escrita sem saber da primeira.

**Correção:** apagar `variacaoDoMes` e chamar `variacao(resumo.monthSalesCents,
resumo.previousMonthSalesCents)` em `features/dashboard/indicadores.tsx:142`.

---

## 9. Três formatadores reimplementados fora de `lib/formatters.ts`

**Gravidade: baixa.**

| Reimplementação | Original | Diferença |
|---|---|---|
| `reais()` — `src/data/pagamento-api.ts:163` | `formatMoneyBRL` | nenhuma; e monta um `Intl.NumberFormat` **a cada chamada** (o original o instancia uma vez no módulo) |
| `formatIndice()` — `src/features/produto/preco-e-margem.tsx:637` | `formatPercent` | nenhuma no código; o comentário justifica pela semântica (índice ≠ percentual) |
| `formatPercentual()` — `src/features/produto/preco-e-margem.tsx:645` | `formatPercent` | 2 casas em vez de 4, e sufixo `%` |

O caso de `reais()` é o único com custo: `Intl.NumberFormat` é caro de construir, e a função é chamada
dentro de `motivoDaRecusa`, que roda por opção de condição de pagamento na lista.

**Correção:** `reais()` → `formatMoneyBRL` (uma linha). Os dois de `preco-e-margem` podem virar parâmetro
de casas em `formatPercent`, ou ficar — a justificativa semântica é defensável, mas então merecem estar
em `lib/formatters.ts` com o nome que têm.

---

## 10. `chip-de-agrupamento.tsx` foi reimplementado inline, e o arquivo ficou

**Gravidade: baixa** (mas é duplicidade **e** código morto no mesmo lugar).

`src/components/cabinet/listagem/chip-de-agrupamento.tsx` — 158 linhas, componente completo (Popover +
Command + botão de desagrupar) — **não é importado por ninguém**. O chip que a listagem realmente desenha
está inline em `src/components/cabinet/listagem/barra-de-filtros.tsx:184-240`, com o mesmo comportamento e
os mesmos rótulos (`Agrupar por um campo`, `Desagrupar — tirar X`).

**Correção:** ou a barra passa a compor o componente, ou o arquivo é removido. Manter os dois garante que
a próxima correção de acessibilidade seja feita no que ninguém renderiza.

---

## 11. Código morto: 8 hooks e 4 arquivos sem nenhum consumidor

**Gravidade: média** — não pesa no bundle (o Rollup faz tree-shaking), mas pesa em leitura: são 610 linhas
que descrevem recursos que a aplicação não tem.

### 11a. A escrita inteira da entrega — 7 hooks, zero consumidores

`src/data/entrega-api.ts` (337 linhas) exporta 17 símbolos. **Quatro** são usados
(`useRomaneios`, `useSituacaoDoPedido`, `ROTULO_DO_ROMANEIO`, `ROTULO_DO_ESTADO_FISICO`, por
`features/vendas/situacao-do-pedido.tsx` e `ficha-lateral.tsx`). Os demais têm **zero** referências em
todo o repo, testes incluídos:

| Hook | Linha | Operação do contrato |
|---|---|---|
| `useFilaDeSeparacao` | 97 | `GET /api/picking-queue` |
| `useLiberarItem` | 184 | liberar item |
| `useSepararItem` | 215 | separar item |
| `useAbrirRomaneio` | 239 | abrir romaneio |
| `useLancarNoRomaneio` | 257 | lançar item |
| `useFecharRomaneio` | 284 | fechar |
| `useCancelarRomaneio` | 307 | cancelar |

Também sem uso: `URL_FILA_DE_SEPARACAO`, `URL_ROMANEIOS`, `CHAVES_DA_ENTREGA`, `ORDENAVEIS_DA_FILA`,
`ORDENAVEIS_DO_ROMANEIO`, `AtoNaLinha`. E não existe `src/data/entrega-api.test.ts` — a fronteira não tem
teste algum, ao contrário do que a regra de teste do repo pede para recurso HTTP.

Isto casa com a nota do `CLAUDE.md` sobre a entrega (G4, 10 operações): *"sem tela e sem handler de mock"*.
A fronteira foi escrita inteira à frente das telas. Não é um defeito por si — é dívida que precisa estar
declarada, porque hoje ela aparenta ser código em uso.

### 11b. `useContadoresDaNavegacao` — `src/data/agregados-api.ts:108`

Consulta `GET /api/nav-counters`, envolve `dadosOuErro`, e não é chamado por ninguém. Os contadores da
barra lateral vêm de `src/app/nav/contadores.ts`, que é outro caminho.

### 11c. Quatro arquivos nunca importados — 610 linhas

| Arquivo | Linhas | O que descreve |
|---|---|---|
| `src/app/cinto-provisorio.tsx` | 233 | `CintoDeNavegacao` / `CintoDeIdentidade` — o nome já diz "provisório" |
| `src/app/nav/favoritos.tsx` | 175 | o grupo **FAVORITOS** da barra lateral (D13) |
| `src/components/cabinet/listagem/chip-de-agrupamento.tsx` | 158 | ver achado #10 |
| `src/components/cabinet/favicon-do-modulo.ts` | 44 | o favicon por módulo (D35) |

O de `favicon-do-modulo.ts` merece nota: tem 14 linhas de comentário explicando por que o favicon deve
mudar por módulo (*"quem opera um ERP passa o dia com seis abas do MESMO sistema abertas"*), e o hook
`useFaviconDoModulo` nunca é montado. **O recurso descrito não existe na aplicação** — quem ler o arquivo
vai concluir o contrário. O mesmo vale para o grupo Favoritos da sidebar.

---

## 12. Quatro dependências órfãs no `package.json`

**Gravidade: baixa** (não entram no bundle, mas são instaladas e auditadas em todo CI).

| Pacote | Ocorrências em `src/` |
|---|---|
| `@schedule-x/calendar` | 0 |
| `@schedule-x/react` | 0 |
| `@schedule-x/theme-default` | 0 |
| `temporal-polyfill` | 0 |

O `src/main.tsx` já documenta a saída: *"A porta do Schedule-X, que era a outra dona, SUMIU na D12: a agenda
passou a usar o calendário do próprio sistema, e com ela foram embora o polyfill do Temporal e o tema da
lib"*. O código saiu; o manifesto não.

**Correção:** `pnpm remove @schedule-x/calendar @schedule-x/react @schedule-x/theme-default temporal-polyfill`.
Atenção à regra do dono único do `package.json` (§Regra de ouro).

---

## 13. `renderLinha` recalcula as células duas vezes por linha

**Gravidade: baixa.**

`src/components/cabinet/data-table.tsx:1377-1386`:

```ts
const apagada = row.getVisibleCells().some(
  (cell) =>
    cell.column.columnDef.meta?.tipo === 'status' &&
    (tomDoValor(cell.getValue()) === 'done' || tomDoValor(cell.getValue()) === 'void'),
)
```

`getVisibleCells()` é chamado aqui e de novo no `map` de renderização, e `tomDoValor(cell.getValue())` roda
**duas vezes por célula** dentro do `some`. Com 50 linhas × 10 colunas são 1.000 chamadas redundantes por
render da tabela.

**Correção:** `const celulas = row.getVisibleCells()` no topo, e `const tom = tomDoValor(cell.getValue())`
dentro do predicado. Duas linhas.

---

## 14. ~67 kB de fixtures de mock entram no bundle de produção

**Gravidade: baixa**, e é dívida já declarada no `CLAUDE.md` — o número serve para dimensioná-la.

`src/data/` importa fixtures de `src/mocks/` fora de `import type`, então elas entram no grafo de produção
independentemente do modo da API:

`orcamentos.ts`, `ordens-compra.ts`, `pedidos-compra.ts`, `colaboradores.ts`, `bancos.ts`, `cidades.ts`,
`clientes.ts`, `fornecedores.ts`, `profissionais.ts`, `transportadoras.ts`, `produtos.ts`, `inbox.ts`,
`ceps.ts` — **66.830 bytes** de fonte.

Isto é o outro lado da frase do `CLAUDE.md`: *"o `app.` mostra dado fake onde a tela ainda é mock, e isso
NÃO é modo mock"*. Some conforme cada provider migrar para HTTP.

Referência do build atual (`pnpm build`, verde, 222 chunks): entrada `index` 439,69 kB (gzip 137,39 kB),
`planner` 260,39 kB (gzip 82,98 kB), `data-table` 130,96 kB (gzip 37,31 kB). O code-splitting por rota do
TanStack Router está funcionando — o gantt não entra na página de login.

---

## 15. `useMemo` sem efeito em `useBuscaDeRegistro`

**Gravidade: baixa.**

`src/data/busca-de-registro.ts:325-359`: o `useMemo` depende de `consultas`, que é um array novo a cada
render (`useQueries`). O comentário reconhece isso e conclui o oposto: *"o que muda de verdade é o estado
de cada uma, e é por ele que este memo tem de passar"* — mas a dependência é a identidade do array, não o
estado, então o memo **recalcula em todo render**. Não causa bug (o cálculo é puro e barato); apenas não
faz o que diz fazer.

**Correção:** ou remover o `useMemo`, ou depender das fatias que importam
(`consultas.map(c => c.status).join()`), e corrigir o comentário.

---

## 16. `VITE_DEMO_PASS` embutido no bundle público

**Gravidade: informativa** — é decisão consciente, registrada em `.env.example` e no `CLAUDE.md`.

`src/mocks/api/handlers.ts:277-278` lê `VITE_DEMO_USER`/`VITE_DEMO_PASS`, e o Vite inlineia toda variável
`VITE_*` no JavaScript servido. A credencial `demo@vertziluminacao.com.br` / `senha1234` é, portanto,
legível no bundle de `cabinetonline.cc`.

É aceitável **porque** o demo é 100 % MSW, sobre dados fabricados, sem backend atrás. O que vale registrar
é a fronteira: essa aceitação **não pode** ser estendida ao projeto `cabinet-erp-app`, cujo painel
deliberadamente não define essas variáveis. Se um dia alguém copiar a env de um projeto para o outro
"para facilitar o teste", a mesma linha de código passa a embutir credencial de um sistema com dado real.

### O que a varredura NÃO encontrou (e procurou)

Registrado porque ausência de achado também é resultado:

- `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` em código de aplicação: **nenhum**.
- `target="_blank"` sem `rel="noreferrer"`: **nenhum** (os 3 casos declaram `rel`; a paleta passa
  `'noreferrer'` ao `window.open`).
- Injeção pela URL: o `filters` vindo do endereço passa por `JSON.parse` protegido, valida operador contra
  enum fechado e descarta campo fora da whitelist da tela **antes** de virar consulta
  (`filtros/filtro-na-url.ts:115-133` e `api-provider.ts:filtrosDaTabela`). Bem defendido nas duas pontas.
- `catch` vazio que engole erro: **nenhum**; os 16 `catch` silenciosos têm comentário justificando e um
  caminho de recuperação explícito.
- Comparação frouxa (`==`/`!=`): 5 ocorrências, todas `== null` intencionais.
- Mutação de array do store nos mocks: **nenhuma** — todo `sort` incide sobre cópia (`[...itens]` ou `.map`).
- A matriz `PAPEL_MINIMO_POR_FAMILIA` (`src/data/papeis.ts`) declara corretamente que serve só para
  **esconder** controle, nunca para autorizar, e que a autoridade é o servidor. Correto.

---

## Ordem sugerida

**Agora** (barato, e destrava o resto)
1. `.nvmrc` + `engines.node` (#1) — sem isso, `pnpm test` não é confiável na máquina de ninguém.
2. Os três `formatDateBR` → `formatInstanteBR` (#3) — três linhas, e apaga texto sem sentido da tela.
3. `reais()` → `formatMoneyBRL` (#9).
4. Aviso no CEP não encontrado (#5, metade 1).

**A seguir** (correção de verdade)
5. Unificar a chave de cache da participação do pedido (#4).
6. Relançar erro não-de-rede no transporte (#2).
7. Apagar `variacaoDoMes` (#8).
8. Seleção por `row.id` (#6).

**Faxina** (uma passada só, com o dono do `package.json` presente)
9. Remover os 4 arquivos órfãos e os 8 hooks sem consumidor — ou declará-los como dívida datada (#11).
10. Remover as 4 dependências órfãs (#12).
11. Decidir entre o `chip-de-agrupamento` e a versão inline (#10).

**Quando houver fôlego**
12. `listar` único nos mocks (#7).
13. Micro-otimização do `renderLinha` (#13).
14. `useMemo` da busca (#15).

---

## 17. A migração para Node 24 — o que foi feito, medido

**Branch:** `chore/node-24-e-deps` · **Data:** 2026-09-07 · Fechamento verde: `pnpm check`,
`pnpm check-types` (e `tsc --noEmit` sem cache), `pnpm test` e `pnpm build`, tudo em **Node v24.19.0**.

### 17.1 A causa, isolada

O achado #1 dizia "trave em Node 22". O pedido virou "faça o 24 funcionar", e a primeira pergunta
era qual dependência resolvia. Medido num projeto mínimo, quatro combinações:

| vitest | jsdom | `new Request(url, { signal })` em Node 24 |
|---|---|---|
| 3.2.7 | 26.1.0 | `TypeError` |
| 3.2.7 | 30.0.1 | `TypeError` |
| 4.1.11 | 26.1.0 | **aceito** |
| 4.1.11 | 30.0.1 | **aceito** |

**Quem resolve é o vitest 4, não o jsdom.** Isso importa porque decide o custo: o caminho para
Node 24 passa por um major que toca os 272 arquivos de teste, não por uma troca lateral de ambiente.

### 17.2 Resultado

| Medida | Antes (Node 24) | Depois (Node 24) |
|---|---|---|
| Testes | **1.247 falhando** / 1.927 passando | **0 falhando** / 3.173 passando |
| Arquivos de teste | 137 falhando | 0 falhando |

As 7 falhas do Planner que apareciam em Node 18 também somem: o gantt do SVAR roda em 24.

### 17.3 O que subiu

**Majors:** vitest 3→4 · jsdom 26→30 · Biome 1.9→2.5 · TypeScript 6→7 ·
@testing-library/jest-dom 6→7 · @types/node 24→26 · motion 12→13 · lucide-react 0.479→1.38 ·
**@tanstack/react-table 8→9** (§17.6).

**Minors/patches:** @tanstack/react-router, @tanstack/react-query, @tanstack/router-plugin,
@radix-ui/react-slot, @atlaskit/pragmatic-drag-and-drop, @hookform/resolvers, react-hook-form,
zod, vite, orval, @vitejs/plugin-react, @faker-js/faker, @testing-library/react,
@testing-library/user-event, @types/react, @types/react-dom.

**Removidas** (as 4 órfãs do achado #12 — atualizá-las seria manter peso morto):
`@schedule-x/calendar`, `@schedule-x/react`, `@schedule-x/theme-default`, `temporal-polyfill`.

**E `@tanstack/react-table` 8 → 9**, autorizada à parte por ser decisão de stack. Ver 17.6.

### 17.4 O que cada major exigiu

| Onde | O que | Correção |
|---|---|---|
| `.nvmrc`, `package.json`, `ci.yml` | Nada declarava a versão do Node, e os dois jobs divergiam (22 e 24) | `.nvmrc` com `24`, `engines.node: ">=24"`, e os **dois** jobs passam a ler `node-version-file: .nvmrc` — uma autoridade só |
| `tsconfig.app.json` | TS 7 **removeu** `baseUrl` | `paths` com caminho relativo (`./src/*`) |
| `tsconfig.app.json` | `@types/node` 26 deixou de resolver por via transitiva | `types: ["vite/client", "node"]` — os testes em `src/` usam `node:fs` e `import.meta.dirname` |
| `ciclo-da-credencial.test.ts` | `ReturnType<typeof vi.spyOn>` sem argumento cai no genérico padrão do vitest 4, e `mock.calls` vira `any[]` | `MockInstance<typeof console.info>` |
| `biome.json` | Migração 1→2 (`ignore`→`includes`, `organizeImports`→`assist`, `recommended`→`preset`) | `biome migrate --write` |
| `biome.json` | Biome 2 desliga a sintaxe do Tailwind por padrão — **17 erros de parse** em `index.css` | `css.parser.tailwindDirectives: true` |
| 585 arquivos | Regra nova de ordenação de nomes importados | fix automático |

### 17.5 O que a atualização EXPÔS — três defeitos que passavam

Estes não são custo da migração; são achados que ela revelou.

1. **`aria-label` em elemento que não o suporta** (`useAriaPropsSupportedByRole`, regra nova).
   Dois casos, e nos dois o rótulo **não chegava a leitor de tela nenhum**:
   `bloco-pagamento.tsx:147` (um `<p>`) e `planner.tsx:129` (um `<span>`). O segundo tem um
   comentário explicando por que o rótulo existe — e ele nunca existiu de fato. Corrigidos com
   `role="note"` e `role="img"`, que aceitam nome acessível.
2. **Um teste que media o texto do fonte, não o valor computado.** `kpi-tile.test.tsx` asseria
   `letterSpacing === '-.03em'`; o CSSOM normaliza para `-0.03em`, e o jsdom só passou a fazê-lo
   na 30. Casava por acidente.
3. **Um conflito de acessibilidade mascarado pela biblioteca.** `filtro-por-modulo.test.tsx`
   afirmava que o nome acessível do checkbox inclui a palavra `fixa` — enquanto o componente
   marca esse `<span>` com `aria-hidden="true"`, dizendo o contrário. O cálculo de accname a
   incluía assim mesmo (com espaço antes; agora grudada), e ninguém percebia a contradição.
   **O conflito segue aberto e está registrado no teste**: é decisão de acessibilidade da tela,
   não de uma atualização de dependências. O teste passou a medir o que é verdade nas duas
   leituras — que aquele é o checkbox da coluna, marcado e desabilitado.

Além disso, o **orval 8.27 corrigiu um defeito no código gerado**: `...options?.headers` era
espalhado direto, o que quebra quando o chamador passa um `Headers` ou um array de pares. O
gerado novo normaliza antes. Nenhum chamador do repo passa esses tipos hoje — o defeito era latente.

### 17.6 `@tanstack/react-table` 8 → 9 — feita, com autorização

O custo inicial media **213 erros de tipo em 38 arquivos**, e a §Stack do `CLAUDE.md` fixa a
versão como decisão do user. Com a autorização dada, a migração foi feita — e o custo real
ficou **muito abaixo** da medição inicial, porque o inventário mostrou onde o uso estava.

**O inventário, que é o que mudou o plano:**

| Uso | Arquivos |
|---|---|
| Importam **apenas o tipo `ColumnDef`** | **37** |
| Montam a tabela (`useReactTable`, `getCoreRowModel`, `Row`, `flexRender`) | **1** (`data-table.tsx`) |

Os 213 erros eram 37 arquivos gritando a mesma coisa: `ColumnDef<TData>` virou
`ColumnDef<TFeatures, TData, TValue>`.

**A solução, num módulo só** — `src/components/cabinet/listagem/tabela.ts`:

- `featuresDaTabela = tableFeatures({...})` declara o conjunto **uma vez**;
- `export type ColumnDef<TData, TValue> = ColumnDefV9<FeaturesDaTabela, TData, TValue>`
  reexporta o tipo **com o mesmo nome**, então a tela segue escrevendo `ColumnDef<Cliente>` e só
  o caminho do import muda;
- o `meta` da coluna saiu do `declare module '@tanstack/react-table'` e virou o slot
  `columnMeta` do mesmo objeto — o alcance passa de global para este conjunto de features.

**Resultado:** 37 trocas de import (mecânicas), 1 arquivo de lógica migrado, e 5 componentes
genéricos que ganharam `<T extends LinhaDaTabela>` — a v9 passou a exigir que a linha seja
record ou array, não `unknown`.

**As três features registradas, e por que só três:**

| Feature | Por quê |
|---|---|
| `columnVisibilityFeature` | o menu `Colunas` esconde e mostra |
| `columnOrderingFeature` | o arraste do mesmo menu reordena |
| `rowSortingFeature`, **sem** `sortedRowModel` | dá o `enableSorting` que 22 colunas usam para dizer "este campo não está na whitelist de `sortBy` do servidor", e a seta do cabeçalho — mas **não** o row model, porque quem ordena é o backend |

Essa última linha é a tradução do antigo `manualSorting`/`manualPagination`: na v9, "a ordenação
é do servidor" se diz **não registrando o row model**. Registrar os dois faria a página vir
ordenada do servidor e ser reordenada no cliente sobre as 10 linhas da página — a lista pareceria
certa e estaria errada a partir da página 2.

**Auditoria das mudanças semânticas** (as que compilam e mudam comportamento): varri o repo por
`getState()`, `onStateChange`, `sortingFn`, `getIsSomeRowsSelected`, `columnSizingInfo`,
`enablePinning`, a família `getLeft*`/`getRight*` do pinning e os internos `_`-prefixados.
**Nenhuma é usada** — a superfície do repo são 8 métodos, todos de leitura.

**Verificação:** 3.173 testes passando (88 só da tabela, incluindo `aria-sort` no cabeçalho e a
whitelist de ordenação), `tsc` limpo, build verde. O chunk `data-table` **encolheu** de
130,96 kB para 124,42 kB (36,50 kB gzip) — é o tree-shaking que a v9 promete, com três features
em vez do pacote inteiro.

**`useLegacyTable` não foi usado.** O pacote oferece essa ponte, e o próprio guia de migração diz
para não mirar nela: é deprecada e só serve para manter uma migração em curso andando. O repo foi
direto para `useTable`.

### 17.7 Escopo do linter, e por quê

O Biome 2 passou a lintar **SVG e HTML**, o que trouxe 19+ diagnósticos em arquivos que não são
código da aplicação. Ficaram fora do escopo:

- `src/assets/**` — ornamentos decorativos; a acessibilidade deles é decidida pelo componente que
  os monta, não pelo arquivo.
- `docs/**/*.html` — mockups-espelho de design.

E quatro regras foram desligadas por não caberem neste repositório: `useHookAtTopLevel` (os hooks
daqui se chamam `usar*`, em PT-BR, e o Biome só reconhece o prefixo `use` — 13 falsos positivos,
mais o padrão `render` do `Controller` do RHF), `noImportantStyles` (os `!important` são
deliberados e já documentados no CSS: vencem `style` inline do DCard e implementam
reduced-motion), `noDescendingSpecificity` e `noDocumentCookie`.

### 17.8 Uma armadilha paga nesta sessão, para quem vier depois

**`biome.json` não aceita comentários `//`.** Um comentário JSONC acrescentado à config fez o
Biome falhar o parse — e o `pnpm check` (`biome check --write`) então rodou **sem configuração
nenhuma**, reformatando 848 arquivos com os padrões de fábrica (tabs, aspas duplas, ponto e
vírgula) em vez dos do repositório. E **não é reversível rodando o check de novo**: o formatador
preserva quebras de objeto já existentes, então `Intl.NumberFormat('pt-BR', { … })` que cabia em
uma linha ficou quebrado em quatro.

A recuperação foi restaurar do HEAD por escrita (`git show HEAD:path > path`) os 715 arquivos que
só carregavam a reformatação, mais os 14 editados, e reaplicar as edições uma a uma. Se precisar
comentar a config: renomeie para `biome.jsonc`, ou ponha a justificativa no `CLAUDE.md`. E confira
que a config parseia **antes** de rodar qualquer `--write`.
