import type { ProductDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import type { OpcaoDeAgrupamento } from '@/components/cabinet/data-table'
import { FaixaDeKpi, KpiTile } from '@/components/cabinet/kpi-tile'
import { Produto } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useResumoDeEstoque, variacao } from '@/data/agregados-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { useDesativarProduto } from '@/data/produtos-api'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleCheck, FileText, Hash } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/cadastros/produtos/')({
  component: ProdutosPage,
})

/**
 * Colunas do que o `ProductDto` traz, com os rótulos LITERAIS da §6.
 *
 * **`Marca`, `Fábrica` e `Tipo de Produto` VOLTARAM (2026-08-13)**, quando o DTO
 * cresceu com a classificação do catálogo. As três saíram um dia porque coluna
 * vazia em toda linha é pior que coluna ausente — parece cadastro incompleto, e
 * o incompleto era o contrato.
 *
 * `Valor de Tabela`, a quarta que a §6 registra, continua fora: ela é da
 * VARIANTE (§6.3), e a listagem lista produtos. Derivar "o preço da primeira
 * variante" seria inventar regra aqui.
 *
 * O `accessorKey` é o nome do campo NO CONTRATO porque ele viaja como `sortBy`, e
 * a whitelist do servidor é `code`/`description`/`active` — por isso as três
 * novas entram com **`enableSorting: false`**. Sem isso, clicar no cabeçalho
 * manda `sortBy=brandName`, que a whitelist recusa com 400: a tela quebraria no
 * clique, não na carga.
 */
