# Capturas — 1.7 × Reface 2.0

Varredura de `scripts/capturas.ts` (D36, #531): toda rota do `routeTree`, nos dois temas,
em 1440×900, com o overlay de 8px (`?grid`) onde ele existe. É o material de prova da
revisão pós-merge — cada desvio apontado nas issues `[Reface 2.0 · R-…]` cita a linha daqui.

- **1.7 — `main` no commit anterior à rodada** — commit `e7718bb`, 49 rotas, 2026-09-04, sem `?grid` (o overlay nasceu na 2.0)
- **2.0 — a rodada como está hoje** — commit `b7d3ea0`, 51 rotas, 2026-09-04, com `?grid`

**A varredura é uma FOTO, e a rodada continua andando.** Quando a base mudar, o par de
novo vale mais que a leitura de quem lembra da versão velha:

```
node --experimental-strip-types scripts/capturas.ts --versao=2.0
node --experimental-strip-types scripts/capturas.ts --readme
```

A 1.7 não precisa ser refeita — ela é um commit fixo. Para refazê-la, rode o script numa
worktree daquele commit apontando `--saida` para `docs/design/capturas/1.7`.

As pastas aqui também guardam capturas avulsas de outras issues da rodada (`d34/`, e os
`ficha-*.png` de `2.0/`), com outra convenção de nome. Quem manda nesta página é o
`manifesto.json` de cada versão: o que não está nele não saiu desta varredura.

## `/`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/raiz.claro.png) | ![claro](2.0/raiz.claro.png) |
| **escuro** | ![escuro](1.7/raiz.escuro.png) | ![escuro](2.0/raiz.escuro.png) |
| **grade 8px** | — | ![grid](2.0/raiz.claro.grid.png) |

## `/agenda`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/agenda.claro.png) | ![claro](2.0/agenda.claro.png) |
| **escuro** | ![escuro](1.7/agenda.escuro.png) | ![escuro](2.0/agenda.escuro.png) |
| **grade 8px** | — | ![grid](2.0/agenda.claro.grid.png) |

## `/ajuda/atalhos`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/ajuda-atalhos.claro.png) | ![claro](2.0/ajuda-atalhos.claro.png) |
| **escuro** | ![escuro](1.7/ajuda-atalhos.escuro.png) | ![escuro](2.0/ajuda-atalhos.escuro.png) |
| **grade 8px** | — | ![grid](2.0/ajuda-atalhos.claro.grid.png) |

## `/boletim`

> Rota **inexistente na 1.7** — nasceu na rodada.

> a guarda desviou para `/` — a imagem é daquela tela · o `?grid` não sobreviveu ao router — esta captura não tem a grade

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | — | ![claro](2.0/boletim.claro.png) |
| **escuro** | — | ![escuro](2.0/boletim.escuro.png) |
| **grade 8px** | — | ![grid](2.0/boletim.claro.grid.png) |

## `/cadastros`

> a guarda desviou para `/vendas` — a imagem é daquela tela · o `?grid` não sobreviveu ao router — esta captura não tem a grade

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros.claro.png) | ![claro](2.0/cadastros.claro.png) |
| **escuro** | ![escuro](1.7/cadastros.escuro.png) | ![escuro](2.0/cadastros.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros.claro.grid.png) |

## `/cadastros/clientes`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-clientes.claro.png) | ![claro](2.0/cadastros-clientes.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-clientes.escuro.png) | ![escuro](2.0/cadastros-clientes.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-clientes.claro.grid.png) |

## `/cadastros/clientes/$clienteId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-clientes-clienteId.claro.png) | ![claro](2.0/cadastros-clientes-clienteId.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-clientes-clienteId.escuro.png) | ![escuro](2.0/cadastros-clientes-clienteId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-clientes-clienteId.claro.grid.png) |

## `/cadastros/colaboradores`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-colaboradores.claro.png) | ![claro](2.0/cadastros-colaboradores.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-colaboradores.escuro.png) | ![escuro](2.0/cadastros-colaboradores.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-colaboradores.claro.grid.png) |

