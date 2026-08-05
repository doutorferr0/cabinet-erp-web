import type { ProductDto } from '@/api/gerado'
import { BandaDeIdentidade } from '@/components/vitra/banda-identidade'
import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { ConfirmarDesativacao } from '@/components/vitra/confirmar-desativacao'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { ErroDaApi } from '@/data/api-provider'
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
 * A §6 registra mais quatro colunas — `Marca`, `Fábrica`, `Tipo de Produto` e
 * `Valor de Tabela`. Elas NÃO estão no DTO da listagem, e coluna que fica vazia em
 * toda linha é pior que coluna ausente: parece cadastro incompleto, não contrato
 * incompleto. Voltam quando o DTO crescer (`docs/integracao.md`).
 *
 * O `accessorKey` é o nome do campo NO CONTRATO porque ele viaja como `sortBy`, e
 * a whitelist do servidor é `code`/`description`/`active`.
 */
const columns: ColumnDef<ProductDto>[] = [
  { accessorKey: 'code', header: 'Nosso Código' },
  { accessorKey: 'description', header: 'Nossa Descrição' },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : 'Não'),
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
    <div className="flex flex-col gap-4">
      {/* O legado escrevia "Cadastro de produtos - Banco Principal" numa linha
          só; o banco é CONTEXTO do cadastro, não parte do nome dele. */}
      <BandaDeIdentidade titulo="Cadastro de produtos" contexto="Banco Principal" />
      <VitraDataTable
        columns={columns}
        queryKey={['produtos']}
        fetcher={data.produtos.list}
        actions={actions}
      />
      {aDesativar ? (
        <ConfirmarDesativacao
          entidade="produto"
          nome={aDesativar.description}
          ativo={aDesativar.active}
          aberto
          pendente={desativar.isPending}
          erro={
            desativar.error instanceof ErroDaApi
              ? (desativar.error.detail ?? 'Não foi possível desativar. Tente de novo.')
              : desativar.error
                ? 'Não foi possível desativar. Tente de novo.'
                : null
          }
          onFechar={() => setADesativar(null)}
          onConfirmar={() => desativar.mutate(aDesativar, { onSuccess: () => setADesativar(null) })}
        />
      ) : null}
    </div>
  )
}
