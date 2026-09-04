import { buttonVariants } from '@/components/ui/button'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { useSessao } from '@/data/sessao'
import { dataPorExtenso, saudacao } from '@/lib/datas'
import { Link } from '@tanstack/react-router'
import { LinhaDeHoje } from './hoje'
import { Indicadores } from './indicadores'

/**
 * DASHBOARD — a tela de entrada depois do login.
 *
 * **Não é o Boletim, e não o substitui.** O Boletim (`/`, e `/boletim` como
 * nome) é a folha do MOVIMENTO: o que a operação fez na data de referência, em
 * ledger, para conferir e fechar. O Dashboard é o que está EM CURSO — o que
 * vence, o que chega, o que alguém precisa tocar hoje. Um olha para trás e
 * fecha, o outro olha para a frente e distribui.
 *
 * ## A cabeça da tela (mockup, aba Dashboard)
 *
 * Saudação em `--t-display` (Gambarino 30px) — **o único Gambarino da tela**, e
 * é o que a régua manda: "um Gambarino por tela, no máximo dois". Abaixo dela,
 * numa linha só de `--t-meta`, a data por extenso e a empresa ativa. A data
 * ancora tudo que a tela chama de "hoje"; a empresa, tudo que ela chama de
 * "nosso" — e é a mesma pergunta que o operador de três empresas faz primeiro.
 *
 * Duas ações, à direita: `Boletim do dia` fantasma e `+ Nova tarefa` primária.
 *
 * **As duas são navegação, não diálogo**, e é decisão: `Nova tarefa` tinha saído
 * daqui para `/tarefas` (§@casca-global — "o botão pertence à tela que mostra a
 * fila que ele alimenta"), e o mockup o traz de volta ao cabeçalho. Os dois
 * estão certos ao mesmo tempo se o botão LEVA à fila em vez de abrir uma segunda
 * porta de criação: a fila continua com um formulário só, e o Dashboard ganha o
 * atalho que o mockup pede. Um diálogo aqui daria dois formulários de tarefa com
 * campos diferentes, que é como eles divergem.
 *
 * ## Fronteira entre as três regiões = ESPAÇO
 *
 * `--s-5` (24) entre cabeça › KPIs › grade, sem linha nenhuma — §Hierarquia,
 * regra de separação. A borda inferior que o cabeçalho 1.x tinha era a segunda
 * ferramenta na mesma fronteira.
 */
export function DashboardTela() {
  const { data: sessao } = useSessao()
  const { ativa } = useEmpresasDaSessao()

  // Nome só quando o servidor sabe (o campo é `Proposto` e nullable). Sem ele a
  // saudação fica sozinha — inventar "Usuário" ou mostrar o id seria pior.
  const nome = sessao?.displayName?.trim()

  return (
    <div className="flex flex-col" style={{ gap: 'var(--s-5)' }}>
      <header
        data-slot="dashboard-header"
        className="flex flex-wrap items-end"
        style={{ gap: 'var(--s-4)' }}
      >
        <div className="min-w-0">
          <h1 className="t-display">
            {saudacao()}
            {nome ? `, ${nome}` : ''}
          </h1>
          {/* Data e empresa na MESMA linha de meta, separadas por `·`: são as
              duas coordenadas do "aqui e agora" da tela, e em duas linhas
              próprias virariam dois subtítulos disputando o degrau. */}
          <p className="t-meta first-letter:uppercase" style={{ marginTop: 'var(--s-1)' }}>
            {dataPorExtenso()}
            {ativa ? ` · ${ativa.name}` : ''}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center" style={{ gap: 'var(--s-2)' }}>
          <Link to="/boletim" className={buttonVariants({ variant: 'ghost' })}>
            Boletim do dia
          </Link>
          <Link to="/tarefas" className={buttonVariants({ variant: 'default' })}>
            + Nova tarefa
          </Link>
        </div>
      </header>

      <Indicadores />

      <LinhaDeHoje />
    </div>
  )
}
