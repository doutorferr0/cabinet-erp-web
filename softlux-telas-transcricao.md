  # SoftLux — transcrição literal das telas (base para o Cabinet)

> Transcrito em 2026-07-27 a partir de 20 capturas de tela do sistema legado.
> **Sistema:** SoftLux - Brasil · **Versão:** 1.0.2.1521 · **Data das capturas:** 05/08/2025
> **Usuário logado nas capturas:** VANESSA · **Fabricante:** FÁCIL IT SOFTWARE · **Cliente:** Vertz
>
> Este arquivo é transcrição, não interpretação. As seções marcadas
> **`[OBSERVAÇÃO]`** são leitura minha e podem estar erradas — confirmar com o user.

---

## Legenda de notação

| Notação | Significado |
|---|---|
| `[texto]` | campo de texto livre |
| `[combo]` | lista suspensa (valores vêm de tabela de apoio) |
| `[combo +...]` | lista suspensa **com botão `...`** = cadastrar item novo sem sair da tela |
| `[data]` | campo de data com ícone de calendário |
| `[máscara: ...]` | campo com máscara de digitação |
| `[busca +...]` | campo que abre janela auxiliar de busca (por código) |
| `[valor +calc]` | campo numérico com ícone de calculadora |
| `☐` / `☑` | caixa de marcação (desmarcada / marcada na captura) |
| `○` / `●` | opção exclusiva (não selecionada / selecionada na captura) |
| `GRADE` | tabela editável dentro do formulário |
| `(vazio)` | campo visível e vazio na captura |
| `(cortado)` | coluna existe mas o texto está cortado pela largura da janela |

---

# 1. Menu principal

**Título da janela:** `Sistema SoftLux - Brasil`

**Barra de menus (11 itens):**
`Tabelas` · `Cadastros` · `Vendas` · `Compras` · `Movimentação` · `Financeiro` · `CRM` ·
`Relatórios` · `Controle de Acesso` · `Sistema` · `Ajuda` · `Sair`

**Barra de status:** `Usuário: VANESSA` · `Versão 1.0.2.1521` · `05/08/2025`

## 1.1 Menu `Cadastros` (20 itens, na ordem exata)

```
Clientes
Fornecedores
Profissional Externo
Colaboradores
Contadores
Transportadoras
Serviços
Custo
Índice de Vl. de Venda
Produtos                          ▸ (submenu — conteúdo não capturado)
Empresa
Centros de Custos
Plano de Contas
Filiais
Empresas de Factoring
Metas de Venda
Rateios
Ganhos Sobre Vendas
Grupos de Produtos Relacionados
Promoção
```

## 1.2 Menu `Compras` (7 itens)

```
Pedido
Ordem
Nota do Fornecedor
──────────────────────────────────────────────
Consultar previsão de chegada de produtos
Consultar compras para estoque(reserva de produto).
Consultar ordens externas
Atualizar valor de tabela
```

## 1.3 Menu `Vendas` (19 itens, com separadores)

```
Pasta
Orçamento
Pedido de venda
Pedido de Demonstração
Pré-venda
Assistência Técnica (Garantia)
Emissão de Cupom Fiscal                        ← DESABILITADO (cinza)
──────────────────────────────────────────────
Devolução de Venda
Autorização de Inclusão (Desativado)           ← rótulo diz "(Desativado)"
Conclusão do Pedido de Venda
──────────────────────────────────────────────
Transferência de Venda entre Profissionais
Quadro de Cargas
──────────────────────────────────────────────
Acompanhamento e Fechamento de Metas
──────────────────────────────────────────────
Acompanhamento de Ganhos Sobre Vendas
Recalcular Ganhos Sobre Vendas
Fechamento de Ganhos Sobre Vendas
──────────────────────────────────────────────
Nota Fiscal (não eletrônica)
Consulta de Valores de NFe, NFCe de Pré-Venda
Consultar Situação do Pedido de Venda
```

---

# 2. Cadastro de Colaboradores

**Título:** `Cadastro de Colaboradores`

### Cabeçalho (fora das abas — vale para todas)
| Campo | Tipo |
|---|---|
| Nome | `[texto]` largo |
| Setor | `[combo +...]` |
| Atendimento ao cliente | `☑` (marcada) |
| Ativo | `☑` (marcada) |

**Botões no canto superior direito:** `Incluir Foto` · `Retirar Foto` + área de imagem (moldura vazia)

### Abas (5)
`Geral` · `Endereço` · `Documentação` · `Contatos` · `Financeiro`
→ **Somente a aba `Geral` foi capturada.** As outras 4 não têm captura.

