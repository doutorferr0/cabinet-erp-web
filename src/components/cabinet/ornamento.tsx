import { type Modulo, moduloDaRota } from '@/app/modulo'
import brutalist011 from '@/assets/brutalist/brutalist-011.svg?raw'
import brutalist014 from '@/assets/brutalist/brutalist-014.svg?raw'
import brutalist022 from '@/assets/brutalist/brutalist-022.svg?raw'
import brutalist029 from '@/assets/brutalist/brutalist-029.svg?raw'
import brutalist064 from '@/assets/brutalist/brutalist-064.svg?raw'
import brutalist072 from '@/assets/brutalist/brutalist-072.svg?raw'
import brutalist097 from '@/assets/brutalist/brutalist-097.svg?raw'
import shape101 from '@/assets/brutalist/brutalist-shape-101.svg?raw'
import shape120 from '@/assets/brutalist/brutalist-shape-120.svg?raw'
import shape128 from '@/assets/brutalist/brutalist-shape-128.svg?raw'
import shape133 from '@/assets/brutalist/brutalist-shape-133.svg?raw'
import shape135 from '@/assets/brutalist/brutalist-shape-135.svg?raw'
import shape140 from '@/assets/brutalist/brutalist-shape-140.svg?raw'
import shape159 from '@/assets/brutalist/brutalist-shape-159.svg?raw'
import shape160 from '@/assets/brutalist/brutalist-shape-160.svg?raw'
import shape182 from '@/assets/brutalist/brutalist-shape-182.svg?raw'
import shape185 from '@/assets/brutalist/brutalist-shape-185.svg?raw'
import shape193 from '@/assets/brutalist/brutalist-shape-193.svg?raw'
import { cn } from '@/lib/utils'
import { useRouter, useRouterState } from '@tanstack/react-router'

/**
 * ORNAMENTO — a forma decorativa que dá cara a um módulo e a um estado.
 *
 * **Desenhado INLINE, com contorno e peso** (decisão do user, 2026-08-07). A
 * versão anterior recolorava por `mask-image`: a forma virava recorte e o
 * `background-color` pintava. Máscara é silhueta de UMA cor — não aceita traço.
 * Como o contorno preto passou a ser requisito, e contorno + preenchimento é
 * bicolor, a máscara deixou de servir. Medido antes de trocar: dos 520 SVGs do
 * acervo, os 320 sólidos (`brutalist`, `brutalist-shape`, `spark`) NÃO têm
 * `<mask>` nenhuma — só as 200 texturas (`wavy-line`, `wireframe`) têm, e essas
 * são fundo, não levam traço e ficariam na máscara se algum dia entrarem.
 *
 * **O `fill` do arquivo continua intocado.** O que mudou é quem lê o arquivo:
 * ele entra como texto (`?raw`), o `d` de cada `path` é extraído e o desenho é
 * remontado aqui com os atributos que a pele exige. Editar o SVG em disco segue
 * proibido — o acervo é fonte, não código.
 *
 * **Por que o contorno existe:** os oito `/01` de módulo mediam 1,32 a 2,97:1
 * sobre superfície clara — nenhum alcançava 3:1, e o ornamento sumia na folha.
 * As saídas eram escurecer a paleta ou trocar cor de módulo; o user escolheu uma
 * terceira, que resolve os dois de uma vez: **quem delimita a forma passa a ser
 * o traço (~20:1), e aí o preenchimento fica livre para ser NEON.** Consequência
 * que precisa estar escrita: os hexes neon têm contraste baixo contra branco POR
 * CONSTRUÇÃO. Isso é intencional. Não "consertar" escurecendo o preenchimento —
 * o critério de aceite é o traço.
 *
 * **O traço vai ATRÁS do preenchimento, em duas camadas.** Traço é centrado na
 * borda e metade dele invade a forma; num shape de LINHA — o galpão, os anéis
 * do Boletim — a faixa pintada tem ~1,5px na tela e um traço de 3,5px a engole
 * inteira: o desenho fica preto e a cor some. Só apareceu ao RASTERIZAR; a
 * suíte passava verde, porque os atributos estavam todos certos.
 *
 * **Traço e peso saem de TOKEN, nunca de literal.** `--foreground` é o token
 * documentado como "traço e texto", e ele VIRA no tema escuro. Um preto literal
 * desapareceria sobre a bancada escura — é a mesma família de defeito mudo do
 * `text-white` que a fase 3 pagou.
 *
 * **Sempre colorido, nunca preto nem cinza** continua valendo — para o
 * PREENCHIMENTO. O traço é preto porque traço é tinta de borda, a mesma
 * linguagem da caixa de 2px do sistema: ornamento contornado não é ornamento
 * preto. Seguem fora as três cores com dono — verde é dinheiro, amarelo é foco,
 * vermelho é erro — exceto onde o significado É aquele estado, que é o 404.
 *
 * **O MESMO shape faz dois trabalhos, e a diferença é a cor, não o desenho:**
 *
 * - **decoração** — cor de TOKEN fixo (`modulo`, `info`, `erro`). A peça grande
 *   que dá cara à região: vazio de módulo, banda de identidade, modal. 24–128px.
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

interface Desenho {
  /** `viewBox` já reexpandido: sem folga o traço é cortado pela borda. */
  viewBox: string
  /** Só o `d` de cada `path`. Cor, traço e peso nascem aqui, não no arquivo. */
  paths: string[]
  /**
   * Cobertura de tinta do shape, em % da área da bbox — ver `temPeso`.
   * Medida por rasterização do arquivo, não estimada no olho.
   */
  cobertura: number
}

