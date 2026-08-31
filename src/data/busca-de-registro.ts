import type { OrderDto, PartnerDto, ProductDto, QuoteDto } from '@/api/gerado'
import { data } from '@/data/index'
import { LISTA_DE_PARCEIROS } from '@/data/parceiros-api'
import { RECURSOS, type RecursoDaEmpresa, useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import type { TableQueryState } from '@/lib/table-query'
import { useQueries } from '@tanstack/react-query'
import { FileText, type LucideIcon, Package, Receipt, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * BUSCA DE REGISTRO — o `q` que já existe em cada listagem, perguntado de uma vez.
 *
 * ## O motivo escrito no código estava vencido
 *
 * `comandos.ts` recusava "ir para o cliente ANDRÉ BATALHA" dizendo que "o
 * contrato não tem busca global". Rota única de fato não há, e continua não
 * havendo — mas o `q` de cada listagem casa exatamente os alvos que o operador
 * pede, e é o BACKEND que decide o que ele casa:
 *
 * | Recurso | `q` casa | onde, no `cabinet-erp-api` |
 * |---|---|---|
 * | Parceiros | `code`, `legal_name`, `trade_name`, `document` | `modules/parceiros/consulta.ts` |
 * | Produtos | `code`, `description` | `modules/catalogo/rotas.ts` |
 * | Orçamentos | `number`, `customer_name`, `project_name` | `modules/orcamento/consulta.ts` |
 * | Pedidos de venda | `number`, `customer_name`, `project_name` | `modules/vendas/consulta.ts` |
 *
 * Ou seja: "achar parceiro, produto e documento por número" é trabalho só de
 * front — nenhuma rota nova, nenhum PR de contrato.
 *
 * ## QUATRO consultas por termo, e por que não uma
 *
 * O custo desta decisão é explícito: cada termo digitado vira quatro
 * requisições, contra UMA de uma rota `/api/search` unificada. Escolhemos as
 * quatro porque a alternativa é uma rota nova no contrato — semanas de espera
 * pelo backend para uma tela que já dá para ter hoje — e porque cada `q` é
 * mantido junto da consulta que ele serve: a whitelist de campos casáveis de
 * parceiro muda quando parceiro muda, e uma busca unificada teria de recopiá-la.
 *
 * O que segura o custo: `DEBOUNCE_MS` (não se consulta a cada tecla),
 * `MINIMO_DE_LETRAS` (duas letras casariam meio cadastro) e `POR_ALVO` páginas
 * de cinco — a paleta mostra o começo e diz quantos ficaram de fora, ela não é
 * a listagem. Se um dia a conta não fechar, o caminho é a rota unificada, e ela
 * troca só este arquivo.
 *
 * ## Falha de um alvo não é lista vazia
 *
 * As quatro consultas são independentes e falham independentemente. Quem
 * falhou aparece dito na tela (`falharam`): silenciar mostraria "nenhum produto"
 * para uma busca que nem chegou ao servidor — a mesma confusão que a #398
 * corrigiu nas listagens.
 */

/** Abaixo disto não se consulta: duas letras casariam meio cadastro. */
export const MINIMO_DE_LETRAS = 3

/** Espera após a última tecla antes de perguntar ao servidor. */
export const DEBOUNCE_MS = 250

/** Quantos resultados por alvo — a paleta mostra o começo, não a listagem. */
export const POR_ALVO = 5

export type ChaveDeAlvo = 'parceiros' | 'produtos' | 'orcamentos' | 'pedidos'

export interface ResultadoDeBusca {
  /** Único na paleta inteira — a chave da lista e o alvo do teste. */
  id: string
  titulo: string
  /** Uma linha embaixo: o que distingue dois registros de nome parecido. */
  subtitulo: string
  icon: LucideIcon
  /** Caminho já montado — a paleta navega, não resolve rota. */
  url: string
  /**
   * O texto que o filtro local da paleta enxerga.
   *
   * Precisa conter TODO campo pelo qual o servidor casou (código, documento,
   * número do documento), senão o resultado chega e o filtro do
   * `Autocomplete` o esconde: quem procura o cliente pelo CNPJ receberia uma
   * lista vazia depois de o servidor tê-lo encontrado.
   */
  textValue: string
}

export interface GrupoDeResultados {
  chave: ChaveDeAlvo
  titulo: string
  itens: ResultadoDeBusca[]
  /** Quantos o servidor tem ao todo — não quantos vieram. */
  total: number
  /** `true` quando `total` passa do que coube em `POR_ALVO`. */
  cortado: boolean
}

export interface BuscaDeRegistro {
  /** O termo efetivamente consultado (já passou pelo debounce). */
  termo: string
  /** `true` enquanto qualquer alvo está no ar. */
  buscando: boolean
  grupos: GrupoDeResultados[]
  /** Títulos dos alvos cuja consulta falhou — a tela precisa dizer. */
  falharam: string[]
  /** `true` quando o que foi digitado ainda não chega a `MINIMO_DE_LETRAS`. */
  curto: boolean
}

function consulta(q: string): TableQueryState {
  return { q, sort: null, page: 1, pageSize: POR_ALVO }
}

/** Junta o que distingue, sem deixar `null` virar "null" na tela. */
function linha(...partes: (string | null | undefined)[]): string {
  return partes.filter((p): p is string => Boolean(p?.trim())).join(' · ')
}

/**
 * A ficha para onde o parceiro leva — e ela depende do PAPEL.
 *
 * Um `PartnerDto` pode ser cliente, fornecedor e profissional ao mesmo tempo
 * (a tabela é uma só no backend), mas as fichas são três telas diferentes. A
 * ordem abaixo é a de probabilidade de quem busca, e o recurso da empresa entra
 * antes: `suppliers` e `professionals` são contratados por empresa, e mandar
 * para uma ficha que a empresa não opera daria o 403 da guarda em vez do
 * registro — a mesma razão de a paleta só oferecer o que a barra lateral mostra.
 *
 * Parceiro cujo único papel a empresa não alcança sai do resultado inteiro:
 * mostrar a linha sem ter para onde levá-la é oferecer um beco.
 */
function fichaDoParceiro(
  parceiro: PartnerDto,
  tem: (recurso: RecursoDaEmpresa) => boolean,
): string | null {
  if (parceiro.isCustomer) return `/cadastros/clientes/${parceiro.id}`
  if (parceiro.isSupplier && tem(RECURSOS.suppliers))
    return `/cadastros/fornecedores/${parceiro.id}`
  if (parceiro.isProfessional && tem(RECURSOS.professionals)) {
    return `/cadastros/profissionais/${parceiro.id}`
  }
  return null
}

function papeisDoParceiro(parceiro: PartnerDto): string {
  const papeis = [
    parceiro.isCustomer && 'Cliente',
    parceiro.isSupplier && 'Fornecedor',
    parceiro.isProfessional && 'Profissional',
  ].filter((p): p is string => typeof p === 'string')
  return papeis.join(' e ')
}

function deParceiro(
  parceiro: PartnerDto,
  tem: (recurso: RecursoDaEmpresa) => boolean,
): ResultadoDeBusca | null {
  const url = fichaDoParceiro(parceiro, tem)
  if (!url) return null
  const titulo = parceiro.tradeName?.trim() || parceiro.legalName
  return {
    id: `parceiro:${parceiro.id}`,
    titulo,
    subtitulo: linha(parceiro.code, papeisDoParceiro(parceiro), parceiro.document),
    icon: Users,
    url,
    // O documento entra CRU e sem máscara, como o dado é guardado: é assim que
    // o `q` do servidor casou, e é o que o filtro local precisa reconhecer.
    textValue: linha(titulo, parceiro.legalName, parceiro.code, parceiro.document),
  }
}

function deProduto(produto: ProductDto): ResultadoDeBusca {
  return {
    id: `produto:${produto.id}`,
    titulo: produto.description,
    subtitulo: linha(produto.code, produto.brandName, produto.productTypeName),
    icon: Package,
    url: `/cadastros/produtos/${produto.id}`,
    textValue: linha(produto.description, produto.code),
  }
}

function deOrcamento(orcamento: QuoteDto): ResultadoDeBusca {
  return {
    id: `orcamento:${orcamento.id}`,
    titulo: `Orçamento ${orcamento.number}`,
    subtitulo: linha(orcamento.customerName, orcamento.projectName, orcamento.workName),
    icon: FileText,
    url: `/vendas/orcamentos/${orcamento.id}`,
    textValue: linha(orcamento.number, orcamento.customerName, orcamento.projectName),
  }
}

function dePedido(pedido: OrderDto): ResultadoDeBusca {
  return {
    id: `pedido:${pedido.id}`,
    titulo: `Pedido ${pedido.number}`,
    subtitulo: linha(pedido.customerName, pedido.projectName, pedido.workName),
    icon: Receipt,
    url: `/vendas/pedidos/${pedido.id}`,
    textValue: linha(pedido.number, pedido.customerName, pedido.projectName),
  }
}

interface Alvo {
  chave: ChaveDeAlvo
  titulo: string
  buscar: (
    q: string,
    tem: (recurso: RecursoDaEmpresa) => boolean,
  ) => Promise<{ itens: ResultadoDeBusca[]; total: number }>
}

/**
 * Os quatro alvos, na ordem em que a paleta os mostra.
 *
 * Parceiro é UMA consulta para os três papéis (`LISTA_DE_PARCEIROS`, sem
 * `role`) e não três: a tabela é a mesma no backend, e recortar por papel aqui
 * triplicaria as requisições para devolver as mesmas linhas. Quem separa é a
 * ficha de destino, que já sabe ler o papel da própria linha.
 */
const ALVOS: readonly Alvo[] = [
  {
    chave: 'parceiros',
    titulo: 'Clientes, fornecedores e profissionais',
    buscar: async (q, tem) => {
      const pagina = await LISTA_DE_PARCEIROS.list(consulta(q))
      const itens = pagina.rows
        .map((parceiro) => deParceiro(parceiro, tem))
        .filter((r): r is ResultadoDeBusca => r !== null)
      return { itens, total: pagina.total }
    },
  },
  {
    chave: 'produtos',
    titulo: 'Produtos',
    buscar: async (q) => {
      const pagina = await data.produtos.list(consulta(q))
      return { itens: pagina.rows.map(deProduto), total: pagina.total }
    },
  },
  {
    chave: 'orcamentos',
    titulo: 'Orçamentos',
    buscar: async (q) => {
      const pagina = await data.orcamentos.list(consulta(q))
      return { itens: pagina.rows.map(deOrcamento), total: pagina.total }
    },
  },
  {
    chave: 'pedidos',
    titulo: 'Pedidos de venda',
    buscar: async (q) => {
      const pagina = await data.pedidosVenda.list(consulta(q))
      return { itens: pagina.rows.map(dePedido), total: pagina.total }
    },
  },
]

/**
 * Segura o termo por `DEBOUNCE_MS` antes de deixá-lo virar consulta.
 *
 * Separado do hook de busca porque é a única parte com relógio: teste de busca
 * que quisesse medir o resultado teria de esperar o timer junto, e misturar as
 * duas coisas faria a falha de rede parecer atraso.
 */
export function useTermoAdiado(termo: string, ms = DEBOUNCE_MS): string {
  const [adiado, setAdiado] = useState(termo)

  useEffect(() => {
    // Apagar a caixa tem de limpar na hora: esperar o debounce deixaria os
    // resultados do termo anterior na tela depois de a busca estar vazia.
    if (termo === '') {
      setAdiado('')
      return
    }
    const id = setTimeout(() => setAdiado(termo), ms)
    return () => clearTimeout(id)
  }, [termo, ms])

  return adiado
}

/**
 * Consulta os quatro alvos com o termo já adiado.
 *
 * Recebe o termo pronto — quem adia é `useTermoAdiado`, na paleta. Assim este
 * hook não tem relógio: o teste passa o termo e mede o resultado.
 */
export function useBuscaDeRegistro(termo: string): BuscaDeRegistro {
  const { tem, conhecido } = useRecursosDaEmpresa()
  const limpo = termo.trim()
  const curto = limpo.length < MINIMO_DE_LETRAS

  /**
   * Os recursos ENTRAM NA CHAVE porque entram no resultado.
   *
   * `fichaDoParceiro` descarta o parceiro cujo único papel a empresa não opera,
   * e essa decisão acontece dentro da consulta. Sem os recursos na chave, uma
   * busca feita ANTES de `/auth/tenants` responder — quando `tem` ainda diz não
   * a tudo — ficaria em cache sem fornecedor nenhum, e os trinta segundos de
   * `staleTime` a serviriam de novo depois de a resposta ter chegado. O
   * operador veria uma lista sem fornecedores e nada explicaria por quê.
   *
   * `conhecido` vai junto: "ainda não sei" e "esta empresa não tem recurso
   * nenhum" dão a mesma lista vazia e não podem compartilhar entrada de cache.
   */
  const chaveDosRecursos = [conhecido, ...Object.values(RECURSOS).filter(tem)]

  const consultas = useQueries({
    queries: ALVOS.map((alvo) => ({
      queryKey: ['busca-de-registro', alvo.chave, limpo, chaveDosRecursos],
      queryFn: () => alvo.buscar(limpo, tem),
      // **Espera saber os recursos antes de perguntar.** Com os recursos na
      // chave, consultar antes de `/auth/tenants` responder faria as quatro
      // consultas DUAS vezes: uma com o "ainda não sei" e outra com a resposta.
      // A espera é teórica na prática — a barra lateral já pediu os vínculos
      // quando o shell montou, e a paleta vive dentro dele.
      enabled: !curto && conhecido,
      // O operador digita, apaga e redigita o mesmo nome o tempo todo; meio
      // minuto de cache tira a maior parte das quatro requisições sem correr o
      // risco de mostrar cadastro que acabou de mudar.
      staleTime: 30_000,
      retry: false,
    })),
  })

  return useMemo(() => {
    const grupos: GrupoDeResultados[] = []
    const falharam: string[] = []

    ALVOS.forEach((alvo, i) => {
      const consultaDoAlvo = consultas[i]
      if (!consultaDoAlvo) return
      if (consultaDoAlvo.isError) {
        falharam.push(alvo.titulo)
        return
      }
      const dados = consultaDoAlvo.data
      if (!dados || dados.itens.length === 0) return
      grupos.push({
        chave: alvo.chave,
        titulo: alvo.titulo,
        itens: dados.itens,
        total: dados.total,
        cortado: dados.total > dados.itens.length,
      })
    })

    return {
      termo: limpo,
      // Esperar os vínculos É estar procurando: dizer "nada encontrado" nesse
      // instante afirmaria o resultado de uma busca que nem começou.
      buscando: !curto && (!conhecido || consultas.some((c) => c.isFetching)),
      grupos,
      falharam,
      curto,
    }
    // `consultas` é array novo a cada render (useQueries); o que muda de
    // verdade é o estado de cada uma, e é por ele que este memo tem de passar.
  }, [consultas, curto, limpo, conhecido])
}