### Aba `Geral`
| Campo | Tipo |
|---|---|
| Sexo | `○ Masculino` `○ Feminino` |
| Dt Nascimento | `[data]` |
| Grau de Instrução | `[combo]` |
| Profissão | `[combo +...]` |
| Raça/Cor | `[combo]` |
| Estado Civil | `[combo]` |
| Nome do Cônjuge | `[texto]` |
| Dt.Nasc.Cônjuge | `[data]` |
| Nome do Pai | `[texto]` |
| Nome da Mãe | `[texto]` |
| Naturalidade | `[busca +...]` |
| UF | rótulo, sem campo visível — parece derivado da Naturalidade |
| Nacionalidade | `[combo +...]` |
| Ano de Chegada | `[texto]` |

**Bloco separado por moldura (trabalhista):**
| Campo | Tipo |
|---|---|
| Cargo | `[combo +...]` |
| Salário | `[valor +calc]` |
| Vínculo | `[combo]` |
| Data de Admissão | `[data]` |
| Data de Demissão | `[data]` |

**Rodapé da aba:**
| Campo | Tipo |
|---|---|
| FaceBook | `[texto]` |
| Instagram | `[texto]` |
| Empresa | `[combo]` — valor na captura: `VERTZ ILUMINAÇÃO` |

**Botões:** `✔ Gravar` · `✖ Cancelar`

> **`[OBSERVAÇÃO]`** Este cadastro mistura dado cadastral simples (nome, setor) com **dado
> sensível de RH** (salário, raça/cor, cônjuge, filiação, admissão/demissão). No Cabinet isso
> provavelmente precisa ser separado em dois blocos com permissão distinta — e trava na
> pergunta aberta sobre responsabilidade formal de LGPD.

---

# 3. Cadastro de Profissional Externo

**Título:** `Cadastro de Profissional Externo`

### Cabeçalho
| Campo | Tipo |
|---|---|
| Nome de Apresentação | `[texto]` largo |
| Ativo | `☑` (marcada) |

### Abas (3)
`Dados Cadastrais` · `Contatos/Observação` · `Participação`
→ **Somente `Dados Cadastrais` foi capturada.**

### Navegador de registros (exclusivo desta tela)
Rótulo `Reg. Atual/Quant. Reg.:` + botões `|◀` `◀` `▶` `▶|` + `➕ Incluir` + `➖ Excluir`

### Aba `Dados Cadastrais`
| Campo | Tipo |
|---|---|
| Tipo de Pessoa | botão duplo `[Física]` `[Jurídica]` — `Física` destacado em verde na captura |
| Nome | `[texto]` |
| Dt Nascimento | `[máscara: /]` |
| CPF | `[máscara: . . . -]` |
| RG | `[texto]` |
| Est. Civil | `[combo]` |
| Profissão | `[combo]` |
| Nome Cônjuge | `[texto]` |
| Dt. Nasc. (do cônjuge) | `[máscara: /]` |
| Endereço | `[texto]` |
| Número | `[texto]` |
| Complemento | `[texto]` |
| Bairro | `[texto]` |
| Cidade | `[busca +...]` — na captura: código `354` + `CAMPINAS` |
| UF | rótulo com valor `SP` (derivado da cidade) |
| CEP | `[máscara: -]` |
| Fone Comer. | `[texto]` |
| Fone Resid. | `[texto]` |
| FAX | `[texto]` |
| Celular | `[texto]` |
| Email | `[texto]` |
| Comunicadores | **dois pares** de `[combo]` + `[texto]` |

**Bloco `Dados Bancários`:**
| Campo | Tipo |
|---|---|
| Nº do banco | `[busca +...]` |
| Nome do banco | `[texto]` |
| Nº da agência | `[texto]` |
| Nº da conta | `[texto]` |
| Endereço (da agência) | `[texto]` |
| Número | `[texto]` |
| Complemento | `[texto]` |
| Bairro | `[texto]` |
| Cidade | `[busca +...]` |
| UF | rótulo |

**Rodapé:**
| Campo | Tipo |
|---|---|
| PIS\PASEP\NIS | `[texto]` |
| Registro Profissional (CREA, CAU, CFT) | `[texto]` |
| FaceBook | `[texto]` |
| Instagram | `[texto]` |

**Botões:** `✔ Gravar` · `✖ Cancelar`

> **`[OBSERVAÇÃO]`** A aba `Participação` (não capturada) é quase certamente comissão/rateio
> do profissional na venda. Confirmar — é pré-requisito do orçamento.

---

# 4. Cadastro de Fornecedores

**Título:** `Cadastro de Fornecedores`

