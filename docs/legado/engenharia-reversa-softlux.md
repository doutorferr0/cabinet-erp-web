# Engenharia reversa do Softlux — banco de dados

> Levantado em 2026-08-10, direto do SQL Server de produção. Leitura de catálogo apenas, nenhuma escrita.
> Fonte bruta: `softlux-schema/` (CSVs de colunas, índices, FKs, contagens) + `bdprincipal-rotinas.sql`.

---

## 1. Ambiente

| Item | Valor |
|---|---|
| Aplicação | `C:\Softlux\SOFTLUX.exe` — Delphi + DevExpress, 49 MB, versão 1.0.2.16 sp06 |
| Host da aplicação | `SRVVMTS01` (terminal server, acesso por RDP, várias instâncias simultâneas) |
| Banco | SQL Server Express em `192.168.18.11:1433` |
| Acesso | OLEDB, credencial `SA` em texto plano em `C:\Softlux\softlux.ini` |
| Bancos | `bdprincipal` (359 tabelas) · `bdprodutos` (5 tabelas) · `GED` (2 tabelas) |

**Risco de segurança registrado, não corrigido:** conta `SA` habilitada com senha fraca, gravada em texto plano num `.ini` legível por qualquer usuário do terminal server, instância exposta na LAN. Não replicar no Cabinet.

---

## 2. Inventário de `bdprincipal`

| Objeto | Qtd |
|---|---|
| Tabelas | 359 — **148 delas com 0 linhas** |
| Primary keys | 324 (36 tabelas sem PK) |
| Foreign keys | 200 |
| Funções escalares | 30 |
| Funções tabulares | 6 |
| Stored procedures | 7 |
| Triggers | 1 |

Código de negócio no servidor: **219 KB** em 44 rotinas. Não é vitrine — tem cálculo de preço, custo, estoque e comissão lá dentro.

### Tabelas maiores

| Tabela | Linhas |
|---|---|
| `estoque_produto_dia` | 8.678.690 |
| `Preco_Produto_Log` | 3.158.263 |
| `VendaProduto` | 549.829 |
| `estoque_log` | 402.161 |
| `VendaDesconto` | 300.325 |
| `VendaIndicacaoGrupProd` | 232.409 |
| `Preco_Produto` | 169.764 |
| `VendaAmbiente` | 144.673 |
| `Estoque_produto` | 141.043 |
| `produtos` | 108.992 |
| `Venda` | 34.135 |
| `Clientes` | 9.322 |

---

## 3. Arquitetura de dados

### 3.1 Documento único, discriminado por tipo

Existem **duas gerações de schema** convivendo. A antiga está morta:

| Tabela legado | Linhas |
|---|---|
| `orcamento` (59 col, prefixo `orc_`) | 0 |
| `Orcamento_luminaria_det` | 0 |
| `orcamento_materiais_det` | 0 |
| `pedido_*_det` | 0 |

O modelo vivo é **`Venda`** (90 colunas, prefixo `Ven_`) + **`VendaProduto`** (53 colunas).
Orçamento, pedido de venda, pré-venda e demonstração são **o mesmo registro físico**, separados por `Ven_Tipo`. As tabelas satélite usam o par `TpDoc` + `NDocPre` como referência.

**Consequência para o Cabinet:** modelar `Orcamento` e `Pedido` como agregados separados diverge do legado. Hoje a conversão orçamento→pedido é troca de tipo; com agregados distintos viraria cópia de dados e quebraria a rastreabilidade que 34 mil registros já têm.

### 3.2 Multi-tenant por coluna

**212 das 360 tabelas carregam `Emp_codigo`.** Nas satélites ele é parte da chave primária composta:

```
VendaAmbiente     PK(VenAmb_TpDoc, VenAmb_NDocPre, CodAmbiente, Emp_Codigo)
VendaIndicacao    PK(VenInd_TpDoc, VenInd_NDocPre, Ind_Codigo, Emp_Codigo)
VendaAtendente    PK(VenAten_TpDoc, VenAten_NDocPre, Fun_Codigo, Emp_Codigo)
Estoque_produto   PK(Epr_Codnosso, Epr_Acabamento, EstTp_Codigo, Tam_codigo, Emp_codigo)
```

Valida a decisão de chave composta com tenant registrada no `project-core` — o legado opera assim há mais de dez anos, com Vertz e Via HF na mesma base.

**Inconsistência a decidir antes de migrar:** `Venda` tem PK só `Ven_CodigoPre`, **sem** `Emp_codigo`, enquanto os filhos incluem. O número da venda é uma sequência global compartilhada entre as duas empresas, e o isolamento depende de filtro na aplicação, não da chave. Com RLS + FORCE isso não se sustenta como está.

