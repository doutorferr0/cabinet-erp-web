import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A FOLHA DO DIÁLOGO NO 2.0 — o que este teste segura são as três decisões que
 * §Hierarquia toma sobre uma superfície que flutua.
 *
 * 1. **Ela é tela própria**, e por isso pode gastar um Gambarino (`t-secao`)
 *    sem contar contra o da página que está atrás da cortina.
 * 2. **A sombra dura é dela** enquanto está aberta — `--hard-3`, pelo alias
 *    `shadow-el5`. A regra é uma sombra dura por tela; o que está sob a cortina
 *    não disputa.
 * 3. **O rodapé termina à direita**, e o par de ações tem UMA tecla. Com as
 *    duas em caixa, o olho precisava ler as duas etiquetas para achar a que
 *    confirma.
 */
function montar() {
  return render(
    <Dialog defaultOpen>
      <DialogHeader>
        <DialogTitle>Trocar a empresa</DialogTitle>
        <DialogDescription>Os documentos abertos serão fechados.</DialogDescription>
      </DialogHeader>
      <DialogFooter showCloseButton />
    </Dialog>,
  )
}

describe('Dialog', () => {
  it('a folha é papel sobre a cortina: traço fino e a sombra alta', async () => {
    montar()
    const folha = (await screen.findByRole('dialog')).closest('[data-slot="dialog-content"]')

    expect(folha).not.toBeNull()
    // 1.5px, e não os 2px do card de página: com o mesmo traço as duas
    // superfícies liam como o mesmo plano, e o que separa o diálogo é ele estar
    // por cima.
    expect(folha?.className).toContain('border-[1.5px]')
    expect(folha?.className).not.toContain('border-2')
    expect(folha?.className).toContain('shadow-el5')
  })

  it('o título é `t-secao`, o degrau de título de diálogo', async () => {
    montar()
    const titulo = screen.getByRole('heading', { name: 'Trocar a empresa' })

    // A família vem da CLASSE e não de herança — já sumiu calada uma vez, no
    // dia em que a regra do `index.css` passou a valer só para `h1`.
    expect(titulo.className).toContain('t-secao')
  })

  it('o rodapé termina à direita, e o `Fechar` não é tecla', async () => {
    montar()
    await screen.findByRole('dialog')
    const rodape = document.querySelector<HTMLElement>('[data-slot="dialog-footer"]')
    expect(rodape).not.toBeNull()
    if (!rodape) return

    expect(rodape.className).toContain('sm:justify-end')

    // São DOIS `Fechar` na tela — o "x" do canto, que é `sr-only`, e o do
    // rodapé. `within` é o que separa: o "x" nasceu `icon-sm` e nunca esteve em
    // disputa de peso com a tecla; a decisão da D29 é sobre o do rodapé.
    //
    // Ghost: ali há duas ações e só uma faz alguma coisa acontecer. Em caixa,
    // o `Fechar` pesava igual à que confirma, e o olho tinha de ler as duas
    // etiquetas para achar qual era qual.
    const fechar = within(rodape).getByRole('button', { name: 'Fechar' })
    expect(fechar.className).not.toContain('bg-card')
    expect(fechar.className).not.toContain('bg-primary')
  })
})
