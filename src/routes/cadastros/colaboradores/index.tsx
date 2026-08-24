import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { colaborador as esquemaColaborador } from '@/features/cadastro/modulos'
import { CoberturaDoColaborador } from '@/features/colaborador/cobertura-do-colaborador'
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
 * Colaborador é piloto do lado MOCK: quem responde `campo + operador + valor`
 * aqui é o provider em memória. O piloto HTTP é Produtos, desde que o contrato
 * publicou `filters` em `/api/products` (issue #77) — `GET /api/employees` existe
 * no contrato para o `salespersonId` do orçamento, não serve esta listagem, e
 * enquanto for assim o filtro daqui não passa por rede.
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
  const { readOnly } = useReadOnlyPorPapel('employees')

  function abrir(colaboradorId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/colaboradores/$colaboradorId',
      params: { colaboradorId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<Colaborador>({
    entidade: 'colaborador',
    readOnly,
    onIncluir: () => abrir('novo'),
    onAbrir: (c) => abrir(String(c.id)),
    onConsultar: (c) => abrir(String(c.id), 'consulta'),
  })

  return (
    <>
      {/* Com backend real o combo de responsável das atividades lê o servidor e
          esta tela segue no mock — duas listas de pessoas. Ver
          `cobertura-do-colaborador.tsx`; some quando a tela migrar. */}
      <CoberturaDoColaborador />
      <TelaDeListagem
        titulo="Cadastro de Colaboradores"
        columns={columns}
        queryKey={['colaboradores']}
        fetcher={data.colaboradores.list}
        actions={actions}
        origem={data.colaboradores.origem}
        filtros={camposFiltraveis}
        // Filtro POR MÓDULO (#104): o mesmo schema que desenha o formulário e a
        // ficha agrupa os campos aqui. Colaborador é MOCK, então o id do filtro é
        // a chave do registro (e não o campo do DTO) — as duas pontas saem do
        // mesmo schema, e é ele que mantém as duas de acordo.
        modoDeFiltro="modulo"
        entidadeDoSchema={esquemaColaborador}
      />
    </>
  )
}