### Corpo principal
| Campo | Tipo |
|---|---|
| Razão Social | `[texto]` largo |
| Sigla | `[texto]` curto |
| Nome Fantasia | `[texto]` largo |
| CNPJ/CPF | `[texto]` + **botão `CNPJ`** (consulta externa) |
| Insc. Est. | `[texto]` |
| Endereço | `[texto]` |
| Número | `[texto]` |
| Complemento | `[texto]` |
| Bairro | `[texto]` |
| Cidade | `[busca +...]` |
| UF | rótulo |
| CEP | `[máscara: -]` |
| Fone 1 | `[texto]` |
| Fone 2 | `[texto]` |
| FAX | `[texto]` |
| E-mail | `[texto]` |
| Site | `[texto]` |
| Comunicadores | **dois pares** de `[combo]` + `[texto]` |
| Fornece produto para revenda | `☐` (desmarcada) |
| Materiais | `[combo]` |
| Prazo de entrega (dias) | `[texto]` |
| Prazo de pagamento (dias) | `[texto]` |
| Ativo | `☑` (marcada) |
| FaceBook | `[texto]` |
| Instagram | `[texto]` |
| **Empresa compradora** | `[combo]` — **destacado em amarelo pelo user na captura** |

### Abas inferiores (8)
`Contatos` · `Dados Bancários` · `Faturamento` · `Observação` · `Outros Dados` ·
`Comissão\Premiação` · `Participação` · `Histórico Emp. Comp.`
→ **Somente `Contatos` foi capturada.**

### Aba `Contatos` — GRADE editável
| Nome | Vínculo | Fone | FAX |
|---|---|---|---|
| (vazia na captura) | | | |

**Botões:** `✔ Gravar` · `✖ Cancelar`

> **`[OBSERVAÇÃO]`** `Empresa compradora` + `Histórico Emp. Comp.` mostram que o vínculo
> fornecedor↔empresa **muda ao longo do tempo e é histórico**, não campo único. Isso é
> modelagem de tabela de vínculo com vigência, não uma coluna.

---

# 5. Cadastro de Clientes

**Título:** `Cadastro de Clientes`

### Abas (6)
`Principal` · `Pessoais` · `Cobrança\Comercial` · `Obra` · `Contato` · `Financeiro\Tributário`
→ **Somente `Principal` foi capturada.**

### Aba `Principal`
| Campo | Tipo |
|---|---|
| Nome | `[texto]` largo |
| Tipo de pessoa | `● FÍSICA` `○ JURÍDICA` |
| CPF | `[máscara: . . . -]` |
| Sexo | `[combo]` |
| RG | `[texto]` |
| Órgão Expedição | `[texto]` |
| UF (do RG) | `[combo]` |
| Endereço | `[texto]` |
| Número | `[texto]` |
| Compl. | `[texto]` |
| Bairro | `[texto]` |
| Cidade | `[busca +...]` — na captura: `354` + `CAMPINAS` |
| UF | rótulo `SP` |
| CEP | `[máscara: -]` + **botão 🔍 (lupa)** = busca endereço por CEP |
| Fone Comer. | `[texto]` |
| FAX | `[texto]` |
| Fone Resid. | `[texto]` |
| Celular | `[texto]` |
| Email | `[texto]` |
| Ativo | `☑` (marcada) |
| Profissional | `[combo +...]` |
| Categoria | `[combo +...]` |
| Dt. de Nasc. | `[máscara: /]` |
| FaceBook | `[texto]` |
| Instagram | `[texto]` |
| Inscrição Estadual Produtor Rural | `[texto]` |
| Observação | `[textarea]` com barra de rolagem |

**Botões:** `✔ Gravar` · `✖ Cancelar`

> **`[OBSERVAÇÃO]`** A aba `Obra` (não capturada) é a peça que liga cliente → obra → ambiente →
> orçamento. Já está registrada como pendência de modelagem na memória. Continua sem captura.

---

# 6. Cadastro de Produtos — 5 abas

**Título:** `Cadastro de produtos - Banco Principal`
**Abas:** `Dados Principais` · `Outros Dados` · `Valores\Localização do Estoque` ·
`Produtos Relacionados` · `Tributação`
→ **Todas as 5 foram capturadas.**

## 6.1 Aba 1 — `Dados Principais`

| Campo | Tipo |
|---|---|
| Nosso Código | `[texto]` |
| Código Especial | `[texto]` |
| Código Reduzido | `[texto]` |
| Nossa Descrição | `[texto]` largo |

**GRADE `Fornecedor`** — botões `➕ Incluir` · `➖ Excluir` (com rolagem horizontal)
| Padrão | Fornecedor | Cód. Prod. Fornecedor | Descrição do Fornecedor |
|---|---|---|---|
| (vazia) | | | |

