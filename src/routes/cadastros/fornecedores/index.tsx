import type { PartnerDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import type { OpcaoDeAgrupamento } from '@/components/cabinet/data-table'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { useDesativarParceiro } from '@/data/parceiros-api'
import { fornecedor as esquemaFornecedor } from '@/features/cadastro/modulos'
import { type CampoFiltravel, somenteDigitos } from '@/lib/filtro-de-consulta'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, CircleCheck, Hash, IdCard, User } from 'lucide-react'
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
    meta: { tipo: 'id' },
  },
  {
    accessorKey: 'tradeName',
    header: 'Nome Fantasia',
    cell: ({ getValue }) => {
      const fantasia = getValue<string | null>()
      return fantasia ? <Nome>{fantasia}</Nome> : '—'
    },
  },
  {
    accessorKey: 'legalName',
    header: 'Razão Social',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
    meta: { tipo: 'entidade' },
  },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

/**
 * Campos filtráveis — a whitelist que o contrato publica em `filters` de
 * `GET /api/partners`. `id` é o nome do campo NO CONTRATO, como o `accessorKey`:
 * é ele que viaja, e a whitelist do servidor é em inglês.
 *
 * **`document` filtra mesmo digitado com máscara** — o dado trafega em dígito
 * puro e o operador digita `12.345.678/0001-90`. O `normalizar` limpa a
 * pontuação na SAÍDA; sem ele a consulta diria "nenhum registro" para um
 * fornecedor que existe.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'code', rotulo: 'Código', variante: 'text', icon: Hash, placeholder: 'Ex.: 1042' },
  {
    id: 'tradeName',
    rotulo: 'Nome Fantasia',
    variante: 'text',
    icon: Building2,
    placeholder: 'Parte do nome…',
  },
  {
    id: 'legalName',
    rotulo: 'Razão Social',
    variante: 'text',
    icon: User,
    placeholder: 'Parte da razão social…',
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

/**
 * Cadastro DESATIVADO (padrão 8: nunca se apaga de verdade) passa a se
 * anunciar na própria linha, em vez de depender da coluna `Ativo` no fim dela
 * — que é onde o olho chega por último numa varredura.
 */
function decoracaoDoParceiro(p: PartnerDto) {
  return p.active ? undefined : ('muted' as const)
}

/**
 * `Situação` é o único agrupamento desta tela, e é o que responde às três
 * consultas que o operador faz aqui — os ativos, os inativos, todos. Tinge a
 * faixa porque é ESTADO; agrupar por nome próprio não teria cor.
 */
const AGRUPAMENTOS: readonly OpcaoDeAgrupamento<PartnerDto>[] = [
  {
    id: 'active',
    rotulo: 'Situação',
    valorDaLinha: (p) => (p.active ? 'Ativo' : 'Inativo'),
    tomDoValor: (valor) => (valor === 'Ativo' ? 'done' : 'void'),
  },
]

function FornecedoresPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { readOnly } = useReadOnlyPorPapel('partners')

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
    readOnly,
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
      titulo="Cadastro de Fornecedores"
      columns={columns}
      queryKey={['fornecedores']}
      fetcher={data.fornecedores.list}
      decoracao={decoracaoDoParceiro}
      agrupamentos={AGRUPAMENTOS}
      actions={actions}
      filtros={camposFiltraveis}
      // Filtro POR MÓDULO (#104): o mesmo schema que desenha o formulário e a
      // ficha agrupa os campos aqui. A whitelist acima continua sendo quem diz
      // o que o servidor aceita e como o valor sai.
      modoDeFiltro="modulo"
      entidadeDoSchema={esquemaFornecedor}
      desativacao={{
        entidade: 'fornecedor',
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
