import type { PartnerDto } from '@/api/gerado'
import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import { VitraDataTable } from '@/components/cabinet/data-table'
import { data } from '@/data'
import { ErroDaApi } from '@/data/api-provider'
import { useDesativarParceiro } from '@/data/parceiros-api'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'

export const Route = createFileRoute('/cadastros/fornecedores/')({
  component: FornecedoresPage,
})

/**
 * Colunas do que o `PartnerDto` traz, com os rótulos da §10.
 *
 * `Empresa Compradora` saiu: não existe no DTO, e coluna vazia em toda linha
 * lê-se como cadastro incompleto quando o incompleto é o contrato.
 *
 * `Ativo` é o `active` do VÍNCULO com a empresa ativa (não o `registrationActive`
 * do cadastro do grupo): a pergunta da tela é "esta empresa trabalha com este
 * fornecedor?". O `accessorKey` é o nome do campo no contrato porque ele viaja
 * como `sortBy` — a whitelist do servidor é em inglês.
 */
const columns: ColumnDef<PartnerDto>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'tradeName',
    header: 'Nome Fantasia',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  { accessorKey: 'legalName', header: 'Razão Social' },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

function FornecedoresPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  function abrir(fornecedorId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/fornecedores/$fornecedorId',
      params: { fornecedorId },
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
  const desativar = useDesativarParceiro(['fornecedores'])

  const actions = cadastroActions<PartnerDto>({
    entidade: 'fornecedor',
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
      <BandaDeIdentidade titulo="Cadastro de Fornecedores" />
      <VitraDataTable
        columns={columns}
        queryKey={['fornecedores']}
        fetcher={data.fornecedores.list}
        actions={actions}
      />
      {aDesativar ? (
        <ConfirmarDesativacao
          entidade="fornecedor"
          nome={aDesativar.legalName}
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
