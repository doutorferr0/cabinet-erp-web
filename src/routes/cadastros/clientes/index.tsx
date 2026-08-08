import type { PartnerDto } from '@/api/gerado'
import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import { VitraDataTable } from '@/components/cabinet/data-table'
import { data } from '@/data'
import { useDesativarParceiro } from '@/data/parceiros-api'
import { mensagemDoErro } from '@/lib/erros'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'

export const Route = createFileRoute('/cadastros/clientes/')({
  component: ClientesPage,
})

/**
 * `Profissional` e `Categoria` saíram: não existem no `PartnerDto`. As duas são
 * do vínculo comercial que a §2 mostra e o contrato ainda não expõe — voltam
 * quando o DTO crescer.
 *
 * `Ativo` é o `active` do vínculo com a empresa ativa; `accessorKey` é o nome do
 * campo no contrato porque viaja como `sortBy`.
 */
const columns: ColumnDef<PartnerDto>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  { accessorKey: 'legalName', header: 'Nome' },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

function ClientesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  function abrir(clienteId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/clientes/$clienteId',
      params: { clienteId },
      search: modo ? { modo } : {},
    })
  }

  /**
   * A LINHA é o registro. O contrato tem `PUT /api/partners/{id}` e não tem
   * `GET` por id — o `PartnerWriteRequest` é subconjunto do `PartnerDto`, então
   * a linha selecionada já traz todo campo gravável. Semear o cache aqui evita
   * pedir ao servidor o que acabou de chegar; quem abrir por link direto não
   * tem linha, e a rota diz isso.
   */
  function abrirParceiro(p: PartnerDto, modo?: 'consulta') {
    queryClient.setQueryData(['parceiro', p.id], p)
    abrir(p.id, modo)
  }

  // O `Excluir` da barra é DESATIVAÇÃO (padrão 8) e passa por confirmação: o
  // rótulo herdado do legado diz "excluir", o efeito é outro, e quem clica
  // precisa ler qual antes. Sem `onExcluir` a ação só escrevia no console —
  // botão destrutivo que não faz nada é pior que botão desabilitado.
  const [aDesativar, setADesativar] = useState<PartnerDto | null>(null)
  const desativar = useDesativarParceiro(['clientes'])

  const actions = cadastroActions<PartnerDto>({
    entidade: 'cliente',
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrirParceiro(p),
    onConsultar: (p) => abrirParceiro(p, 'consulta'),
    onExcluir: (p) => {
      desativar.reset()
      setADesativar(p)
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <BandaDeIdentidade titulo="Cadastro de Clientes" />
      <VitraDataTable
        columns={columns}
        queryKey={['clientes']}
        fetcher={data.clientes.list}
        actions={actions}
      />
      {aDesativar ? (
        <ConfirmarDesativacao
          entidade="cliente"
          nome={aDesativar.legalName}
          ativo={aDesativar.active}
          aberto
          pendente={desativar.isPending}
          erro={mensagemDoErro(desativar.error, 'Não foi possível desativar. Tente de novo.')}
          onFechar={() => setADesativar(null)}
          onConfirmar={() => desativar.mutate(aDesativar, { onSuccess: () => setADesativar(null) })}
        />
      ) : null}
    </div>
  )
}
