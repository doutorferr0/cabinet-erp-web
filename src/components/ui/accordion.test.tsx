import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

function Exemplo({ allowsMultipleExpanded = false }: { allowsMultipleExpanded?: boolean }) {
  return (
    <Accordion allowsMultipleExpanded={allowsMultipleExpanded}>
      <AccordionItem id="endereco">
        <AccordionTrigger>Endereço</AccordionTrigger>
        <AccordionPanel>Rua das Palmeiras, 100</AccordionPanel>
      </AccordionItem>
      <AccordionItem id="telefones">
        <AccordionTrigger>Telefones</AccordionTrigger>
        <AccordionPanel>(11) 4000-0000</AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}

describe('Accordion', () => {
  it('abre e fecha a seção pelo cabeçalho', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)

    const gatilho = screen.getByRole('button', { name: 'Endereço' })
    expect(gatilho).toHaveAttribute('aria-expanded', 'false')

    await user.click(gatilho)
    expect(gatilho).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Rua das Palmeiras, 100')).toBeVisible()

    await user.click(gatilho)
    expect(gatilho).toHaveAttribute('aria-expanded', 'false')
  })

  it('o gatilho é cabeçalho de verdade — a lista de seções tem que existir para o leitor de tela', () => {
    render(<Exemplo />)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
  })

  it('por padrão só uma seção fica aberta', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)

    await user.click(screen.getByRole('button', { name: 'Endereço' }))
    await user.click(screen.getByRole('button', { name: 'Telefones' }))

    expect(screen.getByRole('button', { name: 'Endereço' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Telefones' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('com `allowsMultipleExpanded` as duas ficam abertas', async () => {
    const user = userEvent.setup()
    render(<Exemplo allowsMultipleExpanded />)

    await user.click(screen.getByRole('button', { name: 'Endereço' }))
    await user.click(screen.getByRole('button', { name: 'Telefones' }))

    expect(screen.getByRole('button', { name: 'Endereço' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Telefones' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
