# Proposta — as duas reprovações de contraste da navegação

> **Para o user decidir com uma palavra.** As duas reprovações estão medidas desde a #140 (§Medição
> de contraste do `DESIGN.md`, `tabela:nav-estados`). O que faltava era a solução, e ela estava
> parada porque `src/index.css` proíbe mexer no preenchimento sem passar por aqui. Este documento
> fecha essa lacuna: duas propostas completas, medidas módulo a módulo nos dois temas, com o custo
> visual de cada uma e uma recomendação.
>
> **Nada foi alterado.** Nenhuma cor mudou, nenhum componente mudou. Isto é docs-only de propósito:
> o valor da entrega é o user poder dizer "sim" sem que ninguém tenha mexido antes.
>
> Números gerados por `docs/design/medir-contraste.py` sobre os tokens reais de `src/index.css`.

## 1. O que reprova, e por quê

| caso | par | piso | claro | escuro |
|---|---|---|---|---|
| **1 — o fio** | `/01` × `--background` | 3:1 (WCAG 1.4.11, não-texto) | **1,27:1** (6 de 9 reprovam) | 3,36:1 ✅ |
| **2 — o ícone** | `/02` × `/01` | 3:1 (não-texto) | **1,36:1** | **2,80:1** (8 de 9 reprovam) |

O **caso 1** é o fio de 3px que marca a aba ativa no topo (`bg-modulo-cheia` em `appbar.tsx`). Ele
agrava porque **carrega o estado ativo sozinho**: a superfície `/02` que a aba ganha ao ficar ativa
mede 1,00 a 1,17:1 contra o fundo (§`tabela:pasteis-02`) — invisível. Sem o fio, aba ativa e inativa
são a mesma imagem.

O **caso 2** é o ícone do item da barra lateral contra o próprio preenchimento: ativo é
`text-modulo-suave` (`/02`) sobre `bg-modulo-cheia` (`/01`); hover é o inverso. Mesmo par nos dois
sentidos.

Os dois têm a mesma raiz da pendência antiga do rótulo (§`tabela:estados-fundo`, 4,00:1 no claro e
1,33:1 no escuro): **a cheia `/01` é um neon que não desce de luz no escuro** — `.dark
[data-modulo=…]` só redefine a `/02` — **e é clara demais no claro.**

## 2. A restrição, antes das propostas

Antes de propor hex, vale derivar o que a aritmética permite. Com `L` = luminância relativa:

**Tema claro** — `L(background) = 0,8221`, `L(tinta) = 0` (preta):

| exigência | implica |
|---|---|
| fio `/01` × fundo ≥ 3:1 | `L(/01) ≤ 0,2407` |
| texto tinta × `/01` ≥ 4,5:1 | `L(/01) ≥ 0,1750` |

→ **janela viável: `L(/01) ∈ [0,175 ; 0,241]`.** Estreita, mas existe.

**Tema escuro** — `L(background) = 0,0096`, `L(tinta) = 0,8632` (clara):

| exigência | implica |
|---|---|
| fio `/01` × fundo ≥ 3:1 | `L(/01) ≥ 0,1287` |
| texto tinta × `/01` ≥ 4,5:1 | `L(/01) ≤ 0,1529` |

→ **janela viável: `L(/01) ∈ [0,129 ; 0,153]`.** Também existe — **mas é outra janela**, e é por isso
que o escuro precisa de um `/01` próprio: hoje ele herda o do claro, e nenhum valor serve aos dois.

### O caso 2 é impossível por paleta no tema escuro

Com `L(/01)` obrigatoriamente ≥ 0,1287, o ícone `/02` só alcança 3:1 se

- `L(/02) ≤ 0,0096` — **exatamente a luminância do fundo da página**, ou
- `L(/02) ≥ 0,4861` — que viola `texto × /02 ≥ 4,5:1`, o qual exige `L(/02) ≤ 0,1529`.

O ramo de cima é proibido por outra regra; o de baixo faz a superfície de hover **sumir dentro do
fundo**, que é o oposto do trabalho dela. **Não é difícil: é autodestrutivo.** Nenhuma escolha de
cor resolve o ícone-sobre-preenchimento no escuro enquanto `/01` for o fundo.

Isso não é opinião — é o que as três desigualdades permitem.

---

## 3. Proposta A — mudar o COMPONENTE, zero mudança de cor · **recomendada**

A raiz não é o valor das cores: é **usar a `/01` como fundo de texto e de ícone**. O próprio
`DESIGN.md` já diz o papel dela — *"`bg-modulo-cheia` é o elemento COMPACTO (chip, cabeçalho de card,
marcador) e **nunca área grande**"*, e *"`text-modulo` é o traço"*. O item de menu ativo usa a `/01`
como área com letra em cima, que contraria a regra escrita.

### A1 — o item ativo da lateral deixa de ser preenchido pela `/01`

