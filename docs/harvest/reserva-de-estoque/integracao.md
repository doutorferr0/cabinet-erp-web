# O que precisa acontecer para isto sair de `docs/harvest/`

Este item é **espec**, não componente. Não há `import` a fazer, não há dependência a instalar, e a
maior parte do trabalho não é do front.

---

## 1. Quem implementa o quê

| parte | trilho | arquivo desta pasta |
|---|---|---|
| tabela, constraints, índices | schema (`docs/cabinet/`) | `proposta-schema.md` |
| view, funções, travas | backend | `disponibilidade.sql` |
| caminho no contrato | **front** (dono do contrato) | `nota-front.md` §6 |
| coluna, hierarquia, erro na tela | front | `nota-front.md` |

Ninguém pode começar pelo fim: sem tabela não há view, sem view não há o que o contrato publique,
e sem contrato a tela não mostra número nenhum (§4).

## 2. Ordem

1. **User decide os quatro pontos do §3.** Sem isso, aplicar o schema é adivinhar.
2. **Trilho de schema** aplica `proposta-schema.md` em `gera-cabinet-schema.py` e regera o `.dbml`
   e o mapeamento. É a zona dele — esta issue não toca `docs/cabinet/`.
3. **Trilho backend** implementa `disponibilidade.sql` de verdade: view, as três funções, os
   testes de concorrência (dois pedidos simultâneos na mesma variante é o teste que importa) e a
   ligação com o aceite do pedido e com a entrega.
4. **PR de contrato aqui**, marcando os caminhos como `Proposto`, com `pnpm codegen` e o gerado
   commitado no mesmo PR (o CI reprova gerado velho).
5. **Tela**, compondo os padrões que já existem — DataTable e o `AvisoDeCobertura` enquanto a
   cobertura for parcial.

## 3. Decisões pendentes — todas do user

1. **Pedido sem saldo: parcial ou recusa?** (`mecanica.md` §4.1) Reservar o que dá e abrir
   `purchase_needs` pelo resto (o que o legado fazia) ou recusar o aceite inteiro (o que o Saleor
   faz). O schema proposto aguenta as duas; a regra é de negócio.
2. **Estratégia de rateio entre depósitos** (`mecanica.md` §5). Proposto: ordem configurada, o que
   exige a coluna `stock_locations.sort` (`proposta-schema.md` §5).
3. **Reserva contra ordem de compra em aberto entra agora?** (`mecanica.md` §6) Ela depende do
   módulo de compra, que hoje é esqueleto. Se ficar para depois, `source_kind` e
   `purchase_order_item_id` podem nascer junto mesmo assim — o CHECK já os isola — ou sair da
   primeira versão.
4. **Reserva Técnica (a comissão) continua bloqueada.** `commission_rules.reserve_percent` não
   avançou nesta issue e não avança por fonte externa: o Saleor não tem análogo, e o impedimento é
   `Par_RTautomatico = True` contra `Ven_RtAutomatico` vazio em toda a tabela `Venda`. Ou o user
   diz qual manda, ou alguém pergunta a quem opera. Ver `mecanica.md` §1.

## 4. Pré-requisitos que não são desta pasta

- **Não existe fluxo de aceite de pedido.** `sales_orders` é tabela no desenho; nenhuma tela cria
  pedido, nenhum caminho do contrato aceita orçamento. A reserva nasce no aceite — sem ele, a
  mecânica não tem gatilho.
- **Não existe fluxo de entrega.** `stock_movements` está desenhado, nada o escreve.
- **Não existe caminho de estoque no contrato.** Nem produto→saldo, nem depósito.

Ou seja: esta espec está **à frente** do que o sistema faz. Isso é de propósito — o blocker era
"reserva é campo sem mecânica", e o que faltava era a mecânica escrita, não a tela.

## 5. O que NÃO fazer

- **Não somar "a chegar" no disponível** (`nota-front.md` §3).
- **Não criar coluna de alocado em `stock_balances`** antes de medir que a view dói
  (`mecanica.md` §7.1). Se um dia doer, a saída é gatilho com escritor único, não escrita por
  código de aplicação.
- **Não fechar disponível em zero** em lugar nenhum — nem no SQL, nem no DTO, nem na tela.
- **Não reservar no orçamento** sem antes definir a precedência sobre a reserva de pedido
  (`mecanica.md` §3). Orçamento que ninguém aceita segurando material de pedido pago é regressão,
  não recurso.
- **Não portar o `Stock.quantity_allocated` do Saleor "porque é mais rápido"** — a tarefa de
  reparo dele está citada no `NOTICE` com nome e log.

## 6. O que esta pasta NÃO fez

- Não tocou `src/`, `contracts/`, `package.json`, `pnpm-lock.yaml` nem `docs/cabinet/`.
- Não instalou dependência; não rodou `pnpm codegen` (o contrato não mudou).
- Não abriu nenhuma fonte copyleft. A única fonte externa consultada é o Saleor (BSD-3), com
  arquivos e commit listados no `NOTICE`.
- Não rodou o `disponibilidade.sql` — não há banco do Cabinet contra o que rodar. O arquivo é
  leitura, e diz isso no próprio cabeçalho.
