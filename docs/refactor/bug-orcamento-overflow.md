# Bug — overflow horizontal em Orçamento

## Sintoma

`/vendas/orcamentos/novo` e `/vendas/orcamentos/:id` estouram a largura da página:

| Largura da viewport | Estouro medido |
|---|---|
| 1920px | 0px |
| 1440px (`/novo`) | 76px |
| 1440px (`/2`) | 119px |
| 1280px | 236px |

Todas as outras telas do sistema (produtos, ordem, pedido, colaborador) dão **0px** a 1440px —
o problema é específico do Orçamento.

## Causa

A grade de itens do orçamento tem 14 colunas (`ITEM · CÓDIGO FORNECEDOR · DESCRIÇÃO DO FORNECEDOR
· AMBIENTE · ACABAMENTO · TAMANHO · QUANT. · UND. · VALOR UNIT. · DESC.% · VALOR ITEM · GRUPO
PRODUTO · TIPO DE PEÇA · FORNECEDOR`). O wrapper em
`src/components/cabinet/form-grid.tsx:239` já tem `overflow-x-auto`:

```tsx
<div data-slot="form-grid-box" className="overflow-x-auto border-2 border-border">
```

Medição no browser confirma que o wrapper rola sozinho quando teria espaço
(`wrapClient === wrapScroll === 1165`), mas o **documento** estoura
(`docScroll 1463 > docClient 886` na janela testada). Ou seja: o `overflow-x-auto` funciona, só
que nada limita a LARGURA do ancestral do `FormGrid` dentro do formulário — um item de flex/grid
nasce com `min-width: auto` por padrão, então o pai cresce para acomodar as 14 colunas em vez de
forçar o filho a rolar.

## Correção aplicada

`min-w-0` sozinho no wrapper do `FormGrid` não bastou — o problema se repetia em CADA nível
`flex-col`/`flex-row` da cadeia até a raiz, porque `min-width: auto` é o padrão em TODO item de
flex, não só no mais próximo da tabela. Rastreado com um script que soma `getBoundingClientRect`/
`scrollWidth` de `form-grid-box` até `<html>`, subindo por `parentElement`: o primeiro nível onde
`scrollWidth` do elemento passava do próprio `width` não era nada dentro do formulário — era o
`<main data-slot="sidebar-inset">` do shadcn (`src/components/ui/sidebar.tsx`), item de uma
`flex-row` (sidebar + conteúdo) sem `min-w-0`.

Três arquivos, cada um resolvendo o nível que lhe cabia:

1. `src/components/cabinet/form-grid.tsx` — `min-w-0` na `<div>` raiz que `FormGrid` retorna.
2. `src/components/cabinet/cadastro-form.tsx` — `min-w-0` no `<form>` e no `<fieldset>` (os dois
   são `flex-1 flex-col`, ambos ancestrais de qualquer `FormGrid` dentro de um cadastro).
3. `src/components/ui/sidebar.tsx` — `min-w-0` no `<main data-slot="sidebar-inset">`
   (`SidebarInset`), o item que faltava na `flex-row` raiz do shell. Este foi o nível que
   realmente resolvia: sem ele, os dois primeiros reduziam o estouro mas não zeravam.

Nenhuma mudança em `overflow-x-auto`: o mecanismo de rolagem interna já estava certo, só não tinha
onde exercer — sem `min-w-0` em toda a cadeia, o item nunca chegava a precisar rolar porque o pai
sempre crescia primeiro.

## Verificação

- Medido 0px em 1280/1440/1920 em `/vendas/orcamentos/novo` e `/vendas/orcamentos/2` — as 4
  combinações que estouravam antes.
- Regressão: as 12 rotas de listagem/módulo e as telas de detalhe navegadas (Dashboard, Produto
  Incluir) seguem 0px e pixel-idênticas às capturas anteriores — a mudança em `sidebar.tsx` afeta
  o shell inteiro, não só o Orçamento.
- `form-grid-box` continua com `overflow-x-auto`; a rolagem interna se mantém disponível (a
  screenshot de `/vendas/orcamentos/2` mostra a barra de rolagem própria da grade, não mais o
  scroll da página).
- `pnpm check`, `npx tsc -p tsconfig.app.json --noEmit` e `pnpm test` (400 testes) verdes.

## Critério de saída

0px de estouro em todas as combinações testadas, sem regressão nas demais telas. Commit:
`fix: corrige estouro horizontal por min-w-0 ausente na cadeia flex`.