---

## 4. Formação de preço — a regra central

Implementada em `CalcularProduto` e `CalcularPorProduto` (19 KB cada, T-SQL com cursores aninhados).

### Entradas

- **`Custo`** (40 colunas, 385 registros) — perfil de custo **por fornecedor**: quatro descontos em cascata, IPI, frete, ICMS, embalagem, financeira, Simples, cartão, créditos de ICMS/PIS/COFINS, MVA, custo fixo.
- **`Indice_preco`** (18 colunas, 376 registros) — o "Índice de Vl. de Venda" do menu Cadastros. Vinculado a um `Custo` e a um fornecedor (`for_codigo`). Traz `Ipr_Indice` (multiplicador), `Ipr_desconto`, `Ipr_vl_com_inter` e `Ipr_vl_com_exter` (comissão interna e externa).
- **`Preco_Produto.Pre_Tabela`** — preço de tabela do fornecedor, por variante (produto × acabamento × tamanho × empresa).

### Cadeia de cálculo

```
1.  base            = Pre_Tabela
2.  desconto cascata:
      F1 = base × Cus_desconto1 / 100
      F2 = (base − F1) × Cus_desconto2 / 100
      F3 = (base − F1 − F2) × Cus_desconto3 / 100
      F4 = (base − F1 − F2 − F3) × Cus_desconto4 / 100
    liquido = base − F1 − F2 − F3 − F4
3.  creditos        = liquido × (CreditoICMS + CreditoPIS + CreditoCOFINS) / 100
    liquido         = liquido − creditos
4.  ipi             = liquido × Cus_IPI / 100
    embalagem       = liquido × Cus_Embalagens / 100
    financeiro      = (liquido + embalagem + ipi) × Cus_Financeira / 100
    frete           = liquido × Cus_Frete / 100
    outros          = (liquido + embalagem + ipi + financeiro) × Cus_outros / 100
5.  vlcompra        = liquido + embalagem + ipi + financeiro + frete + icms

6.  ►► VENDA        = round(liquido × Ipr_Indice, 2)          ← o coração do preço
7.  desconto        = venda × Ipr_desconto / 100
    venda_liq       = venda − desconto

8.  icms            = varia por Cus_TributacaoICMS (7 ramos: ST/MVA, DIFAL, crédito, etc.)
    cartao          = venda_liq × Cus_PorcCartao / 100
    simples         = venda_liq × Cus_Simples / 100
    custo_fixo      = venda_liq × Cus_CustoFixo / 100
    desc_custo      = venda_liq × Cus_Desconto / 100

9.  CUSTO           = liquido + embalagem + ipi + financeiro + frete
                      + icms + outros + simples + cartao + custo_fixo + desc_custo

10. com_interna     = venda_liq × Ipr_vl_com_inter / 100
    com_externa     = venda_liq × Ipr_vl_com_exter / 100
    LUCRO           = venda_liq − CUSTO − com_interna − com_externa
```

**O ponto que nenhum print revelaria:** o preço de venda é o **líquido de compra multiplicado por um índice**, aplicado *antes* de qualquer imposto de saída. Impostos e taxas entram só no custo, para apurar lucro — não empurram o preço. Índice é por fornecedor, não por produto nem por categoria.

**Suspeita (confiança média):** há dois pontos no código onde `liquido = liquido − creditos` aparece duas vezes, e `vlcompra` é atribuído duas vezes seguidas (uma com frete, outra sem). Pode ser ramificação legítima por país/banco, pode ser subtração dupla de crédito. Só o teste com dado real confirma. Não migrar essa parte sem validar contra valores conhecidos.

### Histórico

`Preco_Produto_Log` (3,1 milhões de linhas) guarda a foto de cada alteração de preço. `ValorCusto` e `ValorCompra` recuperam o custo vigente numa data — a base de qualquer relatório de margem retroativa. **A tabela não tem chave primária.**

---

## 5. Estoque

| Objeto | Papel |
|---|---|
| `Estoque_produto` | Saldo atual por produto × acabamento × tipo × tamanho × empresa |
| `estoque_log` (402 mil) | Razão de movimentação: tipo, documento, ação, operação, sequência |
| `estoque_produto_dia` (8,7 mi) | Foto diária do saldo — responde por metade do tamanho da base |
| `CompraEstoque` | Disponibilidade futura: ordem de compra aberta − reserva − o que já entrou por nota |
| `estoquefisico*` (4 variantes) | Saldo físico, com e sem recorte por data e por empresa |
| `GiroEstoque` | Classifica giro em faixas dos parâmetros globais, pela distância em dias entre última entrada e última venda |
| `EstoqueMinimo` + `GravaEstoqueMinimo` + trigger `GatilhoEstoqueMinimo` | Recalcula estoque mínimo a cada UPDATE em `Estoque_produto` |

