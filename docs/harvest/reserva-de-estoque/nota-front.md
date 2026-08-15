# Como o front exibe disponível × reservado

Nota de tela, não código. Nada em `src/` foi tocado por esta issue (zona = `docs/harvest/`), e
nada aqui pode ser implementado antes de o contrato publicar os campos — ver §6.

---

## 1. A regra que decide todo o resto: o front NÃO calcula disponível

`disponível = físico − alocado` é conta de servidor, dentro da transação que trava o saldo
(`mecanica.md` §5). O front recebe o resultado; nunca subtrai.

Dois motivos, e o segundo é o que machuca:

1. **Chegam em leituras diferentes.** Físico e alocado vêm de tabelas distintas; subtrair no
   cliente mistura dois instantes e produz um terceiro número que nunca existiu no banco.
2. **O front não enxerga o que não é dele.** A reserva que derruba o disponível é de OUTRO
   operador, em outra empresa da mesma organização, feita meio segundo atrás. Qualquer conta local
   é otimista por construção.

Consequência prática: se o contrato publicar só `onHand`, a tela mostra **só físico** e diz que é
físico. Não existe "estimar o disponível".

## 2. Três números, um protagonista

| número | papel na tela | peso |
|---|---|---|
| **Disponível** | é a decisão: dá para vender? | protagonista — número grande, tinta cheia |
| Reservado | explica por que o disponível é menor que o físico | apoio — tinta secundária |
| Físico | é o que a contagem do depósito confere | apoio — tinta secundária |

Ordem de leitura: **Disponível primeiro**. O operador que abre a listagem para responder "tem?"
não pode ter que subtrair duas colunas com o olho. Físico e Reservado existem para explicar o
primeiro, e é assim que devem se parecer.

Formatação: `formatQuantidade` de `src/lib/formatters.ts` (3 casas, pt-BR) nos três. Nada de
`Intl` improvisado na tela — quantidade tem uma regra só no repo.

## 3. "A chegar" é um QUARTO número, e nunca soma no disponível

A reserva contra ordem de compra em aberto (`mecanica.md` §6) não está em depósito nenhum. Ela
responde outra pergunta — *quando* dá para prometer, não *se* dá para entregar hoje.

Se aparecer na tela, aparece como coluna própria (`A chegar`, com a data prevista da ordem) e
**visualmente separada** das três de cima. Somar ao disponível seria prometer para hoje o que
chega mês que vem — que é a mentira exata que o legado evitava com `CompraEstoque` (ordem em
aberto − reserva − já recebido), e que o `AvisoDeCobertura` existe para não deixar acontecer.

## 4. Zero e negativo não são a mesma coisa

O servidor manda disponível **assinado** (`mecanica.md` §7.2). A tela respeita:

- **zero** — "sem saldo". Estado neutro, é rotina.
- **negativo** — prometeu-se mais do que existe. Estado de **erro**, com a zona de erro do design,
  nunca renderizado como `0` e nunca escondido. É incidente de operação e alguém precisa ver hoje.

Renderizar `Math.max(x, 0)` na borda de exibição é reintroduzir no front o defeito que a espec
recusou no servidor.

## 5. Quando não cobre, o erro precisa dos números

A aceitação do pedido é onde a reserva nasce, e é onde ela falha. O 409/422 carrega, **por item**,
`requested` e `available` reais (`mecanica.md` §7.3 — o Saleor manda `0` fixo e a tela dele não
tem como dizer quanto falta).

A tela então diz, item a item:

> Item 3 · Pendente LED 40W — pedido 10,000 · disponível 3,000

Não é toast: é lista dentro do diálogo, porque pode ser mais de um item e o operador precisa
comparar. As ações que ficam ao lado dependem da decisão em aberto de `mecanica.md` §4.1 (reservar
parcial e abrir necessidade de compra, ou recusar) — enquanto ela não existe, o diálogo só informa
e o operador ajusta a quantidade.

**O front não tenta evitar essa falha.** Checar disponível antes de enviar reduz o susto, não a
corrida: entre a checagem e o envio outro operador reserva. Quem garante é a trava do servidor
(`mecanica.md` §5); o trabalho do front é mostrar a recusa bem. Depois de qualquer aceite ou
cancelamento, invalidar as consultas de disponibilidade — número velho de estoque não é
inconveniente, é promessa errada.

## 6. Antes de existir caminho no contrato: a coluna NÃO entra

Nenhum dos campos desta nota existe em `contracts/openapi-v1.json` hoje. A regra do repo vale
inteira: **coluna que o DTO não tem sai da listagem**, e o `AvisoDeCobertura` conta ao operador
que o dado de estoque ainda não vem do servidor. Preencher com mock daria dado de mentira com cara
de dado do servidor — e estoque é o pior lugar possível para isso, porque a decisão que ele apoia
é comprometer material com o cliente.

Quando o contrato for escrito (PR próprio, fora desta issue), o mínimo que ele precisa publicar:

- disponibilidade por variante (`onHand`, `allocated`, `available`) e o detalhe por local;
- os mesmos nomes na whitelist de `sortBy`, se a coluna for ordenável — **`accessorKey` em
  inglês**, como todo o resto da DataTable. `available` é coluna de view, não de tabela: se o
  servidor não a publicar como ordenável, o cabeçalho **não** ganha botão de ordenação. Cabeçalho
  clicável que responde 400 é pior que coluna fixa;
- o erro de estoque insuficiente com `requested`/`available` por item (§5).

## 7. Onde isto aparece

| tela | o que mostra |
|---|---|
| listagem de produtos | coluna `Disponível` (consolidado da variante); `Físico`/`Reservado` como colunas opcionais |
| detalhe da variante | as três quantidades **por local** — é a única tela onde o rateio entre depósitos é visível |
| pedido, na aceitação | por item: disponível no momento + a recusa do §5 |
| pedido, depois de aceito | por item: quanto está reservado e quanto já foi entregue (`qty` × `qty_consumed`) |

Tudo alcançável por clique, sem tecla nova (`CLAUDE.md` §Convenções). Reservar e liberar não são
ações soltas: acontecem por causa do pedido, dentro da tela do pedido. Botão "reservar" avulso na
tela de estoque seria uma segunda porta para o mesmo compromisso, com metade do contexto.
