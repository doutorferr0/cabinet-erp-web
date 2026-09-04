import type { PartnerDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import type { OpcaoDeAgrupamento } from '@/components/cabinet/data-table'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { useDesativarParceiro } from '@/data/parceiros-api'
import { profissional as esquemaProfissional } from '@/features/cadastro/modulos'
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
    meta: { tipo: 'id' },
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
    // IDENTIFICADOR (CREA/CAU/CFT): a mesma voz do código e do CNPJ. A mono
    // vem do TIPO desde a D8 — `font-mono` na célula seria a segunda
    // autoridade sobre a mesma decisão.
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
    meta: { tipo: 'id' },
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
 * `GET /api/partners`: `code`, `legalName`, `tradeName`, `document`, `active`.
 *
 * **A faixa por módulo depende desta lista existir**, e não só do
 * `entidadeDoSchema`: a DataTable só monta o bloco de filtro quando a tela
 * declara o que pode ser filtrado, e as duas props respondem perguntas
 * diferentes — esta diz o que o SERVIDOR aceita (e como o valor sai daqui), o
 * schema diz a que ASSUNTO cada campo pertence.
 *
 * `document` filtra mesmo digitado com máscara: o dado trafega em dígito puro e
 * o `normalizar` limpa a pontuação na saída. Sem ele a consulta responderia
 * "nenhum registro" para um profissional que existe.
 *
 * `Registro Profissional` é coluna mas NÃO é filtro: não está na whitelist do
 * recurso, e campo fora dela o contrato manda 400. Oferecer o filtro aqui daria
 * erro só no clique.
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
  { id: 'legalName', rotulo: 'Nome', variante: 'text', icon: User, placeholder: 'Parte do nome…' },
  {
    id: 'document',
    rotulo: 'CPF / CNPJ',
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

function ProfissionaisPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { readOnly } = useReadOnlyPorPapel('partners')

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
      titulo="Cadastro de Profissional Externo"
      columns={columns}
      queryKey={['profissionais']}
      fetcher={data.profissionais.list}
      decoracao={decoracaoDoParceiro}
      agrupamentos={AGRUPAMENTOS}
      actions={actions}
      // Filtro POR MÓDULO (#104): os chips saem do mesmo schema que desenha o
      // formulário e a ficha, e é ele que traz o agrupamento que a lista plana
      // não tinha.
      filtros={camposFiltraveis}
      modoDeFiltro="modulo"
      entidadeDoSchema={esquemaProfissional}
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
