import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { CARGOS, type Colaborador, SETORES } from '@/mocks/colaboradores'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { BriefcaseBusiness, Building2, CircleCheck, Hash, User } from 'lucide-react'

export const Route = createFileRoute('/cadastros/colaboradores/')({
  component: ColaboradoresPage,
})

const columns: ColumnDef<Colaborador>[] = [
  { accessorKey: 'id', header: 'Código' },
  {
    accessorKey: 'nome',
    header: 'Nome',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'setor',
    header: 'Setor',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'cargo',
    header: 'Cargo',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'ativo',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

/**
 * TELA PILOTO do filtro estruturado (issue #68).
 *
 * Colaborador é o piloto por um motivo de fase, não de gosto: o recurso ainda é
 * **mock**, e é o provider mock que sabe responder `campo + operador + valor`. O
 * contrato v1 não tem parâmetro de filtro, então listagem HTTP (produto,
 * parceiro) não declara campos filtráveis — declarar ali faria a tela prometer
 * uma consulta que o servidor não recebe (ver `recusarFiltroSemContrato`).
 *
 * Os `id` são os campos do mock (§2 da transcrição). Quando colaborador ganhar
 * caminho no contrato, eles viram os nomes do DTO — a mesma regra do
 * `accessorKey` das colunas ordenáveis.
 *
 * `salario` fica de fora de propósito: trafega em centavos, e um filtro numérico
 * ali compararia com centavos ("1000" acharia R$ 10,00). Entra quando houver
 * variante de dinheiro.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'id', rotulo: 'Código', variante: 'number', icon: Hash, placeholder: 'Ex.: 12' },
  { id: 'nome', rotulo: 'Nome', variante: 'text', icon: User, placeholder: 'Parte do nome…' },
  {
    id: 'setor',
    rotulo: 'Setor',
    variante: 'select',
    icon: Building2,
    opcoes: SETORES.map((s) => ({ valor: s, rotulo: s })),
  },
  {
    // Múltipla escolha porque a pergunta real é "quem é vendedor OU consultor" —
    // com `select` o operador teria de rodar a consulta duas vezes e somar de
    // cabeça.
    id: 'cargo',
    rotulo: 'Cargo',
    variante: 'multiSelect',
    icon: BriefcaseBusiness,
    opcoes: CARGOS.map((c) => ({ valor: c, rotulo: c })),
  },
  { id: 'ativo', rotulo: 'Ativo', variante: 'boolean', icon: CircleCheck },
]

function ColaboradoresPage() {
  const navigate = useNavigate()

  function abrir(colaboradorId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/colaboradores/$colaboradorId',
      params: { colaboradorId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<Colaborador>({
    entidade: 'colaborador',
    onIncluir: () => abrir('novo'),
    onAbrir: (c) => abrir(String(c.id)),
    onConsultar: (c) => abrir(String(c.id), 'consulta'),
  })

  return (
    <TelaDeListagem
      titulo="Cadastro de Colaboradores"
      columns={columns}
      queryKey={['colaboradores']}
      fetcher={data.colaboradores.list}
      actions={actions}
      filtros={camposFiltraveis}
    />
  )
}
