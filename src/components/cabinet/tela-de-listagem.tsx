import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import type { DataTableAction } from '@/components/cabinet/data-table'
import { VitraDataTable } from '@/components/cabinet/data-table'
import type { AcaoDeCabecalho } from '@/components/cabinet/page-header'
import { PageHeader } from '@/components/cabinet/page-header'
import type { EntidadeCadastro } from '@/features/cadastro/modulos'
import { mensagemDoErro } from '@/lib/erros'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import type { TableFetcher } from '@/lib/table-query'
import type { ColumnDef } from '@tanstack/react-table'
import { type ReactNode, useState } from 'react'

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

export interface TelaDeListagemProps<T> {
  titulo: string
  /** Texto pequeno ao lado do título (ex.: "Banco Principal" em Produtos). */
  contexto?: string
  columns: ColumnDef<T>[]
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  actions: DataTableAction<T>[]
  desativacao?: DesativacaoProps<T>
  /** Conteúdo extra abaixo da tabela (os botões de rodapé do Orçamento). */
  rodape?: ReactNode
  /**
   * Campos filtráveis desta listagem — repassados à `VitraDataTable`, que troca
   * o botão `Filtro` da barra pelo filtro estruturado. Sem eles, a barra segue
   * como estava.
   */
  filtros?: readonly CampoFiltravel[]
  modoDeFiltro?: 'lista' | 'menu' | 'modulo'
  /** A entidade do schema de módulos — obrigatória em `modoDeFiltro: 'modulo'`. */
  entidadeDoSchema?: EntidadeCadastro
}

/** Id da ação que ABRE o filtro — fica na tabela, com colunas e consultas salvas. */
const ACAO_FILTRO = 'filtro'
/** Id da ação PRIMÁRIA da listagem — a única peça forte do cabeçalho. */
const ACAO_PRIMARIA = 'incluir'

/**
 * Traduz a ação da barra da tabela para a do cabeçalho.
 *
 * A diferença que importa é o clique: a `DataTableAction` recebe a linha
 * (`(row) => …`) porque nascia dentro da tabela, dona da seleção; o cabeçalho
 * está fora dela e fecha sobre a linha que a tela guardou. É por isso que a
 * seleção subiu de nível — sem isso, `Alterar` no topo abriria `null`.
 */
function paraCabecalho<T>(acao: DataTableAction<T>, selecionado: T | null): AcaoDeCabecalho {
  const precisaDeLinha = acao.needsSelection === true
  const semLinha = precisaDeLinha && selecionado === null
  return {
    id: acao.id,
    label: acao.label,
    ...(acao.icon ? { icon: acao.icon } : {}),
    disabled: acao.disabled === true || semLinha,
    // O motivo do `title` (contrato sem detalhe por id, orçamento que não
    // cancela) vale sempre que a ação está morta POR ELA — a falta de linha
    // tem aviso próprio, de grupo, e repeti-lo em três itens seria ruído.
    ...(acao.title && acao.disabled === true ? { motivo: acao.title } : {}),
    ...(acao.variant === 'destructive' ? { destrutiva: true } : {}),
    onClick: () => acao.onClick?.(precisaDeLinha ? selecionado : null),
  }
}

/**
 * Esqueleto comum às listagens de cadastro e documento (transcrição §9,
 * padrões 4 e 7): cabeçalho de página, tabela e — quando o recurso desativa —
 * o diálogo de confirmação. `cadastroActions` e `VitraDataTable` continuam
 * sendo quem decide o comportamento; este componente só compõe.
 *
 * **A barra de sete botões saiu daqui (Polaris-2, #197).** A mesma lista de
 * `actions` que as dez telas já entregam é repartida em três destinos, sem
 * nenhuma rota mudar:
 *
 * - `Filtro` FICA na tabela — é onde moram colunas e consultas salvas, e os
 *   três são a mesma pergunta ("como esta listagem está montada agora");
 * - `Incluir` vira a ação primária do cabeçalho;
 * - o resto vai para o `⋯`, desabilitado enquanto não houver linha marcada.
 *
 * A repartição mora AQUI, e não em cada rota, porque é a mesma em dez telas —
 * e porque `cadastroActions` continua sendo a fonte única dos rótulos, ícones e
 * motivos que o legado fixou.
 */
export function TelaDeListagem<T>({
  titulo,
  contexto,
  columns,
  queryKey,
  fetcher,
  actions,
  desativacao,
  rodape,
  filtros,
  modoDeFiltro,
  entidadeDoSchema,
}: TelaDeListagemProps<T>) {
  // A linha marcada sobe da tabela para cá: o cabeçalho está fora dela e precisa
  // saber sobre QUAL registro `Alterar`, `Consul.` e `Excluir` agem. A tabela
  // continua dona do estado — aqui é cópia para leitura, avisada por callback.
  const [selecionado, setSelecionado] = useState<T | null>(null)

  const acoesDaTabela = actions.filter((a) => a.id === ACAO_FILTRO)
  const primaria = actions.find((a) => a.id === ACAO_PRIMARIA)
  const secundarias = actions.filter((a) => a.id !== ACAO_FILTRO && a.id !== ACAO_PRIMARIA)
  const esperandoLinha = selecionado === null && secundarias.some((a) => a.needsSelection === true)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titulo={titulo}
        {...(contexto ? { contexto } : {})}
        {...(primaria ? { primaria: paraCabecalho(primaria, selecionado) } : {})}
        secundarias={secundarias.map((a) => paraCabecalho(a, selecionado))}
        {...(esperandoLinha
          ? { avisoDasSecundarias: 'Escolha uma linha na listagem para usar as ações de registro.' }
          : {})}
      />
      <VitraDataTable
        columns={columns}
        queryKey={queryKey}
        fetcher={fetcher}
        actions={acoesDaTabela}
        onSelecaoChange={setSelecionado}
        {...(filtros ? { filtros } : {})}
        {...(modoDeFiltro ? { modoDeFiltro } : {})}
        {...(entidadeDoSchema ? { entidade: entidadeDoSchema } : {})}
      />
      {rodape}
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
