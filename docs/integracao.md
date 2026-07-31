# Integração com o backend — o que muda quando o OpenAPI sair

Este documento é o roteiro da troca — escrito enquanto a fase mock era construída,
para que a integração não vire arqueologia.

## Estado atual — a integração começou

O OpenAPI saiu (`contracts/openapi-v1.json`, cópia versionada do contrato do
`vitra-erp-dotnet`) e o cliente gerado está commitado em `src/api/gerado/`. O que
já vem do servidor:

| Fronteira | Endpoint | Onde |
|---|---|---|
| Listas de apoio — **os 19 kinds, em todo formulário** | `GET /api/catalog-lookups` | `src/data/lookups-api.ts` |
| Empresa ativa da sessão e troca de empresa | `GET /auth/tenants` · `GET /auth/me` · `PUT /auth/active-tenant` | `src/data/empresas-api.ts` |
| Login, guarda de sessão e troca de senha | `POST /auth/login` · `GET /auth/me` · `POST /auth/change-password` | `src/data/sessao.ts` |
| **Cadastro de produtos (listagem e detalhe)** | `GET /api/products` · `GET /api/products/{id}` | `src/data/produtos-api.ts` |

O resto das telas segue em mock por **falta de contrato**, não por escolha. O
registry de `src/data/index.ts` continua sendo o único ponto que muda quando esses
endpoints existirem — a troca acontece entrada por entrada, e `produtos` já é HTTP
enquanto os vizinhos são mock.

### Publicado e ainda NÃO consumido

| Endpoint | Serviria | Situação |
|---|---|---|
| `GET /api/partners` | listagens de **Fornecedor**, **Cliente** e **Profissional** | contrato copiado e cliente gerado; **nenhuma tela ligada** |

`PartnerDto` é uma tabela só, discriminada pelo parâmetro `role` (mesma forma do
`catalog-lookups`, ADR-011): `isCustomer`, `isSupplier` e `isProfessional` são
flags do MESMO registro. As três telas do front hoje têm mock separado por
recurso (`clientes`, `fornecedores`, `profissionais`), então ligar não é trocar
uma linha do registry — é decidir se os três viram um recurso com filtro. Fica
registrado aqui em vez de resolvido no susto.

### Escrita — não existe NENHUMA

O contrato tem `POST` apenas em `/auth/login`, `/auth/logout` e
`/auth/change-password`, e `PUT` apenas em `/auth/active-tenant`. **Nenhum
cadastro tem endpoint de criação ou alteração** — nem produtos, nem parceiros.
Todo `Gravar` de formulário segue sem efeito no servidor, marcado com
`TODO(contract)` no próprio componente.

### As listas de apoio: dois controles, uma fonte

Os 19 kinds da §9 padrão 2 vêm todos de `GET /api/catalog-lookups`. A transcrição
distingue duas formas, e as duas continuam existindo — muda a origem, não o
controle:

| Na transcrição | Controle | Onde |
|---|---|---|
| `[combo +...]` (com cadastro rápido) | `LookupField` → `LookupCombo` | 14 usos |
| `[combo]` puro | `LookupSelectField` | 10 usos |

`src/data/lookups-api.ts` guarda o vocabulário inteiro: para cada kind, o
**rótulo** (UI) e o **nome no banco** (`grauInstrucao` → `GRAU_INSTRUCAO`).
Ficavam em arquivos separados, e acrescentar um kind era lembrar de dois —
esquecer um só aparecia em runtime.

**Dois cuidados que valem para os dois controles:**

- **"Carregando" e "falhou" não podem parecer "lista vazia".** Combo mudo faz o
  operador concluir que não há opção cadastrada quando o problema é outro.
- **Lista cortada no teto de 100 avisa que foi cortada.** `pageSize: 100` é o teto
  do contrato de listagem; acima dele a consulta volta truncada. No combo, a busca
  filtra só o que chegou — então "não achei" e "não existe" viram a mesma coisa, e
  o operador cadastraria duplicado pelo `...`. Quando isso começar a acontecer de
  verdade, a lista deixou de ser lista de apoio: vira `[busca +...]` (padrão 5), e
  aí o componente é outro.
