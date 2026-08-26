import type {
  ProblemFieldError,
  SupportAuditEntryDto,
  SupportAuditEntryDtoAction,
  SupportContextDto,
  SupportGrantDto,
  SupportGrantDtoStatus,
  SupportGrantRequest,
} from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import { TIPO, camposInvalidos, conflito, naoEncontrado, problemaJson, semSessao } from './problema'
import { novoId, store } from './store'

/**
 * O "backend" do SUPORTE-DA-PLATAFORMA no modo mock — o item 6 da fundação
 * (`current-state.md` @pendencias), que é onde o `super-admin` deixa de existir.
 *
 * ## O que estava para dar errado
 *
 * Não existe `super-admin` hoje, e é por isso que ele cabia neste trilho. O que
 * existiria por inércia é uma FLAG: um booleano no colaborador, ou um sexto
 * valor no `CHECK` de `employee_company.role`, e a partir dele leitura de tudo.
 * Com o produto vendido a terceiros (`project-core.md` @objetivo), essa flag é
 * acesso irrestrito a dado de cliente com peso contratual — e, pior, acesso que
 * não deixa de existir quando ninguém está usando.
 *
 * ## A decomposição, que é o trabalho inteiro
 *
 * O papel foi partido em DUAS coisas que a flag confundia numa:
 *
 * 1. **Identidade** — "esta pessoa é da equipe da plataforma". É o que
 *    `ehSuporteDaPlataforma` diz, e ela NÃO CONCEDE NADA. Sozinha, o alcance é
 *    zero: toda operação de organização de cliente responde 403
 *    `sem-concessao-de-suporte`. É de propósito que a identidade seja inútil.
 * 2. **Concessão** — uma organização, um motivo, um prazo. É o que autoriza, e
 *    ela é sempre singular, sempre datada e sempre registrada.
 *
 * A flag antiga era (1) fazendo o trabalho de (2). Separadas, "ser do suporte"
 * vira um fato administrativo sem poder, e "poder ler o dado do cliente X" vira
 * um evento com hora de começar, hora de acabar e um motivo escrito por gente.
 *
 * ## As três regras que este mock EXECUTA, e não só descreve
 *
 * - **Sem motivo ou sem prazo, não abre** (400 `campos-invalidos`). Não há
 *   padrão para nenhum dos dois: motivo padrão é motivo de ninguém, prazo padrão
 *   é permanente com outro nome.
 * - **Uma organização por vez** (409 `suporte-ja-em-organizacao`, com
 *   `openGrantId`). Duas concessões abertas seriam a flag global reconstruída
 *   com sintaxe melhor. Trocar de organização exige encerrar a atual, e o corte
 *   fica na trilha.
 * - **O prazo acaba sozinho.** Ver abaixo — é a parte que mais fácil sairia
 *   falsa.
 *
 * ## A expiração é DERIVADA, nunca gravada
 *
 * `status` não é campo que alguém escreve: é calculado a cada leitura,
 * comparando `expiresAt` com o relógio do servidor. É a diferença entre um
 * prazo e um rótulo. Um `status` persistido dependeria de alguém passar
 * marcando concessão vencida — e o dia em que esse alguém não roda é o dia em
 * que a concessão continua valendo, que é exatamente o defeito que o prazo
 * existe para impedir.
 *
 * Pelo mesmo motivo o CLIENTE não decide expiração: ele desenha a contagem a
 * partir de `expiresAt`, e pergunta ao servidor se ainda pode. Relógio de
 * navegador é ajustável pelo operador.
 *
 * O `deslocamentoMs` existe para o ensaio poder ADIANTAR esse relógio sem
 * esperar oito horas — mesma família do `armarExpiracaoDaProximaEscrita` do
 * store. Ele desloca o relógio do servidor falso, não o do teste: o que se prova
 * é que o servidor recalcula, não que o teste sabe somar.
 *
 * ## A trilha é do servidor
 *
 * `granted`, `revoked` e `expired` são gravados por este módulo, que os
 * presencia. `accessed` é gravado pelo laço que atende requisição — aqui, o
 * `trilhaDeSuporte`, que fica na FRENTE da lista de handlers e cai para o
 * próximo. Trilha alimentada pela tela registraria só o que a tela lembrasse de
 * contar, e o acesso que ninguém lembrou de instrumentar é justamente o que se
 * quer ver.
 *
 * A trilha guarda VERBO e CAMINHO, nunca corpo: registro de auditoria que copia
 * o dado do cliente vira uma segunda cópia do que ele existe para proteger.
 *
 * ## Ainda não há tela
 *
 * Console de suporte é superfície administrativa separada (`project-core.md`
 * @arquitetura) e trilho próprio — a mesma decisão que a web#292 tomou para a
 * tela de checkboxes de papéis. O que existe aqui responde ao contrato para que
 * a tela, quando vier, nasça contra o comportamento que o servidor promete.
 */

