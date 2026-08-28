import type {
  BankAccountDto,
  CashRegisterDto,
  FinancialInstallmentDto,
  FinancialSettlementDto,
  FinancialTitleDto,
  FinancialTitleWriteRequest,
  PagedResultOfBankAccountDto,
  PagedResultOfCashRegisterDto,
  PagedResultOfPaymentModeDto,
  PaymentModeDto,
  SettlementBatchRequest,
  SettlementBatchResultDto,
  SettlementWriteRequest,
} from '@/api/gerado'
import {
  cancelFinancialTitle,
  createFinancialTitle,
  getFinancialTitle,
  listBankAccounts,
  listCashRegisters,
  listPaymentModes,
  settleBatch,
  settleInstallment,
  updateFinancialTitle,
} from '@/api/gerado'
import {
  ErroDaApi,
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
  repetirSeValeAPena,
} from '@/data/api-provider'
import type { ListProvider } from '@/data/provider'
import { avisar } from '@/lib/avisos'
import { formatMoneyBRL } from '@/lib/formatters'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DO FINANCEIRO — `/api/financial-titles`, `/api/financial-installments`
 * e a quitação (avulsa e em lote).
 *
 * ## A tela fala a língua do CONTRATO aqui, e isso é escolha
 *
 * Orçamento e pedido traduzem (`numeroPasta`, `descricaoObra`) porque a fonte
 * dos nomes deles é `topicos/transcricaosoftlux.md`, que capturou os campos do
 * legado tela a tela. **O financeiro não está na transcrição** — as 20 telas
 * transcritas não o cobrem, e a fonte de campo aqui é o contrato, escrito a
 * partir de `docs/harvest/financeiro.md`. Inventar um vocabulário PT-BR
 * intermediário criaria um terceiro nome para cada campo sem nenhuma tela
 * antiga que o exigisse; o que a tela mostra em português é o RÓTULO, que é
 * outra coisa.
 *
 * ## As duas listagens são duas perguntas, e por isso são dois providers
 *
 * `titulosAPagar`/`titulosAReceber` respondem "quais contas existem"; os
 * `vencimentos*` respondem "o que vence, e em que ordem" — e é a segunda que a
 * quitação consome, porque a unidade de baixa é a PARCELA. O contrato desenha
 * isso na whitelist: `dueDate` ordena a listagem de parcelas e NÃO ordena a de
 * títulos, porque um título de cinco parcelas tem cinco vencimentos.
 *
 * ## O que ainda não passa pela passagem
 *
 * As 15 operações continuam em `FORA_DE_PROPOSITO` (`rotas-do-backend.ts`): o
 * `cabinet-erp-api` responde 501 até a api#199 entrar. Enquanto isso, quem
 * responde nos DOIS modos é o mock (`src/mocks/api/financeiro.ts`), e a tela não
 * sabe a diferença — que é exatamente o desenho.
 */

export const URL_TITULOS = '/api/financial-titles'
export const URL_PARCELAS = '/api/financial-installments'

/**
 * Whitelist de `sortBy` dos TÍTULOS — a MESMA da descrição do contrato.
 *
 * `dueDate` está fora e a ausência é a decisão que mais importa nesta listagem:
 * ordenar título por vencimento obrigaria o servidor a escolher um entre os N da
 * parcela, em silêncio. Quem quer a agenda usa a listagem cuja LINHA é um
 * vencimento.
 */
export const ORDENAVEIS_TITULO: readonly string[] = [
  'number',
  'issuedAt',
  'totalCents',
  'openCents',
  'status',
  'partnerName',
]

/** Whitelist de `sortBy` das PARCELAS — o padrão é `dueDate` crescente. */
export const ORDENAVEIS_PARCELA: readonly string[] = [
  'dueDate',
  'amountCents',
  'openCents',
  'partnerName',
  'titleNumber',
  'sequence',
]

