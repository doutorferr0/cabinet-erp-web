# Atalhos do teclado — folha de validação com quem opera

> Uma página. Leva ~10 minutos com o Cabinet aberto na frente.
> Volte com esta folha rabiscada — rabisco vale mais que resposta bonita.

**No sistema deste diálogo, no Cabinet, a tela equivalente é `Ajuda › Atalhos do teclado`**
(abre pelo `Ctrl+K` → "Atalhos do teclado"). Ela mostra a mesma tabela de baixo, sempre
igual ao código.

## O que já está decidido, e não está em jogo aqui

- **Nada depende de tecla.** Toda ação tem botão. Atalho é conveniência para quem tem
  pressa, não requisito — quem nunca decorar nenhum consegue operar o sistema inteiro.
- **F3 a F6 estão proibidas.** Não é escolha de gosto: o navegador as usa antes da
  aplicação (F3 busca na página, F5 recarrega, F6 pula entre painéis). Se o Cabinet
  tentasse usá-las, o navegador ganharia — e às vezes ganharia só em uma das máquinas,
  que é pior que não ter a tecla.
- O que está em jogo é **qual letra substitui cada uma**, e isso ainda dá para mudar
  barato. Depois que a mão aprender, não dá.

## A tabela — marque na coluna da direita

| No sistema antigo | O que faz | No Cabinet hoje | Serve? Se não, o que seria |
|---|---|---|---|
| `F6` | Inserir produto no documento | `Alt+P` | |
| `F5` | Inserir ambiente | `Alt+A` | |
| `F4` | Buscar transportadora (ordem de compra) | `Alt+T` | |
| `F4` | Mostrar imagem do produto (orçamento) | `Alt+I` | |
| `F3` | Inserir localização do estoque | **sem tecla** | |
| — | Abrir a busca | `Ctrl+K` | |
| — | Incluir registro na listagem | `Alt+N` (declarado, ainda não ligado) | |

## Cinco perguntas

1. **A letra ajuda a lembrar, ou o dedo procura a POSIÇÃO da tecla de função?**
   `Alt+P` de produto, `Alt+A` de ambiente. Se a mão procura a fileira de cima e a letra
   atrapalha, diga — a solução existe e é outra, mas precisamos saber disso agora.

2. **`F3` (localização do estoque) não tem substituto.** Duas perguntas numa: essa ação
   ainda é usada no dia a dia? E se for, `Alt+L` soa natural?

3. **`Alt+N` para incluir vale a pena?** Hoje ele está escrito e não faz nada. A busca
   (`Ctrl+K`) já oferece "Novo cliente", "Novo produto" e os outros por escrito. Ligamos o
   `Alt+N` também, ou uma porta só basta?

4. **`Ctrl+K` dentro do cadastro de cliente.** Ali essa tecla abre a busca de **cidade**,
   e não a busca geral — o formulário aberto tem prioridade. É o que vocês esperariam, ou
   a busca geral deveria ganhar sempre?

5. **Falta alguma tecla que vocês usavam e não está na tabela?** É a pergunta mais barata
   desta folha e a mais cara de descobrir depois.

## O teste que só pode ser feito na máquina de vocês

Conferi na documentação oficial do Chrome e do Edge (28/08/2026) e o resultado foi:

| Tecla | Chrome | Edge |
|---|---|---|
| `Ctrl+K` | usa — "pesquisar a partir de qualquer lugar da página" | usa — "abrir consulta de busca na barra de endereço" |
| `Alt+P` `Alt+A` `Alt+T` `Alt+I` `Alt+N` `Alt+L` | não constam da lista | não constam da lista |

O Cabinet intercepta o `Ctrl+K` antes do navegador, então lá dentro ele abre a busca do
sistema, não a do navegador.

**Isso é o que os fabricantes publicam — não é teste na máquina de vocês**, e a diferença
importa: extensão instalada, teclado com layout diferente, leitor de tela e política da
empresa mudam a resposta, e nada disso aparece em manual de fabricante. Por isso o pedido:

> Com o Cabinet aberto, aperte cada tecla da tabela e anote se **o navegador** fez alguma
> coisa (abriu menu, foi para a barra de endereço, mudou de aba).

| | Chrome | Edge | Outro (qual?) |
|---|---|---|---|
| Versão / máquina | | | |
| Alguma tecla fez outra coisa? Qual | | | |

## Sobre a busca (`Ctrl+K`) — o que ela faz hoje

Vale conferir junto, porque é a novidade desta rodada. Ela abre por tecla **ou** pelo campo
de busca no alto da tela, e procura:

- **tela** (`Clientes`, `Orçamentos`…) e **ação** (`Novo cliente`);
- **registro**: cliente, fornecedor, profissional, produto, orçamento e pedido de venda —
  por nome, código, CNPJ/CPF e número do documento, a partir de 3 letras.

Ela mostra os primeiros de cada tipo e diz quantos existem ao todo ("3 de 47") — não é a
listagem, é o atalho para chegar num registro conhecido.

**Perguntar junto:** procurar por essas seis coisas cobre o dia de vocês, ou falta alguma
(ordem de compra? colaborador? nota de recebimento?).

---

Referência para quem for implementar o que sair daqui: o mapa mora em
`src/lib/shortcuts.ts` (`MAPA_DE_ATALHOS`), a tela em `src/features/ajuda/`, e a busca em
`src/data/busca-de-registro.ts`. Issue #362.
