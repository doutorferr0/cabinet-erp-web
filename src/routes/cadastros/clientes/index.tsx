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
 * `GET /api/partners`. `id` é o nome do campo NO CONTRATO pelo mesmo motivo do
 * `accessorKey`: é ele que viaja, e a whitelist do servidor é em inglês.
 *
 * **`document` filtra mesmo digitado com máscara.** O dado trafega em dígito
 * puro (convenção do CLAUDE.md) e o operador digita `12.345.678/0001-90`; o
 * `normalizar` limpa a pontuação na SAÍDA, e o campo continua mostrando o que
 * foi digitado. Sem isso a consulta responderia "nenhum registro" para um
 * cadastro que existe, e o operador conferiria o CNPJ dígito a dígito
 * procurando o erro dele.
 *
 * `tradeName` fica de fora: existe na whitelist e no DTO, mas esta tela não
 * mostra Nome Fantasia — oferecer filtro por coluna que não está à vista faz o
 * operador estreitar a listagem sem enxergar por quê.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'code', rotulo: 'Código', variante: 'text', icon: Hash, placeholder: 'Ex.: 1042' },
  { id: 'legalName', rotulo: 'Nome', variante: 'text', icon: User, placeholder: 'Parte do nome…' },
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
    <TelaDeListagem
      titulo="Cadastro de Clientes"
      columns={columns}
      queryKey={['clientes']}
      fetcher={data.clientes.list}
      actions={actions}
      filtros={camposFiltraveis}
      desativacao={{
        entidade: 'cliente',
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
