import type { CrmLostReasonDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import type { OpcaoDeAgrupamento } from '@/components/cabinet/data-table'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { motivosDePerda, useAlterarMotivoDePerda } from '@/data/crm-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { MotivoDePerdaDialog } from '@/features/crm/motivo-de-perda-dialog'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'

export const Route = createFileRoute('/crm/motivos')({
  component: MotivosPage,
})

/**
 * `accessorKey` é o nome do campo NO CONTRATO — ele viaja como `sortBy`, e a
 * whitelist do servidor é em inglês (`name`, `active`).
 */
const columns: ColumnDef<CrmLostReasonDto>[] = [
  {
    accessorKey: 'name',
    header: 'Motivo',
    meta: { tipo: 'entidade' },
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

/**
 * Cadastro de motivos de perda. É catálogo, e não texto livre, porque a
 * pergunta que ele responde é "por que perdemos" SOMADA no ano — texto livre
 * vira trinta grafias da mesma coisa e nenhuma análise.
 *
 * Incluir e Alterar abrem DIÁLOGO: o contrato não tem detalhe por id, e a linha
 * já é o registro inteiro (ver `MotivoDePerdaDialog`).
 */
/** Motivo desativado some das escolhas novas e continua nos relatórios. */
function decoracaoDoMotivo(m: CrmLostReasonDto) {
  return m.active ? undefined : ('muted' as const)
}

const AGRUPAMENTOS: readonly OpcaoDeAgrupamento<CrmLostReasonDto>[] = [
  {
    id: 'active',
    rotulo: 'Situação',
    valorDaLinha: (m) => (m.active ? 'Ativo' : 'Inativo'),
    tomDoValor: (valor) => (valor === 'Ativo' ? 'done' : 'void'),
  },
]

function MotivosPage() {
  const [emEdicao, setEmEdicao] = useState<CrmLostReasonDto | null>(null)
  const [aberto, setAberto] = useState(false)
  const [aDesativar, setADesativar] = useState<CrmLostReasonDto | null>(null)
  const desativar = useAlterarMotivoDePerda()
  const { readOnly } = useReadOnlyPorPapel('crm')

  function abrir(motivo: CrmLostReasonDto | null) {
    setEmEdicao(motivo)
    setAberto(true)
  }

  const actions = cadastroActions<CrmLostReasonDto>({
    entidade: 'motivo de perda',
    readOnly,
    onIncluir: () => abrir(null),
    onAbrir: (m) => abrir(m),
    // `Consul.` abre o mesmo diálogo: com dois campos, uma versão somente
    // leitura seria a mesma tela sem poder corrigir um erro de digitação à vista.
    onConsultar: (m) => abrir(m),
    onExcluir: (m) => {
      desativar.reset()
      setADesativar(m)
    },
  })

  return (
    <>
      <TelaDeListagem
        titulo="Motivos de Perda"
        columns={columns}
        queryKey={['crm', 'motivos-de-perda', 'listagem']}
        fetcher={motivosDePerda.list}
        decoracao={decoracaoDoMotivo}
        agrupamentos={AGRUPAMENTOS}
        actions={actions}
        desativacao={{
          entidade: 'motivo de perda',
          registro: aDesativar,
          nome: (m) => m.name,
          ativo: (m) => m.active,
          pendente: desativar.isPending,
          erro: desativar.error,
          onFechar: () => setADesativar(null),
          onConfirmar: () => {
            if (!aDesativar) return
            // `PUT` substitui o registro inteiro: o nome viaja junto do
            // `active: false`, senão desativar apagaria o motivo.
            desativar.mutate(
              { id: aDesativar.id, corpo: { name: aDesativar.name, active: false } },
              { onSuccess: () => setADesativar(null) },
            )
          },
        }}
      />

      <MotivoDePerdaDialog aberto={aberto} motivo={emEdicao} onFechar={() => setAberto(false)} />
    </>
  )
}