/** O teto do prazo, e ele é do desenho: concessão de um mês é flag com data. */
export const TETO_DO_PRAZO_MS = 8 * 60 * 60 * 1000

/** O mínimo que um motivo precisa ter para ser um motivo. Espelha o contrato. */
export const MINIMO_DO_MOTIVO = 8

/**
 * As organizações de CLIENTE que o suporte pode alcançar.
 *
 * Três, e não uma: com uma só, "uma organização por vez" não teria como estar
 * errado, e a regra passaria verde sem nunca ser exercida.
 */
export const ORGANIZACOES = [
  { id: 'org-vertz', name: 'Grupo Vertz' },
  { id: 'org-mobili', name: 'Mobili Casa' },
  { id: 'org-luz-norte', name: 'Luz Norte Iluminação' },
] as const

interface Concessao {
  id: string
  organizationId: string
  reason: string
  grantedAt: string
  expiresAt: string
  revokedAt: string | null
  actorEmployeeId: string
  actorDisplayName: string | null
  /** Já gravamos a linha `expired` desta? Sem isto, cada leitura gravaria outra. */
  expiracaoRegistrada: boolean
}

/**
 * A linha da trilha carrega a QUAL concessão pertence, e o `grantId` não sai no
 * corpo: quem pergunta já perguntou por concessão, no caminho.
 *
 * Amarrar por id e não pela janela de tempo é decisão de correção, não de
 * gosto. A linha `expired` é gravada quando o servidor PERCEBE o vencimento,
 * que é sempre depois de `expiresAt` — um recorte por janela a deixaria de
 * fora, e a trilha esconderia exatamente o fim que ela existe para mostrar.
 */
interface LinhaDaTrilha {
  grantId: string | null
  entrada: SupportAuditEntryDto
}

interface EstadoDoSuporte {
  /**
   * A IDENTIDADE, e ela não concede nada. `false` é o padrão de propósito: o
   * suporte começa sem alcançar organização alguma, e é assim que se vê que o
   * alcance vem da concessão e não de ser quem se é.
   */
  ehSuporteDaPlataforma: boolean
  concessoes: Concessao[]
  trilha: LinhaDaTrilha[]
  /** Deslocamento do relógio do servidor falso — só o ensaio mexe. */
  deslocamentoMs: number
}

function estadoInicial(): EstadoDoSuporte {
  return {
    ehSuporteDaPlataforma: false,
    concessoes: [],
    trilha: [],
    deslocamentoMs: 0,
  }
}

export const suporte: EstadoDoSuporte = estadoInicial()

export function resetSuporte(): void {
  Object.assign(suporte, estadoInicial())
}

/** O relógio do SERVIDOR falso. Tudo que decide prazo passa por aqui. */
export function agoraDoSuporte(): number {
  return Date.now() + suporte.deslocamentoMs
}

/**
 * Adianta o relógio do servidor falso — o ensaio de expiração.
 *
 * Existe porque a alternativa seria esperar o prazo de verdade, e um teste que
 * dorme oito horas não roda. O que ele NÃO faz é mexer em `status`: quem
 * recalcula continua sendo `estadoDa()`, e é isso que o ensaio prova.
 */
export function adiantarRelogioDoSuporte(ms: number): void {
  suporte.deslocamentoMs += ms
}

/** Entra como a equipe da plataforma. Continua sem alcançar nada. */
export function entrarComoSuporte(): void {
  suporte.ehSuporteDaPlataforma = true
}

function estadoDa(c: Concessao): SupportGrantDtoStatus {
  if (c.revokedAt) return 'revoked'
  if (Date.parse(c.expiresAt) <= agoraDoSuporte()) return 'expired'
  return 'active'
}

function nomeDaOrganizacao(id: string): string {
  return ORGANIZACOES.find((o) => o.id === id)?.name ?? id
}

function anotar(
  grantId: string | null,
  action: SupportAuditEntryDtoAction,
  extra: { method?: string | null; path?: string | null } = {},
): void {
  suporte.trilha.push({
    grantId,
    entrada: {
      id: novoId('trilha'),
      at: new Date(agoraDoSuporte()).toISOString(),
      action,
      method: extra.method ?? null,
      path: extra.path ?? null,
      actorEmployeeId: 'emp-admin',
    },
  })
}

/**
 * A concessão ABERTA, se houver — e ela é no máximo uma, por construção.
 *
 * Grava a linha `expired` no caminho: o fim por decurso é um fato da trilha
 * igual ao fim por clique, e sem isto a concessão simplesmente sumiria do
 * "ativo" sem nada dizer que acabou.
 */
