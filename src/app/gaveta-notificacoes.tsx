import { Selo } from '@/components/cabinet/selo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Notificacao } from '@/mocks/notificacoes'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

const ROTULO_DO_DIA: Record<Notificacao['dia'], string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
}

function Nota({
  notificacao,
  aoMarcar,
}: {
  notificacao: Notificacao
  aoMarcar: (id: string) => void
}) {
  return (
    <li data-modulo={notificacao.modulo} className="rounded-card border-2 bg-card p-3 shadow-el1">
      <div className="flex items-start gap-2">
        <Selo modulo={notificacao.modulo} tamanho="sm" />
        <span className="min-w-0 flex-1 font-display font-bold leading-tight">
          {notificacao.titulo}
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
          {notificacao.hora}
        </span>
        {/* Bolinha, nunca corte lateral — reprovado 2× no mockup (§@casca-global). */}
        {!notificacao.lida ? (
          <span
            aria-hidden="true"
            className="mt-1.5 size-2 shrink-0 rounded-full border-2 border-border bg-destructive"
          />
        ) : null}
      </div>
      <p className="mt-1.5 text-muted-foreground text-sm leading-snug">{notificacao.descricao}</p>
      <div className="mt-2.5 border-t border-dashed pt-2">
        <Button
          variant={notificacao.lida ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          onClick={() => aoMarcar(notificacao.id)}
        >
          {notificacao.lida ? 'Lida' : 'Marcar como lida'}
        </Button>
      </div>
    </li>
  )
}

/**
 * GAVETA DE NOTIFICAÇÕES — coluna irmã do `<main>`, anima `width` 0↔312px.
 *
 * **Empurra, nunca sobrepõe** (decisão do user, §@casca-global — "não quero
 * que sobreponha, e sim empurre"). Fica na árvore como IRMÃ do `<SidebarInset>`
 * dentro do wrapper flex do `SidebarProvider`: o `<main>` é `flex-1` e cede
 * espaço sozinho quando esta coluna ganha largura — nenhum `position: fixed`,
 * nenhum véu, nenhuma trava de scroll do body.
 *
 * `overflow-hidden` no contêiner é o que evita o conteúdo de 312px vazar
 * durante a transição de largura, quando ela ainda está mais estreita.
 */
export function GavetaDeNotificacoes({
  aberta,
  onOpenChange,
  notificacoes,
  aoMarcarLida,
}: {
  aberta: boolean
  onOpenChange: (aberta: boolean) => void
  notificacoes: Notificacao[]
  aoMarcarLida: (id: string) => void
}) {
  const fecharRef = useRef<HTMLButtonElement>(null)

  // Esc fecha, de qualquer lugar dentro da gaveta — o mesmo alcance que um
  // Dialog daria, sem usar Dialog (que é `fixed` + véu, exatamente o que a
  // gaveta não pode ser).
  useEffect(() => {
    if (!aberta) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberta, onOpenChange])

  // Foco entra no X ao abrir — sem `Dialog` não há focus-trap automático, mas
  // pelo menos o teclado chega direto ao botão que fecha, em vez de continuar
  // solto na appbar que disparou a abertura.
  useEffect(() => {
    if (aberta) fecharRef.current?.focus()
  }, [aberta])

  const porDia = { hoje: [] as Notificacao[], ontem: [] as Notificacao[] }
  for (const n of notificacoes) porDia[n.dia].push(n)

  return (
    <aside
      data-slot="gaveta-notificacoes"
      data-modulo="boletim"
      data-aberta={aberta}
      // Laranja PASTEL do Boletim: a /02 do módulo, texto no `text-foreground`
      // padrão — o mesmo par que o item ativo da sidebar usa
      // (`data-active:bg-modulo`, `sidebar.tsx`).
      //
      // Era a NEON /01, e o comentário daqui afirmava que o par estava "medido
      // AA nos dois temas". Não estava: tinta sobre a /01 do Boletim mede
      // 7,46:1 no claro e **2,45:1 no escuro** (§tabela:estados-fundo), abaixo
      // do piso de 4,5:1 — e o cabeçalho "Notificações" (18px bold, aquém dos
      // 18,66px de texto grande) e o vazio "Nenhuma notificação." pousam nela.
      // O precedente que o comentário citava era justamente um dos casos
      // reprovados. Na /02 o par vai a 16,88:1 claro e 9,32:1 escuro.
      //
      // Os CARTÕES não entram nessa conta: eles têm `bg-card` próprio, então o
      // texto secundário deles pousa na Folha, não na superfície da gaveta.
      //
      // A régua da esquerda só existe ABERTA: fechada, largura zero não tem o
      // que separar, e a borda de 0px encolhendo junto com o width evita o
      // traço preto solto no instante final da transição.
      className={cn(
        'flex shrink-0 flex-col overflow-hidden bg-modulo transition-[width] duration-200 ease-out',
        aberta ? 'w-[312px] border-l-2 border-border' : 'w-0 border-l-0',
      )}
    >
      {/* O CONTEÚDO só monta ABERTA — não é só estética. Fechada, `width:0` +
          `overflow-hidden` escondem visualmente, mas o botão "Fechar" e as
          notas continuariam no DOM e no tab order: o teclado chegaria a um
          painel invisível, e o texto acessível "Fechar" colidiria com o do
          `Dialog` (`dialog.tsx`) em qualquer tela que abra um por cima. */}
      {aberta ? (
        <div className="flex w-[312px] shrink-0 flex-col">
          <div className="flex items-center gap-2 border-border border-b-2 p-4">
            <span className="min-w-0 flex-1 font-display text-lg font-bold">Notificações</span>
            <Button
              ref={fecharRef}
              variant="outline"
              size="icon-sm"
              className="bg-card"
              aria-label="Fechar notificações"
              onClick={() => onOpenChange(false)}
            >
              <X />
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {notificacoes.length === 0 ? (
              <p className="py-8 text-center text-sm">Nenhuma notificação.</p>
            ) : (
              (['hoje', 'ontem'] as const)
                .filter((dia) => porDia[dia].length > 0)
                .map((dia) => (
                  <div key={dia} className="flex flex-col gap-2">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.08em]">
                      {ROTULO_DO_DIA[dia]}
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {porDia[dia].map((notificacao) => (
                        <Nota
                          key={notificacao.id}
                          notificacao={notificacao}
                          aoMarcar={aoMarcarLida}
                        />
                      ))}
                    </ul>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
