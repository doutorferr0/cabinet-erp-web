import { type Modulo, moduloDaRota } from '@/app/modulo'
import brutalist011 from '@/assets/brutalist/brutalist-011.svg?url'
import brutalist022 from '@/assets/brutalist/brutalist-022.svg?url'
import brutalist029 from '@/assets/brutalist/brutalist-029.svg?url'
import brutalist064 from '@/assets/brutalist/brutalist-064.svg?url'
import brutalist072 from '@/assets/brutalist/brutalist-072.svg?url'
import brutalist097 from '@/assets/brutalist/brutalist-097.svg?url'
import shape128 from '@/assets/brutalist/brutalist-shape-128.svg?url'
import shape133 from '@/assets/brutalist/brutalist-shape-133.svg?url'
import shape135 from '@/assets/brutalist/brutalist-shape-135.svg?url'
import shape140 from '@/assets/brutalist/brutalist-shape-140.svg?url'
import shape159 from '@/assets/brutalist/brutalist-shape-159.svg?url'
import shape160 from '@/assets/brutalist/brutalist-shape-160.svg?url'
import shape182 from '@/assets/brutalist/brutalist-shape-182.svg?url'
import shape185 from '@/assets/brutalist/brutalist-shape-185.svg?url'
import shape193 from '@/assets/brutalist/brutalist-shape-193.svg?url'
import { cn } from '@/lib/utils'
import { useRouter, useRouterState } from '@tanstack/react-router'

/**
 * ORNAMENTO — a forma decorativa que dá cara a um módulo e a um estado.
 *
 * **Recolorido por MÁSCARA, nunca editando o `fill`.** Os SVGs saem do Figma
 * com `fill="white"` e máscaras internas; trocar o fill na mão quebra a forma.
 * Aqui o arquivo entra como `mask-image` e quem pinta é o `background-color` —
 * o desenho vira um recorte, e a cor vem de token. É por isso que existe UM
 * componente e `mask-image` solto pelos arquivos é proibido: a técnica está
 * escrita num lugar só.
 *
 * **Sempre colorido, nunca preto nem cinza** (regra dura do user). Preto é a
 * tinta do dado e da borda; ornamento na mesma tinta compete com o conteúdo em
 * vez de emoldurá-lo. Também estão fora as três cores com dono — verde é
 * dinheiro, amarelo é foco, vermelho é erro — exceto onde o significado É
 * aquele estado, que é o caso do 404.
 *
 * **O MESMO shape faz dois trabalhos, e a diferença é a cor, não o desenho:**
 *
 * - **decoração** — cor de TOKEN fixo (`modulo`, `info`, `erro`). O ornamento é
 *   a peça grande que dá cara à região: vazio de módulo, banda de identidade,
 *   modal de alerta. 24–128px.
 * - **ícone** — cor HERDADA do container (`icone`). O shape marca um LUGAR ao
 *   lado de um texto: migalha, cabeçalho de seção, aba. 12–20px.
 *
 * A fronteira com o lucide é o que decide qual família desenha o quê:
 * **shape = onde estou (lugar/entidade) · lucide = o que faço (ação/controle)**.
 * Chevron, x, check e busca continuam do lucide — o acervo não tem esses
 * desenhos, e misturar as duas famílias dentro do mesmo botão é pior do que
 * duas famílias com fronteira escrita.
 *
 * **É decoração, e se declara como tal:** `aria-hidden`. Quem carrega o sentido
 * é o texto ao lado. Estado vazio cuja única explicação fosse o desenho seria
 * uma tela muda para quem usa leitor.
 *
 * **Um por região visível** (teto de densidade da memória §@ornamentos). Se
 * três aparecerem juntos numa tela real, cortar o de menor hierarquia — não
 * diminuir os três.
 *
 * Só os SVGs efetivamente usados entram no repo: são 520 no staging, e um
 * barrel com todos eles arrastaria a coleção inteira para o bundle.
 */

/** Shape por MÓDULO — fixo. Mesmo módulo, mesmo desenho, sempre. */
const SHAPE_DO_MODULO: Record<Modulo, string> = {
  produtos: shape159, // etiqueta de borda serrilhada
  estoque: brutalist072, // empilhamento de camadas
  vendas: shape128, // linhas horizontais = documento
  compras: brutalist022, // sacola / volume
  clientes: brutalist064, // cabeça + corpo = pessoa
  fornecedores: brutalist029, // casa / galpão = empresa
  profissionais: shape133, // losango dentro de losango = crachá
  boletim: shape135, // anéis concêntricos = panorama
}