## `/cadastros/colaboradores/$colaboradorId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-colaboradores-colaboradorId.claro.png) | ![claro](2.0/cadastros-colaboradores-colaboradorId.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-colaboradores-colaboradorId.escuro.png) | ![escuro](2.0/cadastros-colaboradores-colaboradorId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-colaboradores-colaboradorId.claro.grid.png) |

## `/cadastros/fornecedores`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-fornecedores.claro.png) | ![claro](2.0/cadastros-fornecedores.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-fornecedores.escuro.png) | ![escuro](2.0/cadastros-fornecedores.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-fornecedores.claro.grid.png) |

## `/cadastros/fornecedores/$fornecedorId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-fornecedores-fornecedorId.claro.png) | ![claro](2.0/cadastros-fornecedores-fornecedorId.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-fornecedores-fornecedorId.escuro.png) | ![escuro](2.0/cadastros-fornecedores-fornecedorId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-fornecedores-fornecedorId.claro.grid.png) |

## `/cadastros/produtos`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-produtos.claro.png) | ![claro](2.0/cadastros-produtos.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-produtos.escuro.png) | ![escuro](2.0/cadastros-produtos.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-produtos.claro.grid.png) |

## `/cadastros/produtos/$produtoId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-produtos-produtoId.claro.png) | ![claro](2.0/cadastros-produtos-produtoId.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-produtos-produtoId.escuro.png) | ![escuro](2.0/cadastros-produtos-produtoId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-produtos-produtoId.claro.grid.png) |

## `/cadastros/profissionais`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-profissionais.claro.png) | ![claro](2.0/cadastros-profissionais.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-profissionais.escuro.png) | ![escuro](2.0/cadastros-profissionais.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-profissionais.claro.grid.png) |

## `/cadastros/profissionais/$profissionalId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/cadastros-profissionais-profissionalId.claro.png) | ![claro](2.0/cadastros-profissionais-profissionalId.claro.png) |
| **escuro** | ![escuro](1.7/cadastros-profissionais-profissionalId.escuro.png) | ![escuro](2.0/cadastros-profissionais-profissionalId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/cadastros-profissionais-profissionalId.claro.grid.png) |

## `/compras`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/compras.claro.png) | ![claro](2.0/compras.claro.png) |
| **escuro** | ![escuro](1.7/compras.escuro.png) | ![escuro](2.0/compras.escuro.png) |
| **grade 8px** | — | ![grid](2.0/compras.claro.grid.png) |

## `/compras/ordens`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/compras-ordens.claro.png) | ![claro](2.0/compras-ordens.claro.png) |
| **escuro** | ![escuro](1.7/compras-ordens.escuro.png) | ![escuro](2.0/compras-ordens.escuro.png) |
| **grade 8px** | — | ![grid](2.0/compras-ordens.claro.grid.png) |

## `/compras/ordens/$ordemId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/compras-ordens-ordemId.claro.png) | ![claro](2.0/compras-ordens-ordemId.claro.png) |
| **escuro** | ![escuro](1.7/compras-ordens-ordemId.escuro.png) | ![escuro](2.0/compras-ordens-ordemId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/compras-ordens-ordemId.claro.grid.png) |

## `/compras/pedidos`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/compras-pedidos.claro.png) | ![claro](2.0/compras-pedidos.claro.png) |
| **escuro** | ![escuro](1.7/compras-pedidos.escuro.png) | ![escuro](2.0/compras-pedidos.escuro.png) |
| **grade 8px** | — | ![grid](2.0/compras-pedidos.claro.grid.png) |

## `/compras/pedidos/$pedidoId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/compras-pedidos-pedidoId.claro.png) | ![claro](2.0/compras-pedidos-pedidoId.claro.png) |
| **escuro** | ![escuro](1.7/compras-pedidos-pedidoId.escuro.png) | ![escuro](2.0/compras-pedidos-pedidoId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/compras-pedidos-pedidoId.claro.grid.png) |

