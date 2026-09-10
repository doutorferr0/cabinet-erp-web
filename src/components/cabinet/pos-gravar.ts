/**
 * O DESTINO DO `GRAVAR`, decidido num lugar só (issue #405).
 *
 * ## O que estava errado
 *
 * Não havia regra: havia nove decisões parecidas, uma por formulário, escritas
 * dentro do `onSuccess` que cada tela passava para o `mutate()`. Todas
 * mandavam para a listagem, e mesmo assim o pós-Gravar não era determinístico —
 * o E2E do par vivo mediu, no MESMO commit, ora a listagem, ora o documento
 * ainda na tela, e contornou assertando a resposta HTTP em vez da navegação.
 *
 * A causa é a ORDEM em que o TanStack Query chama os dois `onSuccess`:
 *
 * 1. o da MUTATION (a fronteira, `src/data/`), que invalida as queries;
 * 2. o das opções do `mutate()` (a tela), que navegava.
 *
 * O segundo só corre depois do primeiro — e **espera** por ele quando o
 * primeiro devolve promise (`await invalidateQueries` em `usar-parceiro.ts`,
 * `return Promise.all([...])` em `produtos-api.ts`). Como a invalidação
 * refaz as queries ATIVAS, e a query ativa é a do documento aberto, a troca de
 * tela ficava pendurada numa ida à rede: medido no navegador, `PUT` respondido
 * em 718 ms e a tela só trocando em 1000 ms. O intervalo é o tempo do servidor,
 * não do app — por isso muda a cada execução, e por isso quem olha logo depois
 * do 201 vê ora uma tela, ora a outra. Pior: callback de `mutate()` **não roda
 * se o componente desmontar** antes de a promise resolver, e aí a gravação
 * acontece e a navegação simplesmente não.
 *
 * ## A regra
 *
 * - registro **NOVO** → abre o documento que acabou de nascer, com `replace`;
 * - **EDIÇÃO** → permanece na tela, e quem responde ao clique é o toast que a
 *   fronteira já dá (`lib/avisos.ts`).
 *
 * Ela responde a mesma pergunta nos dois casos: *onde está o registro que eu
 * acabei de gravar?* Na inclusão ele não estava em lugar nenhum e agora tem
 * endereço — levar para lá é mostrar o que nasceu, com número e id do servidor.
 * Na edição ele já estava na tela, e trocar de tela para dizer "gravou" cobra
 * do operador uma segunda navegação para conferir o que ele estava vendo.
 *
 * ## Por que isto é uma função, e não mais um `onSuccess` à mão
 *
 * A decisão fica FORA do `mutate()` de cada tela; o que cada tela ainda sabe é
 * só a própria rota (`abrirDocumento`). Um lugar para a regra é um lugar para
 * mudá-la — e o teste de determinismo tem o que endereçar.
 */
export interface PosGravar<D> {
  /**
   * O registro estava sendo CRIADO? Sai do id que o formulário tinha ANTES do
   * `Gravar` — documento novo nasce com id vazio, porque id é do servidor.
   */
  eraNovo: boolean
  /**
   * Abre o documento pelo id que o servidor devolveu. Cada tela passa a sua
   * rota: `to` e `params` são tipados pelo router, e uma string genérica aqui
   * trocaria essa checagem por um erro em tempo de execução.
   *
   * Usar `replace: true` na navegação é parte do gesto: o `/novo` que ficou
   * para trás não existe mais como destino, e o Voltar do navegador levaria a
   * um formulário em branco que já foi gravado — o convite para gravar duas
   * vezes.
   */
  abrirDocumento: (id: string) => void
  /**
   * Onde mora o id no que o servidor devolveu. Padrão: `gravado.id`.
   */
  idDoGravado?: (gravado: D) => string | undefined
}

function idPadrao(gravado: unknown): string | undefined {
  const id = (gravado as { id?: unknown } | null)?.id
  return typeof id === 'string' && id ? id : undefined
}

/**
 * Monta o `onSuccess` do `Gravar` a partir da regra acima.
 *
 * Sem id no que voltou — mock que não devolve o registro, servidor que responde
 * `204` — a inclusão PERMANECE, como a edição: é o único desfecho honesto,
 * porque não há endereço para onde ir. O toast continua sendo a resposta ao
 * clique nos dois casos.
 */
export function posGravar<D>({ eraNovo, abrirDocumento, idDoGravado = idPadrao }: PosGravar<D>) {
  return (gravado: D) => {
    if (!eraNovo) return
    const id = idDoGravado(gravado)
    if (!id) return
    abrirDocumento(id)
  }
}
