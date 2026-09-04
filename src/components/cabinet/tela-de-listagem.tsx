import { AvisoDadosDeExemplo } from '@/components/cabinet/aviso-dados-de-exemplo'
import { ConfirmarCancelamento } from '@/components/cabinet/confirmar-cancelamento'
import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import type {
  DataTableAction,
  DecoracaoDaLinha,
  OpcaoDeAgrupamento,
} from '@/components/cabinet/data-table'
import { VitraDataTable } from '@/components/cabinet/data-table'
import type { AcaoDeCabecalho } from '@/components/cabinet/page-header'
import { PageHeader } from '@/components/cabinet/page-header'
import type { MotivoDoCancelamento } from '@/data/cancelamento-de-documento'
import type { OrigemDosDados } from '@/data/provider'
import type { EntidadeCadastro } from '@/features/cadastro/modulos'
import { mensagemDoErro } from '@/lib/erros'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import type { TableFetcher } from '@/lib/table-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { ReactNode } from 'react'

export interface DesativacaoProps<T> {
  entidade: string
  /** Registro marcado para desativar; `null` fecha o diálogo. */
  registro: T | null
  nome: (row: T) => string
  ativo: (row: T) => boolean
  pendente: boolean
  erro: unknown
  onFechar: () => void
  onConfirmar: () => void
}

/**
 * O `Cancelar` das listagens de DOCUMENTO — irmão de `DesativacaoProps`, e
 * separado dele porque as duas ações dizem coisas opostas ao operador (ver
 * `ConfirmarCancelamento`). Uma listagem declara uma OU outra: cadastro
 * desativa, documento cancela.
 */
export interface CancelamentoProps<T> {
  /** Nome do documento em minúscula, como entra na frase ('orçamento'). */
  documento: string
  /** Documento marcado para cancelar; `null` fecha o diálogo. */
  registro: T | null
  numero: (row: T) => string
  cancelado: (row: T) => boolean
  pendente: boolean
  erro: unknown
  onFechar: () => void
  onConfirmar: (motivo: MotivoDoCancelamento) => void
  /** Pede motivo e observação no diálogo — ver `ConfirmarCancelamento`. */
  comMotivo?: boolean
}

export interface TelaDeListagemProps<T> {
  titulo: string
  /** Texto pequeno ao lado do título (ex.: "Banco Principal" em Produtos). */
  contexto?: string
  columns: ColumnDef<T>[]
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  actions: DataTableAction<T>[]
  desativacao?: DesativacaoProps<T>
  /** Confirmação do `Cancelar` — só nas listagens de documento. */
  cancelamento?: CancelamentoProps<T>
  /** Conteúdo extra abaixo da tabela (os botões de rodapé do Orçamento). */
  rodape?: ReactNode
  /**
   * Campos filtráveis desta listagem — repassados à `VitraDataTable`, que troca
   * o botão `Filtro` da barra pelo filtro estruturado. Sem eles, a barra segue
   * como estava.
   */
  filtros?: readonly CampoFiltravel[]
  modoDeFiltro?: 'pilulas' | 'lista' | 'modulo'
  /** A entidade do schema de módulos — obrigatória em `modoDeFiltro: 'modulo'`. */
  entidadeDoSchema?: EntidadeCadastro
  /**
   * De onde vêm as linhas — `data.<recurso>.origem`, passado CRU pela rota.
   *
   * A tela de documento não precisa desta prop porque já recebe o `provider`
   * inteiro; a listagem recebe só o `fetcher` (uma função solta, que não sabe
   * de quem é). Enquanto for assim, quem liga as duas pontas é a rota — e
   * `dados-de-exemplo-avisado.test.tsx` reprova a rota que ler um recurso de
   * fixture sem declarar a origem, para "esqueci de passar" não virar tela
   * mentindo de novo.
   */
  origem?: OrigemDosDados | undefined
  /**
   * O ESTADO que a linha anuncia sozinha (D10): faixa lateral e tint.
   *
   * Sobe até aqui em vez de ficar em cada rota porque a pergunta que ela
   * responde é a mesma nas onze listagens — "o que nesta lista pede atenção
   * hoje, e o que já saiu do jogo" —, e porque quem decide o que é atraso é a
   * TELA: a tabela não conhece prazo nem situação. `undefined` para a linha
   * comum, que é a maioria; listagem que decora tudo não decora nada.
   */
  decoracao?: (linha: T) => DecoracaoDaLinha | undefined
  /** Campos oferecidos no chip `Agrupar` (D10). */
  agrupamentos?: readonly OpcaoDeAgrupamento<T>[]
  /**
   * O que cada linha soma no subtotal do grupo, em CENTAVOS INTEIROS.
   *
   * Só as listagens de documento a declaram — cadastro agrupado dá contagem, e
   * um `R$ 0,00` com a forma de total conferido seria pior que a ausência.
   */
  subtotalDoGrupo?: (linha: T) => number
  /**
   * A faixa de KPIs, entre o cabeçalho e a grade (mockup §Listagem).
   *
   * Chega montada pela ROTA, e não como uma lista de números: quem sabe de que
   * agregado o resumo vem, o que cada tile qualifica e qual deles é problema é
   * a tela, não o esqueleto. Só as listagens cujo recurso publica `/resumo` a
   * declaram — faixa de zeros enquanto o contrato não soma seria um total com
   * a forma de total conferido.
   */
  resumo?: ReactNode
}