## `/compras/previsao`

> a guarda desviou para `/compras/ordens` — a imagem é daquela tela · o `?grid` não sobreviveu ao router — esta captura não tem a grade

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/compras-previsao.claro.png) | ![claro](2.0/compras-previsao.claro.png) |
| **escuro** | ![escuro](1.7/compras-previsao.escuro.png) | ![escuro](2.0/compras-previsao.escuro.png) |
| **grade 8px** | — | ![grid](2.0/compras-previsao.claro.grid.png) |

## `/config`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/config.claro.png) | ![claro](2.0/config.claro.png) |
| **escuro** | ![escuro](1.7/config.escuro.png) | ![escuro](2.0/config.escuro.png) |
| **grade 8px** | — | ![grid](2.0/config.claro.grid.png) |

## `/config/listas`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/config-listas.claro.png) | ![claro](2.0/config-listas.claro.png) |
| **escuro** | ![escuro](1.7/config-listas.escuro.png) | ![escuro](2.0/config-listas.escuro.png) |
| **grade 8px** | — | ![grid](2.0/config-listas.claro.grid.png) |

## `/config/usuarios`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/config-usuarios.claro.png) | ![claro](2.0/config-usuarios.claro.png) |
| **escuro** | ![escuro](1.7/config-usuarios.escuro.png) | ![escuro](2.0/config-usuarios.escuro.png) |
| **grade 8px** | — | ![grid](2.0/config-usuarios.claro.grid.png) |

## `/crm`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/crm.claro.png) | ![claro](2.0/crm.claro.png) |
| **escuro** | ![escuro](1.7/crm.escuro.png) | ![escuro](2.0/crm.escuro.png) |
| **grade 8px** | — | ![grid](2.0/crm.claro.grid.png) |

## `/crm/funil`

> a guarda desviou para `/crm/funil/funil-projeto` — a imagem é daquela tela · o `?grid` não sobreviveu ao router — esta captura não tem a grade

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/crm-funil.claro.png) | ![claro](2.0/crm-funil.claro.png) |
| **escuro** | ![escuro](1.7/crm-funil.escuro.png) | ![escuro](2.0/crm-funil.escuro.png) |
| **grade 8px** | — | ![grid](2.0/crm-funil.claro.grid.png) |

## `/crm/funil/$funilId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/crm-funil-funilId.claro.png) | ![claro](2.0/crm-funil-funilId.claro.png) |
| **escuro** | ![escuro](1.7/crm-funil-funilId.escuro.png) | ![escuro](2.0/crm-funil-funilId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/crm-funil-funilId.claro.grid.png) |

## `/crm/funis`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/crm-funis.claro.png) | ![claro](2.0/crm-funis.claro.png) |
| **escuro** | ![escuro](1.7/crm-funis.escuro.png) | ![escuro](2.0/crm-funis.escuro.png) |
| **grade 8px** | — | ![grid](2.0/crm-funis.claro.grid.png) |

## `/crm/funis/$funilId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/crm-funis-funilId.claro.png) | ![claro](2.0/crm-funis-funilId.claro.png) |
| **escuro** | ![escuro](1.7/crm-funis-funilId.escuro.png) | ![escuro](2.0/crm-funis-funilId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/crm-funis-funilId.claro.grid.png) |

## `/crm/motivos`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/crm-motivos.claro.png) | ![claro](2.0/crm-motivos.claro.png) |
| **escuro** | ![escuro](1.7/crm-motivos.escuro.png) | ![escuro](2.0/crm-motivos.escuro.png) |
| **grade 8px** | — | ![grid](2.0/crm-motivos.claro.grid.png) |

## `/crm/oportunidades/$oportunidadeId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/crm-oportunidades-oportunidadeId.claro.png) | ![claro](2.0/crm-oportunidades-oportunidadeId.claro.png) |
| **escuro** | ![escuro](1.7/crm-oportunidades-oportunidadeId.escuro.png) | ![escuro](2.0/crm-oportunidades-oportunidadeId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/crm-oportunidades-oportunidadeId.claro.grid.png) |

