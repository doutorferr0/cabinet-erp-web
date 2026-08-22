import {
  type InstallmentPolicyDto,
  type PagedResultOfPaymentTermDto,
  type PaymentTermDto,
  getInstallmentPolicy,
  listPaymentTerms,
} from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro } from '@/data/api-provider'
import { useQuery } from '@tanstack/react-query'

/**
 * A fronteira de leitura do PAGAMENTO: as condições da empresa e os três
 * limites que governam o parcelamento (`/api/payment-terms`,
 * `/api/installment-policy`, contrato S4/web#307).
 *
 * Só LEITURA, e é decisão de escopo: quem cadastra condição é a tela de
 * configuração, que ainda não existe. O documento de venda escolhe entre as que
 * existem — a escrita entra junto da tela que a exige, como toda fronteira
 * deste repo.
 *
 * ## A política nunca é `undefined`, e é isso que a torna útil
 *
 * O contrato diz que empresa sem linha gravada lê o PADRÃO do servidor, não
 * 404. A tela do documento herda essa garantia: `usePoliticaDeParcelamento`
 * devolve `POLITICA_DE_RESERVA` enquanto a consulta não respondeu ou falhou, em
 * vez de um terceiro estado. Um combo que não sabe o teto ofereceria 10× onde a
 * empresa aceita 6, e o operador descobriria o limite errando na gravação.
 *
 * **A reserva é a mesma do legado** (`par_ParcelarVlAcima`, `Par_VlMinParcela`,
 * `Par_QuantMaxParcela` da instalação da Vertz), e ela existe para o front não
 * ficar SEM limite nenhum durante o carregamento — não para substituir a do
 * servidor. Empresa que gravou a dela nunca vê estes números depois que a
 * consulta responde.
 */

/** Os três limites de reserva — ver o cabeçalho: eles cobrem o vão do carregamento. */
export const POLITICA_DE_RESERVA: InstallmentPolicyDto = {
  minTotalToInstallCents: 10000,
  minInstallmentCents: 5000,
  maxInstallments: 6,
}

export const CHAVES_PAGAMENTO = {
  condicoes: ['payment-terms'] as const,
  politica: ['installment-policy'] as const,
}

export interface CondicoesDePagamento {
  /** Só as ATIVAS: desativação é lógica (§9 padrão 8) e o combo não oferece o que a empresa aposentou. */
  condicoes: PaymentTermDto[]
  /** A lista passou do teto de 100 do contrato e veio cortada. */
  truncada: boolean
  carregando: boolean
  erro: boolean
}

/**
 * As condições ATIVAS da empresa, ordenadas por nome.
 *
 * `pageSize: 100` é o teto do contrato — o mesmo raciocínio das listas de
 * apoio: condição de pagamento que passe de 100 deixou de caber num combo, e
 * truncar em silêncio esconderia isso de quem escolhe.
 *
 * Item INATIVO é filtrado aqui e não no servidor porque o contrato não publica
 * `filters` nesta operação (decisão declarada na descrição: sobre um punhado de
 * linhas que já vieram inteiras, o filtro estruturado seria parâmetro sem
 * consumidor). O documento que aponta para condição hoje inativa continua
 * legível — quem garante isso é o bloco, exibindo o nome que o documento
 * carimbou.
 */
export function useCondicoesDePagamento(): CondicoesDePagamento {
  const query = useQuery({
    queryKey: CHAVES_PAGAMENTO.condicoes,
    queryFn: async () => {
      // `name` e não uma constante daqui: a whitelist desta operação já tem
      // dono — `ORDENAVEIS_CONDICAO`, em `src/mocks/api/pagamento.ts`, que é
      // quem `whitelist-do-contrato.test.ts` cruza com a descrição do contrato.
      // Uma segunda lista neste arquivo seria a mesma fronteira em duas cópias,
      // e a cópia sem guarda é a que envelhece calada.
      const resposta: RespostaDaApi = await listPaymentTerms({ pageSize: 100, sortBy: 'name' })
      return dadosOuErro<PagedResultOfPaymentTermDto>(
        resposta,
        'Falha ao carregar as condições de pagamento.',
      )
    },
  })

  const linhas = query.data?.rows ?? []
  return {
    condicoes: linhas.filter((c) => c.active),
    truncada: (query.data?.total ?? 0) > linhas.length,
    carregando: query.isPending,
    erro: query.isError,
  }
}

export interface PoliticaDeParcelamento {
  politica: InstallmentPolicyDto
  /** `false` enquanto a do servidor não chegou — o que está em mãos é a reserva. */
  doServidor: boolean
  carregando: boolean
}

/**
 * Os três limites da empresa ativa.
 *
 * Nunca devolve vazio: até a resposta chegar (ou se ela falhar) vale
 * `POLITICA_DE_RESERVA`, e `doServidor` diz qual das duas está na mão — quem
 * exibe os limites ao operador precisa saber se está mostrando o número da
 * empresa ou o de reserva.
 */
export function usePoliticaDeParcelamento(): PoliticaDeParcelamento {
  const query = useQuery({
    queryKey: CHAVES_PAGAMENTO.politica,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getInstallmentPolicy()
      return dadosOuErro<InstallmentPolicyDto>(
        resposta,
        'Falha ao carregar os limites de parcelamento.',
      )
    },
  })

  return {
    politica: query.data ?? POLITICA_DE_RESERVA,
    doServidor: query.data !== undefined,
    carregando: query.isPending,
  }
}

/**
 * Por que ESTA condição não serve para ESTE documento — ou `null` quando serve.
 *
 * Duas das três regras do parcelamento são decidíveis com o que a tela já tem
 * (a política e o total), e são estas. A terceira
 * (`urn:cabinet:erro:parcela-abaixo-do-minimo`) **não é decidível aqui sem
 * repetir a distribuição da sobra que o servidor faz** — ela depende do total e
 * do número de parcelas ao mesmo tempo, e a web#309 a declarou como a que não
 * se previne filtrando o combo. Ela chega como recusa, com URN própria, e o
 * bloco mostra a frase do servidor.
 *
 * O motivo é TEXTO para o operador ler ao lado da opção desabilitada: esconder
 * a condição faria quem a procura concluir que ela não existe mais.
 */
export function motivoDeNaoCaber(
  condicao: Pick<PaymentTermDto, 'installmentCount'>,
  politica: InstallmentPolicyDto,
  totalCents: number,
): string | null {
  if (condicao.installmentCount > politica.maxInstallments) {
    return `máx. ${politica.maxInstallments}× nesta empresa`
  }
  if (condicao.installmentCount > 1 && totalCents < politica.minTotalToInstallCents) {
    // A frase evita as palavras "à vista" de propósito: elas são NOME de
    // condição na lista da Vertz, e um motivo que repete o nome de outra opção
    // faz a busca por rótulo (a do operador e a do teste) casar com duas linhas.
    return `não parcela abaixo de ${reais(politica.minTotalToInstallCents)}`
  }
  return null
}

function reais(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}
