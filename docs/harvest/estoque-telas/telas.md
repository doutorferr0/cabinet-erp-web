# Telas de Estoque — espec colhida do InvenTree

Material STAGED. Nenhuma tela foi construída, nenhum caminho entrou no contrato, nada em `src/`.
Fonte externa: InvenTree (MIT), commit `e4b23b4` — arquivos e licença no `NOTICE` desta pasta.

---

## 1. O problema de origem: esta tela não tem fonte de campo

A regra do repo é dura e existe por bom motivo: **campo de tela vem de
`transcricaosoftlux.md`; tela fora das fontes = perguntar ao user, nunca inferir.** E a
transcrição diz, com todas as letras, que a Movimentação **não foi capturada**:

> *"Críticas para o escopo inicial (estoque + orçamento): […] menu **Movimentação** inteiro (deve
> ser onde mora a movimentação de estoque)"* — `transcricaosoftlux.md` §10

O repo já registra isso em código: `/estoque/movimentacao` existe e renderiza
`<TelaNaoCapturada>`. Este documento **não muda essa situação** e não inventa a tela. O que ele faz
é reunir o que EXISTE de fonte, deixar cada campo amarrado à sua origem, e mandar para o user só o
que sobrou sem origem (`integracao.md` §3). Cada campo abaixo carrega uma marca:

| marca | origem |
|---|---|
| `[T]` | transcrição de tela (`transcricaosoftlux.md` §6.3 — a única parte capturada que fala de estoque) |
| `[L]` | banco do legado extraído (`docs/legado/schema/`) — colunas e contagens reais |
| `[S]` | schema novo do Cabinet (`docs/cabinet/`) — já desenhado |
| `[I]` | InvenTree — desenho colhido |
| `[?]` | **sem fonte** — pergunta para o user |

## 2. O que a contagem de linhas do legado já decide

Não é opinião, é `docs/legado/schema/bdprincipal-linhas.csv`:

| tabela do legado | linhas | o que isso significa |
|---|---:|---|
| `estoque_produto_dia` | 8.678.690 | foto diária do saldo — sozinha, metade do banco |
| `estoque_log` | 402.161 | o razão de movimentação é usado de verdade |
| `Estoque_produto` | 141.043 | saldo por produto × acabamento × tipo × empresa × tamanho |
| `lancamento_estoque_det` | 10.646 | **lançamento manual é rotina**, não exceção |
| `BalancoEstoqueProdutos` | 7.412 | inventário acontece (324 balanços) |
| `EstoqueTipo` | **4** | os "4 depósitos" — e são 4 mesmo |
| `ForaDoBalanco` | 4 | recurso praticamente natimorto |
| `ProdutosLocEstoque` | **0** | endereçamento Prédio/Rua/Número/Apto: **nunca usado** |
| `Transferencia_filiais` | **0** | transferência entre filiais: **nunca usada** |

Três conclusões que economizam trabalho, e todas são medição:

1. **Endereçamento físico fica FORA da v1.** A tela existe (`[T]` §6.3: `Acabamento | Estoque |
   Prédio | Rua | Número | Apto`) e a tabela existe — com zero linhas em mais de uma década. Isso
   também mata a árvore de locais do InvenTree (§5.3): quem nunca preencheu quatro campos de
   endereço não vai manter hierarquia.
2. **Transferência entre locais entra, entre FILIAIS não.** `Transferencia_filiais` zerada. Mover
   entre os 4 depósitos da mesma empresa é operação de estoque; mover entre empresas é operação
   fiscal (nota), e nota não é escopo desta tela.
3. **A foto diária não se repete.** 8,6 milhões de linhas para responder "qual era o saldo em D".
   O kardex do Cabinet já responde isso: `balance_after` do último `stock_movements` com
   `occurred_at <= D` (`[S]`). A tela de saldo pede a data; o servidor lê o kardex; ninguém
   materializa 8,6 milhões de linhas por ano.

