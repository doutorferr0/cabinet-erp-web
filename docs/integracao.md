# Integração com o backend — o que muda quando o OpenAPI sair

Estado atual: **mock only** (regra da fase, `CLAUDE.md`). Nenhuma chamada HTTP existe
no código. Este documento é o roteiro da troca — escrito enquanto a fase mock era
construída, para que a integração não vire arqueologia.

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

**Na integração**, os testes de tela precisam de um servidor falso (MSW ou stub do
cliente gerado) no lugar do provider mock — é o único ponto que muda neles, porque
nenhum teste conhece `src/mocks/` diretamente.

## Armadilhas conhecidas

- `pnpm build` **não** regenera `src/routeTree.gen.ts` quando há rota nova: o script
  é `tsc -b && vite build` e o `tsc` falha antes do plugin rodar. Rodar `pnpm dev`
  uma vez para gerar, depois `pnpm check-types`.
- Um `useFieldArray` externo sobre o mesmo array de uma `FormGrid` **não**
  re-renderiza a tabela. Quem precisa inserir linha de fora usa a prop `actions`,
  que entrega o `append` da própria grade.