## `/dashboard`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/dashboard.claro.png) | ![claro](2.0/dashboard.claro.png) |
| **escuro** | ![escuro](1.7/dashboard.escuro.png) | ![escuro](2.0/dashboard.escuro.png) |
| **grade 8px** | — | ![grid](2.0/dashboard.claro.grid.png) |

## `/definir-senha`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/definir-senha.claro.png) | ![claro](2.0/definir-senha.claro.png) |
| **escuro** | ![escuro](1.7/definir-senha.escuro.png) | ![escuro](2.0/definir-senha.escuro.png) |
| **grade 8px** | — | ![grid](2.0/definir-senha.claro.grid.png) |

## `/esqueci-senha`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/esqueci-senha.claro.png) | ![claro](2.0/esqueci-senha.claro.png) |
| **escuro** | ![escuro](1.7/esqueci-senha.escuro.png) | ![escuro](2.0/esqueci-senha.escuro.png) |
| **grade 8px** | — | ![grid](2.0/esqueci-senha.claro.grid.png) |

## `/estoque`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/estoque.claro.png) | ![claro](2.0/estoque.claro.png) |
| **escuro** | ![escuro](1.7/estoque.escuro.png) | ![escuro](2.0/estoque.escuro.png) |
| **grade 8px** | — | ![grid](2.0/estoque.claro.grid.png) |

## `/estoque/movimentacao`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/estoque-movimentacao.claro.png) | ![claro](2.0/estoque-movimentacao.claro.png) |
| **escuro** | ![escuro](1.7/estoque-movimentacao.escuro.png) | ![escuro](2.0/estoque-movimentacao.escuro.png) |
| **grade 8px** | — | ![grid](2.0/estoque-movimentacao.claro.grid.png) |

## `/estoque/relatorios/orcado-x-estoque`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/estoque-relatorios-orcado-x-estoque.claro.png) | ![claro](2.0/estoque-relatorios-orcado-x-estoque.claro.png) |
| **escuro** | ![escuro](1.7/estoque-relatorios-orcado-x-estoque.escuro.png) | ![escuro](2.0/estoque-relatorios-orcado-x-estoque.escuro.png) |
| **grade 8px** | — | ![grid](2.0/estoque-relatorios-orcado-x-estoque.claro.grid.png) |

## `/estoque/relatorios/parado`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/estoque-relatorios-parado.claro.png) | ![claro](2.0/estoque-relatorios-parado.claro.png) |
| **escuro** | ![escuro](1.7/estoque-relatorios-parado.escuro.png) | ![escuro](2.0/estoque-relatorios-parado.escuro.png) |
| **grade 8px** | — | ![grid](2.0/estoque-relatorios-parado.claro.grid.png) |

## `/estoque/relatorios/valorizado`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/estoque-relatorios-valorizado.claro.png) | ![claro](2.0/estoque-relatorios-valorizado.claro.png) |
| **escuro** | ![escuro](1.7/estoque-relatorios-valorizado.escuro.png) | ![escuro](2.0/estoque-relatorios-valorizado.escuro.png) |
| **grade 8px** | — | ![grid](2.0/estoque-relatorios-valorizado.claro.grid.png) |

## `/inbox`

> Rota **inexistente na 1.7** — nasceu na rodada.

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | — | ![claro](2.0/inbox.claro.png) |
| **escuro** | — | ![escuro](2.0/inbox.escuro.png) |
| **grade 8px** | — | ![grid](2.0/inbox.claro.grid.png) |

## `/login`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/login.claro.png) | ![claro](2.0/login.claro.png) |
| **escuro** | ![escuro](1.7/login.escuro.png) | ![escuro](2.0/login.escuro.png) |
| **grade 8px** | — | ![grid](2.0/login.claro.grid.png) |

## `/planner`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/planner.claro.png) | ![claro](2.0/planner.claro.png) |
| **escuro** | ![escuro](1.7/planner.escuro.png) | ![escuro](2.0/planner.escuro.png) |
| **grade 8px** | — | ![grid](2.0/planner.claro.grid.png) |

