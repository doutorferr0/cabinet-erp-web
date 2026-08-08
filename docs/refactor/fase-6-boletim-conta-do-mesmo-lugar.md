# Fase 6 — Boletim conta do mesmo lugar que a listagem

## Problema

O Boletim (`/`, `src/data/boletim.ts`) soma os arrays de `src/mocks/*` e anuncia, por exemplo,
"Clientes 16" na seção CADASTROS. A listagem real (`/cadastros/clientes`) pede
`GET /api/partners?role=customer`, que o MSW responde a partir de um seed **diferente**
(`src/mocks/api/store.ts`) — hoje só 1 registro. O Boletim **linka** para essas listagens
("Clientes 16" → `/cadastros/clientes"), então clicar leva a uma lista com 1 item quando o
Boletim prometeu 16. Mesmo padrão em Fornecedores (14 vs 1), Produtos (45 vs 3),
Profissional Externo (8 vs 1).

Decisão já tomada (não semear o MSW a partir de `src/mocks/`): converteria `Cliente`/`Produto`
(shape §5/§6, PT, id numérico) para o shape do contrato (EN, id string/uuid), quebraria os testes
presos aos ids fixos do seed atual (`parc-0002`, `prod-0001`, os uuids usados em
`fornecedor-form.test.tsx`/`profissional-form.test.tsx`) e jogaria fora campo que o `PartnerDto`/
`ProductDto` não têm — o mesmo problema que `docs/integracao.md` já resolve para as telas
("contrato menor que a transcrição fica visível, nunca preenchido com mock").

## Correção mínima

As linhas da seção CADASTROS do Boletim que hoje contam por `src/mocks/*` passam a contar pela
MESMA fonte que a listagem usa — `data.<recurso>.list`, com `pageSize: 1` (só interessa o
`total`), no lugar de `clientes.length`/`produtos.length` etc.

**Escopo:** só os 4 recursos que têm listagem HTTP e são linkados do Boletim —
Clientes, Fornecedores, Profissional Externo, Produtos. Colaboradores **não muda**: sua listagem
já é `createMockProvider` sobre os mesmos arrays de `src/mocks/colaboradores.ts` que o Boletim lê
hoje — a origem já é a mesma nos dois lugares, não há divergência a corrigir. As seções de
documento do Boletim (Vendas do dia, Pedidos de Compra, Ordens sem envio) também não mudam —
usam `src/mocks/orcamentos.ts`/`pedidos-compra.ts`/`ordens-compra.ts`, que são a mesma fonte da
listagem de cada um (ainda mock nos dois lados).

## Implementação

Em `src/data/boletim.ts`, localizar onde a apuração hoje conta `clientes.length`,
`fornecedores.length`, `profissionais.length`, `produtos.length` (import direto dos arrays de
`src/mocks/`). Trocar por chamada a `data.clientes.list({ q: '', page: 1, pageSize: 1 }, 0)` (e
equivalentes), lendo `.total` da resposta. Isso muda `fetchBoletim` de síncrono-sobre-array para
precisar aguardar 4 promises adicionais — já é `async` hoje (usa `mockDelay` em outras partes),
então não é mudança de contrato da função, só mais `await Promise.all([...])` internamente.

Manter os imports de `src/mocks/clientes`, `fornecedores`, `profissionais`, `produtos` REMOVIDOS
de `boletim.ts` se não sobrar outro uso — conferir se as contagens eram a única razão de importar
esses arrays ali (o registro de "desativados" pode depender do array completo, não só do total;
se depender, manter o import só para essa conta e usar `data.*.list` apenas para o total ativo/
geral que aparece linkado).

## Verificação

- `boletim.test.ts` — os números fixos que o teste hoje espera (se houver) precisam ser
  atualizados para bater com o total do MSW, não do array de mocks. Ler o teste atual antes de
  mudar a implementação para saber exatamente quais asserts quebram.
- Manual: abrir `/`, conferir que "Clientes N" bate com o total mostrado na paginação de
  `/cadastros/clientes` (hoje "1 registro"), idem para Fornecedores/Profissionais/Produtos.
- `pnpm test` verde.

## Critério de saída

Nenhum link do Boletim promete um número que a tela de destino não confirma. Commit:
`fix: boletim conta cadastros pela mesma fonte da listagem`.
