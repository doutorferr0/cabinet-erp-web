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
- **Erro é `application/problem+json`** (RFC 9457), **em TODA resposta 4xx/5xx,
  com um schema só.** `title` e `status` são obrigatórios; `detail` é a frase
  daquela ocorrência. As duas extensões são DECLARADAS no schema: `fields[]`
  (validação por campo) e `existingPartnerId` (no 409 de parceiro com documento
  já cadastrado, que é o que habilita "Vincular esta empresa ao cadastro
  existente" — sem ele o 409 vira beco sem saída). Por isso `ErroDaApi` guarda o
  corpo cru. Ver §Problem Details.
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

## Problem Details — o formato ÚNICO de erro (RFC 9457)

O contrato definia sucesso com precisão e deixava o erro subespecificado. Sem
formato único, cada caminho do backend inventaria o seu e a tela trataria caso a
caso — e isso precisa fechar **antes de o backend começar**, porque depois cada
divergência já tem um cliente.

**Medição antes de mexer:** das 106 respostas 4xx/5xx do contrato, **102 já
apontavam** para `ProblemDetails`. O trabalho não era converter tudo: era
enriquecer o schema e fechar as 4 exceções.

### O schema

`title` e `status` **obrigatórios** — `title` é o rótulo ESTÁVEL do tipo (não
varia entre ocorrências) e `status` repete o da resposta, porque o corpo circula
fora dela (log, fila, tela). `detail` é a frase daquela ocorrência, e é a única
parte acionável: a tela mostra o que veio, nunca "algo deu errado".

**As duas extensões são declaradas no schema, não soltas numa resposta:**

| extensão | onde | para quê |
|---|---|---|
| `fields[]` (`{path, message}`) | 400 de validação | o erro chega ao CONTROLE do formulário, não ao topo da tela |
| `existingPartnerId` | 409 de documento repetido | habilita a oferta de vincular ao cadastro existente |

`path` é o caminho no CORPO da requisição (`code`, `variants.0.priceCents`), como
o cliente o mandou — nome de coluna do banco não serve, porque a tela não conhece
o banco.

### Não existe 422

A DoD do trilho pedia 422 para validação. **Não entrou, e é decisão:** o contrato
já usa **400** para validação em todo lugar. Dois códigos para a mesma coisa
obrigariam cada caminho a escolher um e a tela a tratar os dois — o `fields[]`
viaja no 400 que já existe.

### As exceções que sobraram

- **`GET /health/db` 503** continua com `ReadinessStatus`, e está escrito no
  contrato: prova de vida é lida por orquestrador, não por operador. Quem chama
  quer o documento de prontidão (migrações pendentes) para decidir se derruba a
  instância; enfiá-lo em `detail` obrigaria a parsear frase.
- **`LoginFalhou` foi REMOVIDO.** Era `{detail}` — um `ProblemDetails` degenerado
  — usado em 3 respostas de `/auth`. As três passaram ao schema único, com
  `application/problem+json` no lugar de `application/json`. Schema órfão vira
  tipo gerado que ninguém usa, e o próximo leitor não sabe se é dívida ou reserva.

### No front

`ErroDaApi` ganhou `titulo` e `campos` — leitura defensiva, porque o corpo vem do
servidor e pode não ter a forma prometida; item malformado é descartado em vez de
quebrar a tela. `ErroDoServidor` (`src/components/cabinet/`) é o componente único
que mostra os quatro textos em papéis distintos e leva o foco ao campo recusado.

**A guarda é `src/data/problem-details.test.ts`**, que lê o contrato DIRETO:
caminho novo com 4xx entra na verificação sozinho.

### Latência artificial no mock

`VITE_MOCK_DELAY` (padrão **250ms**, `0` desliga) atrasa toda resposta do modo
mock. Sem ela todo estado de carregamento passa em zero frame: esqueleto que
nunca aparece, botão que não chega a desabilitar, corrida entre consultas que
nunca acontece — defeitos que existem desde já e só apareceriam no dia da
integração, com um backend novo para culpar.

Mora só em `src/mocks/browser.ts`, e é isso que a mantém fora dos testes: a suíte
importa `handlers` direto. O mecanismo é um `http.all('*')` que espera e resolve
`undefined` — no MSW isso é "não tratei, passe adiante" (verificado com teste
antes de entrar, não assumido).

### O helper de erro mora num lugar só

`src/mocks/api/problema.ts`. Nasceu duplicado em `handlers.ts` e `crm.ts` — cópia
deliberada, para não criar ciclo (`handlers.ts` importa `crm.ts`) — e saiu de lá
quando o `title` deixou de ser fixo: **formato de erro em duas cópias vira dois
formatos**, e o mapa de títulos ia nascer duplicado no mesmo dia. O módulo é
folha, então o ciclo que justificava a duplicação não existe mais.

O `title` vem de `tituloDoStatus`: 400 `Requisição inválida`, 404 `Não
encontrado`, 409 `Conflito`… Antes era `'Erro'` em 100% das respostas, o que é
pior do que parece — o `ErroDoServidor` mostra `title` como cabeçalho e a frase
da tela abaixo, então todo erro do modo mock aparecia como "Erro" em cima e a
informação útil embaixo, menor. Backend com tipos próprios (`/erros/estoque-insuficiente`)
manda o título dele; o mapa por status é o piso, não o teto.

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

| CRM — funis, estágios, oportunidades, motivos de perda | `GET`/`POST` `/api/crm/pipelines` · `GET`/`PUT` `…/{id}` · `GET`/`POST` `…/{pipelineId}/stages` · `PUT` `…/stages/{id}` · `GET`/`POST` `/api/crm/opportunities` · `GET`/`PUT` `…/{id}` · **`PATCH` `…/{id}/stage`** · `GET`/`POST` `/api/crm/lost-reasons` · `PUT` `…/{id}` · **`GET` `/api/crm/reports/lost-reasons`** | `src/data/crm-api.ts` — caminhos `Proposto`, servidos por `src/mocks/api/crm.ts` no modo mock |

**Ainda mock, por falta de caminho no contrato:** pedido e ordem de compra ·
cidades · resumo do Boletim.

### CRM — por que perdemos é AGREGAÇÃO do servidor (2026-08-14)

`GET /api/crm/reports/lost-reasons?pipelineId&from&to` devolve a contagem por
motivo no período, ordenada pelo maior. É caminho próprio, e não uma soma feita
na tela sobre a listagem, por uma razão de tamanho: **a listagem tem teto de 100
por página**, então contar do lado do cliente sairia certo numa empresa pequena e
**errado, sem sintoma**, na primeira que passasse do teto. Relatório que erra
calado é pior que relatório nenhum, porque alguém decide com ele.

`from`/`to` são **obrigatórios**: contagem sem recorte responde outra pergunta e
cresce para sempre — um motivo aposentado há três anos continuaria liderando o
quadro. O recorte é por DIA (`closedAt`), não por instante.

`lostReasonId` da linha é **anulável**, e só em registro MIGRADO: o
`PATCH …/stage` exige o motivo, então perda sem motivo não nasce pelo produto. O
legado tem, e omitir a linha faria a soma das linhas não bater com o `total` — a
divergência entre os dois é justamente o sintoma que se quer ver.

### CRM — o movimento do quadro é uma requisição só (2026-08-13)

`PATCH /api/crm/opportunities/{id}/stage` recebe destino (`stageId`) e VIZINHO
(`precedeId`, `null` = fim da coluna), e o servidor reordena a coluna inteira
numa transação. **Não é preferência de estilo:** o desenho alternativo — o
cliente calcular índices e mandar um `PUT` por linha deslocada — está medido em
`docs/harvest/kanban-funil/integracao.md`, e com RLS + `SET LOCAL` cada
requisição é transação própria, então falha no meio deixa dois cartões no mesmo
lugar sem sintoma. `precedeId` é referência a vizinho e não índice porque índice
é posição numa lista que pode estar filtrada.

Três coisas o servidor escreve e o cliente nunca manda: `order`,
`stageChangedAt` e `closedAt`. São consequência do movimento — deixar o cliente
escrevê-las permitiria um cartão dizer que está parado há um mês desde ontem.

**`order` ainda não existe no schema mergeado (#66).** O DTO o publica porque
sem posição persistida o `precedeId` não resolve nada; é coluna a acrescentar do
lado do backend, e está anotada como pendência, não como campo inventado.

**Estágio não tem `active`.** `crm_stages` não guarda desativação, então não há
`DELETE` nem baixa lógica de coluna: estágio fora de uso se resolve movendo os
cartões e deixando a coluna vazia. É a única divergência conhecida contra o
padrão 8 dos cadastros, e é do schema, não da tela.

### Produto — o que a extração devolveu (2026-08-13)

`ProductDto`, `ProductDetailDto` e `ProductWriteRequest` cresceram de 4 para 9
campos com o que a engenharia reversa confirmou: `specialCode`, `shortCode` e o
par `unitIn`/`unitInQty` × `unitOut`/`unitOutQty`. Todos `Proposto`.

**Três códigos, e continuam três.** O legado guarda `Nosso Código`, `Código
Especial` e `Código Reduzido` por produto, e a operação usa os três — unificar em
um só quebraria a busca do operador que decorou o outro.

**Quatro campos de unidade, não dois.** Entrada e saída podem ter unidades
DIFERENTES: comprar em caixa de 12 e vender em peça é rotina do ramo. O front
manda os quatro que a tela §6 tem; o fator de conversão é derivado pelo servidor
(a modelagem guarda `unit_factor`), e a tela não o calcula — inventar a conta
aqui seria regra de negócio no cliente.

**Quantidade viaja como string decimal**, pela mesma razão do dinheiro em
centavos: quantidade tem 3 casas e float perde centésimo.

E o `Excluir` da listagem monta o `PUT` a partir da linha, então os campos novos
vão junto: sem isso, desativar apagaria código e unidade do cadastro inteiro.

**Segunda leva, no mesmo dia: a classificação do catálogo.** `productTypeId` +
`productTypeName`, `brandId` + `brandName`, `factoryId` + `factoryName`. Com
eles, três das quatro colunas que a §6 pede **voltaram à listagem**: `Tipo de
Produto`, `Marca` e `Fábrica`. `Valor de Tabela`, a quarta, continua fora — ela é
da VARIANTE (§6.3), e derivar "o preço da primeira variante" seria regra
inventada na tela.

**Id E nome viajam juntos**, o mesmo par de `customerId`/`customerName` do
orçamento: o id é a referência que a escrita usa, o nome é o que a listagem
mostra sem carregar três listas de apoio inteiras só para resolver três colunas.
Na ESCRITA vai só o id — aceitar nome deixaria a tela renomear a lista de apoio
por engano.

**A tela guarda o id sem editá-lo, e isso é o ponto delicado.** O formulário
escolhe a classificação pelo NOME (é o que `useLookupOptions` expõe) e o contrato
escreve por id. Sem guardar o id que veio na leitura, gravar qualquer outro campo
mandaria os três nulos e o `PUT` apagaria a classificação. Por isso `Produto` tem
`tipoProdutoId`/`marcaId`/`fabricaId` — dado do servidor que a tela devolve
intacto, a mesma técnica do `tradeName` na tela de Clientes.

**As três colunas novas não são ordenáveis** (`enableSorting: false`): o
`accessorKey` viaja como `sortBy` e a whitelist do servidor é
`code`/`description`/`active`. Clicar em `Marca` mandaria `sortBy=brandName` e
voltaria 400 — a tela quebraria no CLIQUE, não na carga, que é o pior lugar
porque o operador associa a quebra ao que ele acabou de fazer. Quando a whitelist
crescer, tira-se a trava.

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

## Filtro estruturado da listagem — `filters` + `joinOperator` (`Proposto`)

A `VitraDataTable` filtra por `campo + operador + valor` (issue #68, portado de
sadmann7/shadcn-table — ver `NOTICE`), e desde a issue #77 o contrato publica por
onde isso viaja: **`filters` e `joinOperator`, os dois `Proposto`**, em
`GET /api/products`, `GET /api/partners`, `GET /api/crm/opportunities` (#86) e
`GET /api/quotes` (#134).

### Como viaja

`filters` é um **array JSON url-encoded** num parâmetro só:

```
GET /api/products?q=lustre&filters=%5B%7B%22field%22%3A%22description%22%2C%22operator%22%3A%22iLike%22%2C%22value%22%3A%22cristal%22%7D%5D
```

Parâmetro repetido com delimitador (`filter=code:iLike:ABC`) foi recusado: o
`value` é texto do operador e pode conter qualquer caractere, então o delimitador
exigiria um escape inventado — e bug de escape aparece como **resultado errado, em
silêncio**, que é o modo de falhar que este contrato evita em todo lugar. JSON tem
escape definido e parser em toda linguagem.

O item é `ListFilter` — `field`, `operator`, `value`. **`value` some** em
`isEmpty`/`isNotEmpty` (mandar `''` obrigaria o servidor a decidir se o vazio é o
valor ou a ausência dele) e é **array** em `inArray`/`notInArray` e em `isBetween`
(`[de, ate]`, ponta vazia = extremo aberto).

**O que o front NÃO manda:** `filtroId` (chave de linha do React) e `variante`
(qual controle desenhar). As duas são decisão de tela; mandá-las faria o servidor
receber UI e um dia depender dela.

`joinOperator` (`and` padrão, `or`) vale para a lista inteira e **só viaja quando
não é o padrão** — a mesma regra do campo vazio, para não sujar a chave de cache.
Junção por condição permitiria `A e B ou C`, cuja precedência ninguém lê
corretamente numa lista sem parênteses.

`filters` e `q` se **somam com AND**: `q` é texto livre sobre os campos que o
recurso escolheu, `filters` é campo a campo.

### Whitelist, e onde ela é barrada

Cada recurso declara a sua no contrato, na descrição do parâmetro. Em produtos e
parceiros é a **mesma do `sortBy`** — `code`/`description`/`active` em produtos,
mais `legalName`/`tradeName`/`document` em parceiros — e cresce quando uma tela
precisar. Campo fora dela é **400**, como no `sortBy`: filtro ignorado faria a
tela mostrar resultado errado sem sintoma.

**Oportunidade é a primeira whitelist MENOR que a de `sortBy`**, e a subtração é
uma regra do front, não um esquecimento: `expectedValueCents` fica de fora porque
dinheiro trafega em centavos e o filtro **não tem variante de dinheiro** (ver
`src/lib/filtro-de-consulta.ts`, §Dinheiro fica de fora). Filtrar por `1000` traria
R$ 10,00 para quem procurava mil reais — número certo, significado errado, sem
sintoma. Ordenar por centavos continua valendo: a ordem é a mesma. Sobram `name`,
`partnerName`, `stageName`, `expectedCloseDate` e `stageChangedAt`.

No front a lista mora em `FILTRAVEIS` (alias de `ORDENAVEIS` em `produtos-api.ts` e
`parceiros-api.ts`; lista própria em `crm-api.ts`) e **`filtrosDaTabela` barra antes
de sair** — mesma escolha já feita para `page` e `pageSize`: requisição sabidamente
inválida faria o defeito de quem chamou chegar à tela com cara de erro do servidor.

### O modo mock filtra de verdade — nos três recursos que publicam o parâmetro

`src/mocks/api/filtro-do-servidor.ts` é a peça compartilhada: converte `filters`
para o vocabulário de `filtro-de-consulta`, aplica com `linhaPassaNosFiltros` e
responde **400** ao que o contrato manda recusar. Usam-na `crm.ts` (oportunidades)
e `handlers.ts` (produtos e parceiros). **Fronteira em duas cópias vira duas
fronteiras** — a regra tem de ser a mesma nos três, com o mesmo texto de erro.

Cada recurso declara a whitelist COM O TIPO de cada campo, porque `variante` não
viaja no contrato (é decisão de qual controle desenhar) e sem ela a comparação de
data cairia em texto. Recurso que **não** publica `filters` — `catalog-lookups`,
kardex, atividades — não declara nada, e o filtro que chegar é 400.

**Três coisas viram 400, e as três existiam como silêncio:**

| pedido | antes | agora |
|---|---|---|
| campo fora da whitelist | (crm: 400) · produtos/parceiros: lista inteira | 400 nos três |
| recurso que não publica `filters` | lista inteira | 400 |
| operador fora do vocabulário (`contains` em vez de `iLike`) | condição não recortava nada → lista inteira | 400 |

O terceiro apareceu escrevendo o teste desta mudança: `filtroCasa` não reconhece a
palavra, a condição passa todo mundo, e o sintoma é idêntico ao do parâmetro
descartado. O contrato tipa `operator` como enum — aceitar qualquer texto era o
mesmo buraco uma camada abaixo.

**Por que isto era grave e não "coisa de mock":** `cabinetonline.cc` roda em modo
mock. O operador montava "Ativo é não", lia a condição aplicada no painel e via a
lista inteira, com os ativos dentro. Não é limitação de mock — é a tela afirmando
o que não é.

### Armadilha do cliente gerado

O parâmetro é declarado com `content: application/json`, que o Orval traduz para
`filters?: ListFilter[]` — tipo correto. Mas o **construtor de URL gerado**
(`getListProductsUrl`) serializa todo parâmetro com `String(value)`, e um array de
objetos vira `[object Object]`. **Nenhuma listagem passa por ele** (quem monta a
consulta é `createApiListProvider`, com `urlComQuery`), e a regra de fronteira já
proíbe a tela de chamar o cliente gerado — mas quem for usar `listProducts()` à mão
precisa serializar o `filters` antes.

### O que o operador DIGITA × o que o dado GUARDA

`CampoFiltravel.normalizar` converte o valor **só na saída**, e existe por causa
de um caso concreto: **CPF/CNPJ trafega sem máscara e se digita com ela**
(convenção do CLAUDE.md). Sem isso, `12.345.678/0001-90` procurado como está não
casaria com nada — a listagem diria "nenhum registro" para um cadastro que existe,
e o operador conferiria o documento dígito a dígito procurando o erro dele.

Quem aplica é a `VitraDataTable`, no mesmo ponto em que decide o que já é frase
completa (`filtrosNormalizados(filtrosValidos(...))`) — **normaliza depois de
validar**, porque um documento meio digitado continua sendo filtro sem valor. O
campo continua exibindo o que foi digitado: limpar a máscara na tela apagaria a
pontuação embaixo do cursor no meio da digitação.

`somenteDigitos` é o normalizador dos três cadastros de parceiro. **Dinheiro ainda
não tem o seu** — a conversão reais→centavos não é limpeza de caractere, é
mudança de unidade, e enquanto não existir variante própria coluna de dinheiro não
entra na lista de campos filtráveis.

### A UI continua opt-in por tela

A prop `filtros` da `VitraDataTable` é quem liga o painel, e só declara campos a
tela cujo provider sabe responder. Hoje filtram:

| tela | origem | campos |
|---|---|---|
| Produtos | HTTP (`/api/products`) | Nosso Código · Nossa Descrição · Ativo |
| Clientes | HTTP (`/api/partners`) | Código · Nome · CNPJ/CPF · Ativo |
| Fornecedores | HTTP (`/api/partners`) | Código · Nome Fantasia · Razão Social · CNPJ/CPF · Ativo |
| Profissionais | HTTP (`/api/partners`) | Código · Nome de Apresentação · Nome · CNPJ/CPF · Ativo |
| Colaboradores | mock | Código · Nome · Setor · Cargo · Ativo |
| Orçamentos | mock | Número · Cliente · Descrição da Obra · **Data Emissão** · **Data Validade** |
| Pedidos de Compra | mock | Código · Pedido de Venda · Data · **Fornecedores** (multivalorado) |
| Ordens de Compra | mock | Código · Fornecedor · Data Ordem · Data Envio · Data Prevista |

**Campo filtrável ≠ coluna**, mas as telas de parceiro seguem as colunas de
propósito, com uma exceção: `document` filtra sem ser coluna, porque é a busca
mais natural do cadastro. A recíproca não vale — a tela de Clientes não oferece
`tradeName`, que está na whitelist e no DTO, porque ela não mostra Nome Fantasia:
filtro por coluna fora da vista faz o operador estreitar a listagem sem enxergar
por quê.

Recurso sem o parâmetro publicado (`catalog-lookups`, `stock-movements`) não passa
`filtraveis`, e a fronteira recusa em voz alta se alguém declarar campos ali.

### Data: o filtro é o DIA, e o input é o nativo

A variante `date` usa `<input type="date">`, como o `DateField` do formulário — o
dado é ISO (`yyyy-mm-dd`), que é exatamente o que o input produz e consome, e o
calendário vem do sistema operacional. **A primeira versão deixou data de fora
alegando falta de dependência de calendário; era erro de leitura do próprio
repo**, e por causa dele a consulta mais comum de uma listagem de documento —
"os orçamentos de agosto" — não existia.

A comparação é sobre a **string ISO**: `yyyy-mm-dd` ordena lexicograficamente na
mesma ordem em que ordena cronologicamente, então `Date` só acrescentaria fuso a
uma pergunta que não tem hora.

**O filtro pergunta pelo DIA, não pelo instante.** Campo que guarde
`2025-08-05T14:32:00Z` é comparado pelos 10 primeiros caracteres: sem isso,
`em 05/08` não acharia nada emitido às 14h e `até 05/08` deixaria o próprio dia
de fora — a listagem cortaria um dia sem explicação. A faixa do `isBetween` é
**fechada nos dois extremos**, que é o que "entre 01/08 e 05/08" quer dizer na
boca de quem pergunta.

Não existe `dateRange` como variante separada: `date` + `isBetween` já rende dois
campos de data, e uma variante a mais para o mesmo resultado seria escolha sem
consequência na tela.

### Campo multivalorado casa por ALGUM elemento

`PedidoCompra.fornecedores` é `string[]`, e a coluna concatena os nomes. O
avaliador reconhece o array e casa quando **algum** elemento casa — não pela lista
concatenada, que é o que `String(array)` faria por acidente, com vírgula, que nem
é o separador que a tela mostra.

**Negar quer dizer "NENHUM elemento casa"**, e a diferença aparece com dois
valores: um pedido com fornecedores `[A, B]` e o filtro "não contém A" tem de
EXCLUIR o pedido — ele tem o A. Testar elemento a elemento com a negação embutida
faria o B responder "não contém A" e o pedido entraria na lista, que é o oposto do
pedido.

### Consultas favoritas — a pergunta com nome

A combinação de filtro + junção + ordenação se salva com nome e volta com um
clique (`ConsultasFavoritas`, ao lado do painel de filtro).

**Guarda o que a CONSULTA é, não o que a tela mostrou.** `page` e `q` ficam de
fora: página é onde o operador parou de rolar naquele momento, e `q` é texto
livre de uma pergunta pontual — restaurá-los faria o favorito abrir na página 4
de uma busca que ninguém lembra ter feito.

**Um padrão por tela, aplicado na abertura.** É o caso que se repete todo dia, e
cobrar dois cliques por ele seria cobrar pelo mais frequente. Clicar na estrela do
próprio padrão desmarca — senão não haveria como voltar a abrir a tela sem filtro.

**`localStorage` versionado** (`cabinet.consultas-favoritas.v1`), porque não há
backend de preferência de usuário. Quando houver, o que muda é a origem da lista,
não a forma. Toda leitura tolera lixo: JSON quebrado ou item estragado vira lista
vazia (ou some sozinho, sem levar os irmãos). **Perder um favorito é aborrecimento;
perder a listagem por causa de um valor gravado seria defeito.**

**A identidade da tela vem do `queryKey`** — já é o nome estável da listagem. O
acoplamento tem preço: trocar o `queryKey` por motivo de cache faria os favoritos
sumirem em silêncio, e por isso há teste fixando a chave de cada tela. Se ele
ficar vermelho, a decisão é migrar o guardado, não atualizar o valor esperado.

**Agrupamento não entra ainda porque não existe** — os view modes são padrão
aprovado e não implementados. O campo cabe depois sem quebrar o que já está
gravado: ausência = sem agrupamento.

### O que continua de fora, agora medido

**Dinheiro não tem consumidor.** As oito listagens com filtro foram verificadas e
**nenhuma tem coluna de dinheiro** — valor de orçamento é da variante, faturamento
mínimo é do formulário. A variante fica de fora por isso, que é razão mais forte do
que a anterior ("trafega em centavos"): esta é sobre demanda, aquela era sobre
mecanismo. Quando existir a coluna, o obstáculo real é que reais→centavos é
mudança de UNIDADE e não limpeza de caractere, então `normalizar` não serve — o
operador que digita `1234` quer R$ 1.234,00, e o mesmo texto lido como centavos dá
R$ 12,34.

**Faixa por slider** segue fora por falta de componente, e essa checagem foi
refeita: não há slider no repo.

## Parceiros — uma tabela, três telas

`GET /api/partners` serve **Fornecedor**, **Cliente** e **Profissional Externo**:
são PAPÉIS do mesmo cadastro, e o filtro `role` decide qual. **Papel inválido é
400**, não filtro ignorado — ignorado faria a tela de Fornecedores mostrar
clientes sem ninguém desconfiar.

A resposta junta duas origens: `legalName`, `tradeName`, `document`, `email`, os
três papéis e — desde 2026-08-13 — `registration` e `payoutBankInfo` são do
cadastro da **organização**; `code`, `paymentTerms` e `active` são do vínculo com
a **empresa**. Por isso `Ativo` na tela é o `active` do vínculo — a pergunta do
operador é "esta empresa trabalha com este fornecedor?".

**`registration` e `payoutBankInfo` são `Proposto`, e vieram da EXTRAÇÃO, não da
transcrição.** A engenharia reversa do legado (`docs/legado/`, modelagem em
`docs/cabinet/cabinet-schema.dbml`) confirmou `partners.registration` — o
CREA/CAU/CFT do Profissional Externo — e os dados bancários de comissão. As duas
coisas a tela §3 já mostrava; o que faltava era caminho no contrato, e é por isso
que a coluna `Registro Profissional` volta à listagem agora.

Os dois moram na ORGANIZAÇÃO e não no vínculo, e a distinção não é arbitrária: o
conselho profissional é do profissional, não da empresa que o contrata, e a conta
que recebe comissão é dele. Consequência que o código honra em
`corpoDeEscrita`: as telas de Cliente e Fornecedor **não editam** os dois e os
devolvem como vieram — inclusive no `Excluir`, que é um `PUT` montado a partir da
linha. Sem isso, desativar um profissional pela tela errada apagaria o conselho e
a conta bancária dele.

**Conta em branco ≠ conta vazia.** `payoutBankInfo: null` significa "não tem
conta"; um objeto com os quatro campos em branco seria um registro bancário que
existe e não paga ninguém. Quem decide é a tela (`contaDaComissao`), e o contrato
distingue os dois estados de propósito.

`Profissão`, a outra coluna que a §3 registra, **continua fora** — e agora por um
motivo mais duro que falta de contrato: ela não existe no `PartnerDto` NEM na
extração do legado. Não é lacuna de contrato, é campo sem fonte.

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