/**
 * Folga de 12% de cada lado antes de desenhar.
 *
 * Os arquivos saem do Figma com o `viewBox` colado na forma (padding de 2%). O
 * traço é centrado na borda do caminho, então metade dele cai FORA do `viewBox`
 * e é recortada — o shape aparece com o contorno comido de um lado só. Não dá
 * erro: é defeito mudo, do tipo que passa verde na suíte.
 */
const FOLGA = 0.12

/** `id="Vector_1"` também contém `d="`; o espaço antes garante que é o atributo. */
const ATRIBUTO_D = /\sd="([^"]+)"/g
const ATRIBUTO_VIEWBOX = /viewBox="([^"]+)"/

function lerDesenho(raw: string, cobertura: number): Desenho {
  const bruto = ATRIBUTO_VIEWBOX.exec(raw)?.[1] ?? '0 0 100 100'
  const [x = 0, y = 0, w = 100, h = 100] = bruto.split(/\s+/).map(Number)
  const folgaX = w * FOLGA
  const folgaY = h * FOLGA
  const paths = [...raw.matchAll(ATRIBUTO_D)].map(([, d]) => d ?? '')
  return {
    viewBox: `${x - folgaX} ${y - folgaY} ${w + folgaX * 2} ${h + folgaY * 2}`,
    paths: paths.filter((d) => d.length > 0),
    cobertura,
  }
}

/**
 * A cobertura de cada shape, medida uma vez e guardada — não se recalcula em
 * render. Obtida rasterizando o SVG e dividindo os pixels de tinta pela área da
 * bbox da tinta. Refazer com o mesmo método se entrar shape novo; chutar o
 * número aqui derrota a regra inteira.
 */
const DESENHOS = {
  brutalist011: lerDesenho(brutalist011, 55.6),
  brutalist014: lerDesenho(brutalist014, 43.8),
  brutalist022: lerDesenho(brutalist022, 72.3),
  brutalist029: lerDesenho(brutalist029, 5.0),
  brutalist064: lerDesenho(brutalist064, 78.8),
  brutalist072: lerDesenho(brutalist072, 60.2),
  brutalist097: lerDesenho(brutalist097, 50.3),
  shape101: lerDesenho(shape101, 12.3),
  shape120: lerDesenho(shape120, 56.8),
  shape128: lerDesenho(shape128, 80.2),
  shape133: lerDesenho(shape133, 43.4),
  shape135: lerDesenho(shape135, 12.5),
  shape140: lerDesenho(shape140, 62.2),
  shape159: lerDesenho(shape159, 94.7),
  shape160: lerDesenho(shape160, 10.1),
  shape182: lerDesenho(shape182, 41.2),
  shape185: lerDesenho(shape185, 66.0),
  shape193: lerDesenho(shape193, 42.0),
} as const