/** Id da ação que ABRE o filtro — fica na tabela, com colunas e consultas salvas. */
const ACAO_FILTRO = 'filtro'
/** Id da ação PRIMÁRIA da listagem — a única peça forte do cabeçalho. */
const ACAO_PRIMARIA = 'incluir'
/** Id da ação que a LINHA passou a fazer sozinha (#198). */
const ACAO_ABRIR = 'consultar'

/**
 * Traduz a ação da barra da tabela para a do cabeçalho.
 *
 * Só as que NÃO dependem de linha chegam aqui desde a #198 — as de registro
 * moram na barra de seleção, dentro da tabela, que é quem sabe o que está
 * marcado.
 */
function paraCabecalho<T>(acao: DataTableAction<T>): AcaoDeCabecalho {
  return {
    id: acao.id,
    label: acao.label,
    ...(acao.icon ? { icon: acao.icon } : {}),
    disabled: acao.disabled === true,
    ...(acao.title && acao.disabled === true ? { motivo: acao.title } : {}),
    ...(acao.variant === 'destructive' ? { destrutiva: true } : {}),
    onClick: () => acao.onClick?.(null),
  }
}

/**
 * Esqueleto comum às listagens de cadastro e documento (transcrição §9,
 * padrões 4 e 7): cabeçalho de página, tabela e — quando o recurso desativa —
 * o diálogo de confirmação. `cadastroActions` e `VitraDataTable` continuam
 * sendo quem decide o comportamento; este componente só compõe.
 *
 * ## Onde cada ação foi parar, e por quê
 *
 * A mesma lista de `actions` que as dez telas entregam é repartida em QUATRO
 * destinos, sem nenhuma rota mudar — as duas primeiras vieram da #197, as duas
 * últimas da #198:
 *
 * | ação | destino | por quê |
 * |---|---|---|
 * | `Filtro` | barra da tabela | é irmão de `Colunas` e das consultas salvas |
 * | `Incluir` | ação primária do cabeçalho | única peça forte da tela |
 * | `Consul.` | **a própria linha** | clicar na linha abre o registro; o botão virava um passo a mais para fazer o que o clique já dizia |
 * | `Alterar`, `Excluir`, … | barra de SELEÇÃO | só existem depois de marcar, e é lá que a marcação está |
 *
 * Sobra no `⋯` do cabeçalho o que não depende de linha nenhuma (`Imprimir`).
 * A repartição mora AQUI, e não em cada rota, porque é a mesma em dez telas.
 */
