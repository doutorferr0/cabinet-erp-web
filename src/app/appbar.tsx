import { ATALHO_DA_PALETA } from '@/app/paleta-de-comandos'
import { Button } from '@/components/ui/button'
import { Bell, Search } from 'lucide-react'

/**
 * TOPBAR — o que é GLOBAL e não é navegação.
 *
 * ## A fileira de seções MORREU (Reface 2.0, D4)
 *
 * Ela existiu em 15/08 (#145), foi descartada em 17/08 pelo Polaris (#195) e
 * restaurada pelo user em 22/08 no desenho v7. Agora sai de vez: a auditoria
 * §6 nomeia "navegação duplicada" — sete ícones sem rótulo no topo e a sidebar
 * embaixo repetindo os mesmos destinos — como o defeito, e o modelo A o resolve
 * com UMA lista. O slot fica vazio, para a D5 desenhar a faixa nova.
 *
 * ## Quatro peças saíram junto, e todas pelo mesmo motivo
 *
 * A MARCA, o SELETOR DE EMPRESA, a ENGRENAGEM de Configurações e o MENU DO
 * OPERADOR desceram para a barra (mockup: Listagem › sidebar — marca no topo,
 * seletor logo abaixo, Configurações e avatar no rodapé). Mantê-los aqui daria
 * dois logotipos, dois seletores da mesma empresa, dois caminhos para `/config`
 * e dois lugares para sair do sistema, na mesma tela. Duplicata de navegação é
 * exatamente o que esta issue veio apagar; repeti-la em outra escala seria
 * trocar o defeito de lugar.
 *
 * ## O que fica, e por quê
 *
 * - **Busca** — abre a paleta. Botão com cara de campo (mesma peça do Supabase
 *   Studio): o que parece campo e responde abrindo diálogo mentiria como
 *   `<input>`. `Ctrl+K` escrito no próprio botão. A barra também publica um
 *   botão de busca, e não é duplicata de NAVEGAÇÃO: é a mesma AÇÃO alcançável
 *   de onde a mão estiver, e as duas abrem o mesmo diálogo.
 * - **Sino** — abre a gaveta que EMPURRA. `aoAbrirGaveta` é do AppShell: a
 *   gaveta é coluna irmã do conteúdo, e o estado mora lá; a topbar só avisa a
 *   intenção. A D7 transforma a gaveta em rota (`/inbox`), e a barra já mostra
 *   o item apagado dizendo para onde ele vai.
 */
export function Appbar({
  naoLidas,
  aoAbrirGaveta,
  aoAbrirPaleta,
}: {
  naoLidas: number
  aoAbrirGaveta: () => void
  aoAbrirPaleta: () => void
}) {
  return (
    <div
      data-slot="appbar"
      className="flex h-12 shrink-0 items-center gap-3 border-rule-strong border-b-2 bg-card/75 px-4 backdrop-blur-md"
    >
      {/* BUSCA CENTRAL — a âncora da topbar no Polaris.
          O `min-w` continua sendo piso e não enfeite: medido no par local com a
          fileira de seções ocupando 320px, a busca caía para **150px** e o
          rótulo saía como "Pes…". A fileira morreu na D4 e a faixa ficou larga,
          mas o piso fica — é ele que impede a próxima peça a entrar aqui de
          espremer o botão outra vez. */}
      <div className="flex min-w-56 flex-1 justify-center">
        <button
          type="button"
          onClick={aoAbrirPaleta}
          aria-label="Abrir a paleta de comandos"
          aria-keyshortcuts="Control+K"
          className="flex h-8 w-full max-w-xl items-center gap-2 rounded-control border-2 border-input bg-background px-2.5 text-left text-muted-foreground text-sm outline-none hover:bg-muted focus-visible:focus-ring"
        >
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Pesquisar…</span>
          {/* O atalho fica ESCRITO no botão: quem prefere teclado aprende sem
              documentação, e quem não prefere continua clicando. */}
          <span className="shrink-0 rounded-data border-2 border-border px-1 font-mono text-[10px] uppercase tracking-[0.06em]">
            {ATALHO_DA_PALETA}
          </span>
        </button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={aoAbrirGaveta}
        aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
        className="relative"
      >
        <Bell />
        {naoLidas > 0 ? (
          <span
            aria-hidden="true"
            className="-top-1 -right-1 absolute grid size-4 place-content-center rounded-full bg-destructive font-mono font-bold text-[0.625rem] text-destructive-foreground tabular-nums"
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        ) : null}
      </Button>
    </div>
  )
}