| Campo | Tipo |
|---|---|
| Dt de Vigência | `[data]` — na captura: `05/08/2025` |
| Tipo de Produto | `[combo]` |
| Tipo da Peça | `[combo +...]` |
| Tipo da Linha | `[combo +...]` |
| Unidade de Entrada — Unidade | `[combo]` |
| Unidade de Entrada — Quantidade | `[texto]` |
| Unidade de Saída — Unidade | `[combo]` |
| Unidade de Saída — Quantidade | `[texto]` |
| Classificação do Produto | `[combo]` |
| Empresa Compradora | `[combo]` |
| Designer\Modelo | `[combo +...]` |
| Fábrica | `[combo +...]` |
| Marca | `[combo +...]` |
| Nossa Descrição Complementar (material) | `[textarea]` |

**Controles na coluna direita:** área de imagem + `Incluir Foto` · `Retirar Foto` ·
`☐ Fora de Linha` · `☑ Consultar Valor` · `☑ Ativo` · `☐ Sobre Medida`

**Botões:** `✔ Gravar` · `✖ Cancelar`

## 6.2 Aba 2 — `Outros Dados` (especificação técnica luminotécnica)

| Campo | Tipo |
|---|---|
| Qtd. lâmp. por reator | `[texto]` |
| Consumo (Watts) | `[texto]` |
| Tensão (Volts) | `[texto]` |
| Tensão (Bi-Volts) | `[texto]` |
| Temperatura Cor | `[texto]` |
| Ângulo | `[texto]` |
| Vão Livre | `[texto]` |
| Tempo Instalação (Min) | `[texto]` |
| Corte\Nicho | `[texto]` |
| Peso Líquido | `[texto]` |
| Peso Bruto | `[texto]` |
| Lúmen | `[texto]` |
| Garantia Meses | `[texto]` |

**Bloco `Dimensões do Produto`:** `Altura` · `Largura` · `Comprimento` · `Raio`
**Bloco `Dimensões da Embalagem (caixa)`:** `Altura` · `Largura` · `Comprimento` · `Raio`

| Campo | Tipo |
|---|---|
| Descrição Livre | `[textarea]` grande |
| Publicar no Site | `☑` (marcada) |

## 6.3 Aba 3 — `Valores\Localização do Estoque`

**Texto de instrução na tela:**
`"Escolha o acabamento e tecle F3 para inserir localização do estoque."`

**GRADE 1 — valores por variante** (botão `➕ Incluir`; tem rolagem horizontal, colunas
adicionais não visíveis)
| Ativo | Acabamento | Tamanho | Valor de Tabela | Índice | Est.Mínimo | Tipo de Valor | V… (cortado) |
|---|---|---|---|---|---|---|---|
| `<No data to display>` | | | | | | | |

**GRADE 2 — bloco `Localização do Estoque`**
| Acabamento | Estoque | Prédio | Rua | Número | Apto |
|---|---|---|---|---|---|
| `<No data to display>` | | | | | |

**Botões:** `✔ Gravar` · `✖ Cancelar`

> **`[OBSERVAÇÃO]`** Duas coisas importantes aqui: (1) a variante é **Acabamento × Tamanho**,
> e o preço e o estoque mínimo vivem nela, não no produto; (2) a localização física é
> **endereçamento estruturado** (Prédio / Rua / Número / Apto), mais um campo `Estoque` que
> provavelmente é o depósito. Isso é mais estruturado do que "um campo flexível" — provavelmente
> merece tabela própria.

## 6.4 Aba 4 — `Produtos Relacionados`

Botões `➕ Incluir` · `➖ Excluir`

**GRADE 1 — grupos**
| Nome do Grupo | Padrão | Ativo |
|---|---|---|
| `<No data to display>` | | |

| Campo | Tipo |
|---|---|
| Código do Produto | `[combo]` — valor na captura: `Fornecedor` |

**GRADE 2 — itens do grupo**
| Cód. Fornecedor | Descrição Forne(cedor) | Acabamento | Quantidade | Padrão |
|---|---|---|---|---|
| `<No data to display>` | | | | |

> **`[OBSERVAÇÃO]`** Bate com a modelagem já decidida (`product_relation_groups` /
> `product_relation_items`, quantidade preenchida = kit, nula = sugestão).

## 6.5 Aba 5 — `Tributação`

| Campo | Tipo |
|---|---|
| Origem do Produtos *(sic — plural no rótulo original)* | `[combo]` largo |
| NCM | `[texto]` |
| CEST | `[texto]` |

**Bloco `Impostos para NFe`:** `Padrão:` `[combo +...]`

**Bloco `Busca automática dos Impostos da NFe vinculada ao NCM`** — GRADE
| Código | Descrição | Operação | CFOP | Consumidor Final | UF | Ativo |
|---|---|---|---|---|---|---|
| `<No data to display>` | | | | | | |

**Botões:** `✔ Gravar` · `✖ Cancelar`

