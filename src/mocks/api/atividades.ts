import type { ActivityDto, ActivityWriteRequest } from '@/api/gerado'
import { diaLocalISO } from '@/lib/datas'
import { http, HttpResponse } from 'msw'
import { crm } from './crm'
import { verificarEscrita } from './permissao'
import { TIPO, naoEncontrado, problemaJson, semEmpresaAtiva, semSessao } from './problema'
import { novoId, store } from './store'

/**
 * O "backend" das atividades no modo mock (`VITE_API_MODE=mock`).
 *
 * Arquivo próprio pela mesma razão do CRM: estado que não pertence ao store das
 * telas antigas, e uma árvore com mais de um agente — arquivo novo não conflita
 * com quem edita o vizinho.
 *
 * O que este mock reproduz de propósito, porque é onde o desenho pode estar
 * errado:
 *
 * - **o alvo é um PAR** — `entityId` sem `entityType` é 400, e alvo inexistente
 *   é 404: sem isso o painel de um registro apagado listaria as atividades dele
 *   como se estivessem vivas;
 * - **`doneAt` é escrito pelo SERVIDOR**, em `POST .../done`, e nunca pelo
 *   corpo — concluir a já concluída é 409;
 * - **`PUT` não move a atividade de alvo** — trocar `entityType`/`entityId` é
 *   400, como a tela promete ao operador;
 * - **a ordem é a do painel**, resolvida aqui: pendentes por prazo crescente
 *   (sem prazo por último), depois as concluídas da mais recente para a mais
 *   antiga. É a ordem que o contrato publica, e o painel não reordena nada.
 */

const ORDENAVEIS = ['dueDate', 'doneAt', 'kind', 'title']

/** Dia relativo ao dia em que o mock roda — prazo fixo envelheceria em uma semana. */
function dia(deslocamento: number): string {
  const d = new Date()
  d.setDate(d.getDate() + deslocamento)
  return diaLocalISO(d)
}

/** Horas atrás, em ISO — o carimbo de conclusão do que já é histórico. */
function horasAtras(horas: number): string {
  return new Date(Date.now() - horas * 60 * 60 * 1000).toISOString()
}

interface EstadoDasAtividades {
  atividades: ActivityDto[]
}

function estadoInicial(): EstadoDasAtividades {
  return {
    atividades: [
      {
        id: 'ativ-0001',
        entityType: 'opportunity',
        entityId: 'op-0001',
        kind: 'call',
        title: 'Ligar para confirmar a visita técnica',
        dueDate: dia(1),
        assigneeEmployeeId: 'emp-0002',
        // `null` de propósito: `comResponsavel` resolve o nome em TODA leitura,
        // a partir da lista de pessoas. Guardá-lo aqui não seria lido — só
        // envelheceria, e a #276 mostrou como: a semente dizia um nome e o id
        // apontava para outra pessoa depois que as listas se unificaram.
        assigneeName: null,
        doneAt: null,
        notes: 'Cliente pediu contato depois das 14h.',
      },
      {
        id: 'ativ-0002',
        entityType: 'opportunity',
        entityId: 'op-0001',
        kind: 'meeting',
        title: 'Apresentar o projeto luminotécnico',
        dueDate: dia(-2),
        assigneeEmployeeId: 'emp-admin',
        assigneeName: null,
        doneAt: null,
        notes: null,
      },
      {
        id: 'ativ-0003',
        entityType: 'opportunity',
        entityId: 'op-0001',
        kind: 'email',
        title: 'Enviar a lista de acabamentos',
        dueDate: dia(-5),
        assigneeEmployeeId: 'emp-0003',
        assigneeName: null,
        doneAt: horasAtras(30),
        notes: null,
      },
      {
        id: 'ativ-0004',
        entityType: 'opportunity',
        entityId: 'op-0005',
        kind: 'task',
        title: 'Refazer a proposta com o desconto aprovado',
        dueDate: null,
        assigneeEmployeeId: null,
        assigneeName: null,
        notes: 'Sem prazo até o cliente devolver a planta.',
        doneAt: null,
      },
      {
        id: 'ativ-0005',
        entityType: 'partner',
        entityId: 'parc-0002',
        kind: 'call',
        title: 'Retomar contato — arquiteta indicou dois projetos',
        dueDate: dia(3),
        assigneeEmployeeId: 'emp-0002',
        assigneeName: null,
        doneAt: null,
        notes: null,
      },
    ],
  }
}

export const atividades: EstadoDasAtividades = estadoInicial()

/** Devolve as atividades ao seed — o `resetStore()` daqui, para os testes. */
export function resetAtividades(): void {
  Object.assign(atividades, estadoInicial())
}

/**
 * O alvo EXISTE? A tabela é polimórfica e não tem FK — quem confere é quem
 * escreve. Sem esta checagem o painel de um registro apagado listaria atividade
 * viva, e o mock deixaria passar o desenho que o banco vai recusar.
 */
function alvoExiste(entityType: string, entityId: string): boolean {
  if (entityType === 'opportunity') return crm.oportunidades.some((o) => o.id === entityId)
  if (entityType === 'partner') return store.parceiros.some((p) => p.id === entityId)
  // Orçamento e pedido de compra ainda não são HTTP (`docs/integracao.md`): não
  // há coleção do servidor para conferir, e recusar o que não se pode verificar
  // deixaria o painel morto nas duas telas. Passa, e o backend confere de verdade.
  return entityType === 'quote' || entityType === 'purchaseOrder'
}

