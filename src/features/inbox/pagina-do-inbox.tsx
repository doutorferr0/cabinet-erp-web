import { PageHeader } from '@/components/cabinet/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getRouteApi } from '@tanstack/react-router'
import { CheckCheck } from 'lucide-react'
import { alternarLido, marcarTudoComoLido, useItensDoInbox } from './estado-do-inbox'
import { LinhaDoInbox } from './item-do-inbox'
import { VIEWS, type ViewDoInbox, itensDaView, viewPorId } from './views'

const rota = getRouteApi('/inbox')

/**
 * CAIXA DE ENTRADA — o que era a gaveta de notificações, agora como TELA.
 *
 * ## Por que deixou de ser gaveta (issue D7)
 *
 * A gaveta tratava notificação como aviso: um sino, uma coluna que empurra, um
 * cartão por aviso com título e parágrafo. Isso responde "aconteceu algo?" e
 * para aí — não dá para filtrar, não dá para linkar, não sobrevive a um F5, e o
 * que ela mostra some assim que o operador fecha a coluna para voltar a
 * trabalhar. Caixa de entrada trata a mesma coisa como LISTA DE TRABALHO: cada
 * item é uma linha com quem, o quê, qual registro e quando, tem endereço
 * próprio (`/inbox?view=…`), e a ação de resolver está na própria linha.
 *
 * O `Sheet` continua no repo, reestilizado — D24 monta a movimentação nele. O
 * que morreu foi a gaveta, que nem Sheet era (era uma coluna irmã do `<main>`).
 *
 * ## A hierarquia desta tela (§Hierarquia)
 *
 * Três regiões, separadas por ESPAÇO e nada mais — fronteira entre regiões da
 * página é `--s-5` (24px, o `gap-6`), sem linha: cabeçalho › barra de views ›
 * lista. A lista é o único CARD da tela e leva a única sombra dura de tinta
 * (`shadow-el3`, que D1 aponta para `--hard-2`, o degrau de painel de página).
 * Dentro dela só hairline entre linhas — sem borda vertical, sem card em card.
 *
 * O título fica no `PageHeader` compartilhado em vez de um `h1` local: tela
 * COMPÕE, não reimplementa. Ele ainda desenha o título com os utilitários 1.x —
 * levá-lo a `--t-pagina` é a issue D5, e é o mesmo componente para as vinte
 * telas, então corrigir aqui seria consertar um caso e deixar dezenove.
 */
export function PaginaDoInbox() {
  const { view } = rota.useSearch()
  const navegar = rota.useNavigate()
  const itens = useItensDoInbox()

  const daView = itensDaView(itens, view)
  const naoLidas = itens.filter((item) => !item.lido).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Caixa de entrada"
        // Contagem é DADO, e vai no lugar que o cabeçalho reserva para o
        // contexto do título. Zero não vira "0 não lidas" — some, porque a
        // ausência já é a informação.
        {...(naoLidas > 0 && { contexto: `${naoLidas} não lidas` })}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={view}
          onValueChange={(escolhida) =>
            navegar({ search: { view: escolhida as ViewDoInbox }, replace: true })
          }
        >
          <TabsList>
            {VIEWS.map((v) => {
              const quantos = itensDaView(itens, v.id).length
              return (
                <TabsTrigger key={v.id} value={v.id} className="group/aba">
                  {v.rotulo}
                  {/* A contagem por view fica na aba, e não num rótulo à parte:
                      é a resposta da pergunta que a aba faz. `.t-dado-meta`
                      porque é número que se compara entre as três.

                      A cor precisa VIRAR na aba selecionada, que é tinta cheia
                      — e virar com `!`, porque `.t-dado-meta` é CSS sem camada
                      e vence a `@layer utilities` do Tailwind. Sem isso o
                      número fica n-500 sobre a tinta e some (medido na
                      captura). */}
                  <span className="t-dado-meta ml-1.5 group-data-[selected]/aba:text-primary-foreground!">
                    {quantos}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          onClick={marcarTudoComoLido}
          disabled={naoLidas === 0}
          // Desabilitado com a caixa limpa, e não escondido: botão que some
          // muda o desenho da barra a cada leitura e faz o operador procurar
          // onde ele estava.
          title={naoLidas === 0 ? 'Nada por ler' : undefined}
        >
          <CheckCheck aria-hidden="true" />
          Marcar tudo como lido
        </Button>
      </div>

      {/* O CARD da tela: folha opaca, régua de tinta de 2px, uma sombra dura
          só. `overflow-hidden` para as linhas não vazarem o raio nas pontas. */}
      <section
        data-slot="lista-do-inbox"
        aria-label={`Caixa de entrada — ${viewPorId(view).rotulo}`}
        className="overflow-hidden rounded-card border-2 border-border bg-card shadow-el3"
      >
        {daView.length === 0 ? (
          <p className="t-meta px-4 py-10 text-center">{viewPorId(view).vazio}</p>
        ) : (
          <ul className="divide-y divide-rule-hair">
            {daView.map((item) => (
              <LinhaDoInbox key={item.id} item={item} aoAlternarLido={alternarLido} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
