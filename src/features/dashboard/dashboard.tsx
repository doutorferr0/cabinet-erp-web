import { PageHeader } from '@/components/cabinet/page-header'
import { useSessao } from '@/data/sessao'
import { dataPorExtenso, saudacao } from '@/lib/datas'
import { LinhaDeHoje } from './hoje'
import { Indicadores } from './indicadores'

/**
 * A data por extenso chega minúscula do `Intl` ("terça-feira, 2 de setembro").
 * Era o CSS que a capitalizava (`first-letter:uppercase`) — o subtítulo do
 * cabeçalho é um degrau da régua e não carrega classe da tela, então quem
 * capitaliza passa a ser o texto.
 */
function comInicialMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * DASHBOARD — a tela de entrada depois do login.
 *
 * **Não é o Boletim, e não o substitui.** O Boletim (`/`) é a folha do
 * MOVIMENTO: o que a operação fez na data de referência, em ledger, para
 * conferir e fechar. O Dashboard é o que está EM CURSO — o que vence, o que
 * chega, o que alguém precisa tocar hoje. Um olha para trás e fecha, o outro
 * olha para a frente e distribui. Fundi-los daria uma tela que não faz nem uma
 * coisa nem outra.
 *
 * **Só o panorama do dia: KPIs, calendário, agenda e pendentes.** O quadro
 * (kanban), a lista e o progresso das tarefas SAÍRAM daqui pra `/tarefas`
 * (§@casca-global) — o user reclamou "muita coisa/poluído" e a resposta foi
 * uma tela por assunto: esta olha o que está por vir, `/tarefas` é onde se
 * TRABALHA a fila. `Nova tarefa` foi junto, porque o botão pertence à tela que
 * mostra a fila que ele alimenta.
 *
 * ## O que o mockup pedia e não entrou, com o motivo
 *
 * - **Topbar própria** (busca global, sino, engrenagem, chip de usuário): agora
 *   existe — mas vive no SHELL (`AppShell`), não aqui. É cromo de toda rota, e
 *   duplicá-lo por página o desalinharia da regra "appbar = layout".
 * - **`Exportar`**: exportação/impressão é decidido-adiado (PRODUCT.md). Botão
 *   que não gera arquivo ensina o operador a não confiar na barra de ações.
 * - **`Filtrar` e `Personalizar`**: seriam botões mortos.
 * - **Aba `Linha do tempo`**: a linha do tempo do projeto é o **Planner**, que é
 *   tela própria com rota própria. Uma terceira aba inerte prometeria aqui o que
 *   está uma linha acima na sidebar.
 */
export function DashboardTela() {
  const { data: sessao } = useSessao()

  // Nome só quando o servidor sabe (o campo é `Proposto` e nullable). Sem ele a
  // saudação fica sozinha — inventar "Usuário" ou mostrar o id seria pior.
  const nome = sessao?.displayName?.trim()

  return (
    <div className="flex flex-col gap-8">
      {/* A saudação é o único `--t-display` do sistema junto do claim do login
          (§Hierarquia). A régua embaixo saiu: a fronteira entre o cabeçalho e
          os indicadores é ESPAÇO, e ela era a segunda ferramenta na mesma
          fronteira que o `gap-8` já resolvia.
          A data por extenso é o que ancora tudo que a tela chama de "hoje". */}
      <div data-slot="dashboard-header">
        <PageHeader
          variante="display"
          titulo={`${saudacao()}${nome ? `, ${nome}` : ''}`}
          subtitulo={comInicialMaiuscula(dataPorExtenso())}
        />
      </div>

      <Indicadores />

      <LinhaDeHoje />
    </div>
  )
}