> **`[OBSERVAÇÃO]`** A regra fiscal é resolvida por combinação
> `NCM × Operação × CFOP × Consumidor Final × UF`. É tabela de regra, não campo no produto.
> Nenhum grupo IBS/CBS aparece — o legado é pré-Reforma.

---

# 7. Compras

## 7.1 Ordem de Compra — listagem

**Título:** `Ordem de Compra`
**Busca:** `Busca pelo código:` `[texto]`
**Barra de ações (7):** `■ Filtro` · `➕ Incluir` · `✏ Alterar` · `✔ Consul.` · `➖ Excluir` ·
`🖨 Imprimir` · `↩ Sair`

**GRADE** (ordenada por `Código ▲` decrescente na captura)
| Código | Fornecedor | Data Ordem | Data Envio |
|---|---|---|---|
| 5149 | EVOLED (ATIVA COMERCIAL) | 05/08/2025 | (vazio) |
| 5148 | ILUMINAR | 05/08/2025 | 05/08/2025 |
| 5147 | FILLAMENTO | 05/08/2025 | 05/08/2025 |
| 5146 | INTERLIGHT | 04/08/2025 | 04/08/2025 |
| 5145 | STELLA | 02/08/2025 | 04/08/2025 |
| 5144 | TELAS TENSIONADAS | 01/08/2025 | 01/08/2025 |
| 5143 | DSGNSELO | 01/08/2025 | 04/08/2025 |
| 5142 | USINA DESIGN | 31/07/2025 | 31/07/2025 |
| 5141 | MISTER LED | 31/07/2025 | 31/07/2025 |
| 5140 | MISTER LED | 30/07/2025 | 31/07/2025 |
| 5139 | DSGNSELO | 29/07/2025 | 29/07/2025 |
| 5138 | STELLA | 29/07/2025 | 29/07/2025 |

## 7.2 Ordem de Compra — inclusão/edição

**Título:** `Ordem de Compra`
**Abas:** `Principal` · `Pagamento` → somente `Principal` capturada.

### Cabeçalho
| Campo | Tipo |
|---|---|
| Código | `[texto]` |
| Data Ordem | `[data]` |
| Data Envio | `[data]` |
| Data Prevista | `[data]` |
| Reagendamento | `[data]` |
| Código do Produto | `[combo]` (seletor de qual código exibir) |
| **Filtro Sobre Venda** → Número | `[texto]` valor `0` + botão |
| Empresa Compradora | `[combo]` |
| Fornecedor | `[combo]` largo |
| Faturamento mínimo | `[valor +calc]` valor `0,00` |

### Corpo
**Botões:** `Excluir Produtos Selecionado` · `📦 Produtos Estoque` · `📦 Produtos Pedidos`

**GRADE `Produtos`** (rolagem horizontal — pode ter colunas além destas)
| Código do Produto | Descrição do Produto | Acab. | Tamanho | Quantidade | Unidade | Vl. Unitário | Valor Total | Ped. Compra | Data |
|---|---|---|---|---|---|---|---|---|---|
| `<No data to display>` | | | | | | | | | |

### Totais
`Subtotal:` `[valor +calc]` · `Desconto:` `[valor +calc]` · `Acréscimo:` `[valor +calc]` ·
`Total:` `[valor +calc]`

### Bloco `Transportadora`
`Nome:` (rótulo) · `Município:` (rótulo) · `UF:` (rótulo) · botão `🔍 Busca F4`

| Campo | Tipo |
|---|---|
| Observação | `[textarea]` |

**Botão inferior esquerdo:** `Pedido de Compra` (navega para o pedido relacionado)
**Botões:** `✔ Gravar` · `✖ Cancelar`

## 7.3 Pedido de Compra — listagem

**Título:** `Pedido de Compra`
**Busca:** `Busca pelo código:` `[texto]`
**Barra de ações (7):** `■ Filtro` · `Incluir` · `Alterar` · `Consul.` · `Excluir` · `Imprimir` · `Sair`

**GRADE**
| Código | Pedido de Venda | Série | Data | Fornecedores |
|---|---|---|---|---|
| 7763 | (vazio) | (vazio) | 05/08/2025 | EVOLED (ATIVA COMERCIAL) |
| 7762 | 21646 | 1 | 05/08/2025 | VIA HF ILUMINAÇÃO |
| 7761 | 21649 | 1 | 05/08/2025 | DRAMALUX |
| 7760 | 21607 | 1 | 05/08/2025 | STELLA |
| 7759 | (vazio) | (vazio) | 05/08/2025 | EVOLED (ATIVA COMERCIAL) - FILLAMENTO |
| 7758 | 21643 | 1 | 04/08/2025 | INTERLIGHT |
| 7757 | 21548 | 1 | 04/08/2025 | INTERLIGHT - MISTER LED |
| 7756 | 21628 | 1 | 02/08/2025 | NEWSTANDARD |
| 7755 | 21619 | 1 | 01/08/2025 | DSGNSELO |
| 7754 | 21634 | 1 | 01/08/2025 | STUDIOLUCE ILUMINACAO IMPORTACAO E EXPORTACAO |
| 7753 | 21614 | 1 | 31/07/2025 | DRAMALUX - EVOLED (ATIVA COMERCIAL) - ILUMINAR - MIST… (cortado) |
| 7752 | 21594 | 1 | 31/07/2025 | ALLOY ILUMINAÇÃO - INTERLIGHT |
| 7751 | 21581 | 1 | 30/07/2025 | DSGNSELO - MISTER LED |

