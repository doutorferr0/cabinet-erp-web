import { Appbar } from '@/app/appbar'
import { GavetaDeNotificacoes } from '@/app/gaveta-notificacoes'
import { moduloDaRota } from '@/app/modulo'
import { GRUPOS_NAV, GRUPO_CONFIG } from '@/app/nav/grupos'
import { SidebarNav, ativoEm } from '@/app/nav/sidebar-nav'
import { PageFrame } from '@/app/page-frame'
import { PaletaDeComandos } from '@/app/paleta-de-comandos'
import { RequireRecurso } from '@/app/require-recurso'
import { ModeToggle } from '@/components/cabinet/mode-toggle'
import { NOTIFICACOES_MOCK } from '@/mocks/notificacoes'
import { useRouterState } from '@tanstack/react-router'
import { useState } from 'react'

/**
 * A CASCA — barra à esquerda, appbar no topo, folha no meio.
 *
 * ## O que mudou na Reface 2.0 (D4)
 *
 * A navegação era um par: uma fileira de sete ícones na appbar escolhia a
 * SEÇÃO, e a `<Sidebar>` do shadcn desenhava só a seção escolhida. Isso morreu
 * inteiro — não ficou escondido atrás de flag —, e com ele foram embora três
 * coisas que só existiam para sustentá-lo:
 *
 * - o estado `espiada`, que guardava a última seção clicada JUNTO com o caminho
 *   em que o clique aconteceu, para poder caducar quando a rota mudasse. Ele
 *   existia porque dois lugares diziam qual seção estava no ar e era preciso
 *   desempatá-los. Com uma lista só, não há empate.
 * - o campo "Filtrar telas" da barra, que servia para achar o que a seção
 *   ESCONDIA. A lista inteira está presente agora; procurar tela é trabalho da
 *   paleta `Ctrl+K`, que também acha registro.
 * - o `SidebarProvider`/`SidebarInset`, que davam o layout de uma barra que
 *   abre e fecha por contexto. A barra 2.0 guarda o próprio colapso em
 *   `localStorage`, por operador, e publica a largura por variável — o layout
 *   volta a ser um flex de duas colunas, que é o que ele sempre foi.
 *
 * O rastro "Você está em" continua, e passou a ser a única coisa que a appbar
 * diz sobre navegação. A D5 redesenha a faixa.
 */
/**
 * O RASTRO — grupo e tela, por extenso, para a rota no ar.
 *
 * Ele lê a MESMA lista que a barra desenha, e não uma segunda taxonomia: o
 * modelo antigo tinha `secaoDaRota` de um lado e a barra do outro, e a
 * divergência entre os dois foi o defeito que a `espiada` existia para
 * remendar. Aqui há uma fonte, e o que ela não conhece simplesmente não vira
 * rastro — dizer "Você está em" apontando para o lugar errado é pior que calar.
 */
function rastroDaRota(pathname: string) {
  for (const grupo of [...GRUPOS_NAV, GRUPO_CONFIG]) {
    const tela = grupo.items.find((item) => ativoEm(item.url, pathname))
    if (tela) return { grupo: grupo.title, tela: tela.title }
  }
  return undefined
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const modulo = moduloDaRota(location.pathname)
  const rastro = rastroDaRota(location.pathname)

  // Notificação é CASCA nesta fatia — dado de mock local, sem `src/data/` por
  // trás (não há `/api/notifications` no contrato — §@casca-global). Estado
  // vive no shell porque é ele que também guarda se a gaveta está aberta; as
  // duas coisas nascem e morrem juntas com a navegação da sessão.
  const [notificacoes, setNotificacoes] = useState(NOTIFICACOES_MOCK)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  // A paleta é do SHELL, não da appbar nem da barra: ela está em toda rota e o
  // `Ctrl+K` precisa valer com o foco em qualquer lugar. Montá-la dentro de
  // quem a abre a amarraria a um dos dois botões que a chamam.
  const [paletaAberta, setPaletaAberta] = useState(false)
  const naoLidas = notificacoes.filter((n) => !n.lida).length

  return (
    <div className="flex min-h-svh w-full">
      <SidebarNav aoAbrirPaleta={() => setPaletaAberta(true)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* APPBAR GLOBAL — acima do cabeçalho de página, em TODA rota
            (§@casca-global). Vive no shell: página nenhuma monta a própria. */}
        <Appbar
          naoLidas={naoLidas}
          aoAbrirGaveta={() => setGavetaAberta(true)}
          aoAbrirPaleta={() => setPaletaAberta(true)}
        />

        {/* O RASTRO e os ajustes de VISTA — o que a appbar diz sobre onde se
            está, agora que ela não escolhe mais para onde ir. A D5 redesenha
            esta faixa; o `ModeToggle` fica aqui até lá, e não na barra: tema é
            ajuste de VISTA, e a barra é navegação. */}
        <header
          className="flex h-[52px] shrink-0 items-center gap-2 border-b-2 bg-card px-4"
          data-slot="rastro"
        >
          {rastro ? (
            <nav aria-label="Você está em" className="flex min-w-0 items-center gap-1.5">
              <span className="t-rotulo shrink-0">{rastro.grupo}</span>
              <span aria-hidden="true" className="t-meta">
                /
              </span>
              <span className="t-ui truncate">{rastro.tela}</span>
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        {/* A área de conteúdo é Papel COM a grade de 52px; a folha (PageFrame)
            pousa opaca por cima (Regra da Grade de Fundo).
            `data-modulo` é declarado UMA vez, aqui: tudo que a tela montar
            dentro dele lê o par de cor do módulo pelas utilities `bg-modulo*`
            sem precisar saber em que módulo está. Rota sem cor atribuída não
            escreve o atributo — o par padrão do `:root` é o que vale. */}
        <main
          {...(modulo && { 'data-modulo': modulo })}
          className="bg-paper-grid flex flex-1 flex-col p-5"
        >
          {/* `key` por CAMINHO: trocar de tela remonta a folha e a entrada
              anima; paginar e ordenar mexem em search params, não no caminho,
              e por isso não remontam nem animam. */}
          <PageFrame key={location.pathname}>
            {/* A guarda mora DENTRO da folha: quem chega por URL a uma tela que
                a empresa não opera continua vendo o sistema inteiro em volta —
                barra, empresa ativa, saída — em vez de uma tela nua. */}
            <RequireRecurso>{children}</RequireRecurso>
          </PageFrame>
        </main>
      </div>

      {/* Coluna IRMÃ do conteúdo, dentro do mesmo flex — é isso que faz a
          gaveta EMPURRAR ao abrir, em vez de flutuar por cima dele (decisão do
          user, §@casca-global: "não quero que sobreponha, e sim empurre"). */}
      <PaletaDeComandos aberta={paletaAberta} onOpenChange={setPaletaAberta} />
      <GavetaDeNotificacoes
        aberta={gavetaAberta}
        onOpenChange={setGavetaAberta}
        notificacoes={notificacoes}
        aoMarcarLida={(id) =>
          setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, lida: !n.lida } : n)))
        }
      />
    </div>
  )
}