Troca `data-active:bg-modulo-cheia` por `bg-modulo` (a `/02`, a mesma do hover). O estado ativo
continua distinto porque **as duas marcas que já existem ficam**: `data-active:border-l-foreground`
(a barra de 3px à esquerda) e `data-active:font-bold`.

O par do rótulo **e** do ícone passa a ser tinta × `/02`, que já está medido e já passa:

| tema | pior | melhor | piso |
|---|---|---|---|
| claro | **16,88:1** | 18,81:1 | 4,5 texto · 3 ícone |
| escuro | **9,32:1** | 13,10:1 | 4,5 texto · 3 ícone |

**Resolve o caso 2 e, de quebra, a pendência antiga do rótulo** (`tabela:estados-fundo`), que sai de
4,00/1,33:1 para 16,88/9,32:1.

### A2 — o fio da aba do topo passa a usar `--foreground`

Troca `bg-modulo-cheia` por `bg-foreground` no `<span>` de 3px do `appbar.tsx`. **Há precedente no
próprio sistema**: o item da lateral já marca o ativo com `border-l-foreground`, não com a cor do
módulo.

| tema | `--foreground` × `--background` | piso |
|---|---|---|
| claro | **17,44:1** | 3 |
| escuro | **15,33:1** | 3 |

**Resolve o caso 1 nos dois temas, com folga de 5×.**

### Custo visual de A

- **A cor do módulo sai de dois lugares**: do preenchimento do item ativo e do fio da aba. Ela
  continua em tudo o mais — a superfície `/02` do hover e do ativo, o `text-modulo` do ícone
  inativo, os chips, os cabeçalhos de card e as molduras.
- **O item ativo e o item em hover passam a ter o mesmo fundo.** A diferença fica por conta da
  barra esquerda e do negrito, que já existem hoje. É menos vistoso do que o preenchimento cheio —
  e é a decisão a pesar nesta proposta.
- **A família das 9 cores não muda em nada**: nenhum valor é tocado, então a distinguibilidade entre
  módulos é exatamente a de hoje.

---

## 4. Proposta B — mudar a PALETA

Se a preferência for manter a `/01` como preenchimento do ativo, dá para trazer os valores para
dentro das janelas da §2. **Matiz e saturação ficam intactos — só a lightness anda**, para preservar
a identidade de cada módulo.

### B1 — tema claro, alvo `L = 0,190`

| Módulo | atual | proposto | fio | texto | ícone |
|---|---|---|---|---|---|
| Produtos | `186 100% 50%` `#00E5FF` | `186 100% 29%` `#008594` | 3,63:1 | 4,80:1 | 3,87:1 |
| Estoque | `206 100% 50%` `#0090FF` | `206 100% 42%` `#007AD8` | 3,63:1 | 4,80:1 | 3,57:1 |
| Vendas / Orçamento | `260 100% 62%` `#7E3DFF` | `260 100% 66%` `#8C53FF` | 3,63:1 | 4,80:1 | 3,64:1 |
| Compras / Pedidos | `330 100% 59%` `#FF2E96` | `330 100% 46%` `#EB0076` | 3,63:1 | 4,80:1 | 3,71:1 |
| Clientes | `293 100% 56%` `#E51FFF` | `293 100% 46%` `#CE00E9` | 3,63:1 | 4,80:1 | 3,64:1 |
| Fornecedores | `231 99% 62%` `#3E5BFE` | `231 99% 65%` `#4F69FE` | 3,63:1 | 4,80:1 | 3,57:1 |
| Profissionais | `278 100% 57%` `#AF24FF` | `278 100% 60%` `#B331FF` | 3,63:1 | 4,80:1 | 3,67:1 |
| CRM | `151 100% 45%` `#00E677` | `151 100% 27%` `#008B48` | 3,63:1 | 4,80:1 | 3,92:1 |
| Boletim | `18 100% 59%` `#FF6D2E` | `18 100% 43%` `#DB4200` | 3,63:1 | 4,80:1 | 3,52:1 |

**No claro, uma mudança resolve os três de uma vez** — fio (≥3), texto (≥4,5) e ícone (≥3).

### B2 — tema escuro, `/01` próprio, alvo `L = 0,140`

Hoje o escuro **herda** o `/01` do claro. Precisaria de bloco próprio em `.dark [data-modulo=…]`:

| Módulo | proposto (escuro) | fio | texto | ícone |
|---|---|---|---|---|
| Produtos | `186 100% 25%` `#007481` | 3,19:1 | 4,81:1 | **1,97:1** |
| Estoque | `206 100% 37%` `#006ABC` | 3,19:1 | 4,81:1 | **2,26:1** |
| Vendas / Orçamento | `260 100% 61%` `#7937FF` | 3,19:1 | 4,81:1 | **2,73:1** |
| Compras / Pedidos | `330 100% 40%` `#CD0067` | 3,19:1 | 4,81:1 | **2,53:1** |
| Clientes | `293 100% 40%` `#B400CB` | 3,19:1 | 4,81:1 | **2,64:1** |
| Fornecedores | `231 99% 60%` `#3452FE` | 3,19:1 | 4,81:1 | **2,58:1** |
| Profissionais | `278 100% 49%` `#9D00F8` | 3,19:1 | 4,81:1 | **2,58:1** |
| CRM | `151 100% 24%` `#00793E` | 3,19:1 | 4,81:1 | **1,94:1** |
| Boletim | `18 100% 37%` `#BF3900` | 3,19:1 | 4,81:1 | **2,46:1** |

**O ícone continua reprovando no escuro, e pela §2 não há valor que resolva.** A proposta B, sozinha,
**não fecha o caso 2** — ela precisaria do A1 mesmo assim.

### Custo visual de B

- **O neon acaba no tema claro.** Produtos vai de ciano elétrico a petróleo (`#00E5FF` → `#008594`,
  −21 pontos de lightness); CRM de verde-limão a verde-mata (−18 pp); Boletim de laranja a
  ferrugem (−16 pp). Compras (−13 pp) e Clientes (−10 pp) andam bastante. Os roxos e o azul de
  Fornecedores quase não se mexem (+3 a +4 pp), porque já estavam na janela.
- **A família continua distinguível entre si** — matiz e saturação não mudam, e a separação entre os
  9 módulos é a de hoje. O que muda é o conjunto ficar mais escuro e menos vibrante no claro.
- **Contradiz a decisão de identidade** que trocou a paleta antiga pela neon (2026-08-13). Desfazê-la
  por contraste é uma escolha de produto, não de acessibilidade — e por isso é sua, não minha.
- **Dobra a superfície de manutenção**: passa a haver `/01` no claro e `/01` no escuro, e toda
  medição futura precisa cobrir os dois.

---

## 5. Um híbrido, se a `/01` tiver de continuar sendo o fio

Se a preferência for **manter a cor do módulo no fio** da aba (recusando o A2) mas aceitar o A1:

- **só o `/01` do tema claro escurece** (tabela B1) — 9 valores, um tema;
- o escuro fica **exatamente como está**, porque o fio lá já passa: pior caso **3,36:1** ≥ 3;
- o A1 resolve o ícone e o rótulo nos dois temas, sem cor nova.

É a menor mudança de paleta que fecha os três problemas. Custo: o neon do tema claro ainda acaba.

---

## 6. Recomendação

**Proposta A.** Três razões, em ordem de peso:

1. **É a única que fecha o caso 2 nos dois temas.** A B não fecha — a §2 prova que nenhuma cor
   fecha, enquanto a `/01` for o fundo do ícone. Adotar B sozinha deixaria uma reprovação de pé
   depois de mudar nove cores.
2. **Custa zero em cor** e devolve a `/01` ao papel que o `DESIGN.md` já escreveu para ela —
   elemento compacto e traço, nunca área com letra em cima. A reprovação é sintoma de uso fora do
   papel, e A trata o uso, não o sintoma.
3. **Tem precedente dentro do próprio sistema**: o item da lateral já marca o ativo com
   `border-l-foreground`. O A2 só estende ao topo o que a lateral já faz.

O preço a aceitar é o item ativo ficar com o mesmo fundo do hover, distinguido por barra e negrito.
Se isso for pouco à vista, o caminho é reforçar a marca de ativo com FORMA (barra mais grossa,
recuo, moldura) e não com cor de fundo — forma não tem piso de contraste, e não custa a paleta.

**Se a resposta for B**, o que eu faria: B1 no claro, A1 para o ícone, e o escuro intocado (o
híbrido da §5) — porque B2 muda nove valores a mais e ainda assim deixa o ícone reprovando.

---

## 7. O que é preciso para executar, quando houver decisão

**Nada disto foi feito.** Fica registrado para o trilho que vier:

- **A1** — `src/components/ui/sidebar.tsx`: `data-active:bg-modulo-cheia` → `data-active:bg-modulo`.
- **A2** — `src/app/appbar.tsx`: o `<span>` do fio, `bg-modulo-cheia` → `bg-foreground`.
- **B1/B2** — `src/index.css`, blocos `[data-modulo=…]` e um bloco novo `.dark [data-modulo=…]`
  para o `/01`.
- Em qualquer caso: rodar `python3 docs/design/medir-contraste.py --escrever`, porque
  `tabela:nav-estados`, `tabela:estados-fundo`, `tabela:pasteis-02` e `tabela:cheia-01` mudam todas —
  e o `--conferir` do CI reprova se ficarem velhas.
- O comentário do §utilities de `src/index.css` que hoje proíbe mexer sem passar por aqui precisa
  apontar para esta decisão depois de tomada.