> **`[OBSERVAÇÃO]` — dois fatos estruturais importantes:**
> 1. **Um pedido de compra tem N fornecedores** (concatenados por ` - ` na coluna). Não é 1:1.
> 2. **`Pedido de Venda` aparece no pedido de compra** — é a compra puxada pela venda
>    (números 21xxx batem com a faixa de numeração dos orçamentos). Alguns pedidos têm o campo
>    vazio = compra para estoque, não para venda específica.
> 3. `VIA HF ILUMINAÇÃO` aparece como **fornecedor** no pedido 7762 — ou seja, uma empresa do
>    grupo vende para a outra. Confirmar: isso é transferência entre empresas?

## 7.4 Pedido de Compra — inclusão/edição

**Título:** `Pedido de Compra`

| Campo | Tipo |
|---|---|
| Código | `[texto]` |
| Ped. Venda | `[texto]` |
| Série | `[texto]` |
| Data | `[data]` — na captura: `05/08/2025` |
| Fornecedor | `[combo]` largo |
| Código do Produto | `[combo]` — valor `Fornecedor` |

**Botão:** `📦 Produto F6`

**GRADE `Produtos`** (rolagem horizontal)
| Código Fornecedor | Descrição do Fornecedor | Acab. | Quantidade | **Destino** | Tamanho | Unidade | Valor Unit. | V… (cortado) |
|---|---|---|---|---|---|---|---|---|
| (linha em branco pronta para digitação) | | | | | | | | |

| Campo | Tipo |
|---|---|
| Observação | `[textarea]` |
| Total | rótulo com valor `0,00` |

**Botão inferior esquerdo:** `Ordem de Compra` (navega para a ordem relacionada)
**Botões:** `✔ Gravar` · `✖ Cancelar`

> **`[OBSERVAÇÃO]`** A coluna `Destino` na grade do pedido, ausente na ordem, sugere que o item
> comprado já nasce com destino definido (estoque × obra/cliente). Confirmar.
> Pedido ↔ Ordem se navegam mutuamente por botão — são dois documentos distintos e ligados.

---

# 8. Vendas — Orçamento

## 8.1 Orçamento — listagem

**Título:** `Orçamento`
**Barra de ações (7):** `■ Filtro` · `➕ Incluir` · `✏ Alterar` · `✔ Consul.` ·
**`Cancelar`** · `🖨 Imprimir` · `↩ Sair`

> **Diferença relevante:** nas telas de compra o botão é `Excluir`; aqui é **`Cancelar`**.
> Orçamento não se apaga, se cancela.

**GRADE**
| Número | Série | Cliente | Descrição da Obra | Data Emissão | Data Validade |
|---|---|---|---|---|---|
| 21653 | 1 | ANDRÉ BATALHA | MARIANA | 05/08/2025 | 10/08/2025 |
| 21654 | 1 | ROMULO GERMANO | MARIANA | 05/08/2025 | 10/08/2025 |
| 21655 | 1 | SHEILA E VICENTE | ARIADINE | 05/08/2025 | 10/08/2025 |
| 21645 | 1 | TELMA TOMPSON | ANA ELIZA | 04/08/2025 | 09/08/2025 |
| 21652 | 1 | ROBERT TAGLIAELA | MALU | 04/08/2025 | 09/08/2025 |
| 21644 | 1 | 3Z REALTY | MALU | 04/08/2025 | 09/08/2025 |
| 21650 | 1 | ADRIANA FERREIRA | ANA ELIZA | 04/08/2025 | 09/08/2025 |
| 21651 | 1 | ALEXANDER SCHULZ | (vazio) | 04/08/2025 | 09/08/2025 |
| 21647 | 1 | BSA ADMINISTRADORA DE BENS E PARTICIPACOES | GIORDANA | 04/08/2025 | 09/08/2025 |
| 21646 | 1 | CONSUMIDOR | OBRA INDEFINIDA | 04/08/2025 | 09/08/2025 |
| 21648 | 1 | HELIO MURSSA JUNIOR | FLAVIO COSSA | 04/08/2025 | 09/08/2025 |
| 21649 | 1 | LUIMARA PAULA MALVEZZI ROCHA | OBRA INDEFINIDA | 04/08/2025 | 09/08/2025 |
| 21641 | 1 | ERICA BRAGION | FLAVIO COSSA | 02/08/2025 | 07/08/2025 |
| 21643 | 1 | ANTONIO ANGELO CASADEI | MALU | 02/08/2025 | 07/08/2025 |
| 21642 | 1 | NAHLA | RICARDO | 02/08/2025 | 07/08/2025 |
| 21639 | 1 | PATRICIA E MARCELO ROSSI | SILVANIA | 01/08/2025 | 06/08/2025 |
| 21638 | 1 | PATRICIA E MARCELO ROSSI | SILVANIA | 01/08/2025 | 06/08/2025 |

