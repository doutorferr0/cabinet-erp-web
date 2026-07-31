# Integração com o backend — o que muda quando o OpenAPI sair

Este documento é o roteiro da troca — escrito enquanto a fase mock era construída,
para que a integração não vire arqueologia.

## Estado atual — a integração começou

O OpenAPI saiu (`contracts/openapi-v1.json`, cópia versionada do contrato do
`vitra-erp-dotnet`) e o cliente gerado está commitado em `src/api/gerado/`. O que
já vem do servidor:

| Fronteira | Endpoint | Onde |
|---|---|---|
| Listas de apoio do `LookupCombo` | `GET /api/catalog-lookups` | `src/data/lookups-api.ts` |
| Empresa ativa da sessão e troca de empresa | `GET /auth/tenants` · `GET /auth/me` · `PUT /auth/active-tenant` | `src/data/empresas-api.ts` |

O resto das telas segue em mock por **falta de contrato**, não por escolha: o
backend ainda não publicou endpoint de cadastro (cliente, produto, fornecedor…).
O registry de `src/data/index.ts` continua sendo o único ponto que muda quando
esses endpoints existirem.

### O adaptador de listagem já existe

`src/data/api-provider.ts` (`createApiListProvider`) traduz o `TableQueryState` da
UI para a convenção de listagem do backend e devolve `PagedResult<T>`. Quando um
endpoint de recurso for publicado, a entrada no registry vira uma linha:

```ts
clientes: createApiListProvider<Cliente>({ url: '/api/clientes' }),
```

A convenção não é suposição — é a forma literal de `GET /api/catalog-lookups`, o
único endpoint de lista publicado, e é contra ele que `api-provider.test.ts` roda.

**`get(id)` ficou deliberadamente de fora:** não há NENHUM endpoint de item por id
no contrato, então rota, código de "não encontrado" e tipo do id seriam invenção.

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

## `GET /api/products` — o primeiro cadastro, e o que falta nele

O backend publicou a listagem de produtos. O `ProductDto` traz **4 campos**; a
listagem do front (`src/routes/cadastros/produtos/index.tsx`, campos literais da
§6 da transcrição) mostra 7 colunas:

| Coluna da listagem | Campo no `ProductDto` | Situação |
|---|---|---|
| `Nosso Código` | `code` | mapeável |
| `Nossa Descrição` | `description` | mapeável |
| `Ativo` | `active` | mapeável |
| `Marca` | — | **falta no DTO** |
| `Fábrica` | — | **falta no DTO** |
| `Tipo de Produto` | — | **falta no DTO** |
| `Valor de Tabela` | — | **falta no DTO** (centavos int; a §6.3 põe preço na VARIANTE, não no produto) |

Por isso a tela **não** foi ligada ao endpoint: trocar agora esvaziaria quatro
colunas que a transcrição registra. Falta também sessão com empresa ativa — o
próprio contrato do backend anota que `products` depende de `active_tenant_id`.

Quando o DTO crescer, a troca é uma linha no registry (`createApiListProvider`) e
os testes de tela passam a precisar de servidor falso, como em
`company-switcher.test.tsx`.

## Divergências entre a UI e o contrato (achadas ao ler o OpenAPI)

| Assunto | UI hoje | Contrato | Situação |
|---|---|---|---|
| Ordenação | `sort: { id, desc }` | `sortBy` + `sortDesc` | **resolvida** pelo adaptador |
| Página vazia | `q` omitido quando vazio | `q` opcional | **resolvida** — campo vazio não viaja |
| **Tipo do id** | `number` em `get(id)`, `empty(id)`, mocks e rota (`$clienteId`) | **uuid (string)**, com `code text` separado — `UNIQUE (tenant_id, code)` | **caminho resolvido, execução pendente** (ver abaixo) |
| Erro em listagem sem empresa ativa | — | `GET /api/products` declara **409**; o contrato escrito diz **500** para contexto ausente | **a confirmar com o backend** |

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
já tem os dois separados (`Produto.id` × `Produto.nossoCodigo`), só com o tipo
errado no primeiro.

Execução, quando o primeiro `GET /recurso/{id}` existir: `ResourceProvider.get` e
`empty` passam a `string`, os mocks trocam id numérico por uuid e as rotas
(`$produtoId`) carregam string. Toca todas as telas; não faz sentido antes,
porque o formato de "não encontrado" ainda não está publicado.

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
- **tabelas de apoio** (`src/mocks/lookups.ts`, `UNIDADES`, `TIPOS_VALOR`) — as
  opções passam a vir do backend; hoje são listas locais;
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