- **O valor gravado é sempre exibível.** A consulta só devolve item ATIVO
  (desativação é lógica, §9 padrão 8); um registro que aponte para item
  desativado DEPOIS de gravado abriria com o campo em branco, e a gravação
  seguinte apagaria o valor sem ninguém pedir. Por isso o valor corrente entra na
  lista quando não está nela — no `LookupSelectField` e na célula `select` da
  `FormGrid`.

### O adaptador de listagem já existe

`src/data/api-provider.ts` (`createApiListProvider`) traduz o `TableQueryState` da
UI para a convenção de listagem do backend e devolve `PagedResult<T>`. Quando um
endpoint de recurso for publicado, a entrada no registry vira uma linha:

```ts
clientes: createApiListProvider<Cliente>({ url: '/api/clientes' }),
```

A convenção não é suposição — é a forma literal de `GET /api/catalog-lookups`, o
único endpoint de lista publicado, e é contra ele que `api-provider.test.ts` roda.

**`itemOuNulo` (o item por id)** entrou quando o backend publicou
`GET /api/products/{id}`, o primeiro endpoint de item. A política é a mesma dos
dois lados: **404 vira `null`** ("não existe" é resposta legítima de uma consulta
por id) e QUALQUER outro status rejeita — 409 sem empresa ativa tratado junto com
404 mandaria o operador procurar um registro que está lá.

**Repetição de consulta:** `repetirSeValeAPena` (usado como `retry` padrão do
QueryClient) não repete 4xx. Com a repetição padrão do TanStack Query, um 409
"nenhuma empresa ativa" deixaria a tela ~7s em esqueleto antes de dizer o que o
servidor respondeu de primeira. 5xx e falha de rede seguem repetindo.

### Como o dev fala com o backend

`vite.config.ts` desvia `/api` e `/auth` para `http://localhost:5251` (perfil
`http` do `launchSettings.json` do backend; `VITE_API_PROXY` troca o destino).

**A escolha é sobre o COOKIE, não sobre conveniência.** A sessão é um cookie
opaco (ADR-010, D2). Apontar o front direto para a porta do backend tornaria
toda chamada cross-origin, e aí o cookie passaria a depender de `SameSite=None;
Secure` + CORS com `Allow-Credentials` — configuração que teria de valer em
desenvolvimento e mudaria em produção. Com o proxy, `configurarApi()` fica com
base `/` e o dev se parece com a implantação. `VITE_API_URL` continua existindo
para a implantação em que as origens forem mesmo diferentes.

### Conferir a cópia do contrato

```bash
pnpm contrato:conferir     # compara com docs/contrato/openapi-v1.json do backend
```

Cópia sem conferência envelhece em silêncio: o front geraria cliente de um
contrato que o backend já mudou, e a divergência apareceria como 404 ou campo
faltando em runtime. O comando roda **local** (o repo do backend é privado; o CI
do front não tem credencial). A outra metade da guarda está no CI: o passo
`Codegen is up to date` refaz o codegen e falha se `src/api/gerado` divergir da
cópia — é a guarda que o contrato do backend pede explicitamente.

## Produtos — a tela LIGADA, e o que o contrato v1 ainda não cobre

`GET /api/products` e `GET /api/products/{id}` estão publicados e a tela consome
os dois (`src/data/produtos-api.ts`). O mock saiu do caminho: `src/mocks/produtos.ts`
só fornece o **tipo**, o registro **em branco** do "Incluir" e as tabelas de apoio
estáticas (mais o array que o boletim ainda lê).

**O contrato é menor que a tela**, e isso é visível de propósito.

### Listagem — 3 das 7 colunas da §6

| Coluna da §6 | Campo no `ProductDto` | Situação |
|---|---|---|
| `Nosso Código` | `code` | **em tela** |
| `Nossa Descrição` | `description` | **em tela** |
| `Ativo` | `active` | **em tela** |
| `Marca` | — | falta no DTO — coluna REMOVIDA |
| `Fábrica` | — | falta no DTO — coluna REMOVIDA |
| `Tipo de Produto` | — | falta no DTO — coluna REMOVIDA |
| `Valor de Tabela` | — | falta no DTO (a §6.3 põe preço na VARIANTE) — coluna REMOVIDA |