/** Shape por MÓDULO — fixo. Mesmo módulo, mesmo desenho, sempre. */
const SHAPE_DO_MODULO: Record<Modulo, Desenho> = {
  produtos: DESENHOS.shape159, // etiqueta de borda serrilhada
  estoque: DESENHOS.brutalist072, // empilhamento de camadas
  vendas: DESENHOS.shape128, // linhas horizontais = documento
  compras: DESENHOS.brutalist022, // sacola / volume
  clientes: DESENHOS.brutalist064, // cabeça + corpo = pessoa
  fornecedores: DESENHOS.brutalist029, // casa / galpão = empresa
  profissionais: DESENHOS.shape133, // losango dentro de losango = crachá
  boletim: DESENHOS.shape135, // anéis concêntricos = panorama
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
  'busca-vazia': DESENHOS.shape160, // círculos que não se cruzam
  'rota-inexistente': DESENHOS.shape193, // bandeira torta
  alerta: DESENHOS.shape193, // a mesma bandeira: confirmação destrutiva
  'falha-rede': DESENHOS.brutalist097, // triângulo partido — a consulta não chegou
  marca: DESENHOS.shape182, // estrela radiada: a marca do sistema, fora de módulo
  'marca-apoio': DESENHOS.shape140, // acompanha a marca na composição do login
  'marca-base': DESENHOS.brutalist011, // idem
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
  emblema: DESENHOS.shape185,
  /**
   * Galpão — a EMPRESA ATIVA. Aponta para o mesmo arquivo do módulo
   * Fornecedores, pelo mesmo motivo de `rota-inexistente`/`alerta`: é a mesma
   * ideia (uma empresa), vista de dois lugares. Fornecedores é a empresa do
   * outro; esta é a empresa de dentro. Chave própria porque quem escreve o
   * rodapé pensa em "empresa ativa", não em "o shape de Fornecedores" — e no
   * dia em que os desenhos se separarem, muda aqui e em nenhum consumidor.
   */
  empresa: DESENHOS.brutalist029,
} as const

export type ShapeDeEstado = keyof typeof SHAPE_DE_ESTADO

/**
 * Shapes de LUGAR sem módulo — as três telas que a tabela de cor não cobre.
 *
 * A tabela de shape×cor travada pelo user cobre oito módulos, e Dashboard,
 * Planner e Colaboradores não estão nela. Ficavam com ícone lucide cinza no meio
 * de uma fileira colorida, e a memória registrava isso como decisão pendente do
 * user desde a PR #45 — a alternativa que eu me proibia era inventar a nona cor.
 *
 * **`mockup-dashboard-cores.html` resolveu sem cor nova:** os três EMPRESTAM o
 * par de um módulo vizinho e se distinguem pelo DESENHO. Por isso os shapes
 * moram aqui e não em `SHAPE_DO_MODULO`: a chave é o LUGAR, e a cor vem de fora,
 * do `[data-modulo]` que a entrada do menu declara.
 *
 * Sem isto, os três teriam de compartilhar o desenho de quem empresta a cor —
 * três anéis concêntricos idênticos na sidebar, e a fileira deixaria de ser mapa.
 *
 * **Sobre a `cobertura` destes três:** medida por rasterização, como manda o
 * comentário do campo, mas por um método que NÃO reproduziu os valores já
 * gravados — rodando os dois controles, `shape135` deu 10,8 contra os 12,5 do
 * repo e `shape160` deu 5,3 contra 10,1. O número aqui é o que eu medi, e não
 * finge a precisão que não tenho. O que ele decide é binário (o corte de 35% do
 * `temPeso`) e os três estão longe da linha nos dois métodos: 12,3 é vazado com
 * folga, 43,8 e 56,8 são cheios com folga. Conferido rasterizado a 18px.
 */
