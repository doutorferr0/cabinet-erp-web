import { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants } from '@/components/ui/tabs'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

/**
 * A aba da 2.0 é uma LINHA INFERIOR (Polaris), e a mudança tem consequência
 * mensurável: a tira deixa de ser um pill de vidro com borda 2px + fundo
 * translúcido + desfoque + sombra na mesma fronteira — quatro ferramentas de
 * separação onde o §Hierarquia manda usar uma.
 *
 * Estes casos medem o que jsdom consegue medir: o vocabulário de classe (a
 * fronteira é hairline + traço de 2px, e não caixa) e o comportamento de
 * seleção, que é o que o operador de fato usa.
 */
describe('Tabs — a aba é linha inferior, não caixa', () => {
  it('a tira separa por UMA hairline embaixo, sem caixa nem vidro', () => {
    const classes = tabsListVariants({})
    expect(classes).toContain('border-b')
    expect(classes).toContain('border-[color:var(--n-200)]')
    expect(classes).not.toMatch(/\bborder-2\b/)
    expect(classes).not.toContain('backdrop-blur')
    expect(classes).not.toMatch(/\brounded-/)
  })

  it('as duas variantes desenham a MESMA linha — não há duas formas de aba', () => {
    expect(tabsListVariants({ variant: 'line' })).toBe(tabsListVariants({ variant: 'default' }))
  })

  it('a aba ativa marca a si mesma com traço de tinta e sobe de cor', () => {
    renderWithQuery(
      <Tabs defaultValue="geral">
        <TabsList aria-label="Abas do cadastro">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
        </TabsList>
        <TabsContent value="geral">Dados gerais</TabsContent>
        <TabsContent value="fiscal">Dados fiscais</TabsContent>
      </Tabs>,
    )

    const ativa = screen.getByRole('tab', { name: 'Geral' })
    expect(ativa).toHaveAttribute('data-selected', 'true')
    expect(ativa.className).toContain('data-selected:border-b-[color:var(--n-900)]')
    // Repouso em n-500, ativa em n-900: a cor faz a segunda metade do trabalho.
    expect(ativa.className).toContain('text-[color:var(--n-500)]!')
    expect(ativa.className).toContain('data-selected:text-[color:var(--n-900)]!')
    // Aba não é tecla: não levanta e não afunda.
    expect(ativa.className).not.toMatch(/shadow-\[|active:translate-y-/)
  })

  it('clicar troca a aba e o painel', async () => {
    const user = userEvent.setup()
    renderWithQuery(
      <Tabs defaultValue="geral">
        <TabsList aria-label="Abas do cadastro">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
        </TabsList>
        <TabsContent value="geral">Dados gerais</TabsContent>
        <TabsContent value="fiscal">Dados fiscais</TabsContent>
      </Tabs>,
    )

    await user.click(screen.getByRole('tab', { name: 'Fiscal' }))

    expect(screen.getByRole('tab', { name: 'Fiscal' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Dados fiscais')).toBeInTheDocument()
  })

  it('a contagem sai em chip MONO e sem borda, junto do rótulo', () => {
    renderWithQuery(
      <Tabs defaultValue="abertas">
        <TabsList aria-label="Situação">
          <TabsTrigger value="abertas" contagem={12}>
            Abertas
          </TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
        <TabsContent value="abertas">…</TabsContent>
        <TabsContent value="todas">…</TabsContent>
      </Tabs>,
    )

    const aba = screen.getByRole('tab', { name: /Abertas/ })
    const chip = aba.querySelector('[data-slot="tabs-count"]')
    expect(chip).not.toBeNull()
    expect(chip).toHaveTextContent('12')
    // Mono porque é número que se compara entre abas; sem borda porque o chip
    // mora a 6px do traço da aba e duas linhas ali seriam duas fronteiras.
    expect(chip?.className).toContain('t-dado-meta')
    expect(chip?.className).not.toMatch(/\bborder\b|border-\[/)
  })

  it('aba sem contagem não inventa chip vazio', () => {
    renderWithQuery(
      <Tabs defaultValue="todas">
        <TabsList aria-label="Situação">
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
        <TabsContent value="todas">…</TabsContent>
      </Tabs>,
    )

    expect(document.querySelector('[data-slot="tabs-count"]')).toBeNull()
  })
})