export function concessaoAberta(): Concessao | null {
  for (const c of suporte.concessoes) {
    const estado = estadoDa(c)
    if (estado === 'active') return c
    if (estado === 'expired' && !c.expiracaoRegistrada) {
      c.expiracaoRegistrada = true
      anotar(c.id, 'expired')
    }
  }
  return null
}

/** O `support` da sessão. `null` é o caso de quase toda sessão que existe. */
export function contextoDeSuporte(): SupportContextDto | null {
  if (!suporte.ehSuporteDaPlataforma) return null
  const aberta = concessaoAberta()
  if (!aberta) return null
  return {
    grantId: aberta.id,
    organizationId: aberta.organizationId,
    organizationName: nomeDaOrganizacao(aberta.organizationId),
    reason: aberta.reason,
    expiresAt: aberta.expiresAt,
  }
}

function dto(c: Concessao): SupportGrantDto {
  return {
    id: c.id,
    organizationId: c.organizationId,
    organizationName: nomeDaOrganizacao(c.organizationId),
    reason: c.reason,
    grantedAt: c.grantedAt,
    expiresAt: c.expiresAt,
    revokedAt: c.revokedAt,
    status: estadoDa(c),
    actorEmployeeId: c.actorEmployeeId,
    actorDisplayName: c.actorDisplayName,
  }
}

/** Identidade ausente é 403, e é a MESMA resposta de admin de cliente batendo aqui. */
function semSuporte() {
  return problemaJson(
    403,
    'Esta operação é da superfície de suporte da plataforma.',
    {},
    TIPO.semConcessaoDeSuporte,
  )
}

export const ORDENAVEIS_CONCESSAO = ['grantedAt', 'expiresAt', 'organizationName'] as const

/**
 * A trilha ordena só por `at`, e a lista curta é a decisão.
 *
 * Ordenar auditoria por `action` ou `path` convida a ler a trilha agrupada por
 * tipo de evento, que é a leitura errada: o que se quer saber dela é a SEQUÊNCIA
 * — o que veio antes do quê. Por tempo, e nos dois sentidos.
 */
export const ORDENAVEIS_TRILHA = ['at'] as const

/**
 * O registrador de `accessed` — o handler que fica NA FRENTE de todos e cai
 * para o próximo.
 *
 * MSW v2 passa a requisição adiante quando o resolvedor não devolve resposta, e
 * é essa a única razão de ele poder existir sem duplicar handler nenhum. Sem
 * concessão aberta, não anota nada: acesso da própria organização do operador
 * não é acesso de suporte, e enchê-la de linha diária faria a trilha deixar de
 * ser lida.
 *
 * `/api/platform/*` fica de fora de propósito: ler a própria trilha não é
 * acessar dado de cliente, e anotá-la faria a lista crescer por ser consultada.
 */
export const trilhaDeSuporte = http.all('*/api/*', ({ request }) => {
  const aberta = concessaoAberta()
  if (!aberta) return undefined
  const caminho = new URL(request.url).pathname
  if (caminho.includes('/api/platform/')) return undefined
  anotar(aberta.id, 'accessed', { method: request.method, path: caminho })
  return undefined
})