/** Nome do responsável, resolvido na resposta — guardá-lo envelheceria na linha. */
function comResponsavel(atividade: ActivityDto): ActivityDto {
  const colaborador = crm.colaboradores.find((c) => c.id === atividade.assigneeEmployeeId)
  return { ...atividade, assigneeName: colaborador?.name ?? null }
}

/**
 * A ordem do painel: pendente antes de concluída; entre pendentes, o prazo mais
 * próximo primeiro e o sem prazo por último; entre concluídas, a mais recente.
 */
function ordemDoPainel(a: ActivityDto, b: ActivityDto): number {
  if (Boolean(a.doneAt) !== Boolean(b.doneAt)) return a.doneAt ? 1 : -1
  if (a.doneAt && b.doneAt) return b.doneAt.localeCompare(a.doneAt)
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  }
  return a.title.localeCompare(b.title)
}

function corpoInvalido(corpo: ActivityWriteRequest): string | null {
  if (!corpo.entityType || !corpo.entityId) return 'Alvo da atividade é obrigatório.'
  if (!corpo.kind) return 'Tipo da atividade é obrigatório.'
  if (!corpo.title?.trim()) return 'Título da atividade é obrigatório.'
  return null
}

export const handlersDeAtividades = [
  http.get('*/api/activities', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const entityType = url.searchParams.get('entityType')
    const entityId = url.searchParams.get('entityId')
    const aberta = url.searchParams.get('open')
    const responsavel = url.searchParams.get('assigneeEmployeeId')
    const q = url.searchParams.get('q')
    const sortBy = url.searchParams.get('sortBy')
    const sortDesc = url.searchParams.get('sortDesc') === 'true'
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')

    // Um sem o outro é 400: uuid sem a tabela não identifica registro nenhum, e
    // devolver a lista inteira faria a tela mostrar atividade de outro cadastro.
    if (Boolean(entityType) !== Boolean(entityId)) {
      return problemaJson(400, 'entityType e entityId viajam juntos.')
    }
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return problemaJson(
        400,
        'Paginação inválida: page é 1-based e pageSize vai até 100.',
        {},
        TIPO.paginacaoInvalida,
      )
    }
    if (sortBy && !ORDENAVEIS.includes(sortBy)) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let linhas = atividades.atividades.map(comResponsavel)
    if (entityType && entityId) {
      linhas = linhas.filter((a) => a.entityType === entityType && a.entityId === entityId)
    }
    if (aberta === 'true') linhas = linhas.filter((a) => !a.doneAt)
    if (aberta === 'false') linhas = linhas.filter((a) => Boolean(a.doneAt))
    if (responsavel) linhas = linhas.filter((a) => a.assigneeEmployeeId === responsavel)
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter(
        (a) => a.title.toLowerCase().includes(alvo) || (a.notes ?? '').toLowerCase().includes(alvo),
      )
    }

    if (sortBy) {
      const chave = sortBy as keyof ActivityDto
      linhas.sort((a, b) => {
        const comparacao = String(a[chave] ?? '').localeCompare(String(b[chave] ?? ''))
        return sortDesc ? -comparacao : comparacao
      })
    } else {
      linhas.sort(ordemDoPainel)
    }

    const total = linhas.length
    const inicio = (page - 1) * pageSize
    return HttpResponse.json({ rows: linhas.slice(inicio, inicio + pageSize), total })
  }),

  http.post('*/api/activities', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('activities')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as ActivityWriteRequest
    const erro = corpoInvalido(corpo)
    if (erro) return problemaJson(400, erro)
    if (!alvoExiste(corpo.entityType, corpo.entityId)) {
      return naoEncontrado('Registro da atividade não encontrado.')
    }

    const nova: ActivityDto = {
      id: novoId('ativ'),
      entityType: corpo.entityType,
      entityId: corpo.entityId,
      kind: corpo.kind,
      title: corpo.title,
      dueDate: corpo.dueDate ?? null,
      assigneeEmployeeId: corpo.assigneeEmployeeId ?? null,
      assigneeName: null,
      doneAt: null,
      notes: corpo.notes ?? null,
    }
    atividades.atividades.push(nova)
    return HttpResponse.json(comResponsavel(nova), { status: 201 })
  }),

  http.put('*/api/activities/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('activities')
    if (semPermissao) return semPermissao

    const achada = atividades.atividades.find((a) => a.id === String(params.id))
    if (!achada) return naoEncontrado('Atividade não encontrada.')

    const corpo = (await request.json()) as ActivityWriteRequest
    const erro = corpoInvalido(corpo)
    if (erro) return problemaJson(400, erro)
    if (corpo.entityType !== achada.entityType || corpo.entityId !== achada.entityId) {
      return problemaJson(400, 'Atividade não muda de registro.')
    }

    // `PUT` substitui o registro inteiro — o campo que não veio é o campo
    // apagado. `doneAt` fica de fora: quem conclui é o caminho próprio.
    achada.kind = corpo.kind
    achada.title = corpo.title
    achada.dueDate = corpo.dueDate ?? null
    achada.assigneeEmployeeId = corpo.assigneeEmployeeId ?? null
    achada.notes = corpo.notes ?? null
    return HttpResponse.json(comResponsavel(achada))
  }),

  http.post('*/api/activities/:id/done', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('activities')
    if (semPermissao) return semPermissao

    const achada = atividades.atividades.find((a) => a.id === String(params.id))
    if (!achada) return naoEncontrado('Atividade não encontrada.')
    if (achada.doneAt) return problemaJson(409, 'Atividade já concluída.')

    achada.doneAt = new Date().toISOString()
    return HttpResponse.json(comResponsavel(achada))
  }),
]