export function TelaDeListagem<T>({
  titulo,
  contexto,
  columns,
  queryKey,
  fetcher,
  actions,
  desativacao,
  cancelamento,
  rodape,
  filtros,
  modoDeFiltro,
  entidadeDoSchema,
  origem,
  decoracao,
  agrupamentos,
  subtotalDoGrupo,
  resumo,
}: TelaDeListagemProps<T>) {
  const acoesDaTabela = actions.filter((a) => a.id === ACAO_FILTRO)
  const primaria = actions.find((a) => a.id === ACAO_PRIMARIA)
  const abrir = actions.find((a) => a.id === ACAO_ABRIR)
  // Ação de registro desce para a barra de seleção; o que não depende de linha
  // fica no `⋯`. `Consul.` sai das duas: quem a faz agora é a linha.
  const acoesDeSelecao = actions.filter(
    (a) => a.needsSelection === true && a.id !== ACAO_ABRIR && a.disabled !== true,
  )
  const secundarias = actions.filter(
    (a) =>
      a.id !== ACAO_FILTRO &&
      a.id !== ACAO_PRIMARIA &&
      a.id !== ACAO_ABRIR &&
      (a.needsSelection !== true || a.disabled === true),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo={titulo}
        {...(contexto ? { contexto } : {})}
        {...(primaria ? { primaria: paraCabecalho(primaria) } : {})}
        secundarias={secundarias.map(paraCabecalho)}
      />
      {/* Resumo antes do detalhe (mockup §Listagem): a faixa responde antes de
          o operador filtrar, e some da leitura assim que ele começa a varrer a
          grade. Fronteira com o resto = espaço, sem linha (§Hierarquia). */}
      {resumo}
      {/* Entre o cabeçalho e a tabela: depois do título, que diz de que tela se
          trata, e antes da primeira linha de dado, que é o que ele desmente. */}
      <AvisoDadosDeExemplo origem={origem} />
      <VitraDataTable
        columns={columns}
        queryKey={queryKey}
        fetcher={fetcher}
        actions={acoesDaTabela}
        acoesDeSelecao={acoesDeSelecao}
        {...(abrir?.onClick && abrir.disabled !== true
          ? // A linha abre em CONSULTA, que é o uso mais frequente de um
            // cadastro. Recurso cujo contrato ainda não publica detalhe por id
            // manda a ação desabilitada — ali a linha continua só marcando, em
            // vez de prometer uma tela que não existe.
            { aoAbrirLinha: (linha: T) => abrir.onClick?.(linha) }
          : {})}
        {...(filtros ? { filtros } : {})}
        // A MESMA ação primária do cabeçalho, repetida DENTRO do vazio (#201).
        // Não é duplicata gratuita: o cabeçalho é onde `Incluir` mora sempre, e
        // a caixa do vazio é onde o operador está olhando quando descobre que
        // não há nada — mandá-lo procurar o botão lá em cima é cobrar um passo
        // por um estado que a própria tela acabou de anunciar. Some assim que
        // houver uma linha, porque aí o vazio não existe mais.
        {...(primaria?.onClick && primaria.disabled !== true
          ? {
              acaoDoVazio: {
                label: primaria.label,
                onClick: () => primaria.onClick?.(null),
              },
            }
          : {})}
        // A tela INTEIRA é dona do endereço; a janela de busca (padrão 5), que
        // monta a mesma tabela por cima dela, não é. Por isso a consulta na URL
        // (#199) se liga aqui, e não dentro do componente.
        consultaNoEndereco
        {...(modoDeFiltro ? { modoDeFiltro } : {})}
        {...(entidadeDoSchema ? { entidade: entidadeDoSchema } : {})}
        {...(decoracao ? { decoracao } : {})}
        {...(agrupamentos ? { agrupamentos } : {})}
        {...(subtotalDoGrupo ? { subtotalDoGrupo } : {})}
      />
      {rodape}
      {cancelamento?.registro ? (
        <ConfirmarCancelamento
          documento={cancelamento.documento}
          numero={cancelamento.numero(cancelamento.registro)}
          cancelado={cancelamento.cancelado(cancelamento.registro)}
          aberto
          pendente={cancelamento.pendente}
          erro={mensagemDoErro(cancelamento.erro, 'Não foi possível cancelar. Tente de novo.')}
          onFechar={cancelamento.onFechar}
          onConfirmar={cancelamento.onConfirmar}
          comMotivo={cancelamento.comMotivo ?? false}
        />
      ) : null}
      {desativacao?.registro ? (
        <ConfirmarDesativacao
          entidade={desativacao.entidade}
          nome={desativacao.nome(desativacao.registro)}
          ativo={desativacao.ativo(desativacao.registro)}
          aberto
          pendente={desativacao.pendente}
          erro={mensagemDoErro(desativacao.erro, 'Não foi possível desativar. Tente de novo.')}
          onFechar={desativacao.onFechar}
          onConfirmar={desativacao.onConfirmar}
        />
      ) : null}
    </div>
  )
}