Coluna vazia em toda linha é pior que coluna ausente: lê-se como cadastro
incompleto, quando o incompleto é o contrato. As quatro voltam quando o DTO
crescer — a mudança é o `columns` de `src/routes/cadastros/produtos/index.tsx`.

O `accessorKey` das colunas é o nome do campo **no contrato** (`code`,
`description`, `active`), não o nome em português: ele viaja como `sortBy`, e a
whitelist do servidor (`contrato-http-listagem.md`) é em inglês. Nome traduzido
voltaria 400 ao clicar no cabeçalho.

### Detalhe — 4 campos das 5 abas

`ProductDetailDto` = `code`, `description`, `active` e `variants[]`. O formulário
mantém as 5 abas da §6; o que o servidor não conhece aparece **em branco**, e a
tela DIZ isso ao operador (aviso acima do formulário). Esconder as abas apagaria
o que o cadastro precisa vir a ter; preenchê-las com mock daria dado de mentira
com cara de dado do servidor.

Da grade de variantes (§6.3), o mapeamento é `finish`→Acabamento, `size`→Tamanho,
`active`→Ativo, `priceCents`→Valor de Tabela, `minStock`→Est.Mínimo. Ficam de
fora: `Índice` e `Tipo de Valor` (não existem no DTO), `stockQty` (existe no DTO e
não tem coluna na §6.3) e o `id` da variante (sem escrita, não há a quem devolvê-lo).

### Escrita de produto não existe

Não há `POST`/`PUT` de produto no contrato — conferido de novo em 2026-07-31,
depois de `GET /api/partners` entrar. `Gravar` continua sem efeito no servidor
(`TODO(contract)` em `produto-form.tsx`), e o "Incluir" abre um formulário que
ainda não tem para onde enviar.

## Divergências entre a UI e o contrato (achadas ao ler o OpenAPI)

| Assunto | UI hoje | Contrato | Situação |
|---|---|---|---|
| Ordenação | `sort: { id, desc }` | `sortBy` + `sortDesc` | **resolvida** pelo adaptador |
| Página vazia | `q` omitido quando vazio | `q` opcional | **resolvida** — campo vazio não viaja |
| **Tipo do id** | `number` nos recursos ainda mock | **uuid (string)** | **resolvida em produtos** (ver abaixo); os outros recursos mudam quando seus endpoints saírem |
| Erro em listagem sem empresa ativa | — | `GET /api/products` declara **409** | **resolvida** — o contrato de listagem revisou 500 → 409 em 2026-07-31, com o motivo: "ainda não escolhi empresa" é estado legítimo do cliente, não defeito |

### O id: chave técnica × código do operador

`docs/contrato/schema-canonico.sql` do backend resolve a dúvida:

```sql
CREATE TABLE products (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL, code text NOT NULL, description text NOT NULL,
  PRIMARY KEY (tenant_id, id), UNIQUE (tenant_id, code)
);
```

São **duas coisas diferentes**: `id` é chave técnica (uuid, nunca exibida) e
`code` é o "Nosso Código" que o operador lê e digita — único por empresa. O front
já tinha os dois separados (`Produto.id` × `Produto.nossoCodigo`), só com o tipo
errado no primeiro.

**Feito em produtos** (quando `GET /api/products/{id}` saiu): `Produto.id` é
`string`, `produtoVazio()` nasce com id vazio (a chave é do servidor, não se
inventa uuid no cliente), a rota `$produtoId` carrega o uuid como veio da URL e o
mock passou a usar uuid determinístico.

**Pendente nos demais recursos**, cada um quando seu endpoint sair — o
`ResourceProvider` mock segue com `id: number` porque é o que os mocks têm. Migrar
todos de uma vez, sem endpoint, seria trocar um id inventado por outro.

Outras confirmações do mesmo arquivo, todas batendo com o que o front assumiu:

- `product_tenant.price_cents bigint` — **dinheiro em centavos int**, como a UI.
- `stock_qty numeric(14,3)` — **quantidade com 3 casas**.
- `product_variants (finish, size)` e preço/estoque em `product_tenant` ligado à
  **variante**, não ao produto — é a decisão V7 da frente visual, confirmada.
- `employee_company.role` tem CHECK fechado: `owner`, `admin`, `operator-full`,
  `operator-sales`, `viewer`. Virou `src/data/papeis.ts` (rótulo PT-BR na UI, o
  identificador do contrato continua trafegando).