export const handlersDeSuporte = [
  http.get('*/api/platform/support-grants', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!suporte.ehSuporteDaPlataforma) return semSuporte()

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS_CONCESSAO.includes(sortBy as never)) {
      return problemaJson(
        400,
        `Não é possível ordenar por "${sortBy}".`,
        {},
        TIPO.ordenacaoInvalida,
      )
    }

    const organizationId = url.searchParams.get('organizationId')
    const status = url.searchParams.get('status')
    let linhas = suporte.concessoes.map(dto)
    if (organizationId) linhas = linhas.filter((l) => l.organizationId === organizationId)
    if (status) linhas = linhas.filter((l) => l.status === status)

    if (sortBy) {
      const dir = url.searchParams.get('sortDir') === 'desc' ? -1 : 1
      linhas.sort((a, b) => {
        const x = String(a[sortBy as 'grantedAt' | 'expiresAt' | 'organizationName'])
        const y = String(b[sortBy as 'grantedAt' | 'expiresAt' | 'organizationName'])
        return x.localeCompare(y) * dir
      })
    }

    const page = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20)
    const inicio = (page - 1) * pageSize
    return HttpResponse.json({
      rows: linhas.slice(inicio, inicio + pageSize),
      total: linhas.length,
    })
  }),

  http.post('*/api/platform/support-grants', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!suporte.ehSuporteDaPlataforma) return semSuporte()

    const corpo = (await request.json()) as Partial<SupportGrantRequest>

    // As duas recusas que são o trilho inteiro. Vêm ANTES do 409 de propósito:
    // pedido malformado é malformado mesmo que houvesse concessão aberta, e
    // trocar a ordem faria "sem motivo" às vezes responder "já está em outra".
    const fields: ProblemFieldError[] = []
    if (!corpo.organizationId) {
      fields.push({ path: 'organizationId', message: 'Informe a organização.' })
    } else if (!ORGANIZACOES.some((o) => o.id === corpo.organizationId)) {
      fields.push({ path: 'organizationId', message: 'Organização não encontrada.' })
    }
    if (!corpo.reason || corpo.reason.trim().length < MINIMO_DO_MOTIVO) {
      fields.push({
        path: 'reason',
        message: 'Descreva por que está acessando os dados deste cliente.',
      })
    }
    if (!corpo.expiresAt) {
      fields.push({ path: 'expiresAt', message: 'Informe até quando o acesso vale.' })
    } else {
      const fim = Date.parse(corpo.expiresAt)
      const agora = agoraDoSuporte()
      if (Number.isNaN(fim)) {
        fields.push({ path: 'expiresAt', message: 'Data inválida.' })
      } else if (fim <= agora) {
        fields.push({ path: 'expiresAt', message: 'O prazo já passou.' })
      } else if (fim - agora > TETO_DO_PRAZO_MS) {
        fields.push({ path: 'expiresAt', message: 'O prazo máximo é de 8 horas.' })
      }
    }
    if (fields.length > 0) return camposInvalidos(fields)

    // UMA POR VEZ. Vale inclusive para a MESMA organização: reabrir sem encerrar
    // esconderia o segundo motivo dentro do prazo do primeiro.
    const aberta = concessaoAberta()
    if (aberta) {
      return conflito(
        `Já há acesso aberto em ${nomeDaOrganizacao(aberta.organizationId)}. Encerre antes de abrir outro.`,
        TIPO.suporteJaEmOrganizacao,
        { openGrantId: aberta.id },
      )
    }

    const concessao: Concessao = {
      id: novoId('grant'),
      organizationId: corpo.organizationId as string,
      reason: (corpo.reason as string).trim(),
      grantedAt: new Date(agoraDoSuporte()).toISOString(),
      expiresAt: corpo.expiresAt as string,
      revokedAt: null,
      actorEmployeeId: 'emp-admin',
      actorDisplayName: 'Henrique',
      expiracaoRegistrada: false,
    }
    suporte.concessoes.push(concessao)
    anotar(concessao.id, 'granted')
    return HttpResponse.json(dto(concessao), { status: 201 })
  }),

  http.get('*/api/platform/support-grants/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!suporte.ehSuporteDaPlataforma) return semSuporte()
    const c = suporte.concessoes.find((x) => x.id === params.id)
    if (!c) return naoEncontrado('Concessão não encontrada.')
    return HttpResponse.json(dto(c))
  }),

  http.post('*/api/platform/support-grants/:id/revoke', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!suporte.ehSuporteDaPlataforma) return semSuporte()
    const c = suporte.concessoes.find((x) => x.id === params.id)
    if (!c) return naoEncontrado('Concessão não encontrada.')
    // Vencida também recusa: encerrar o que o prazo já encerrou daria uma
    // segunda linha na trilha para um fato que já tinha a sua.
    if (estadoDa(c) !== 'active') {
      return conflito('Este acesso já foi encerrado.', TIPO.concessaoEncerrada)
    }
    c.revokedAt = new Date(agoraDoSuporte()).toISOString()
    anotar(c.id, 'revoked')
    return HttpResponse.json(dto(c))
  }),

  http.get('*/api/platform/support-grants/:id/audit', ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!suporte.ehSuporteDaPlataforma) return semSuporte()
    const c = suporte.concessoes.find((x) => x.id === params.id)
    if (!c) return naoEncontrado('Concessão não encontrada.')

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS_TRILHA.includes(sortBy as never)) {
      return problemaJson(
        400,
        `Não é possível ordenar por "${sortBy}".`,
        {},
        TIPO.ordenacaoInvalida,
      )
    }

    // Lê a concessão pelo lado da leitura também: sem isto, a linha `expired`
    // só nasceria quando alguém tentasse ABRIR outra, e a trilha de quem apenas
    // olha a que venceu não teria o fim dela.
    concessaoAberta()

    const dir = url.searchParams.get('sortDir') === 'desc' ? -1 : 1
    const linhas = suporte.trilha
      .filter((l) => l.grantId === c.id)
      .map((l) => l.entrada)
      .sort((a, b) => a.at.localeCompare(b.at) * dir)

    const page = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20)
    const inicio = (page - 1) * pageSize
    return HttpResponse.json({
      rows: linhas.slice(inicio, inicio + pageSize),
      total: linhas.length,
    })
  }),
]
