# Integração — o front é o dono do contrato

`contracts/openapi-v1.json` **não é cópia de contrato alheio**: é a especificação
de ENTRADA que o backend precisa implementar. Ele muda **só por PR neste
repositório**; caminho que o front define antes de existir servidor entra
marcado `Proposto`.

O cliente é gerado dele (`pnpm codegen`, **Orval** + passo pós-codegen, saída
commitada em `src/api/gerado/`, **nunca editada à mão**). O CI tem o passo
`Codegen is up to date`: refaz o codegen e reprova se `src/api/gerado` divergir
de `contracts/`. É a guarda inteira — não existe mais conferência contra
repositório de backend.

## Semânticas inegociáveis

Quem implementar o contrato honra isto. Não são preferências: cada uma já está
codificada em `src/data/` e travada por teste, e mudar qualquer uma quebra tela.

- **Envelope de listagem `{ rows, total }`.** `total` é o total **pós-filtro**,
  não o da página — é dele que sai a paginação.
- **`page` é 1-based.** Página 1 é a primeira; 0 não existe.
- **`pageSize` tem teto 100.** Acima do teto a resposta volta truncada, e a UI
  avisa que foi truncada (combo que corta em silêncio faz "não achei" e "não
  existe" virarem a mesma coisa, e o operador cadastra duplicado).
- **`sortBy` é whitelist e recusa com 400.** Campo fora da lista é erro, não
  ordenação ignorada: ignorar faria a tela mostrar ordem errada sem sintoma. Por
  isso o `accessorKey` das colunas é o nome **em inglês** do contrato.
- **Erro é `application/problem+json`** (RFC 9457). O **409 de parceiro com
  documento já cadastrado carrega `existingPartnerId`** — membro de extensão fora
  do schema do `ProblemDetails`, e é ele que habilita "Vincular esta empresa ao
  cadastro existente" (`POST /api/partners/{id}/link`). Sem esse campo o 409 vira
  beco sem saída. Por isso `ErroDaApi` guarda o corpo cru.
- **`mustChangePassword` bloqueia o domínio com 403, nunca 401.** 401 significa
  "não autenticado" e derrubaria a sessão que acabou de ser criada — o usuário
  está autenticado, só não pode operar antes de trocar a senha. A rota
  `/trocar-senha` é a única que passa; trocar a senha invalida a sessão anterior.
- **Empresa ativa vazia = lista vazia, não erro.** Sessão sem empresa escolhida é
  estado legítimo do cliente. (O 409 documentado em listagem cobre o caso de
  recurso que exige empresa; lista de escopo vazio devolve `{ rows: [], total: 0 }`.)
- **`features` do vínculo (`Proposto`) é o que a EMPRESA opera, não o que a
  pessoa pode.** Papel (`role`) e recurso (`features`) são eixos diferentes: um
  `owner` de empresa que só vende continua sem Fornecedores. Enum fechado
  (`suppliers` · `professionals` · `employees`), **sempre presente** — empresa
  sem recurso opcional devolve `[]`, nunca omite o campo, porque ausência viraria
  "não sei" e o front teria de escolher entre esconder tudo e oferecer tela que
  não existe. É de `features` que saem o menu lateral (`gruposVisiveis`), a
  guarda de rota (`RequireRecurso`) e as linhas de cadastro do boletim.
- **`PUT` substitui o registro INTEIRO.** Corpo parcial apaga o que não veio —
  por isso todo caminho de escrita monta o corpo a partir do registro inteiro
  (`corpoDeEscrita`, `produtoParaContrato`), inclusive desativar (`active: false`).
- **Dinheiro em centavos (int).** Nunca float, em lugar nenhum. Percentual com 4
  casas implícitas (`10000` = 1%). Quantidade com até 3 casas. Datas ISO no dado.
  CPF/CNPJ sem máscara no dado.
- **Desativação é lógica.** Existe `active`; nada é excluído de verdade.

## Como o dado chega à tela

```
telas (routes/ + features/)
        │  só conhecem  →  data.<recurso>.list / .get / .empty
        ▼
src/data/index.ts        ← REGISTRY: o único arquivo que muda ao ligar um recurso
        │
        ▼
src/data/provider.ts     ← contrato (ListProvider / ResourceProvider)
        │  mock   →  createMockProvider sobre src/mocks/
        │  HTTP   →  createApiListProvider + cliente gerado
```

Tela **nunca** importa `fetch*` de `src/mocks/` nem chama o cliente gerado
direto. De `src/mocks/` só vêm **tipos** e **tabelas de apoio estáticas**.
Trocar mock→HTTP mexe em `src/data/`, não na tela.

**A entrada do registry tem a forma do que o CONTRATO oferece**, não a que a tela
gostaria: expor um `get` mock ao lado de listagem real casaria uuid do servidor
com id inventado e responderia "não encontrado" para registro que existe.

## Estado — o que já é HTTP

| Fronteira | Caminhos | Onde |
|---|---|---|
| Sessão, empresa ativa, troca de senha | `/auth/login` · `/auth/logout` · `/auth/me` · `/auth/tenants` · `/auth/active-tenant` · `/auth/change-password` | `src/data/sessao.ts`, `empresas-api.ts` |
| Listas de apoio (19 kinds) | `GET /api/catalog-lookups` | `src/data/lookups-api.ts` |
| Produtos (listagem, detalhe, escrita, desativar) | `GET`/`POST` `/api/products` · `GET`/`PUT` `/api/products/{id}` | `src/data/produtos-api.ts` |
| Variantes (grade de Valores) | `POST` `/api/products/{productId}/variants` · `PUT` `…/variants/{id}` | `src/data/produtos-api.ts` |
| Kardex de estoque | `GET`/`POST` `/api/variants/{variantId}/stock-movements` | só o **tipo** chegou; tela é decisão de produto |
| Parceiros — Fornecedor, Cliente, Profissional | `GET`/`POST` `/api/partners` (filtro `role`) · `GET`/`PUT` `/api/partners/{id}` · `POST` `/api/partners/{id}/link` | `src/data/parceiros-api.ts` |

**Ainda mock, por falta de caminho no contrato:** pedido e ordem de compra ·
cidades · resumo do Boletim.

**Caminho no contrato, tela ainda mock:** orçamento e colaborador. Os caminhos
existem (ver abaixo), o cliente gerado existe, mas `src/data/` ainda não os
consome — a troca é a rodada seguinte, e mexe em `src/data/`, não na tela.

### Orçamento — `/api/quotes`, caminhos `Proposto`

Escritos pelo front a partir da transcrição §8.1/§8.2 e da engenharia reversa do
banco do legado (`docs/legado/`). Cinco decisões que quem implementar honra:

1. **`number` é do servidor.** Sequência **global do grupo**, não por empresa —
   decisão registrada em `project-core` @decisoes, apoiada nos 34.136 documentos
   do legado, onde `Ven_CodigoPre` já é única entre as duas empresas. Não existe
   na escrita: cliente que escolhe número colide entre empresas. A chave continua
   composta com tenant; numeração global não é PK sem tenant.
2. **Orçamento e Pedido são agregados distintos.** No legado são o mesmo registro
   com `Ven_Tipo` O/P — uma tabela de 90 colunas com metade nula conforme o tipo.
   Aqui Pedido **não** é um campo do orçamento; entra como recurso próprio quando
   tiver tela, e a conversão será operação explícita.
3. **Itens e ambientes viajam embutidos, `PUT` substitui o documento inteiro.**
   Sub-recurso por linha faria um `Gravar` virar N requisições sem transação entre
   elas (a armadilha que produto+variantes já tem, registrada no fim deste
   arquivo) — numa grade de dezenas de linhas, falha no meio deixaria metade
   gravada. Item de documento não tem identidade fora do documento.
4. **Ambiente tem TRÊS camadas, e o contrato tem duas delas.** Catálogo por
   empresa em `GET /api/catalog-lookups?kind=AMBIENTE`; instância no documento em
   `QuoteDetailDto.environments[]`, com `name` **congelado**; item aponta por
   `environmentCode`. É o desenho do legado (`Ambiente` → `VendaAmbiente`, que já
   guarda `VenAmb_Descricao` própria → `VendaProduto.CodAmbiente`). String livre no
   item não serve: renomear ambiente reescreveria item a item, ambiente vazio não
   poderia existir, e a ordem — que o PDF usa para agrupar — não teria onde morar.
   **`order` é acréscimo do front**, o legado não tem coluna de ordem.
5. **Documento cancela, não desativa.** `status: active|cancelled` por
   `POST /api/quotes/{id}/cancel`; `active` de cadastro não serve para documento.
   A listagem continua mostrando o cancelado, com a situação.

Descrição, acabamento, tamanho e preço do item são **snapshot da emissão**, não
leitura do catálogo — senão corrigir o cadastro reescreveria orçamento do ano
passado (regra do `project-core` @arquitetura).

**Falta conhecida:** `kind` `AMBIENTE` ainda não está no vocabulário de
`src/data/lookups-api.ts` (são 19 kinds hoje). Entra junto com a wiring da tela.

### Colaborador — `GET /api/employees`, só leitura

Aberto para o `salespersonId` do orçamento ter para onde apontar. **Não tem
`POST`, `PUT` nem detalhe por id**: o formulário de RH são ~30 campos da
transcrição §2 e merece corte próprio; detalhe que devolvesse só os 5 campos da
listagem mostraria formulário quase em branco. **Não tem `code`** — o legado
identifica funcionário por CPF e não guarda código humano, então a coluna
`Código` sai da listagem em vez de exibir um uuid.

### Dashboard e Planner — caminhos `Proposto`, sem servidor ainda

Entraram no contrato pelo front (nenhum backend os implementa) e no
`VITE_API_MODE=mock` quem responde é `src/mocks/api/handlers.ts` sobre o store em
memória. Do ponto de vista da tela **já são HTTP**: passam pelo cliente gerado,
pelos helpers de `src/data/api-provider.ts` e pelo mesmo tratamento de
`problem+json` do resto. Trocar o mock pelo backend não mexe em tela nenhuma.

| Fronteira | Caminhos | Onde |
|---|---|---|
| Indicadores do Dashboard | `GET /api/dashboard/summary` | `src/data/dashboard-api.ts` |
| Agenda (calendário do mês + dia) | `GET /api/dashboard/agenda?from&to` | idem |
| Quadro de tarefas | `GET`/`POST` `/api/tasks` · `PATCH /api/tasks/{taskId}` | idem |
| Lista A fazer | `GET /api/todos` · `PATCH /api/todos/{todoId}` | idem |
| Planner — projetos e plano | `GET /api/projects` · `GET /api/projects/{projectId}/plan` | `src/data/planner-api.ts` |
| Nome do operador na saudação | `SessaoAtual.displayName` (nullable) | `src/data/sessao.ts` |

Três decisões que quem implementar o backend precisa honrar:

1. **`GET /api/tasks` NÃO é `PagedResult`.** O quadro mostra as quatro colunas de
   uma vez; página de 10 cortaria coluna no meio e daria contagem de coluna
   errada. Crescendo o volume, o corte é por período/responsável, não por página.
2. **`PATCH /api/tasks/{taskId}` é a única exceção à regra do `PUT` inteiro**, e
   ela existe porque o cartão do quadro não carrega o registro completo — um
   `PUT` a partir dele apagaria o que a tela não mostra. Campo **ausente** fica
   como está; campo **`null`** apaga.
3. **`from`/`to` são obrigatórios na agenda.** Sem eles a resposta seria a agenda
   inteira, e a tela pediria um mês achando que recebeu um mês.

O `displayName` é `null` quando o servidor não sabe — a tela cumprimenta sem
nome, em vez de exibir e-mail ou id, que são identificador de sistema.

**Faltas conhecidas do contrato:** sem `DELETE` de variante (excluir linha da
grade tira da TELA; a saída é desmarcar `Ativo` e gravar) · `Índice` e
`Tipo de Valor` da §6.3 não existem no DTO · `Marca`, `Fábrica` e
`Tipo de Produto` não existem no `ProductDto`. Coluna que o DTO não tem **sai da
listagem** e campo que o servidor não guarda aparece **em branco**, com o
`AvisoDeCobertura` dizendo isso ao operador — preencher com mock daria dado de
mentira com cara de dado do servidor.

## Parceiros — uma tabela, três telas

`GET /api/partners` serve **Fornecedor**, **Cliente** e **Profissional Externo**:
são PAPÉIS do mesmo cadastro, e o filtro `role` decide qual. **Papel inválido é
400**, não filtro ignorado — ignorado faria a tela de Fornecedores mostrar
clientes sem ninguém desconfiar.

A resposta junta duas origens: `legalName`, `tradeName`, `document`, `email` e os
três papéis são do cadastro da **organização**; `code`, `paymentTerms` e `active`
são do vínculo com a **empresa**. Por isso `Ativo` na tela é o `active` do
vínculo — a pergunta do operador é "esta empresa trabalha com este fornecedor?".

Incluir cria o cadastro com **o papel da tela e nenhum outro** (o schema exige ao
menos um papel; marcar os três faria todo cadastro novo aparecer nas três
listagens). **Vincular não edita:** o corpo do `link` só tem `code`,
`paymentTerms` e `active`, senão "vincular" viraria caminho para sobrescrever em
silêncio a razão social que a empresa vizinha cadastrou.

## Testes

Recurso HTTP se testa contra **servidor falso** (`instalarServidor`, `json`,
`problema` em `src/test/servidor.ts`), nunca com mock do módulo. O cliente gerado
chama `fetch(new Request(...))`: **verbo e corpo vêm do `Request`** — `init.method`
dá sempre `GET`, e stub que casa só por caminho deixa `POST` cair na resposta do
`GET`, com o teste passando sem asserir nada. Caminho sem rota declarada responde
404 de propósito.

Tela usa `renderRoute('/url')` (router real); componente isolado usa
`renderWithQuery(<X />)` — ambos em `src/test/utils.tsx`. Recurso mock segue
travado por `src/data/provider.test.ts`; os HTTP, por `src/data/<recurso>-api.test.ts`.

## Armadilhas conhecidas

- **Um `Gravar` pode virar N requisições em endpoints diferentes e não há
  transação entre elas** (produto + variantes). Falha no meio deixa o anterior
  gravado: a mensagem tem de dizer qual linha caiu e mandar reabrir.
- **Texto→número na borda:** vazio é `null` (ausência), texto inválido é
  `undefined` (recusa). Colapsar os dois faria erro de digitação apagar dado em
  silêncio (`parseQuantidade`).
- **Repetição de consulta:** `repetirSeValeAPena` não repete 4xx. Com o retry
  padrão do TanStack Query, um 409 deixaria a tela ~7s em esqueleto antes de
  dizer o que o servidor respondeu de primeira.
- **404 por id vira `null`**; qualquer outro status rejeita. Tratar 409 junto com
  404 mandaria o operador procurar registro que está lá.
- `pnpm build` **não** regenera `src/routeTree.gen.ts` quando há rota nova (o
  script é `tsc -b && vite build` e o `tsc` falha antes do plugin rodar): rodar
  `pnpm dev` uma vez, depois `pnpm check-types`.
- Um `useFieldArray` externo sobre o mesmo array de uma `FormGrid` **não**
  re-renderiza a tabela. Quem insere linha de fora usa a prop `actions`.