## Fronteira única

```
telas (routes/ + features/)
        │  só conhecem  →  data.<recurso>.list / .get / .empty
        ▼
src/data/index.ts        ← REGISTRY: o único arquivo que muda
        │
        ▼
src/data/provider.ts     ← contrato (ListProvider / ResourceProvider)
        │  hoje  →  createMockProvider sobre src/mocks/
        │  depois →  cliente gerado pelo codegen
```

Nenhum componente em `src/components/` ou `src/features/` importa de `src/mocks/`
para buscar dado — só para **tipos** e para **tabelas de apoio estáticas**
(`lookups.ts`, constantes como `UNIDADES`). Isso é verificável:

```bash
grep -rn "from '@/mocks/" src/routes src/features | grep -v "^.*import type"
```

## Contrato que o backend precisa honrar

`src/data/provider.ts` define o que a UI espera. `src/data/provider.test.ts` trava
esse comportamento — **esses testes não devem mudar na integração**:

| Operação | Assinatura | Endpoint esperado |
|---|---|---|
| `list(state)` | `(TableQueryState) => Promise<PagedResult<T>>` | `GET /recurso?q=&sort=&page=&pageSize=` |
| `get(id)` | `(number) => Promise<T \| null>` | `GET /recurso/{id}` → 404 vira `null` |
| `empty(id)` | `(number) => T` | **local**, não é endpoint |

Regras já assumidas pela UI:

- **Paginação 1-based**; `total` é o total **pós-filtro**, não o da página.
- **Ordenação e filtro são do servidor** — `VitraDataTable` nunca filtra no cliente
  (`manualSorting` / `manualPagination`). O `sort` viaja como `{ id, desc }`.
- **Dinheiro em centavos (int)**, nunca float. Campos terminam em `Centavos`.
- **Percentual com 4 casas implícitas** (`10000` = 1%) — `PERCENT_ESCALA`.
- **Datas ISO** (`yyyy-mm-dd`) no dado; a formatação pt-BR é da borda.
- **CPF/CNPJ sem máscara** no dado.
- Desativação lógica: existe campo `ativo`; a UI nunca exclui de verdade.
- **Consulta é a mesma tela** (`?modo=consulta`), não um endpoint separado: o
  backend não precisa de rota read-only, só do mesmo `GET /recurso/{id}`.

## Passo a passo da troca

1. **Gerar o cliente** — `@hey-api/openapi-ts` a partir do OpenAPI publicado
   (Etapa 0 do `vitra-erp-py`, passo 9). Respeitar `minimumReleaseAge` do pnpm.
2. **Substituir o corpo de cada entrada** em `src/data/index.ts`:
   ```ts
   clientes: {
     list: (state) => api.listClientes({ query: state }),
     get: (id) => api.getCliente({ path: { id } }).catch(naoEncontrado),
     empty: clienteVazio,          // continua local
   },
   ```
   O predicado `matches` some — quem filtra passa a ser o backend.
3. **Trocar os tipos**: `src/mocks/<recurso>.ts` exporta `interface X` marcada com
   `// TODO(contract)`. Passam a vir do codegen; os arrays de dado somem.
4. **Trocar os schemas Zod**: cada `features/*/…-form.tsx` tem
   `// TODO(contract): Zod do codegen substituirá este schema`. As mensagens de
   validação em PT-BR precisam ser preservadas ou reaplicadas.
5. **Gravar de verdade**: hoje todo `onGravar` é `console.info`. Vira `useMutation`
   + `invalidateQueries` da chave do recurso. As chaves já existem
   (`['clientes']`, `['produto', id]`…).
6. **Rever `staleTime`**: o provider hoje usa `staleTime: Infinity` porque mock não
   muda sozinho. Com backend real isso precisa cair.

## Onde estão os `TODO(contract)`

```bash
grep -rn "TODO(contract)" src/
```

Categorias:
- **tipos** (`src/mocks/*.ts`) — viram tipos do codegen;
- **schemas Zod** (`src/features/*/*-form.tsx`) — viram schemas do codegen;
- **tabelas de apoio que o contrato NÃO expõe como kind** (`UNIDADES`,
  `TIPOS_VALOR`, `ACABAMENTOS`, `AMBIENTES`… em `src/data/tabelas.ts`) — seguem
  locais. Os 19 **kinds** já vêm do servidor: `src/mocks/lookups.ts` não existe
  mais;
