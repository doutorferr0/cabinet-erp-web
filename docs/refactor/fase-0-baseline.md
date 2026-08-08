# Fase 0 — baseline

Sem mudança de código. Objetivo: ter um "antes" verificável para comparar contra cada fase
seguinte — se algo mudar de pixel ou comportamento nas fases 1–4, isto aqui prova que era
diferente antes.

## Passos

1. `pnpm test` — deve estar verde. Guardar a contagem de arquivos/testes.
2. `pnpm check-types` e `pnpm check` — zero erros.
3. Subir `pnpm dev` (Node ≥22) e, com Chrome (`chrome-devtools` CLI ou equivalente), navegar e
   capturar screenshot de cada rota abaixo a 1440×900:
   - `/`, `/dashboard`, `/planner`
   - `/cadastros/clientes`, `/cadastros/fornecedores`, `/cadastros/profissionais`,
     `/cadastros/colaboradores`, `/cadastros/produtos`
   - `/vendas/orcamentos`, `/compras/ordens`, `/compras/pedidos`, `/estoque`
   - Um detalhe de cada: `/cadastros/produtos/novo`, `/cadastros/colaboradores/1?modo=consulta`,
     `/vendas/orcamentos/novo`
4. Para cada rota, registrar `document.documentElement.scrollWidth - clientWidth` (estouro
   horizontal). Guardar os números medidos nesta sessão como referência:

| Rota | Estouro a 1440px |
|---|---|
| `/cadastros/produtos/novo` | 0px |
| `/compras/ordens/1` | 0px |
| `/compras/pedidos/1` | 0px |
| `/vendas/orcamentos/2` | 119px |
| `/vendas/orcamentos/novo` | 76px |
| demais telas testadas | 0px |

5. Registrar console limpo (zero erro) como baseline.
6. Fluxo funcional de referência: desativar um produto pela listagem (`/cadastros/produtos` →
   selecionar linha → Excluir → confirmar) deve terminar com a linha `INATIVO` e sem erro de
   console. Abrir `/cadastros/clientes/parc-0002` por link direto deve carregar o formulário
   (não "não encontrado").

## Números de duplicação (para comparar a redução ao final)

- `src/routes/`: 1.881 linhas totais.
- Layouts de módulo (`cadastros.tsx`, `vendas.tsx`, `compras.tsx`, `estoque.tsx`): 4 arquivos,
  diff normalizado zero entre 3 deles.
- Detalhe de documento (`$orcamentoId`, `$ordemId`, `$pedidoId`): 49 linhas cada, diff de 3 linhas.
- Detalhe de parceiro (`$clienteId`, `$fornecedorId`, `$profissionalId`): ~220 linhas cada, diff
  normalizado de ~15 linhas.
- Ternário `erro instanceof ErroDaApi ? … : …`: 13 ocorrências.
- `console.info('[mock] …')` como handler de botão morto: 26 ocorrências.

## Critério de saída

Nenhuma linha de código mudou. Este arquivo tem os números e os screenshots (ou path para eles)
que as fases seguintes vão usar para provar "nada mudou visualmente".