## 3. Tela 1 — Movimentação (listagem)

Rota `/estoque/movimentacao`, hoje `TelaNaoCapturada`. É uma DataTable comum, composta, não
reimplementada (padrão 1 do `CLAUDE.md`).

### 3.1 Colunas

| coluna | `accessorKey` | origem | nota |
|---|---|---|---|
| Data/hora | `occurredAt` | `[S]` `occurred_at` | ISO no dado, pt-BR na tela |
| Produto | `variantId` → descrição | `[S]` | mostra a variante (acabamento × tamanho), não o produto |
| Local | `locationId` → nome | `[S]` | os 4 de `[L]` `EstoqueTipo` |
| Motivo | `reason` | `[S]` + `[I]` | rótulo PT-BR do enum — `vocabulario-de-movimento.md` |
| Documento | `sourceKind` + `sourceId` | `[S]` | link para o documento de origem; em branco no lançamento manual |
| Quantidade | `delta` | `[S]` | **com sinal** — entrada positiva, saída negativa |
| Saldo depois | `balanceAfter` | `[S]` | é o que faz a listagem ser conferível linha a linha |
| Operador | `employeeId` → nome | `[S]` | `[L]` já guardava (`Elg_usuario`) |

`delta` e `balanceAfter` com `formatQuantidade` (3 casas). A quantidade **é assinada e aparece
assinada**: uma listagem de kardex em que entrada e saída se parecem só pelo motivo obriga o
operador a ler duas colunas para saber o sinal de uma.

### 3.2 A barra de ações não tem `Excluir`

O padrão 7 do `CLAUDE.md` manda a barra `Filtro · Incluir · Alterar · Consultar · Excluir ·
Imprimir`. Aqui ela muda, e a mudança é consequência da ADR-009:

| ação padrão | nesta tela |
|---|---|
| `Incluir` | vira **quatro** botões: `Entrada` · `Saída` · `Ajuste` · `Transferência` (§3.4) |
| `Alterar` | **não existe** — kardex é imutável |
| `Excluir` | **não existe** — o desfazer de um movimento é outro movimento (estorno), com motivo próprio |
| `Consultar` | ficha do movimento (§3.5) |
| `Filtro` · `Imprimir` | como em toda listagem |

Botão `Alterar` desabilitado seria melhor que ausente? Não: desabilitado promete que existe um
estado em que se pode alterar. Aqui não existe, e a tela deve dizer isso com a ausência.

### 3.3 Filtros (`filtros` da DataTable, vocabulário do #76)

Declaração pronta em `filtros-movimentacao.ts`. São seis campos, e a escolha de cada um:

| campo | variante | por quê |
|---|---|---|
| `occurredAt` | `date` | **é o filtro principal.** Kardex sem recorte de período devolve o banco inteiro |
| `locationId` | `select` | 4 opções fixas — combo seria caro para quatro itens |
| `variantId` | `text` | busca por código/descrição; `select` com milhares de variantes é inutilizável |
| `reason` | `multiSelect` | "só entradas por nota" é a pergunta mais comum depois do período |
| `sourceKind` | `select` | separa manual de documento sem precisar saber o motivo exato |
| `employeeId` | `select` | "quem lançou isso" — a pergunta de auditoria |

**`delta` fica de fora** — pelo mesmo motivo que `salario` ficou fora do piloto do #76: número que
o operador lê com sinal e três casas, comparado com o que o banco guarda, produz filtro que acha o
que ninguém pediu. Se entrar um dia, entra como `number` sobre o módulo, não sobre o valor
assinado.

**Nenhum destes filtros pode ser ligado antes de o contrato publicá-los.** A regra do #76 é a
mesma aqui: recurso que não publica o parâmetro recusa em voz alta (`recusarFiltroSemContrato`) em
vez de devolver a lista inteira com a tela mostrando filtro aplicado.