const SHAPE_DE_LUGAR = {
  dashboard: DESENHOS.brutalist014, // quatro pontas convergindo — o painel que reúne
  planner: DESENHOS.shape120, // faixas paralelas deitadas = a linha do tempo
  colaboradores: DESENHOS.shape101, // corpo dentro de moldura = a pessoa de dentro
} as const

export type ShapeDeLugar = keyof typeof SHAPE_DE_LUGAR

/**
 * O tom é o PAPEL da cor, não a cor. `modulo`/`modulo-suave` leem o par que o
 * `[data-modulo]` do ancestral definiu — por isso o mesmo componente pinta de
 * neon ciano em Produtos e de laranja no Boletim sem receber cor nenhuma.
 *
 * São classes de TEXTO, não de fundo: o `path` preenche com `currentColor`, e
 * aí o tom `icone` sai de graça — basta NÃO pôr classe, e o shape herda o
 * `color` do container.
 */
const TONS = {
  /** Cheia /01 do módulo: ornamento em destaque. */
  modulo: 'text-modulo',
  /** Pastel /02 do módulo: presença sem chamar atenção (item inativo). */
  'modulo-suave': 'text-modulo-suave',
  /** Info/01 — busca sem resultado. Nunca a cor do módulo: vazio de busca não é módulo vazio. */
  info: 'text-info',
  /** Danger/01 — só onde o significado É erro. */
  erro: 'text-destructive',
  /**
   * Tomato — INDISPONIBILIDADE, que não é erro. A consulta não chegou; ninguém
   * fez nada errado e ninguém precisa consertar cadastro. Vermelho aqui faria o
   * operador tratar queda de rede como defeito.
   */
  offline: 'text-offline',
  /** Roxo de marca — o sistema falando de si (login, splash). Fora de módulo. */
  marca: 'text-accent',
  /**
   * Soft blue — a EMPRESA ATIVA. Fixo de propósito: é o único ornamento que não
   * pode mudar de cor ao navegar, porque ele responde "de qual empresa é o que
   * estou vendo" — pergunta cuja resposta não depende da tela aberta.
   */
  empresa: 'text-empresa',
  /**
   * ÍCONE — a cor NÃO é escolhida aqui: sem classe de cor, o `currentColor` do
   * `fill` resolve para o `color` do container e o shape passa a herdá-lo.
   *
   * É o que separa o papel de ícone do de decoração. Um ícone acompanha o
   * texto ao lado em hover, ativo e desabilitado; com token fixo, cada um
   * desses estados precisaria de uma SEGUNDA regra de cor só para o ornamento,
   * e estado duplicado é estado que um dia diverge — foi isso que obrigou o par
   * /01//02 do item de menu a entrar invertido na 1.6.
   *
   * Não confundir com "sem cor": herdar o preto do texto de corpo violaria a
   * regra dura, então o papel de ícone só entra onde o container já pinta em
   * cor. O traço, esse, continua existindo — é o que dá a forma.
   */
  icone: '',
} as const

export type TomDeOrnamento = keyof typeof TONS

/**
 * A espessura do traço acompanha o tamanho, senão o desenho fecha.
 *
 * Vai com `vector-effect="non-scaling-stroke"`, então o número é **px de tela** e
 * não unidade de `viewBox` — sem isso, um traço de 2 unidades num `viewBox` de
 * ~250 renderizado a 18px vira 0,15px e some.
 */
function tracoPara(tamanho: number): number {
  if (tamanho >= 100) return 3.5
  if (tamanho >= 24) return 1.75
  return 1.1
}

/** O deslocamento do peso, na mesma escala do traço. */
function pesoPara(tamanho: number): number {
  if (tamanho >= 100) return 5
  if (tamanho >= 24) return 2
  return 1.25
}

