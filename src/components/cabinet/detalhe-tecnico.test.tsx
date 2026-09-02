import { DetalheTecnico } from '@/components/cabinet/detalhe-tecnico'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

/**
 * O DETALHE TÉCNICO tem DOIS leitores, e o teste é sobre isso.
 *
 * Quem opera precisa da orientação da tela; quem vai abrir chamado precisa da
 * frase exata do servidor. Antes da D29 as duas saíam lado a lado, em Inter, e
 * a segunda se lia como continuação da primeira. O colapsável só resolve isso
 * se nascer FECHADO — um `<details open>` seria a mesma tela de antes com uma
 * seta.
 */
describe('DetalheTecnico', () => {
  it('nasce fechado e abre no gatilho', async () => {
    const user = userEvent.setup()
    render(<DetalheTecnico detalhe="sortBy inválido: não está na whitelist." />)

    // Fechado: o painel do `Disclosure` fica no DOM (é o que dá a animação e o
    // `aria-controls`), então quem responde pela leitura é a VISIBILIDADE, não
    // a presença. Asserir com `queryByText` daria verde com o detalhe à mostra.
    const detalhe = screen.getByText('sortBy inválido: não está na whitelist.')
    expect(detalhe).not.toBeVisible()

    await user.click(screen.getByRole('button', { name: /detalhe técnico/i }))
    expect(detalhe).toBeVisible()
  })

  it('em mono, e selecionável de uma vez', async () => {
    const user = userEvent.setup()
    render(<DetalheTecnico detalhe="constraint uq_partner_code violada." />)
    await user.click(screen.getByRole('button', { name: /detalhe técnico/i }))

    // §Hierarquia: mono é o que se copia, compara ou soma — e este texto existe
    // para ser colado num chamado. `select-all` é o que faz um clique pegar a
    // frase inteira, em vez de a metade que o arrasto alcançou.
    const detalhe = screen.getByText('constraint uq_partner_code violada.')
    expect(detalhe.className).toContain('t-dado-meta')
    expect(detalhe.className).toContain('select-all')
  })

  it('sem detalhe, não desenha gatilho nenhum', () => {
    const { container } = render(<DetalheTecnico detalhe={undefined} />)

    // Erro de rede e exceção de código não têm `detail`. Um gatilho que abre
    // para revelar o vazio é pior que a ausência: promete informação que não
    // existe, e quem clicou vai procurar o que ler.
    expect(container).toBeEmptyDOMElement()
  })
})