/**
 * Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo.
 *
 * São TRÊS raízes porque são três consultas com vidas diferentes — a listagem de
 * títulos, o detalhe do título e a agenda de vencimentos. Uma baixa muda as
 * três: o saldo do título, o extrato dentro dele e a linha da agenda.
 */
export const CHAVES_FINANCEIRO = {
  titulos: ['titulos-financeiros'] as const,
  titulo: ['titulo-financeiro'] as const,
  parcelas: ['parcelas-financeiras'] as const,
  apoio: ['apoio-financeiro'] as const,
}

export type Direcao = 'payable' | 'receivable'

/** Títulos de UM lado — `direction` é query fixa, como o `role` do parceiro. */
export function titulosFinanceiros(direction: Direcao): ListProvider<FinancialTitleDto> {
  return createApiListProvider<FinancialTitleDto>({
    url: URL_TITULOS,
    fixa: { direction },
  })
}

/**
 * O RECORTE da agenda — o que o operador escolhe ver.
 *
 * Existe como parâmetro, e não como `status: 'open'` fixo, porque o contrato é
 * explícito: *"quem pede a lista sem `status` recebe as duas, e uma lista que
 * esconde o que já foi pago sem dizer é o que faz o operador pagar de novo"*.
 * Aqui o recorte é sempre uma escolha VISÍVEL na tela.
 */
export type RecorteDaAgenda = 'abertos' | 'vencidos' | 'todos'

const QUERY_DO_RECORTE: Record<RecorteDaAgenda, Record<string, string | boolean>> = {
  abertos: { status: 'open' },
  // `overdue` vem do SERVIDOR, e por isso é filtro dele: "vencido" se mede com
  // o dia do servidor, e o relógio errado de uma estação marcaria vencido o que
  // ainda não venceu.
  vencidos: { status: 'open', overdue: true },
  todos: {},
}

/** A AGENDA de vencimentos de um lado, no recorte pedido. */
export function parcelasFinanceiras(
  direction: Direcao,
  recorte: RecorteDaAgenda = 'abertos',
): ListProvider<FinancialInstallmentDto> {
  return createApiListProvider<FinancialInstallmentDto>({
    url: URL_PARCELAS,
    fixa: { direction, ...QUERY_DO_RECORTE[recorte] },
  })
}

// ------------------------------------------------------------------ detalhe

/**
 * O título por id, fora de hook — é o `get` que a tela de documento chama.
 *
 * `null` quando não existe: 404 é RESPOSTA, não falha. O id foi digitado na URL,
 * ou o título foi cancelado em outra sessão, e a tela já sabe dizer isso.
 */
export async function carregarTitulo(id: string): Promise<FinancialTitleDto | null> {
  const resposta: RespostaDaApi = await getFinancialTitle(id)
  return itemOuNulo<FinancialTitleDto>(resposta, 'o título')
}

/** O título com as parcelas e as baixas de cada uma — o que o formulário edita. */
export function useTituloFinanceiro(id: string | undefined) {
  return useQuery({
    queryKey: [...CHAVES_FINANCEIRO.titulo, id],
    enabled: !!id,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getFinancialTitle(id as string)
      return itemOuNulo<FinancialTitleDto>(resposta, 'o título')
    },
  })
}

function useInvalidarFinanceiro() {
  const cliente = useQueryClient()
  return () => {
    // As três raízes, sempre. Invalidação fina economizaria uma requisição e
    // pagaria com a classe de bug que este repo já conhece: a baixa muda o saldo
    // do título, o extrato dentro dele e a linha da agenda — e `['titulo']` não
    // é prefixo de `['titulos']`, a comparação do TanStack é elemento a elemento.
    for (const chave of [
      CHAVES_FINANCEIRO.titulos,
      CHAVES_FINANCEIRO.titulo,
      CHAVES_FINANCEIRO.parcelas,
    ]) {
      void cliente.invalidateQueries({ queryKey: chave, exact: false })
    }
  }
}

