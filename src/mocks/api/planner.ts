import type { PlanItemDto, PlanItemRescheduleRequest, PlanPhaseDto } from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import { verificarEscrita } from './permissao'
import { camposInvalidos, naoEncontrado, semEmpresaAtiva, semSessao } from './problema'
import { store } from './store'

/**
 * O "backend" da ESCRITA do Planner no modo mock — hoje um caminho só,
 * `PATCH /api/projects/{projectId}/plan/items/{itemId}`.
 *
 * Arquivo próprio pela mesma razão do CRM, das atividades e das obras: a árvore
 * tem mais de um agente, e arquivo novo não disputa linha com quem edita o
 * vizinho. A LEITURA do Planner continua em `handlers.ts`, onde sempre esteve —
 * mover as duas rotas de lugar seria um diff grande para pagar uma arrumação
 * que ninguém pediu.
 *
 * ## O que este mock ENSINA, e por que ensinar importa
 *
 * O caminho é `Proposto`: nenhum backend o implementa ainda. Então este arquivo
 * é, na prática, a primeira especificação executável da regra — e um mock que
 * só ecoasse o corpo de volta deixaria a tela nascer certa por acidente.
 *
 * 1. **Data invertida é 400, não silêncio.** Arrastar a ponta esquerda para
 *    depois da direita é um gesto possível na tela; aceitar produziria um item
 *    de duração negativa, que o gantt desenha como barra que some.
 * 2. **A FASE acompanha o item.** É a regra declarada na descrição do caminho:
 *    item que sai do intervalo da fase estica a fase. Sem isso a barra-resumo
 *    ficaria menor que os filhos que ela resume, e o operador leria a fase como
 *    encolhida quando na verdade ela cresceu.
 * 3. **Papel decide antes de tudo.** `projects` pede `owner` para escrever
 *    (`PAPEL_MINIMO_POR_FAMILIA`), e a checagem vem ANTES de procurar o item:
 *    responder 404 para quem nem podia escrever contaria a quem não tem
 *    permissão qual id existe e qual não.
 * 4. **Item de outro projeto é 404.** O `itemId` é procurado DENTRO do plano do
 *    `projectId` da URL, nunca no conjunto de todos os planos. Procurar solto
 *    deixaria passar um pedido que reagenda item de projeto que quem pediu nem
 *    está olhando — e o mock ensinaria justamente o descuido.
 */

/** `YYYY-MM-DD` de calendário. Só a forma: 30/02 fica para o servidor real. */
const DIA = /^\d{4}-\d{2}-\d{2}$/

/** Ordem lexicográfica basta em `YYYY-MM-DD` — é para isso que o ISO serve. */
function faseEsticada(fase: PlanPhaseDto): void {
  for (const item of fase.items) {
    if (item.startsOn < fase.startsOn) fase.startsOn = item.startsOn
    if (item.endsOn > fase.endsOn) fase.endsOn = item.endsOn
  }
}

export const handlersDoPlanner = [
  http.patch('*/api/projects/:projectId/plan/items/:itemId', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const semPermissao = verificarEscrita('projects')
    if (semPermissao) return semPermissao

    const plano = store.planos[String(params.projectId)]
    if (!plano) return naoEncontrado('Projeto não encontrado.')

    // Fase e item juntos: quem reagenda o item precisa da fase para esticá-la,
    // e uma segunda varredura para achá-la leria a árvore duas vezes.
    let alvo: { fase: PlanPhaseDto; item: PlanItemDto } | null = null
    for (const fase of plano.phases) {
      const item = fase.items.find((i) => i.id === String(params.itemId))
      if (item) {
        alvo = { fase, item }
        break
      }
    }
    if (!alvo) return naoEncontrado('Item do plano não encontrado.')

    const corpo = (await request.json()) as Partial<PlanItemRescheduleRequest>

    const invalidos = [
      ...(typeof corpo.startsOn === 'string' && DIA.test(corpo.startsOn)
        ? []
        : [{ path: 'startsOn', message: 'Data de início inválida.' }]),
      ...(typeof corpo.endsOn === 'string' && DIA.test(corpo.endsOn)
        ? []
        : [{ path: 'endsOn', message: 'Previsão de término inválida.' }]),
    ]
    if (invalidos.length > 0) return camposInvalidos(invalidos)

    const inicio = corpo.startsOn as string
    const fim = corpo.endsOn as string
    if (fim < inicio) {
      return camposInvalidos([
        { path: 'endsOn', message: 'A previsão de término não pode ser anterior ao início.' },
      ])
    }

    alvo.item.startsOn = inicio
    alvo.item.endsOn = fim
    faseEsticada(alvo.fase)

    return HttpResponse.json(alvo.item)
  }),
]
