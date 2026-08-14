# Diretrizes de UI — Cabinet

> Aprovadas pelo user em 2026-08-14. Promovidas a **regra permanente** em `project-core` @regras
> (repo de memória `doutorferr0/projetos-claude`). Não são preferência de estilo: cada uma nasceu de
> um defeito observado em produção, e cada uma tem teste.

Estas quatro diretrizes valem para **toda** a UI. Não existe tela isenta, e "essa tela é antiga" não
é justificativa — é o próprio problema.

---

## 1. Estado nunca se diz por cor clara

**A regra.** Ícone e rótulo de controle desabilitado ficam em **tinta preta**. O que muda é o
**fundo** (superfície apagada) e o **traço**. Nunca a opacidade do conteúdo.

**Onde nasceu.** Barra de ações do Cadastro de Produtos: `Alterar`, `Consul.` e `Excluir`
desabilitados em cinza-claro sobre folha clara. Ícone e texto somem. Palavras do user: *"esses ícones
por exemplo têm que ser pretos, nunca fazer algo assim em cor clara pois não dá pra ver."*

```
ERRADO   <button disabled class="opacity-40">        ← conteúdo clareia, ícone some
         <Icon class="text-muted-foreground" />

CERTO    <button disabled class="bg-surface-disabled border-dashed">
         <Icon class="text-foreground" />            ← ícone preto, fundo apagado
```

**Vale para** botão, ícone, campo somente-leitura, item de menu, aba inativa, linha de grade
desabilitada.

**Como se diz estado, então:** forma, posição, rótulo, fundo, traço. Nunca clareamento do conteúdo.

**Teste.** Falha se conteúdo (texto ou ícone) de controle desabilitado for clareado. Sem esse teste a
regra volta a quebrar na próxima tela — foi assim que chegou até aqui.

---

## 2. Cor por bloco, forte — com donos intocados

**A regra.** Cada módulo de formulário, ficha e grade recebe **faixa de cabeçalho na cor cheia** e
**corpo na `/02`** correspondente. Cor é estrutura, não enfeite: ela diz onde um assunto começa e
termina.

**Isto supersede** `direcao-visual-brutalism.md` §4 ("não trazer paleta saturada"). A decisão antiga
protegia o sinal do verde e do vermelho; a nova mantém essa proteção por outro caminho.

**Os três donos não mudam, e nenhum bloco invade faixa com dono:**

| Dono | Cor | Uso exclusivo |
|---|---|---|
| Dinheiro | verde | valor, total, preço, positivo |
| Foco | amarelo | anel de foco, pendência, atenção |
| Erro | vermelho | inválido, destrutivo, obrigatório faltando |

Cor de módulo é sempre outra família. Se um módulo é sobre dinheiro (Dados bancários), ele usa o
verde **porque o conteúdo tem dono** — não porque a cor coube.

**Tokens, nunca hex.** O mockup mostra hexes para ser legível fora do repo; no código, tudo sai de
`index.css`. Hex hardcodado em componente é defeito.

---

## 3. Hierarquia de formulário é invariante, não estilo

**A regra.**

- Campo **obrigatório** mora em módulo **sempre aberto**.
- Campo **opcional** mora em módulo **recolhido** por padrão.
- **Bloco fechado nunca esconde campo obrigatório.**

**Onde nasceu.** Cadastro despejando ~40 campos de uma vez, sem dizer o que trava o gravar. O que
existia — `FormBlock` — é `<fieldset>` + `<legend>`, citação direta do groupbox do SoftLux: moldura,
não hierarquia. E o uso era desigual entre telas da mesma base de código:

| Tela | Blocos | Nomeados |
|---|---|---|
| Fornecedor | 13 | 6 |
| Cliente | 11 | 4 |
| Profissional | 3 | 1 |
| Colaborador | 3 | 1 |

**Sinais que o formulário precisa dar:** asterisco vermelho no obrigatório · contador `n/total` no
bloco recolhido · progresso "X de N obrigatórios" no topo · o que falta no rodapé.

**Testes (é isto que impede o drift):**

- todo campo `req` mora em módulo `obrigatorio`;
- toda entidade tem exatamente um módulo `obrigatorio`;
- módulo não-obrigatório renderiza fechado;
- todo módulo tem ao menos um campo de coluna, senão some da grade;
- `id` de módulo é único dentro da entidade.

---

## 4. Módulo é a unidade — de tudo

**A regra.** O mesmo módulo alimenta **formulário, ficha de leitura e grade de listagem**. Um schema
declarativo por entidade, não três telas se combinando de boca.

- **Formulário:** módulo vira bloco.
- **Ficha:** módulo com dado abre; módulo vazio recolhe, cinza, com "+ Preencher". Campo sem valor
  dentro de módulo cheio aparece como "não informado" — some só o módulo inteiramente vazio.
- **Listagem:** módulo vira chip de filtro e grupo no seletor de colunas; a coluna carrega o ponto da
  cor do módulo de origem.

**Teste de paridade:** todo módulo do formulário existe na ficha com o mesmo `id`. É o que impede as
telas de divergirem — que é exatamente o que aconteceu entre Fornecedor e Profissional.

---

## Exemplos executáveis

Abrir no navegador. São a espec de **comportamento**; os tokens do repo vencem os hexes do mockup.

| Arquivo | O que demonstra |
|---|---|
| `mockup-cadastro-hierarquia.html` | a ideia, aplicada a Profissional |
| `mockup-cadastros-modelo.html` | 6 entidades geradas de schema · repetidor de vínculo empresa × colaborador |
| `mockup-consulta-modelo.html` | listagem com filtro/coluna por módulo · ficha em modo leitura |

O objeto `ENTIDADES` / `E` no topo do `<script>` de cada mockup **é a espec do schema**. Ele deve
virar módulo TS no repo, não ser reescrito à mão — reescrita diverge na primeira semana.

---

## O que estas diretrizes não são

Não são um pedido para repintar tudo de uma vez. São o critério pelo qual toda tela nova nasce e toda
tela tocada é corrigida. Uma tela que viola a diretriz 1 é **defeito**, não dívida — ela está no ar,
em cabinetonline.cc, e o usuário não consegue ler.