### 3.4 As quatro operações

Colhidas do InvenTree (`add_stock` / `take_stock` / `stocktake` / `move`), que as trata como
verbos distintos em vez de um formulário genérico com um combo de tipo. Cada uma é um Dialog:

| verbo | campos | vira, no kardex |
|---|---|---|
| **Entrada** | variante, local, quantidade, motivo, observação | 1 movimento, `delta > 0` |
| **Saída** | variante, local, quantidade, motivo, observação | 1 movimento, `delta < 0` |
| **Ajuste** | variante, local, **quantidade contada**, observação | 1 movimento com `delta = contado − saldo`; `delta = 0` **não** grava |
| **Transferência** | variante, origem, destino, quantidade, observação | **2 movimentos** na mesma transação, `delta` simétrico |

Duas decisões dentro disso:

- **Ajuste pede o CONTADO, não a diferença.** Quem está no depósito conta 37; fazer a pessoa
  calcular −3 é pedir um erro de subtração que entra no saldo. O InvenTree acerta isso
  (`stocktake(count)`), e o legado também tinha a coluna do saldo anterior (`[L]`
  `lesd_estoque_ant`) — sinal de que a conferência importava.
- **Observação é obrigatória no Ajuste**, opcional no resto. Ajuste é a única operação sem
  documento por trás: sem texto, o kardex registra "alguém mudou o saldo" e o porquê morre. `[L]`
  já tinha o campo (`lesd_observacao`, varchar 300).

### 3.5 Ficha do movimento (`Consultar`)

Somente leitura, e existe por um motivo só: mostrar o que a linha não cabe — a observação
completa, o documento de origem clicável, o operador com data/hora exata, e o saldo antes/depois
do par (variante, local). É a tela para onde vai quem perguntou "por que o saldo mudou".

## 4. Tela 2 — Saldo por local

Consulta, não cadastro: nada nela grava.

**Recorte:** variante (uma) × locais (os 4), ou local (um) × variantes (muitas). Os dois sentidos
respondem perguntas diferentes — "onde está este produto" e "o que tem neste depósito" — e a
mesma DataTable serve, mudando o que é linha.

**Colunas:** `Físico` · `Reservado` · `Disponível`, exatamente com a semântica e a hierarquia
fixadas em `docs/harvest/reserva-de-estoque/nota-front.md` §2 — Disponível é o protagonista,
Físico e Reservado são apoio, o front **não** calcula nenhum dos três, e negativo é estado de erro
e não zero.

**Data de referência** (`[L]`, substituindo `estoque_produto_dia`): campo de data no topo, vazio =
hoje. Com data preenchida, o servidor responde pelo kardex (`balance_after` do último movimento
até a data) e a coluna `Reservado` **some** — reserva é estado do agora, não tem versão histórica.
Mostrar reserva de hoje ao lado de saldo de março seria somar dois instantes na mesma linha.

**Estoque mínimo** `[T]` §6.3 (`Est.Mínimo`, na grade de valores por variante) e `[S]`
(`variant_tenant_settings.min_stock`): a linha abaixo do mínimo se marca. Ela é a razão de a tela
existir para o comprador — sem a marca, "o que preciso comprar" vira leitura de coluna inteira.

## 5. O que NÃO copiar do InvenTree

### 5.1 O armazenamento — é a forma que a ADR-009 proíbe

```python
def updateQuantity(self, quantity):
    ...
    quantity = max(quantity, 0)
    ...
    self.quantity = quantity
    self.save(add_note=False)
```

`StockItem.quantity` é **saldo absoluto escrito pela aplicação**, e o `StockItemTracking` é
gravado ao lado, depois. É exatamente o desenho do legado Softlux que a ADR-009 fecha: *"saldo de
estoque escrito por valor absoluto (`set Epr_estoque = :valor`), com `estoque_log` à parte → baixas
concorrentes se perdem e log diverge do saldo sem sinal"*.

