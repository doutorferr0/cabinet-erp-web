import { COR_DE_ZONA, DCard, MarcaDeCard, Painel } from '@/components/cabinet/painel'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O que estes testes travam é a RÉGUA, não a aparência.
 *
 * §Hierarquia (issue-mãe #469) diz duas coisas sobre esta peça, e as duas são
 * verificáveis: (1) a fronteira cabeçalho→corpo tem UMA ferramenta de separação,
 * e ela é hairline — a faixa tingida do 1.x era a segunda na mesma linha; (2) a
 * cor do assunto pinta um quadradinho de 8px, não uma área.
 *
 * Ler `style` em vez de classe aqui é deliberado: o card 2.0 declara borda,
 * sombra e padding por token (`var(--n-300)`, `var(--hard-soft)`, `var(--s-*)`),
 * e é o VALOR do token que a régua manda conferir. Classe Tailwind casaria com
 * `bg-modulo` de volta sem ninguém notar.
 */
describe('DCard', () => {
  it('é card quieto: borda n-300 e --hard-soft, nunca sombra de tinta', () => {
    const { container } = renderWithQuery(<DCard titulo="Andamento">conteúdo</DCard>)
    const card = container.querySelector('[data-slot="dcard"]') as HTMLElement

    expect(card.style.border).toBe('1px solid var(--n-300)')
    expect(card.style.boxShadow).toBe('var(--hard-soft)')
    // A sombra dura de TINTA é dos KPIs, e é uma por tela (auditoria §2.4:
    // "nada com borda preta além dos KPIs").
    expect(card.style.boxShadow).not.toContain('--hard-1')
    expect(card.style.boxShadow).not.toContain('--hard-2')
  })

  it('a fronteira cabeçalho→corpo é UMA hairline, sem fundo próprio', () => {
    const { container } = renderWithQuery(<DCard titulo="Andamento">conteúdo</DCard>)
    const cabecalho = container.querySelector('[data-slot="dcard-cabecalho"]') as HTMLElement

    expect(cabecalho.style.borderBottom).toBe('1px solid var(--hairline)')
    // Hairline + fundo diferente na MESMA fronteira é o defeito que a régua
    // nomeia. O cabeçalho fica na folha.
    expect(cabecalho.style.background).toBe('')
    expect(cabecalho.className).not.toContain('bg-modulo')
    expect(cabecalho.className).not.toContain('bg-zone-')
  })

  it('o título é `.t-bloco` num h3 — nenhum tamanho literal', () => {
    renderWithQuery(<DCard titulo="Agenda de hoje">conteúdo</DCard>)
    const titulo = screen.getByRole('heading', { name: 'Agenda de hoje', level: 3 })

    expect(titulo.className).toContain('t-bloco')
    expect(titulo.className).not.toMatch(/text-\[/)
  })

  it('sem título não desenha cabeçalho — o calendário é assim', () => {
    // Cabeçalho vazio ocuparia 41px dizendo nada, e um quadradinho sem rótulo
    // ao lado é cor que o operador não tem como nomear (WCAG 1.4.1).
    const { container } = renderWithQuery(<DCard>conteúdo</DCard>)

    expect(container.querySelector('[data-slot="dcard-cabecalho"]')).toBeNull()
  })

  it('o segundo cabeçalho do mesmo card separa por CIMA', () => {
    // Duas hairlines encostadas na mesma fronteira é o defeito da régua: a
    // agenda acima já fecha com a linha da última linha dela.
    const { container } = renderWithQuery(
      <DCard titulo="Agenda de hoje">
        <p>compromissos</p>
      </DCard>,
    )
    const primeiro = container.querySelector('[data-slot="dcard-cabecalho"]') as HTMLElement
    expect(primeiro.style.borderTop).toBe('')
    expect(primeiro.style.borderBottom).toBe('1px solid var(--hairline)')
  })

  it('corpo sem padding por padrão, para a hairline atravessar o card', () => {
    const { container } = renderWithQuery(<DCard titulo="Lista">conteúdo</DCard>)
    const corpo = container.querySelector('[data-slot="dcard-corpo"]') as HTMLElement

    expect(corpo.style.padding).toBe('')
  })

  it('o gap anda junto com o padding — espaço E linha na mesma fronteira, não', () => {
    // Corpo de lista (sem padding) tem a hairline de cada linha como fronteira;
    // um `gap` ali abriria 12px antes da linha divisória.
    const { container: lista } = renderWithQuery(<DCard titulo="Lista">linhas</DCard>)
    expect((lista.querySelector('[data-slot="dcard-corpo"]') as HTMLElement).style.gap).toBe('')

    // Corpo de blocos (com padding) separa irmãos por espaço, que é a
    // ferramenta mais barata da régua.
    const { container: blocos } = renderWithQuery(
      <DCard titulo="Blocos" corpoComPadding>
        blocos
      </DCard>,
    )
    expect((blocos.querySelector('[data-slot="dcard-corpo"]') as HTMLElement).style.gap).toBe(
      'var(--s-3)',
    )
  })
})

describe('MarcaDeCard', () => {
  it('aceita valor de cor 2.0 e não anuncia nada ao leitor de tela', () => {
    const { container } = renderWithQuery(<MarcaDeCard cor="var(--warn)" />)
    const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement

    expect(marca.style.background).toBe('var(--warn)')
    expect(marca).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Painel', () => {
  it('o módulo pinta o QUADRADINHO com o matiz 2.0, não a faixa', () => {
    const { container } = renderWithQuery(
      <Painel titulo="Agenda de hoje" modulo="compras">
        conteúdo
      </Painel>,
    )

    const card = container.querySelector('[data-slot="painel"]') as HTMLElement
    // `data-modulo` continua na seção: quem estiver DENTRO do corpo (chip,
    // linha de grade) segue resolvendo o par pelo escopo.
    expect(card).toHaveAttribute('data-modulo', 'compras')
    const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement
    expect(marca.style.background).toBe('var(--mod-compras)')
    // E o ornamento de 20px do 1.x saiu de vez.
    expect(container.querySelector('[data-slot="selo"]')).toBeNull()
    expect(container.querySelector('[data-slot="ornamento"]')).toBeNull()
  })

  it('os três papéis de pessoa caem no matiz `pessoas` da 2.0', () => {
    // A lista de `modulo.ts` é de 2026-08 e separa cliente/fornecedor/
    // profissional; a 2.0 chama os três de `pessoas`. Traduzir aqui é o que
    // mantém um nome por cor publicado.
    for (const modulo of ['clientes', 'fornecedores', 'profissionais'] as const) {
      const { container, unmount } = renderWithQuery(
        <Painel titulo="Ficha" modulo={modulo}>
          conteúdo
        </Painel>,
      )
      const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement
      expect(marca.style.background).toBe('var(--mod-pessoas)')
      unmount()
    }
  })

  it('a tinta de zona vale para região que NÃO é de módulo', () => {
    // Pendência é estado, não assunto.
    const { container } = renderWithQuery(
      <Painel titulo="A fazer" tinta="warn">
        conteúdo
      </Painel>,
    )

    const card = container.querySelector('[data-slot="painel"]')
    expect(card).not.toHaveAttribute('data-modulo')
    const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement
    // `--amber-600`, e não `var(--warn)`: o `index.css` 1.x ainda define
    // `--warn` como tripla HSL, que como `background` é inválida e sai
    // TRANSPARENTE. Ver `COR_DE_ZONA`.
    expect(marca.style.background).toBe(COR_DE_ZONA.warn)
    expect(marca.style.background).not.toBe('')
  })

  it('havendo módulo, a tinta é ignorada — uma marca tem uma fonte de cor só', () => {
    const { container } = renderWithQuery(
      <Painel titulo="Calendário" modulo="estoque" tinta="warn">
        conteúdo
      </Painel>,
    )

    const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement
    expect(marca.style.background).toBe('var(--mod-estoque)')
  })

  it('sem módulo e sem tinta não há quadradinho — marca sem informação não entra', () => {
    const { container } = renderWithQuery(<Painel titulo="Andamento">conteúdo</Painel>)

    expect(container.querySelector('[data-slot="marca-de-card"]')).toBeNull()
  })

  it('`selo={false}` desliga o quadradinho e mantém o cabeçalho', () => {
    const { container } = renderWithQuery(
      <Painel titulo="Andamento" modulo="vendas" selo={false}>
        conteúdo
      </Painel>,
    )

    expect(container.querySelector('[data-slot="marca-de-card"]')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Andamento' })).toBeInTheDocument()
  })
})
