# Kanban de funil — nota de integração

Fonte: [marmelab/atomic-crm](https://github.com/marmelab/atomic-crm), MIT (ver `NOTICE`).
Arquivos lidos: `DealListContent.tsx`, `DealColumn.tsx`, `DealCard.tsx`, `stages.ts`.

**Estado: ENTREGUE — nota histórica desde 2026-08-25.** Nada aqui é importado por `src/` (era
material colhido, não código), mas o que estava "abaixo, em ordem de dependência" aconteceu: o
quadro é `src/features/crm/pagina-do-funil.tsx` e o caminho existe no contrato como
`PATCH /api/crm/opportunities/{id}/stage`, servido pelo backend desde a #274.

**Uma coisa mudou de nome no caminho, e é a que mais confunde quem lê isto agora:** o corpo
proposto aqui é `{ "stage": "negociacao", "precedeId": … }` e o contrato fechou
`{ "stageId": <uuid>, "precedeId": <uuid|null> }` — o estágio virou REGISTRO por funil
(`CrmStageDto`: `id`, `pipelineId`, `name`, `sort`, `probability`, `isWon`/`isLost`, `rotDays`),
então o destino viaja por id e não por slug; o contrato ainda escreve que estágio de OUTRO funil
é 400, porque mudar de funil é `PUT` e reseta a posição. `precedeId` sobreviveu exatamente como
está descrito abaixo. Ler o resto como o registro do PORQUÊ; o QUE está no contrato.

## Por que esta fonte, e não outra

O funil de oportunidade é o desenho aprovado do 13º módulo (CRM entrou em 2026-08-13, @decisoes do
`project-core.md`). As referências mais completas de funil são **Odoo** (`crm.lead`, stage,
rotting) e **Twenty CRM** — LGPL e AGPL. Pela política de fontes, dessas sai CONCEITO, nunca
código. Atomic CRM é MIT, é React + shadcn/ui + Tailwind — a mesma base deste repo — e é a única
da lista de onde o código pode de fato ser copiado.

O que não se copia dela: react-admin. Atomic CRM é uma aplicação react-admin, e `ra-core` está
presente em todos os quatro arquivos (`useListContext`, `useDataProvider`, `RecordContextProvider`,
`ReferenceField`, `useRedirect`). Adotar react-admin seria decisão de stack, não colheita — está
fora do que este trabalho pode fazer, e nem foi proposto. Por isso o que sobrou foi a ESTRUTURA
(quadro → coluna → cartão, agrupamento por etapa, ordenação por inteiro), com o acoplamento a
react-admin removido peça por peça.

## Três coisas do original que não atravessam, e a que substitui cada uma

### 1. A reindexação não atravessa

`DealListContent.tsx` persiste um arrasto assim: busca todas as oportunidades da coluna de origem e
da coluna de destino (`getList`, `perPage: 100`), calcula quais índices deslizam, e dispara **um
`update` por linha afetada**, em `Promise.all`. Mover um cartão do topo de uma coluna de 40 para o
topo de outra são ~80 requisições.

Aqui isso quebra em três lugares diferentes:

- **Atomicidade.** Com RLS e `SET LOCAL` por transação (@arquitetura), cada requisição é uma
  transação própria. Metade das reindexações aplicadas e metade falhadas deixa a coluna com dois
  cartões no mesmo índice — e o critério de ordenação vira "o que o banco devolver primeiro".
- **Contrato.** O front não inventa chamada HTTP. Oitenta `PATCH` de índice teriam de estar no
  `contracts/openapi-v1.json` como fluxo, e não é assim que o Cabinet escreve intenção.
- **Filtro.** O `perPage: 100` é um teto silencioso. Coluna com 101 oportunidades reordena errado
  sem avisar ninguém.

**O que substitui:** o quadro emite UMA intenção — `onMover(oportunidadeId, { etapa, precedeId })`
— e quem persiste é `src/data/`. `precedeId` é o id do cartão na frente do qual a oportunidade
fica, `null` para o fim da coluna. Referência a vizinho em vez de índice numérico, porque índice é
posição numa lista que pode estar filtrada e vizinho é um fato sobre dois registros que o servidor
verifica.

O caminho `Proposto` que isso pede no contrato:

```
PATCH /api/crm/opportunities/{id}/stage
body: { "stage": "negociacao", "precedeId": "uuid|null" }
```

O servidor faz a reordenação inteira em UMA transação. Se ele guardar `ordem` como inteiro denso,
reindexa a coluna ali; se guardar como racional/`numeric` entre vizinhos, nem reindexa. Essa é
decisão do backend, e é justamente o tipo de decisão que o front não deve tomar mandando 80
requisições.

### 2. O arrasto não atravessa sozinho

Atomic CRM usa `@hello-pangea/dnd` (fork mantido do `react-beautiful-dnd`). Dependência nova, e
esta tarefa não adiciona dependência — mas o problema não é só esse:

| | `@hello-pangea/dnd` | HTML5 nativo (o que está staged) |
|---|---|---|
| custo | +1 dep, ~30 kB gzip | zero |
| teclado | tem (espaço pega, setas movem, anúncio em `aria-live`) | **nenhum** |
| touch | tem | irregular entre navegadores móveis |
| placeholder animado | tem | não |

O staged usa nativo **mais** um menu `Mover para` em cada cartão. O menu é o caminho principal e o
arrasto é o atalho por cima dele — a regra de interface por clique do `CLAUDE.md` diz que nenhum
fluxo pode depender de gesto memorizado, e arrasto nativo não tem caminho de teclado nenhum.

**Se o funil for para produção com arrasto como interação principal, `@hello-pangea/dnd` volta à
mesa** e vira decisão de dependência para o user, com o dono do `package.json`. O staged foi
escrito para que essa troca seja local: o motor de arrasto mora nos handlers de `FunilCartao` e
`FunilColuna`; `funil-agrupa.ts` e a intenção `onMover` não mudam.

### 3. A mutação de estado não atravessa

`updateDealStageLocal` faz `column.splice(...)` sobre os arrays que estão dentro do estado e devolve
`{...dealsByStage, [stage]: column}`: objeto novo por fora, arrays mutados por dentro. É por isso
que o `useEffect` de lá precisa de `isEqual` do lodash — a comparação por referência já não
significa nada. `funil-agrupa.ts` é puro, e o `useEffect` do quadro volta a poder comparar
referência, sem lodash.

## O que a integração ainda precisa, e não está aqui

1. **Contrato.** Não existe caminho de CRM em `contracts/openapi-v1.json`. Precisa entrar marcado
   `Proposto`: `GET /api/crm/opportunities` (com `stage` no filtro), `PATCH .../{id}/stage`, e as
   etapas do funil — que são **lista de apoio**, não constante de código: no legado tudo que é lista
   de apoio vive em `catalog-lookups`, e etapa de funil é exatamente isso. Mexeu no contrato →
   `pnpm codegen` e commitar `src/api/gerado/` no mesmo PR (o CI reprova o gerado velho).
2. **Tipos.** `funil-tipos.ts` morre no dia da integração. `OportunidadeDoFunil` sai do codegen.
3. **Entrada em `src/data/`.** `data.oportunidades` com `list`/`moverEtapa`. Enquanto o servidor não
   existir, respondem os handlers de `src/mocks/api/handlers.ts`, como já acontece com dashboard e
   planner — a tela não sabe a diferença.
4. **Campos.** As 20 telas transcritas em `transcricaosoftlux.md` **não têm funil** — o Softlux não
   tem camada de relacionamento, e é por isso que o CRM entrou. `topicos/dashboard.md` também não
   cobre. Logo: **cada campo do cartão é pergunta para o user**, não inferência. O staged mostra
   título, parceiro e valor porque são o mínimo para o quadro fazer sentido; `Valor previsto`,
   `Data prevista`, `Origem`, `Motivo de perda` e `Probabilidade` são conceitos do Odoo e ficam como
   conceito até o user confirmar quais existem aqui.
5. **Cor do módulo.** `src/app/modulo.ts` tem oito módulos com par de cor travado pelo user, e CRM
   não é um deles. O staged fica na superfície neutra. Atribuir a nona cor é decisão do user — o
   mesmo tratamento que Colaboradores já recebe lá.
6. **Testes.** `funil-agrupa.ts` é puro e se testa direto (etapa desconhecida cai na primeira,
   `precedeId` órfão vai para o fim, movimento nulo devolve a mesma referência). O quadro se testa
   com `renderWithQuery` e o menu `Mover para` — arrasto nativo não é simulável de forma honesta em
   jsdom, e teste de arrasto que passa em jsdom não prova que o arrasto funciona.

## Custo estimado

Estrutura e regras de agrupamento: **prontas** (é o que está staged). O que resta é contrato,
codegen, fronteira de dado, decisão de campos e decisão de cor — nenhum deles é trabalho de kanban.