- **`TableFetcher`** (`src/lib/table-query.ts`) — o tipo já é o do contrato.

## Dados inventados (não vieram da transcrição)

A regra é **não inventar campo**. Onde a transcrição mostrava só o tipo do controle
(`[combo]`) sem as opções, foram criadas listas locais — todas marcadas, todas
precisam ser confirmadas contra o backend:

| Constante | Arquivo | Situação |
|---|---|---|
| `UNIDADES` | `mocks/produtos.ts` | inventada — §6.1 não capturou as opções |
| `TIPOS_VALOR` | `mocks/produtos.ts` | inventada — coluna cortada na captura §6.3 |
| opções de `Código do Produto` | forms | inventadas a partir do valor visto (`Fornecedor`) |
| `ORIGENS_PRODUTO` | `mocks/produtos.ts` | **não é invenção** — tabela oficial de origem ICMS |
| `AMBIENTES` | `mocks/orcamentos.ts` | inventada — §8.2 mostra a grade vazia |
| `DESTINOS` | `mocks/pedidos-compra.ts` | derivada da observação §7.4 (estoque × obra) |

## Testes

| Alvo | Como | Arquivo de exemplo |
|---|---|---|
| Tela inteira (rota + query + form) | `renderRoute('/url')` | `features/*/**.test.tsx` |
| Componente com Query, sem router | `renderWithQuery(<X />)` | `components/vitra/data-table.test.tsx` |
| Contrato de dados | `provider.list/get/empty` | `data/provider.test.ts` |
| Semântica do mock (filtro/sort/página) | `pagedMock` direto | `mocks/query.test.ts` |
| Cálculo puro (dinheiro, %, data) | função direta | `lib/formatters.test.ts`, `components/vitra/documento.test.ts` |
| Modo consulta (§9 padrão 8) | `renderRoute('/url?modo=consulta')` | `components/vitra/cadastro-form.test.tsx` |

Helpers em `src/test/utils.tsx` (`renderRoute`, `renderWithQuery`, `tableState`).
Os testes de tela chamam os providers com `delayMs = 0` através das próprias telas.

**O servidor falso já existe:** `src/test/servidor.ts` (`instalarServidor`,
`json`, `problema`). Intercepta o `fetch`, não o SDK — assim o teste exercita o
cliente gerado de verdade e quebra se o codegen mudar URL, parâmetro ou forma da
resposta. Caminho sem rota declarada responde 404 de propósito: endpoint que a
tela chama sem o teste saber aparece como falha, em vez de receber dado de outro.

```ts
beforeEach(() => {
  servidor = instalarServidor({
    '/api/produtos': () => ({ rows: [...], total: 1 }),
    '/api/produtos/erro': () => problema(409, 'Sem empresa ativa.'),
  })
})
afterEach(() => vi.unstubAllGlobals())
```

Usado hoje em `company-switcher.test.tsx` e `shell.test.tsx`. É o que substitui o
provider mock nos testes de tela conforme cada recurso for ligado à API.

**Existem dois mecanismos, por enquanto:** `renderRoute` (em `src/test/utils.tsx`)
já instala um stub próprio de sessão válida, porque a guarda consulta `/auth/me`
em toda rota; `instalarServidor` é o mapa de rotas para quem precisa de mais
endpoints ou de estado entre chamadas. Nasceram em paralelo (login × empresa
ativa) e fazem a mesma coisa por dentro — **unificar é dívida conhecida**: o
`fetchStub` do `renderRoute` deveria ser montado pelo `instalarServidor`.

## Armadilhas conhecidas

- `pnpm build` **não** regenera `src/routeTree.gen.ts` quando há rota nova: o script
  é `tsc -b && vite build` e o `tsc` falha antes do plugin rodar. Rodar `pnpm dev`
  uma vez para gerar, depois `pnpm check-types`.
- Um `useFieldArray` externo sobre o mesmo array de uma `FormGrid` **não**
  re-renderiza a tabela. Quem precisa inserir linha de fora usa a prop `actions`,
  que entrega o `append` da própria grade.
