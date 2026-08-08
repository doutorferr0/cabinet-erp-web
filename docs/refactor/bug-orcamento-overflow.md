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

## Correção proposta

Em `src/features/orcamento/orcamento-form.tsx`, no container que envolve `<FormGrid>` (por volta
da linha 274), adicionar `min-w-0` ao elemento pai direto — a técnica padrão para permitir que um
item de flex/grid encolha abaixo do seu conteúdo intrínseco. Não mexer em `form-grid.tsx`: o
componente já está correto, o container que o embrulha no orçamento é que precisa ceder.

Se `min-w-0` sozinho não resolver (o container pode estar dentro de outro flex sem `min-w-0`),
subir a correção um nível até achar o ancestral que está esticando — confirmar com o mesmo script
de medição usado na investigação:

```js
() => {
  const d = document.documentElement
  return d.scrollWidth - d.clientWidth
}
```

## Verificação

- Medir o estouro nas 4 combinações (1280/1440/1920 × `/novo` e `/:id`) antes e depois — deve ir
  a 0 em todas.
- Conferir visualmente que a grade continua rolando horizontalmente dentro de si mesma quando o
  conteúdo excede a largura disponível (o scroll não deve desaparecer, só deixar de vazar para a
  página).
- Repetir em Ordem de Compra e Pedido de Compra (`compras/ordens/:id`, `compras/pedidos/:id`) —
  eles usam a mesma `FormGrid`; hoje dão 0px, então a correção não deve alterar esse resultado.

## Critério de saída

0px de estouro em todas as combinações testadas. `pnpm test` verde (não deve haver teste
dependente da classe removida/adicionada). Commit: `fix: corrige estouro horizontal do orçamento`.
