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
   horizontal). Medido nesta sessão (Chrome, 1440×900, `pnpm dev` porta 5174):

| Rota | Estouro |
|---|---|
| Todas as 15 listagens/módulos (`/`, `/dashboard`, `/planner`, as 5 de cadastro, `/vendas`,
  `/vendas/orcamentos`, `/compras`, `/compras/ordens`, `/compras/pedidos`, `/estoque`, `/cadastros`) | 0px |
| `/cadastros/clientes/novo`, `/fornecedores/novo`, `/profissionais/novo`, `/produtos/novo`, `/compras/ordens/novo`, `/compras/pedidos/novo` | 0px |
| `/cadastros/colaboradores/novo` | 2px |
| `/cadastros/colaboradores/1?modo=consulta` | 2px |
| `/vendas/orcamentos/novo` | **76px** |
| `/vendas/orcamentos/2` | **119px** |

Confirma os números do levantamento anterior. Os 2px do Colaborador são residuais (possível
rolagem/arredondamento) — o `bug-colaborador-layout.md` foca no vão vertical e nos campos
mal-posicionados, que é o problema visível de verdade.

5. Console: **zero erro**, mas 2 Issues de acessibilidade em toda tela com `RadioField` (campo
   "Sexo"): `Incorrect use of <label for=FORM_ELEMENT>` e `No label associated with a form
   field`. Causa raiz identificada e documentada em `bug-a11y-form-fields.md` (reescrito com o
   achado exato, substituindo a investigação especulativa original).
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
