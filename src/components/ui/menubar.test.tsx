import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

function Exemplo({ aoImprimir = () => {} }: { aoImprimir?: () => void }) {
  return (
    <Menubar aria-label="Comandos do documento">
      <MenubarMenu>
        <MenubarTrigger>Arquivo</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onAction={aoImprimir}>Imprimir</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Fechar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Editar</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Alterar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

describe('Menubar', () => {
  it('abre a lista do gatilho e executa o comando', async () => {
    const user = userEvent.setup()
    const aoImprimir = vi.fn()
    render(<Exemplo aoImprimir={aoImprimir} />)

    await user.click(screen.getByRole('button', { name: 'Arquivo' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Imprimir' }))

    expect(aoImprimir).toHaveBeenCalledOnce()
  })

  it('anuncia qual menu está aberto', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)

    const arquivo = screen.getByRole('button', { name: 'Arquivo' })
    expect(arquivo).toHaveAttribute('aria-expanded', 'false')

    await user.click(arquivo)
    expect(arquivo).toHaveAttribute('aria-expanded', 'true')
  })

  it('é UMA parada de tabulação, e as setas andam entre os menus', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Arquivo' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Editar' })).toHaveFocus()
  })

  it('a barra se apresenta com o nome que recebeu', () => {
    render(<Exemplo />)
    expect(screen.getByRole('toolbar', { name: 'Comandos do documento' })).toBeInTheDocument()
  })
})
