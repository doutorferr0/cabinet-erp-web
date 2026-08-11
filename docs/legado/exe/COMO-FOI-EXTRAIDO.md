# Extração do SOFTLUX.exe — 2026-08-11

Fonte: `SOFTLUX.exe`, 49.876.480 bytes, SHA-256 `7F4C19D1DED5FD66E3540BAA903A02C3B6A61F7F92069A31BF94668B105D09C9`.
Método: parse dos recursos DFM embutidos (768 marcadores `TPF0`, 713 formulários recuperados,
54 falhas = falsos positivos em dados binários) + varredura de literais de string.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `mapa-telas.md` | 713 telas: form, título, nº de componentes, nº de blocos SQL, nº de campos ligados a coluna, tabelas tocadas |
| `sql-por-tela.sql` | 1.981 blocos SQL dos DFMs, agrupados por formulário, com parâmetros `:nomeados` preservados |
| `sql-do-codigo.sql` | 3.793 SQL únicos montados no código Delphi: 2.137 SELECT · 857 UPDATE · 666 INSERT · 129 DELETE · 4 EXEC |
| `formularios/*.txt` | 142 dumps DFM completos das telas do escopo (produto, orçamento, pedido, cliente, fornecedor, estoque, compras, parâmetros) — campo, rótulo, posição, máscara, ordem de tabulação, coluna que grava |

**15.921 campos** ligados a coluna de banco foram mapeados (`DataField` / `FieldName` / `DataBinding.FieldName`).

## Achados imediatos — regra que morava só no Delphi

**Numeração de venda tem condição de corrida.** Existe tabela de sequência `SisSeqTabela`
(`SeqTab_Tabela`, `SeqTab_Campo`, `SeqTab_Numero`), mas ela é realimentada por:

```sql
update SisSeqTabela set SeqTab_Numero = (select MAX(Ven_CodigoPre)+1 from Venda)
 where SeqTab_Tabela='Venda' and SeqTab_Campo='Ven_CodigoPre'
```

`MAX+1` sob concorrência entrega o mesmo número a dois operadores. No Cabinet: sequência do banco
ou identidade, nunca `MAX+1`.

**Saldo de estoque é escrito por valor absoluto, não por delta.**

```sql
update Estoque_produto set Epr_estoque = :pEpr_estoque
 where Epr_Codnosso=:pEpr_Codnosso and Epr_Acabamento=:pEpr_Acabamento
```

O valor vem calculado da aplicação e sobrescreve o saldo — duas baixas simultâneas perdem uma.
`estoque_log` é gravado à parte, então log e saldo podem divergir sem ninguém notar. É exatamente
o modo de falhar que o ADR-009 (kardex com `balance_after` do `RETURNING`) já evita no Cabinet.

**Cancelamento de venda** = `ven_situacao='C'` + `cen_codigo=null` + auditoria
(`usr_dt_hr_alteracao=getdate()`, `usr_cod_alteracao`). Há variante que também grava `Mod_codigo`
(motivo). Fechamento marca `Ven_DataFechaVenda`, com ramo próprio por `Ven_Tipo` e `ParSV_serie`.

## O que esta extração NÃO resolveu

O relatório impresso do orçamento (`FrmRel_OrcamentoP1`, QuickReport) tem a estrutura de bandas
recuperada, mas os textos são preenchidos em runtime — os `TQRLabel` do binário carregam
placeholders (`QRLEmpresa`, `QRLblCnpj`) e uma data de 2004. **Os PDFs reais de orçamento
continuam necessários** para o item E.