## `/tarefas`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/tarefas.claro.png) | ![claro](2.0/tarefas.claro.png) |
| **escuro** | ![escuro](1.7/tarefas.escuro.png) | ![escuro](2.0/tarefas.escuro.png) |
| **grade 8px** | — | ![grid](2.0/tarefas.claro.grid.png) |

## `/trocar-senha`

> a guarda desviou para `/login` — a imagem é daquela tela · o `?grid` não sobreviveu ao router — esta captura não tem a grade

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/trocar-senha.claro.png) | ![claro](2.0/trocar-senha.claro.png) |
| **escuro** | ![escuro](1.7/trocar-senha.escuro.png) | ![escuro](2.0/trocar-senha.escuro.png) |
| **grade 8px** | — | ![grid](2.0/trocar-senha.claro.grid.png) |

## `/vendas`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/vendas.claro.png) | ![claro](2.0/vendas.claro.png) |
| **escuro** | ![escuro](1.7/vendas.escuro.png) | ![escuro](2.0/vendas.escuro.png) |
| **grade 8px** | — | ![grid](2.0/vendas.claro.grid.png) |

## `/vendas/cargas`

> a guarda desviou para `/vendas/pedidos` — a imagem é daquela tela · o `?grid` não sobreviveu ao router — esta captura não tem a grade

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/vendas-cargas.claro.png) | ![claro](2.0/vendas-cargas.claro.png) |
| **escuro** | ![escuro](1.7/vendas-cargas.escuro.png) | ![escuro](2.0/vendas-cargas.escuro.png) |
| **grade 8px** | — | ![grid](2.0/vendas-cargas.claro.grid.png) |

## `/vendas/orcamentos`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/vendas-orcamentos.claro.png) | ![claro](2.0/vendas-orcamentos.claro.png) |
| **escuro** | ![escuro](1.7/vendas-orcamentos.escuro.png) | ![escuro](2.0/vendas-orcamentos.escuro.png) |
| **grade 8px** | — | ![grid](2.0/vendas-orcamentos.claro.grid.png) |

## `/vendas/orcamentos/$orcamentoId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/vendas-orcamentos-orcamentoId.claro.png) | ![claro](2.0/vendas-orcamentos-orcamentoId.claro.png) |
| **escuro** | ![escuro](1.7/vendas-orcamentos-orcamentoId.escuro.png) | ![escuro](2.0/vendas-orcamentos-orcamentoId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/vendas-orcamentos-orcamentoId.claro.grid.png) |

## `/vendas/pedidos`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/vendas-pedidos.claro.png) | ![claro](2.0/vendas-pedidos.claro.png) |
| **escuro** | ![escuro](1.7/vendas-pedidos.escuro.png) | ![escuro](2.0/vendas-pedidos.escuro.png) |
| **grade 8px** | — | ![grid](2.0/vendas-pedidos.claro.grid.png) |

## `/vendas/pedidos/$pedidoId`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/vendas-pedidos-pedidoId.claro.png) | ![claro](2.0/vendas-pedidos-pedidoId.claro.png) |
| **escuro** | ![escuro](1.7/vendas-pedidos-pedidoId.escuro.png) | ![escuro](2.0/vendas-pedidos-pedidoId.escuro.png) |
| **grade 8px** | — | ![grid](2.0/vendas-pedidos-pedidoId.claro.grid.png) |

## `/vendas/reservas-tecnicas`

| | 1.7 | 2.0 |
|---|---|---|
| **claro** | ![claro](1.7/vendas-reservas-tecnicas.claro.png) | ![claro](2.0/vendas-reservas-tecnicas.claro.png) |
| **escuro** | ![escuro](1.7/vendas-reservas-tecnicas.escuro.png) | ![escuro](2.0/vendas-reservas-tecnicas.escuro.png) |
| **grade 8px** | — | ![grid](2.0/vendas-reservas-tecnicas.claro.grid.png) |