/**
 * Shapes de ESTADO — não pertencem a módulo nenhum.
 *
 * `rota-inexistente` e `alerta` apontam para o MESMO arquivo de propósito: a
 * memória dá a bandeira torta aos dois usos (404 e confirmação destrutiva), e
 * os dois são a mesma ideia — algo saiu do trilho. Ficam com nomes separados
 * porque quem escreve a tela pensa no ESTADO, não no número do SVG; e se um dia
 * a memória separar os dois desenhos, muda aqui e em nenhum consumidor.
 */
const SHAPE_DE_ESTADO = {
  'busca-vazia': shape160, // círculos que não se cruzam
  'rota-inexistente': shape193, // bandeira torta
  alerta: shape193, // a mesma bandeira: confirmação destrutiva
  'falha-rede': brutalist097, // triângulo partido — a consulta não chegou
  marca: shape182, // estrela radiada: a marca do sistema, fora de módulo
  'marca-apoio': shape140, // acompanha a marca na composição do login
  'marca-base': brutalist011, // idem
  /**
   * Losango dentro de círculo — a marca do sistema DENTRO da interface (topo da
   * sidebar), e depois no cabeçalho de documento impresso.
   *
   * Não reusa a chave `marca`, e a diferença não é capricho: `marca` é a
   * composição de BOAS-VINDAS (estrela radiada + apoio + base), que ocupa meia
   * tela no login e some assim que o operador entra. Este é o selo que fica no
   * canto durante as oito horas seguintes — tem de se ler a 28px e não pode
   * competir com o conteúdo. Dois empregos, dois desenhos, duas chaves.
   */
  emblema: shape185,
  /**
   * Galpão — a EMPRESA ATIVA. Aponta para o mesmo arquivo do módulo
   * Fornecedores, pelo mesmo motivo de `rota-inexistente`/`alerta`: é a mesma
   * ideia (uma empresa), vista de dois lugares. Fornecedores é a empresa do
   * outro; esta é a empresa de dentro. Chave própria porque quem escreve o
   * rodapé pensa em "empresa ativa", não em "o shape de Fornecedores" — e no
   * dia em que os desenhos se separarem, muda aqui e em nenhum consumidor.
   */
  empresa: brutalist029,
} as const

export type ShapeDeEstado = keyof typeof SHAPE_DE_ESTADO

/**
 * O tom é o PAPEL da cor, não a cor. `modulo`/`modulo-suave` leem o par que o
 * `[data-modulo]` do ancestral definiu — por isso o mesmo componente pinta de
 * cyan em Produtos e de coral no Boletim sem receber cor nenhuma.
 */
const TONS = {
  /** Cheia /01 do módulo: ornamento em destaque. */
  modulo: 'bg-modulo-cheia',
  /** Pastel /02 do módulo: presença sem chamar atenção (item inativo). */
  'modulo-suave': 'bg-modulo',
  /** Info/01 — busca sem resultado. Nunca a cor do módulo: vazio de busca não é módulo vazio. */
  info: 'bg-info',
  /** Danger/01 — só onde o significado É erro. */
  erro: 'bg-destructive',
  /**
   * Tomato — INDISPONIBILIDADE, que não é erro. A consulta não chegou; ninguém
   * fez nada errado e ninguém precisa consertar cadastro. Vermelho aqui faria o
   * operador tratar queda de rede como defeito.
   */
  offline: 'bg-offline',
  /** Roxo de marca — o sistema falando de si (login, splash). Fora de módulo. */
  marca: 'bg-accent',
  /**
   * Soft blue — a EMPRESA ATIVA. Fixo de propósito: é o único ornamento que não
   * pode mudar de cor ao navegar, porque ele responde "de qual empresa é o que
   * estou vendo" — pergunta cuja resposta não depende da tela aberta.
   */
  empresa: 'bg-empresa',
  /**
   * ÍCONE — a cor NÃO é escolhida aqui: `bg-current` resolve para
   * `background-color: currentColor` e o shape passa a herdar o `color` do
   * container.
   *
   * É o que separa o papel de ícone do de decoração. Um ícone acompanha o
   * texto ao lado em hover, ativo e desabilitado; com token fixo, cada um
   * desses estados precisaria de uma SEGUNDA regra de cor só para o ornamento,
   * e estado duplicado é estado que um dia diverge — foi isso que obrigou o par
   * /01//02 do item de menu a entrar invertido na 1.6.
   *
   * Sem custo de técnica: continua a mesma máscara das outras cinco, só muda
   * de onde vem o `background-color`. Não confundir com "sem cor" — herdar
   * preto do texto violaria a regra dura, então o papel de ícone só entra onde
   * o container já pinta em cor.
   */
  icone: 'bg-current',
} as const