const columns: ColumnDef<ProductDto>[] = [
  { accessorKey: 'code', header: 'Nosso Código', meta: { tipo: 'id' } },
  {
    accessorKey: 'description',
    header: 'Nossa Descrição',
    // Voz de O QUÊ, e recuada: na listagem o produto é coadjuvante do nome.
    cell: ({ getValue }) => <Produto>{getValue<string>()}</Produto>,
    meta: { tipo: 'entidade' },
  },
  {
    accessorKey: 'productTypeName',
    header: 'Tipo de Produto',
    enableSorting: false,
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'brandName',
    header: 'Marca',
    enableSorting: false,
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'factoryName',
    header: 'Fábrica',
    enableSorting: false,
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

/**
 * Campos filtráveis — a whitelist que o contrato publica no parâmetro `filters`
 * de `GET /api/products`, que hoje é a mesma do `sortBy`.
 *
 * **Primeira listagem HTTP a filtrar de verdade.** O `id` é o nome do campo NO
 * CONTRATO pelo mesmo motivo do `accessorKey`: é ele que viaja, e a whitelist do
 * servidor é em inglês — traduzir aqui daria 400 ao aplicar o filtro.
 *
 * `Tipo de Produto`, `Marca` e `Fábrica` ficam de fora com as colunas que já não
 * ordenam: existem no DTO, não na whitelist. Oferecê-los renderia 400 no clique —
 * e a fronteira barra antes disso, com o nome do campo (`filtrosDaTabela`). Entram
 * quando o contrato os aceitar.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'code', rotulo: 'Nosso Código', variante: 'text', icon: Hash, placeholder: 'Ex.: 1042' },
  {
    id: 'description',
    rotulo: 'Nossa Descrição',
    variante: 'text',
    icon: FileText,
    placeholder: 'Parte da descrição…',
  },
  { id: 'active', rotulo: 'Ativo', variante: 'boolean', icon: CircleCheck },
]

/**
 * Produto DESATIVADO continua na lista (padrão 8: cadastro não se apaga) e
 * passa a se anunciar como o que é — fora de linha. Antes ele só se distinguia
 * pela coluna `Ativo`, no fim da linha, que é onde o olho chega por último.
 */
function decoracaoDoProduto(p: ProductDto) {
  return p.active ? undefined : ('muted' as const)
}

/**
 * Agrupar pelo que ORGANIZA o catálogo. Nenhum destes tinge a faixa: tipo,
 * marca e fábrica são nomes próprios, não estados — cor aqui seria decoração
 * sem significado (§Hierarquia).
 */
const AGRUPAMENTOS: readonly OpcaoDeAgrupamento<ProductDto>[] = [
  {
    id: 'productTypeName',
    rotulo: 'Tipo de Produto',
    valorDaLinha: (p) => p.productTypeName ?? '—',
  },
  { id: 'brandName', rotulo: 'Marca', valorDaLinha: (p) => p.brandName ?? '—' },
  { id: 'factoryName', rotulo: 'Fábrica', valorDaLinha: (p) => p.factoryName ?? '—' },
]

/**
 * Os quatro do ESTOQUE sobre a listagem de produtos, e não quatro campos do
 * produto: `ProductDto` não publica quantidade, mínimo nem preço — quem soma é
 * `GET /api/estoque/resumo`. Pôr a quantidade como COLUNA seria dado de outra
 * consulta com cara de campo do produto (ver a nota da PR).
 *
 * `Críticos` é o problema da tela: item abaixo do mínimo é o que faz alguém
 * abrir esta listagem com pressa.
 */
function KpisDeEstoque() {
  const { data: resumo } = useResumoDeEstoque()
  if (!resumo) return null

  return (
    <FaixaDeKpi>
      <KpiTile rotulo="Variantes" valor={resumo.variantCount} unidade="SKUs" tint="lilac" />
      <KpiTile rotulo="Abaixo do mínimo" valor={resumo.criticalItems} alerta tint="sand" />
      <KpiTile
        rotulo="Valor em estoque"
        valorCentavos={resumo.stockValueCents}
        delta={variacao(resumo.stockValueCents, resumo.previousMonthStockValueCents)}
        serie={resumo.monthlyValueSeries}
        tint="mint"
      />
      <KpiTile
        rotulo="Sem preço"
        valor={resumo.unpricedVariants}
        nota="não entram na valorização"
        tint="sky"
      />
    </FaixaDeKpi>
  )
}

function ProdutosPage() {
  const navigate = useNavigate()
  const { readOnly } = useReadOnlyPorPapel('products')

  function abrir(produtoId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/produtos/$produtoId',
      params: { produtoId },
      search: modo ? { modo } : {},
    })
  }

  // O `Excluir` da barra é DESATIVAÇÃO (padrão 8) e passa por confirmação: o
  // rótulo herdado do legado diz "excluir", o efeito é outro, e quem clica
  // precisa ler qual antes. Sem `onExcluir` a ação só escrevia no console —
  // botão destrutivo que não faz nada é pior que botão desabilitado.
  const [aDesativar, setADesativar] = useState<ProductDto | null>(null)
  const desativar = useDesativarProduto()

  const actions = cadastroActions<ProductDto>({
    entidade: 'produto',
    readOnly,
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrir(p.id),
    onConsultar: (p) => abrir(p.id, 'consulta'),
    onExcluir: (p) => {
      desativar.reset()
      setADesativar(p)
    },
  })

  return (
    <TelaDeListagem
      // O legado escrevia "Cadastro de produtos - Banco Principal" numa linha
      // só; o banco é CONTEXTO do cadastro, não parte do nome dele.
      titulo="Cadastro de Produtos"
      contexto="Banco Principal"
      columns={columns}
      queryKey={['produtos']}
      fetcher={data.produtos.list}
      resumo={<KpisDeEstoque />}
      decoracao={decoracaoDoProduto}
      agrupamentos={AGRUPAMENTOS}
      actions={actions}
      filtros={camposFiltraveis}
      desativacao={{
        entidade: 'produto',
        registro: aDesativar,
        nome: (p) => p.description,
        ativo: (p) => p.active,
        pendente: desativar.isPending,
        erro: desativar.error,
        onFechar: () => setADesativar(null),
        onConfirmar: () => {
          if (!aDesativar) return
          desativar.mutate(aDesativar, { onSuccess: () => setADesativar(null) })
        },
      }}
    />
  )
}
