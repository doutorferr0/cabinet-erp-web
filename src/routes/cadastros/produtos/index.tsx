import type { ProductDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { Produto } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useDesativarProduto } from '@/data/produtos-api'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
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
  { accessorKey: 'code', header: 'Nosso Código' },
  {
    accessorKey: 'description',
    header: 'Nossa Descrição',
    // Voz de O QUÊ, e recuada: na listagem o produto é coadjuvante do nome.
    cell: ({ getValue }) => <Produto>{getValue<string>()}</Produto>,
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

function ProdutosPage() {
  const navigate = useNavigate()

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
      actions={actions}
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