**Botões no rodapé (5):** `Produtos Desativados` · `Alterar Limites` · `Atualizar Valores` ·
`Margem de Lucro` · `Quadro`

> **`[OBSERVAÇÃO]`** A coluna `Descrição da Obra` está preenchida com **nomes de pessoas**
> (MARIANA, ARIADINE, ANA ELIZA, MALU, GIORDANA, FLAVIO COSSA, SILVANIA, RICARDO), mais os
> valores `OBRA INDEFINIDA` e um vazio. Isso sugere que na prática o campo está sendo usado
> para registrar **o arquiteto/profissional da obra**, não a obra. Se for isso, é desvio de uso
> do legado e o Cabinet precisa decidir se separa os dois conceitos.
> Também: dois orçamentos para o mesmo cliente no mesmo dia (21638 e 21639, PATRICIA E MARCELO
> ROSSI) — versão/revisão de orçamento é caso real.
> A numeração é sequencial global com `Série` separada, e **não é cronológica** (21653-21655
> emitidos em 05/08, 21645 em 04/08) — o número é atribuído na criação, a emissão depois.

## 8.2 Orçamento — inclusão/edição (tela mais complexa do sistema)

**Título:** `Orçamento` (janela maximizada)
**Abas superiores (5):** `Principal` · `Serviços` · `Cliente` · `Pagamento` · `Outros Dados`
→ **Somente `Principal` foi capturada.**

### Cabeçalho
| Campo | Tipo |
|---|---|
| Código | `[texto]` |
| Série | `[combo]` — valor `1` |
| Nº Pasta | `[busca +...]` |
| Data Emissão | `[data]` — `05/08/2025` |
| Data Validade | `[data]` — `10/08/2025` |
| Data Fechamento | `[data]` — vazia |
| Cliente | `[texto]` + botão `👤 Cliente` |
| Consultor(a) | `[busca +...]` |
| Profissional Externo | `[busca +...]` |

### Controles de desconto
`● Desconto por Produto` `○ Desconto Geral` + botão `Desconto Grupo`

### Texto de instrução na tela
`"Tecle F4 para mostrar imagem do produto."`

### Botões de inserção de item
`🏠 Ambiente F5` · `📦 Produto F6` · `Pré Produto`

### GRADE de itens (13 colunas)
| Item | Código Fornecedor | Descrição do Fornecedor | Acabamento | Tamanho | Quant. | Und. | Valor Unit. | Desc. % | Valor Item | Grupo Produto | Tipo de Peça | Fornecedor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `<No data to display>` | | | | | | | | | | | | |

### Totais (linha principal)
`SubTotal:` `[valor]` · `Desconto:` `[valor]` `%` `[valor]` · `Total:` `[valor]`

### Abas internas de totais (3)
`Totais da Venda` · `Totais de Impostos` · `Frete`
→ Aba `Totais da Venda` visível: `SubTotal 0,00` · `Desconto 0,0010 %` `0,00` · `Total 0,00`

### Botões no rodapé (4)
`📄 Orçamento` · `📦 Estoque` · `Alterar Limites` · `🔒 Permissões`

**Botões:** `✔ Gravar` · `✖ Cancelar`

> **`[OBSERVAÇÃO]`** Esta é a tela central do sistema. Pontos estruturais:
> - **`Ambiente F5`** = os itens do orçamento são agrupados por ambiente da obra (sala, quarto…).
>   A grade capturada está vazia, então não se vê como o ambiente aparece nela — pode ser linha
>   de agrupamento ou coluna oculta na rolagem.
> - **`Pré Produto`** = item que ainda não existe no catálogo (produto sob medida / a definir).
> - **Desconto em três níveis:** por produto, por grupo e geral — mutuamente exclusivos os dois
>   primeiros por radio.
> - **`Desconto 0,0010`** no total sugere que o percentual é guardado com 4 casas decimais.
> - **`Permissões` como botão dentro do documento** = autorização por documento, provavelmente
>   para liberar desconto acima do limite. Combina com `Alterar Limites`.
> - **`Data Fechamento`** separada de emissão e validade = o orçamento tem ciclo de vida.
> - O item referencia **`Código Fornecedor` + `Descrição do Fornecedor`**, não o código próprio —
>   ou seja, o orçamento fala na língua do fornecedor.