// ------------------------------------------------------------------ escrita

/**
 * O `Gravar` do título — UM hook que decide `POST` ou `PUT` pelo id.
 *
 * Mesma razão de `useGravarOrcamento`: dois hooks lado a lado parecem o caminho
 * e não são, e chamar o errado grava calado pela metade. Título novo chega sem
 * `id`, porque número e id são do servidor — o número é sequencial POR DIREÇÃO.
 *
 * **O `PUT` substitui o título INTEIRO, parcelas junto.** O corpo se monta a
 * partir do que a tela tem na mão; parcela ausente é parcela apagada.
 */
export function useGravarTitulo() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({
    mutationFn: async ({ id, corpo }: { id?: string; corpo: FinancialTitleWriteRequest }) => {
      const resposta: RespostaDaApi = id
        ? await updateFinancialTitle(id, corpo)
        : await createFinancialTitle(corpo)
      return dadosOuErro<FinancialTitleDto>(resposta, 'Falha ao gravar o título.')
    },
    onSuccess: (gravado) => {
      invalidar()
      avisar('Título gravado.', gravado.number ? `Nº ${gravado.number}` : undefined)
    },
  })
}

/**
 * O `Cancelar` do título — a desistência.
 *
 * Não há `DELETE` no módulo inteiro, e a ausência é regra: título que some é
 * dinheiro que o sistema esqueceu de dever. Título com baixa lançada recusa com
 * `urn:cabinet:erro:titulo-com-baixa`, e a saída ali é lançar outro título — o
 * passado não se reescreve depois que o dinheiro andou.
 */
export function useCancelarTitulo() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await cancelFinancialTitle(id)
      return dadosOuErro<FinancialTitleDto>(resposta, 'Falha ao cancelar o título.')
    },
    onSuccess: (cancelado) => {
      invalidar()
      avisar('Título cancelado.', cancelado.number ? `Nº ${cancelado.number}` : undefined)
    },
  })
}

/**
 * A BAIXA de uma parcela.
 *
 * O destino (`bankAccountId` XOR `cashRegisterId`) é obrigatório na escrita — é
 * o que faz a baixa virar linha de extrato. Quem monta o corpo é o diálogo, que
 * é onde o operador escolhe a conta; aqui só se decide o que é falha.
 */
export function useQuitarParcela() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({
    mutationFn: async ({
      installmentId,
      corpo,
    }: { installmentId: string; corpo: SettlementWriteRequest }) => {
      const resposta: RespostaDaApi = await settleInstallment(installmentId, corpo)
      return dadosOuErro<FinancialSettlementDto>(resposta, 'Falha ao quitar a parcela.')
    },
    onSuccess: (baixa) => {
      invalidar()
      avisar('Baixa lançada.', `${formatMoneyBRL(baixa.paidCents)} na conta escolhida`)
    },
  })
}

/**
 * A QUITAÇÃO EM LOTE — N parcelas num ato só.
 *
 * **Tudo ou nada**, e é o servidor quem garante: uma parcela recusada derruba a
 * requisição inteira e nenhuma baixa fica gravada. Por isso a tela NÃO tem laço
 * de N requisições — um laço no cliente falha pela metade, e o operador que
 * corrige e reenvia o bloco paga em dobro o que já tinha passado.
 *
 * O item pode omitir `amountCents`: o padrão é o saldo inteiro, que é o caso
 * normal do lote. Repetir um número que o servidor já sabe faz a tela pagar a
 * mais quando o saldo muda entre a leitura e o envio.
 */
export function useQuitarEmLote() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({
    mutationFn: async (corpo: SettlementBatchRequest) => {
      const resposta: RespostaDaApi = await settleBatch(corpo)
      return dadosOuErro<SettlementBatchResultDto>(resposta, 'Falha ao quitar o lote.')
    },
    onSuccess: (resultado) => {
      invalidar()
      avisar(
        `Lote quitado — ${resultado.settlements.length} ${
          resultado.settlements.length === 1 ? 'parcela' : 'parcelas'
        }.`,
        formatMoneyBRL(resultado.totalPaidCents),
      )
    },
  })
}