O InvenTree é mais cuidadoso que o Softlux — tem `lock_quantity()` com `select_for_update` e
relê a quantidade sob trava —, mas a FORMA continua a mesma: a verdade é o saldo, o histórico é
efeito colateral. No Cabinet a verdade é o kardex e o saldo é derivado por gatilho. **É a inversão
inteira, e é o motivo de esta pasta colher tela e vocabulário, não modelo.**

### 5.2 `deltas` como JSONField

```python
deltas = models.JSONField(null=True, blank=True)
```

A quantidade do histórico mora dentro do JSON (`deltas['added']`, `deltas['quantity']`). Consequências
que aparecem na API do próprio InvenTree: `StockTrackingList` só sabe ordenar por `date`
(`ordering_fields = ['date']`), só sabe buscar em `notes`, e o filtro tem `item`, `user` e `part`
— **não há filtro por período nem por motivo**, que são justamente os dois primeiros da §3.3. E o
documento de origem, guardado como id cru dentro do JSON, precisa ser resolvido no `list()` com
uma passada extra por modelo relacionado.

O kardex do Cabinet tem `delta`, `balance_after`, `reason`, `source_kind`, `source_id`,
`occurred_at` e `employee_id` como **colunas tipadas** `[S]`. Os seis filtros da §3.3 são baratos
por causa disso. Guardar em JSON custaria a listagem inteira.

### 5.3 A árvore de locais

`StockLocation` é `InvenTreeTree` com `pathstring`, `structural` e `external`. Para 4 depósitos, a
árvore paga manutenção de caminho, regra de nó estrutural e consulta recursiva sem entregar nada —
e a medição da §2 (endereçamento com **zero** linhas) diz que a demanda por profundidade nunca
existiu aqui.

**O que vale a pena atravessar são os dois sinalizadores, não a árvore:**

- `external` `[I]` — e o legado concorda: `EstoqueTipo` tem a coluna `EstTp_externo` `[L]`.
  Depósito de terceiro não entra na conta de "o que temos".
- `structural` `[I]` — nó que só agrupa e não recebe saldo. Sem árvore ele não tem uso hoje;
  fica anotado para o dia em que houver.

### 5.4 `delete_on_deplete`

O InvenTree **apaga** a linha de estoque quando ela zera, e o histórico fica com `item` nulo
(`on_delete=SET_NULL`). Além disso, `StockItemTracking.part` é `CASCADE`: apagar a peça apaga o
histórico dela.

No Cabinet, saldo zero é uma linha com `qty = 0` e o kardex não se apaga nunca — é a trilha que
responde "para onde foi". Apagar histórico junto com cadastro é o oposto do que a ADR-009 e o item
`docs/harvest/auditoria/` desta mesma pasta defendem.

### 5.5 `max(quantity, 0)`

Mesmo defeito já registrado em `docs/harvest/reserva-de-estoque/mecanica.md` §7.2, agora no saldo
físico: saldo negativo vira zero e a informação de que se entregou mais do que existia some. No
Cabinet o saldo é assinado, na coluna e na tela.

## 6. O que esta espec NÃO cobre, de propósito

- **BOM, montagem, ordem de produção** — fora do recorte pela própria issue.
- **Serial e lote.** O InvenTree gira em torno disso (`serialized`, `splitStock`, `merge`); o
  Cabinet não tem nem campo. Se um dia luminária passar a ter número de série, é modelagem nova,
  não ajuste de tela.
- **Balanço/inventário como DOCUMENTO.** O legado tem (`BalancoEstoque`, 324 · `ForaDoBalanco`, 4)
  e é fluxo próprio: abre contagem, congela, lança diferenças em lote. O `Ajuste` da §3.4 é o
  ajuste unitário, que cobre a rotina; o inventário em lote é outra tela e outra issue.
- **Nota fiscal e transferência entre empresas** — fiscal, não estoque.