---

# 9. Padrões de interface que se repetem

Levantamento derivado das telas acima. É o que interessa para dimensionar a reconstrução:
**não são 20 telas, são 8 padrões.**

| # | Padrão | Onde aparece | Nº de ocorrências |
|---|---|---|---|
| 1 | Formulário com abas, um registro só | colaborador, prof. externo, fornecedor, cliente, produto | 5 |
| 2 | `[combo +...]` — escolher ou cadastrar na hora | Setor, Grau de Instrução, Profissão, Raça/Cor, Estado Civil, Nacionalidade, Cargo, Vínculo, Categoria, Profissional, Tipo de Produto, Tipo da Peça, Tipo da Linha, Classificação, Designer\Modelo, Fábrica, Marca, Materiais, Impostos Padrão | **19** |
| 3 | GRADE editável dentro do formulário | fornecedores do produto, valores por acabamento, localização de estoque, grupos relacionados, itens de grupo, contatos do fornecedor, itens da ordem, itens do pedido, itens do orçamento, impostos por NCM | **10** |
| 4 | Listagem com barra de 7 ações idêntica | ordem de compra, pedido de compra, orçamento | 3 |
| 5 | `[busca +...]` com janela auxiliar / atalho | Cidade, Naturalidade, Banco, Nº Pasta, Consultor, Profissional Externo, Transportadora (F4), Produto (F6), Ambiente (F5), Cliente | **10** |
| 6 | Documento com cabeçalho + itens + totais | ordem de compra, pedido de compra, orçamento | 3 |
| 7 | Recorte por empresa | Empresa (colaborador), Empresa compradora (fornecedor, produto, ordem), Histórico Emp. Comp. | 5 |
| 8 | Consulta somente-leitura | previsão de chegada, compras para estoque, ordens externas, situação do pedido, valores de NFe | 5 |

**Convenções globais observadas:**
- Todo formulário termina em `✔ Gravar` / `✖ Cancelar` no canto inferior direito.
- Toda listagem tem `Busca pelo código:` no topo esquerdo.
- Atalhos de teclado são parte da operação: **F3** (localização de estoque), **F4** (busca
  transportadora / imagem do produto), **F5** (ambiente), **F6** (produto).
- `Ativo` como marcação em todos os cadastros — desativação lógica, nunca exclusão.
- Endereço aparece repetido em 4 cadastros com os mesmos campos (Endereço, Número,
  Complemento, Bairro, Cidade, UF, CEP) → é bloco reutilizável.
- Telefone aparece em 4 variações fixas (Comer., Resid., Celular, FAX) → também bloco.
- `Comunicadores` = par `[combo]` + `[texto]`, sempre dois pares.
- Redes sociais (FaceBook, Instagram) em **todos** os cadastros de pessoa e empresa.

---

# 10. O que NÃO foi capturado (lacunas para próxima rodada de prints)

| Tela | Abas/partes faltando |
|---|---|
| Colaboradores | `Endereço`, `Documentação`, `Contatos`, `Financeiro` |
| Profissional Externo | `Contatos/Observação`, **`Participação`** |
| Fornecedores | `Dados Bancários`, `Faturamento`, `Observação`, `Outros Dados`, **`Comissão\Premiação`**, **`Participação`**, **`Histórico Emp. Comp.`** |
| Clientes | `Pessoais`, `Cobrança\Comercial`, **`Obra`**, `Contato`, `Financeiro\Tributário` |
| Produtos | submenu `Produtos` do menu Cadastros |
| Ordem de Compra | aba `Pagamento` |
| Orçamento | **`Serviços`**, `Cliente`, **`Pagamento`**, `Outros Dados`; abas `Totais de Impostos` e `Frete`; janela do `Ambiente F5`; janela `Pré Produto`; telas dos 5 botões do rodapé da listagem |
| Menus inteiros | `Tabelas`, `Movimentação`, `Financeiro`, `CRM`, `Relatórios`, `Controle de Acesso`, `Sistema` |
| Fluxos | Pedido de venda, Pré-venda, Pasta, Quadro de Cargas, Metas, Ganhos Sobre Vendas |

**As lacunas mais críticas para o escopo inicial (estoque + orçamento):**
`Cliente → Obra` · `Orçamento → Ambiente F5` · `Orçamento → Serviços` · `Orçamento → Pagamento` ·
`Profissional Externo → Participação` · menu `Movimentação` (é onde deve morar a
movimentação de estoque).