// ------------------------------------------------------------- listas de apoio

/**
 * As três listas que o lançamento e a baixa precisam para OFERECER escolha.
 *
 * Vêm inteiras (`pageSize` no teto do contrato) porque alimentam combo, não
 * grade: conta bancária, caixa e modo de pagamento são dezenas de linhas no
 * legado — 19, poucos e 26 —, e paginar um combo faria a segunda página sumir
 * sem ninguém notar. `active: true` some do combo o que foi desativado; o
 * histórico continua mostrando o id que a baixa guardou.
 */
function useApoio<T>(
  nome: string,
  buscar: () => Promise<RespostaDaApi>,
  extrair: (dados: unknown) => T[],
) {
  return useQuery({
    queryKey: [...CHAVES_FINANCEIRO.apoio, nome],
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta = await buscar()
      return extrair(dadosOuErro<unknown>(resposta, `Falha ao consultar ${nome}.`))
    },
  })
}

export function useContasBancarias() {
  return useApoio<BankAccountDto>(
    'as contas bancárias',
    () => listBankAccounts({ active: true, pageSize: PAGE_SIZE_MAX, sortBy: 'name' }),
    (dados) => (dados as PagedResultOfBankAccountDto).rows ?? [],
  )
}

export function useCaixas() {
  return useApoio<CashRegisterDto>(
    'os caixas',
    () => listCashRegisters({ active: true, pageSize: PAGE_SIZE_MAX, sortBy: 'code' }),
    (dados) => (dados as PagedResultOfCashRegisterDto).rows ?? [],
  )
}

/**
 * Os modos que servem para QUITAR — `usableInSettlement: true` no pedido.
 *
 * Não é zelo de filtro: é o que o legado faz com uma cláusula solta na quitação
 * em lote, e o contrato o publicou como parâmetro. Oferecer no combo um modo que
 * o servidor recusa com 400 põe o erro no `Gravar`, depois de o operador ter
 * preenchido o diálogo inteiro.
 */
export function useModosDeQuitacao() {
  return useApoio<PaymentModeDto>(
    'os modos de pagamento',
    () => listPaymentModes({ active: true, usableInSettlement: true, pageSize: PAGE_SIZE_MAX }),
    (dados) => (dados as PagedResultOfPaymentModeDto).rows ?? [],
  )
}

// ------------------------------------------------------------------- recusas

/**
 * A recusa da QUITAÇÃO A MENOR — 403 com URN própria.
 *
 * Existe como função e não como `if` na tela porque a distinção é o motivo de a
 * URN ter sido criada: no `papel-insuficiente` a tela ESCONDE o controle, porque
 * a pessoa não resolve sozinha; aqui o controle é justamente o que resolve — o
 * valor sobe até o saldo e a baixa passa. Tratar as duas como o mesmo 403
 * tiraria da frente o campo que destrava o caso.
 *
 * **O backend ainda não emite esta URN.** A api#199 (fase B, aberta) recusa com
 * `TIPO.papelInsuficiente` em `financeiro/baixa.ts`; a URN entrou no contrato por
 * este PR e a fase B a adota quando reler o contrato. Até lá, o mock — que é
 * quem responde nos dois modos, porque as 15 operações estão em 501 — já a
 * manda, e o reconhecimento aqui é o lado do cliente pronto.
 */
export function ehQuitacaoAMenor(erro: unknown): boolean {
  return (
    erro instanceof ErroDaApi &&
    erro.status === 403 &&
    tipoDoProblema(erro) === 'urn:cabinet:erro:quitacao-a-menor'
  )
}

function tipoDoProblema(erro: ErroDaApi): string | undefined {
  const corpo = erro.corpo as { type?: string } | undefined
  return corpo?.type
}
