import type { EmployeeDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { colaborador as esquemaColaborador } from '@/features/cadastro/modulos'
import { CoberturaDoColaborador } from '@/features/colaborador/cobertura-do-colaborador'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/colaboradores/')({
  component: ColaboradoresPage,
})

/**
 * As colunas são os campos do `EmployeeDto` CRU, e os `accessorKey` são o que o
 * `sortBy` manda ao servidor: `name`, `sector`, `jobTitle`, `active` — a
 * whitelist medida em 25/08 (pedir `nome` responde 400
 * `urn:cabinet:erro:ordenacao-invalida`, nomeando os aceitos).
 *
 * **A coluna `Código` saiu, e o contrato diz por quê:** "o legado identifica
 * funcionário por CPF e não guarda código humano, então a coluna `Código` da
 * listagem sai da tela em vez de exibir um uuid". Mostrar
 * `ac956183-c6b5-4adf-…` onde o operador procurava `12` é ruído com cara de
 * dado.
 *
 * `sector` e `jobTitle` vêm com o NOME já resolvido pelo servidor — é serviço
 * que o DTO presta de propósito, para a listagem não ter de buscar o rótulo de
 * cada lista de apoio só para imprimir uma linha.
 */
const columns: ColumnDef<EmployeeDto>[] = [
  {
    accessorKey: 'name',
    header: 'Nome',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'sector',
    header: 'Setor',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'jobTitle',
    header: 'Cargo',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

/**
 * O FILTRO ESTRUTURADO SAIU DAQUI, e a saída é medição, não preferência.
 *
 * Esta era a tela piloto do filtro por módulo (issue #68) do lado MOCK: quem
 * respondia `campo + operador + valor` era o provider em memória. Com a
 * listagem em `GET /api/employees` quem responde é o servidor, e **ele não
 * publica o parâmetro `filters`**: medido em 2026-08-25 contra a main `2ee954b`
 * do api, pedir `filters` responde 400 `urn:cabinet:erro:filtro-invalido` —
 * "Este recurso não publica o parâmetro filters".
 *
 * Deixar os campos na tela faria `filtrosDaTabela` LANÇAR antes da rede (é
 * guarda dela, e a mensagem nomeia as duas saídas) — ou, sem ela, o operador
 * montaria um filtro e receberia 400 sem entender o que fez de errado.
 *
 * **O piloto não se perdeu:** o piloto HTTP é Produtos, desde que o contrato
 * publicou `filters` em `/api/products` (issue #77), e é ele que exercita o
 * caminho de verdade. Esta tela volta a filtrar no dia em que o contrato
 * publicar `filters` para `/api/employees` — que é PR no dono do contrato,
 * este repo, e depois handler no api. Enquanto isso a busca é o `q`, que o
 * servidor serve.
 */

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

  const actions = cadastroActions<EmployeeDto>({
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
        // O SELETOR DE COLUNAS continua, e é função diferente do filtro: o
        // schema diz quais colunas o operador pode ligar, e cada uma declara o
        // `dto:` que a casa com o campo do `EmployeeDto`. Ele saiu junto com o
        // filtro num primeiro corte desta migração, e a única coisa que isso
        // fez foi tirar da tela uma função que o servidor não impede.
        // `modoDeFiltro="modulo"` SEM `filtros`: desde 25/08 o braço por módulo
        // do DataTable não exige campo filtrável, então isto pede o seletor de
        // COLUNAS sem pedir a faixa de chips de filtro — que é exatamente o que
        // esta tela pode oferecer enquanto o contrato não publicar `filters`.
        modoDeFiltro="modulo"
        entidadeDoSchema={esquemaColaborador}
      />
    </>
  )
}
