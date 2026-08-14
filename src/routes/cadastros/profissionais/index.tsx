import type { PartnerDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useDesativarParceiro } from '@/data/parceiros-api'
import { type CampoFiltravel, somenteDigitos } from '@/lib/filtro-de-consulta'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleCheck, Hash, IdCard, User } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/cadastros/profissionais/')({
  component: ProfissionaisPage,
})

/**
 * `Registro Profissional` VOLTOU (2026-08-13): a engenharia reversa do legado
 * confirmou o campo (`partners.registration` — CREA/CAU/CFT) e ele entrou no
 * contrato como `Proposto`. Era uma das duas colunas da §3 que a tela escondia
 * por falta de DTO.
 *
 * `Profissão` continua de fora, e agora por um motivo mais duro: não existe no
 * `PartnerDto` NEM na extração do legado. Não é lacuna de contrato, é campo sem
 * fonte — volta quando o user disser de onde ele sai.
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
  {
    accessorKey: 'tradeName',
    header: 'Nome de Apresentação',
    cell: ({ getValue }) => {
      const apresentacao = getValue<string | null>()
      return apresentacao ? <Nome>{apresentacao}</Nome> : '—'
    },
  },
  {
    accessorKey: 'registration',
    header: 'Registro Profissional',
    // Mono: é IDENTIFICADOR (CREA/CAU/CFT), a mesma voz do código e do CNPJ.
    cell: ({ getValue }) => <span className="font-mono">{getValue<string | null>() ?? '—'}</span>,
  },
  {
    accessorKey: 'legalName',
    header: 'Nome',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

/**
 * Campos filtráveis — a whitelist que o contrato publica em `filters` de
 * `GET /api/partners`. `id` é o nome do campo NO CONTRATO, como o `accessorKey`.
 *
 * **`document` filtra mesmo digitado com máscara**: o dado trafega em dígito
 * puro e o operador digita com pontuação, então o `normalizar` limpa na SAÍDA.
 * `Profissão` continua fora daqui pelo mesmo motivo de estar fora das colunas —
 * não existe no DTO nem na extração, é campo sem fonte.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'code', rotulo: 'Código', variante: 'text', icon: Hash, placeholder: 'Ex.: 1042' },
  {
    id: 'tradeName',
    rotulo: 'Nome de Apresentação',
    variante: 'text',
    icon: User,
    placeholder: 'Parte do nome…',
  },
  {
    id: 'legalName',
    rotulo: 'Nome',
    variante: 'text',
    icon: User,
    placeholder: 'Parte do nome…',
  },
  {
    id: 'document',
    rotulo: 'CNPJ / CPF',
    variante: 'text',
    icon: IdCard,
    placeholder: 'Com ou sem pontuação',
    normalizar: somenteDigitos,
  },
  { id: 'active', rotulo: 'Ativo', variante: 'boolean', icon: CircleCheck },
]

function ProfissionaisPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  function abrir(profissionalId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/profissionais/$profissionalId',
      params: { profissionalId },
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
  const desativar = useDesativarParceiro(['profissionais'])

  const actions = cadastroActions<PartnerDto>({
    entidade: 'profissional',
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrirParceiro(p),
    onConsultar: (p) => abrirParceiro(p, 'consulta'),
    onExcluir: (p) => {
      desativar.reset()
      setADesativar(p)
    },
  })

  return (
    <TelaDeListagem
      titulo="Cadastro de Profissional Externo"
      columns={columns}
      queryKey={['profissionais']}
      fetcher={data.profissionais.list}
      actions={actions}
      filtros={camposFiltraveis}
      desativacao={{
        entidade: 'profissional',
        registro: aDesativar,
        nome: (p) => p.legalName,
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