O único trigger do banco inteiro dispara em `Estoque_produto` AFTER UPDATE — e **lê só a primeira linha de `inserted`**, então falha em update multi-linha. Bug latente do legado.

---

## 6. Comissão e participação

- **`VendaAtendente`** — vários atendentes por venda, cada um com `Porcentagem`, flag `Principal` e `DtVigencia`.
- **`VendaIndicacao`** — profissional externo (arquiteto/especificador) com percentual, flag principal e vigência.
- **`VendaIndicacaoGrupProd`** (232 mil linhas) — percentual **por grupo de produto** dentro da mesma indicação, com `VenIndGrup_Operador`. A regra de participação é bem mais fina do que os prints sugeriam.
- `VendaMes/Trimestre/Semestre/Ano` + variantes `*Atendente` — apuração de metas e ganhos.

---

## 7. Escopo fiscal — correção à leitura anterior

A memória do projeto dizia que a emissão fiscal do legado era limitada. **Falso.** O menu estava limitado; o sistema não.

`NotaFiscal` (174 colunas) · `NotaFiscalProdutos` (144) · `NFSe` (69) · `MDFe` (52) · `ParamentrosNFe` (94) · `TabelaImposto` (62) · `ECFCupom` (51). A própria `Venda` carrega `Ven_ICMSBase`, `Ven_ICMSSTBase`, `Ven_ICMSSTValor`, `Ven_ValorDIFAL`, `Ven_ImpostoRetido`.

NF-e, NFS-e e MDF-e estão implementados. Isso redimensiona o escopo fiscal do Cabinet.

---

## 8. Blockers do next-task resolvidos pelo schema

| Blocker (print faltante) | Resposta |
|---|---|
| Ambiente F5 | `VendaAmbiente` — só 9 colunas, é rótulo de agrupamento. O vínculo do item vem de `VendaProduto.CodAmbiente` |
| Participação | `VendaIndicacao` + `VendaIndicacaoGrupProd` (% por grupo de produto, com operador) |
| Movimentação | `estoque_log` + `estoque_produto_dia` |
| Pré Produto | Não é tela: campos `VenPro_PreProduto` e `VenPro_PreProdFoto` na linha do item |
| Serviços / Pagamento | `VendaServico` + campos `Ven_formaPag`, `Ven_formaPagExtra`, `Ven_formaPagHist`, `par_ParcelarVlAcima`, `Par_VlMinParcela`, `Par_QuantMaxParcela` |
| Obra | `Obr_codigo` na `Venda` e no `orcamento`; entidade `Obra` própria |

---

## 9. Dívidas do legado — não replicar

- **`Paramentros`: 284 colunas, sem PK.** Tabela de configuração linha-única. God object, e com o erro de grafia preservado por uma década.
- **36 tabelas sem primary key**, incluindo `Preco_Produto_Log` com 3,1 milhões de linhas.
- **148 tabelas vazias** de 360 — 41% do schema é entulho de versões anteriores.
- Regra de negócio em T-SQL com **cursores** para leitura linha a linha, inclusive onde um `SELECT TOP 1` resolveria (`ValorCusto`, `ValorCompra`, `GiroEstoque`).
- `Venda` com PK sem tenant enquanto os filhos têm.
- Trigger que ignora update multi-linha.
- Nomenclatura sem padrão: `Ven_`, `orc_`, `Epr_`, `Cus_`, `Ipr_`, `PreLog_`, mistura de PascalCase e minúsculas na mesma tabela.

---

## 10. O que ainda falta

1. **Mapa tela → tabela** com trace SQL ligado, para as telas onde o cálculo mora no Delphi e não no banco.
2. **Papel de `bdprodutos`** — 5 tabelas, 4.881 produtos, nomes repetidos de `bdprincipal` (que tem 108.992). O `softlux.ini` mantém as duas conexões ativas, então o app usa. Provável catálogo de importação. Não migrar sem entender.
3. **Validar a suspeita de subtração dupla de crédito** em `CalcularProduto` contra valores conhecidos.
4. **`PlanoContaValor`** (41 KB, a maior rotina do banco) — não analisada. É a apuração contábil.
5. **Valores distintos de `Ven_Tipo` e `Ven_Situacao`** — precisa de consulta a dado, não a catálogo.