export type TomDeOrnamento = keyof typeof TONS

export interface OrnamentoProps {
  /** Módulo (usa o shape fixo dele) ou um shape de estado. */
  shape: Modulo | ShapeDeEstado
  tom: TomDeOrnamento
  /**
   * Lado em px. A escala segue o PAPEL: 12–20 no de ícone (migalha, item de
   * menu, seção, aba) · 24–128 no de decoração (banda, modal, estado vazio).
   */
  tamanho: number
  className?: string
}

/**
 * O ornamento do módulo em que o operador ESTÁ, resolvido pela rota.
 *
 * Existe porque peças compartilhadas — a banda de identidade, o estado vazio da
 * listagem — não sabem nem devem saber de que módulo são: elas aparecem em 19
 * telas. A cor já vem sozinha pelo `[data-modulo]` do shell, mas o SHAPE é
 * escolha de JavaScript, e alguém precisa fazer a ponte.
 *
 * Rota sem módulo atribuído não desenha nada: melhor ausência do que o desenho
 * de outro módulo.
 */
export interface OrnamentoDoModuloProps {
  tom?: TomDeOrnamento
  tamanho: number
  className?: string
}

export function OrnamentoDoModulo(props: OrnamentoDoModuloProps) {
  // `warn: false` devolve `undefined` em vez de estourar quando não há router.
  // Sem isto, peças compartilhadas como a banda de identidade e a DataTable
  // passariam a EXIGIR router só por causa de um desenho — e o teste de
  // componente isolado (`renderWithQuery`), que é a regra do repo, quebraria
  // em todas elas. Fora do router não há rota, logo não há módulo, logo não há
  // ornamento: ausência, nunca o desenho de outro módulo.
  const router = useRouter({ warn: false })
  if (!router) return null
  return <OrnamentoDaRotaAtual {...props} />
}

/**
 * Metade de baixo: só é montada quando existe router, e é por isso que o hook
 * do roteador mora aqui e não no componente acima — hook não pode ser
 * condicional, mas COMPONENTE pode.
 */
function OrnamentoDaRotaAtual({ tom = 'modulo', tamanho, className = '' }: OrnamentoDoModuloProps) {
  const { location } = useRouterState()
  const modulo = moduloDaRota(location.pathname)
  if (!modulo) return null
  return <Ornamento shape={modulo} tom={tom} tamanho={tamanho} className={className} />
}

export function Ornamento({ shape, tom, tamanho, className }: OrnamentoProps) {
  const url =
    shape in SHAPE_DE_ESTADO
      ? SHAPE_DE_ESTADO[shape as ShapeDeEstado]
      : SHAPE_DO_MODULO[shape as Modulo]

  return (
    <span
      // Decoração: o significado está no texto ao lado, sempre.
      aria-hidden="true"
      data-slot="ornamento"
      data-shape={shape}
      className={cn('inline-block shrink-0', TONS[tom], className)}
      style={{
        width: tamanho,
        height: tamanho,
        // ASPAS DUPLAS OBRIGATÓRIAS em volta da URL. O Vite inlineia SVG
        // pequeno como data URI e mantém as aspas SIMPLES do markup
        // (`xmlns='...'`); um `url()` SEM aspas não pode conter aspas, então a
        // declaração inteira é inválida e o browser a DESCARTA — o ornamento
        // some e sobra o `background-color` pintando o retângulo inteiro. Era
        // isso que fazia todo shape da 1.6 aparecer como quadrado colorido.
        //
        // Não deu erro em lugar nenhum: o jsdom aceita a forma inválida, então
        // a suíte passava verde. É a mesma família da lição "contraste de tema
        // se confere renderizando" — CSS malformado é mudo.
        maskImage: `url("${url}")`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }}
    />
  )
}
