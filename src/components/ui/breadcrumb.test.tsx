import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function Exemplo() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Início</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/cadastros/produtos">Produtos</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbPage>Luminária LED 18W</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

describe('Breadcrumb', () => {
  it('é um marco de navegação com nome em PT-BR', () => {
    render(<Exemplo />)
    expect(screen.getByRole('navigation', { name: 'Trilha de navegação' })).toBeInTheDocument()
  })

  it('os níveis acima continuam sendo LINK — é o caminho de volta', () => {
    render(<Exemplo />)
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Produtos' })).toHaveAttribute(
      'href',
      '/cadastros/produtos',
    )
  })

  it('a página atual se anuncia como atual e NÃO se disfarça de link', () => {
    render(<Exemplo />)
    const atual = screen.getByText('Luminária LED 18W')
    expect(atual).toHaveAttribute('aria-current', 'page')
    expect(atual).not.toHaveAttribute('href')
    // O staging trazia `role="link"` aqui. Papel de link exige ser focável, e
    // este nó não navega nem recebe foco — seria mentira para o leitor.
    expect(atual).not.toHaveAttribute('role')
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('o separador é decoração — não entra na leitura', () => {
    const { container } = render(<Exemplo />)
    const separadores = container.querySelectorAll('[data-slot="breadcrumb-separator"]')
    // Um por item que NÃO é o último: três níveis, dois separadores.
    expect(separadores).toHaveLength(2)
    for (const s of separadores) {
      expect(s).toHaveAttribute('aria-hidden', 'true')
    }
  })
})
