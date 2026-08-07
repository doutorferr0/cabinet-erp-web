import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuGroup,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

function Exemplo() {
  return (
    <NavigationMenu aria-label="Módulos">
      <NavigationMenuLink href="/" isCurrent>
        Boletim
      </NavigationMenuLink>
      <NavigationMenuGroup>
        <NavigationMenuTrigger>Cadastros</NavigationMenuTrigger>
        <NavigationMenuContent>
          <NavigationMenuItem href="/cadastros/clientes">Clientes</NavigationMenuItem>
          <NavigationMenuItem href="/cadastros/produtos">Produtos</NavigationMenuItem>
        </NavigationMenuContent>
      </NavigationMenuGroup>
    </NavigationMenu>
  )
}

describe('NavigationMenu', () => {
  it('é um marco de navegação com nome — dá para pular direto para ele', () => {
    render(<Exemplo />)
    expect(screen.getByRole('navigation', { name: 'Módulos' })).toBeInTheDocument()
  })

  it('marca a tela atual de um jeito que não depende da cor', () => {
    render(<Exemplo />)
    expect(screen.getByRole('link', { name: 'Boletim' })).toHaveAttribute('aria-current', 'page')
  })

  it('o destino da lista continua sendo LINK, não comando', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)

    await user.click(screen.getByRole('button', { name: 'Cadastros' }))

    // `menuitem` com href sai como âncora: botão direito, abrir em nova aba e
    // leitor de tela continuam funcionando.
    const clientes = await screen.findByRole('menuitem', { name: 'Clientes' })
    expect(clientes.tagName).toBe('A')
    expect(clientes).toHaveAttribute('href', '/cadastros/clientes')
  })
})
