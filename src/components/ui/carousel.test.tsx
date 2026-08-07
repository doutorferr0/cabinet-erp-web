import {
  Carousel,
  CarouselNext,
  CarouselPrevious,
  CarouselSlide,
  CarouselTrack,
} from '@/components/ui/carousel'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function Exemplo() {
  return (
    <Carousel label="Fotos do produto">
      <CarouselTrack>
        <CarouselSlide>Foto 1</CarouselSlide>
        <CarouselSlide>Foto 2</CarouselSlide>
        <CarouselSlide>Foto 3</CarouselSlide>
      </CarouselTrack>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

describe('Carousel', () => {
  beforeEach(() => {
    // jsdom não faz layout nem rolagem: sem isto, `scrollWidth` é 0 e a peça
    // acharia que já está nas duas pontas ao mesmo tempo.
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
    HTMLElement.prototype.scrollBy = vi.fn()
  })

  it('se anuncia como carrossel COM nome — "carrossel" sozinho não diz de quê', () => {
    render(<Exemplo />)
    const regiao = screen.getByRole('region', { name: 'Fotos do produto' })
    expect(regiao).toHaveAttribute('aria-roledescription', 'carrossel')
  })

  it('todo item continua no documento — o que sai da vista ainda é achável', () => {
    render(<Exemplo />)
    // É a diferença entre rolar e trocar slide por estado: aqui o `Ctrl+F` do
    // browser e o leitor de tela alcançam a Foto 3 sem clicar em nada.
    expect(screen.getByText('Foto 3')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('o trilho recebe foco — região que rola tem que ser alcançável por teclado', () => {
    render(<Exemplo />)
    expect(screen.getByRole('list')).toHaveAttribute('tabindex', '0')
  })

  it('avançar rola para a frente; voltar começa desabilitado na primeira ponta', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)

    expect(screen.getByRole('button', { name: 'Item anterior' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Próximo item' }))
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: expect.any(Number), behavior: 'smooth' }),
    )
    const chamada = vi.mocked(HTMLElement.prototype.scrollBy).mock.calls[0]?.[0] as ScrollToOptions
    expect(chamada.left).toBeGreaterThan(0)
  })
})
