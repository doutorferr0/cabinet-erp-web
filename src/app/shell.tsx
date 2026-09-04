import { Appbar } from '@/app/appbar'
import { moduloDaRota } from '@/app/modulo'
import { SidebarNav } from '@/app/nav/sidebar-nav'
import { PageFrame } from '@/app/page-frame'
import { PaletaDeComandos } from '@/app/paleta-de-comandos'
import { RequireRecurso } from '@/app/require-recurso'
import { RegiaoDeAvisos } from '@/components/cabinet/regiao-de-avisos'
import { useNaoLidasDoInbox } from '@/features/inbox/estado-do-inbox'
import { useNavigate, useRouterState } from '@tanstack/react-router'
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
export function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const modulo = moduloDaRota(location.pathname)

  // A CAIXA DE ENTRADA é rota (D7): o contador do sino vem do store de módulo
  // (`features/inbox/estado-do-inbox.ts`) e o sino NAVEGA para `/inbox` — a
  // gaveta que empurrava o conteúdo saiu. Merge D5+D7 pelo Cowork, 2026-09-03.
  const navigate = useNavigate()
  const naoLidas = useNaoLidasDoInbox()
  // A paleta é do SHELL, não da appbar nem da barra: ela está em toda rota e o
  // `Ctrl+K` precisa valer com o foco em qualquer lugar.
  const [paletaAberta, setPaletaAberta] = useState(false)

  return (
    <div className="flex min-h-svh w-full">
      <SidebarNav aoAbrirPaleta={() => setPaletaAberta(true)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* APPBAR GLOBAL — acima do cabeçalho de página, em TODA rota
            (§@casca-global). Vive no shell: página nenhuma monta a própria. */}
        {/* Appbar da D5: migalha + ações globais (ajuda, notificações, config,
            tema). A paleta (⌘K) mora na barra lateral (D4). Merge D4+D5 pelo
            Cowork em 2026-09-03: o rastro provisório que a D4 desenhava aqui
            saiu — a migalha da appbar é a mesma fonte. */}
        <Appbar
          naoLidas={naoLidas}
          aoAbrirNotificacoes={() => void navigate({ to: '/inbox' as never })}
        />
        {/* A faixa de avisos é IRMÃ da appbar e vem logo abaixo dela: empurra o
            conteúdo em vez de cobri-lo, e some sem deixar buraco (`empty:hidden`).
            Fora do `<main>` de propósito — ela não pertence à tela, e sobrevive
            à troca de rota que a `key` do `PageFrame` remonta.

            RECOLOCADA NA D37. A D5 a moveu do `providers.tsx` para cá, e o
            comentário que ela deixou lá explica exatamente esta linha; D4 e D7
            continuavam montando no `providers`, sem saber da mudança. O merge
            das três conflitou no `shell.tsx` e a resolução ficou com o lado que
            não tinha a faixa: a região sumiu do app inteiro, e não sobrou nem
            erro — o `RegiaoDeAvisos` virou componente órfão, gravar parou de
            dizer que gravou (#208) e desativar parou de dizer o que aconteceu.
            Só a guarda `todo-componente-e-montado` e os dois casos de
            `aviso-de-conclusao` acusaram. */}
        <RegiaoDeAvisos />

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

      <PaletaDeComandos aberta={paletaAberta} onOpenChange={setPaletaAberta} />
    </div>
  )
}