/**
 * Abaixo de 35% de cobertura o shape é VAZADO — linha, anel, contorno — e o
 * peso fecha os vãos: o desenho vira mancha em vez de ganhar volume.
 *
 * O corte não é arbitrário. Medindo os 15 shapes em uso, o maior vazado é o
 * `brutalist-shape-135` com 12,5% e o menor cheio é o `brutalist-shape-182` com
 * 41,2%: o vão entre os dois grupos é largo e o limiar cai no meio dele.
 * Ficam sem peso o galpão (5,0%), os círculos da busca vazia (10,1%) e os anéis
 * concêntricos do Boletim (12,5%).
 */
const COBERTURA_MINIMA_PARA_PESO = 35

function temPeso(desenho: Desenho): boolean {
  return desenho.cobertura >= COBERTURA_MINIMA_PARA_PESO
}

export interface OrnamentoProps {
  /** Módulo (usa o shape fixo dele), um shape de estado ou um lugar sem módulo. */
  shape: Modulo | ShapeDeEstado | ShapeDeLugar
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
  const desenho =
    shape in SHAPE_DE_ESTADO
      ? SHAPE_DE_ESTADO[shape as ShapeDeEstado]
      : shape in SHAPE_DE_LUGAR
        ? SHAPE_DE_LUGAR[shape as ShapeDeLugar]
        : SHAPE_DO_MODULO[shape as Modulo]

  const peso = pesoPara(tamanho)
  const comPeso = temPeso(desenho)

  return (
    <svg
      // Decoração: o significado está no texto ao lado, sempre.
      aria-hidden="true"
      data-slot="ornamento"
      data-shape={shape}
      // Sem peso quando o shape é vazado — ver COBERTURA_MINIMA_PARA_PESO.
      data-peso={comPeso ? 'sim' : 'nao'}
      viewBox={desenho.viewBox}
      width={tamanho}
      height={tamanho}
      className={cn('inline-block shrink-0 overflow-visible', TONS[tom], className)}
      style={
        comPeso
          ? // Blur ZERO: é peso, não sombra difusa. Sai do mesmo token do traço,
            // então vira junto no tema escuro. E é o único preto permitido a um
            // ornamento — vale AQUI dentro, nunca em superfície: a escada quente
            // da 1.5 continua sendo a elevação de card e painel.
            { filter: `drop-shadow(${peso}px ${peso}px 0 hsl(var(--foreground)))` }
          : undefined
      }
    >
      {/*
        DUAS CAMADAS por caminho, e não um `path` com `fill` + `stroke` junto.

        Traço é centrado na borda: metade dele cai para DENTRO da forma. Em
        shape de massa isso não se nota, mas em shape de LINHA a faixa pintada
        tem ~1,5px na tela — um traço de 3,5px a cobre inteira e o desenho fica
        preto, sem cor nenhuma. Foi o que apareceu ao rasterizar: o Boletim
        virou alvo preto e o galpão dos Fornecedores perdeu o índigo.

        Desenhando o traço ATRÁS e o preenchimento por cima, a metade de dentro
        do traço fica escondida e a faixa de cor sobrevive inteira. O contorno
        aparente é a metade de fora — some o efeito colateral, e o desenho fica
        igual no shape de massa.
      */}
      {desenho.paths.map((d) => (
        <path
          key={`traco-${d}`}
          d={d}
          fillRule="evenodd"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth={tracoPara(tamanho)}
          strokeLinejoin="round"
          // O traço em px de TELA, não em unidade de viewBox. Ver `tracoPara`.
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {desenho.paths.map((d) => (
        <path
          key={`cor-${d}`}
          d={d}
          // `evenodd` preserva os furos do Figma (o miolo do losango, os anéis
          // do Boletim). Com o preenchimento padrão eles fechariam.
          fillRule="evenodd"
          fill="currentColor"
        />
      ))}
    </svg>
  )
}
