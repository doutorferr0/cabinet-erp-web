import { Ornamento } from '@/components/cabinet/ornamento'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function pecaDe(container: HTMLElement) {
  return container.querySelector('[data-slot="ornamento"]') as SVGSVGElement
}

/** A camada de TRAÇO: desenhada primeiro, atrás. */
function primeiroPath(container: HTMLElement) {
  return container.querySelector('[data-slot="ornamento"] path[fill="none"]') as SVGPathElement
}

/** A camada de COR: desenhada depois, por cima do traço. */
function pathDeCor(container: HTMLElement) {
  return container.querySelector(
    '[data-slot="ornamento"] path[fill="currentColor"]',
  ) as SVGPathElement
}

describe('Ornamento', () => {
  it('é decoração — não entra na árvore de acessibilidade', () => {
    const { container } = render(<Ornamento shape="produtos" tom="modulo" tamanho={128} />)
    expect(pecaDe(container)).toHaveAttribute('aria-hidden', 'true')
    // Nada de texto: quem explica o estado é a frase ao lado.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('desenha INLINE e mantém todos os subcaminhos do arquivo', () => {
    // O empilhamento de camadas do Estoque são 4 elipses. Com máscara elas
    // viravam uma silhueta só; inline, cada uma é um `path` e o traço passa a
    // separá-las — é metade do motivo de a técnica ter mudado.
    const { container } = render(<Ornamento shape="estoque" tom="modulo" tamanho={128} />)
    expect(pecaDe(container).tagName.toLowerCase()).toBe('svg')
    // 4 elipses × 2 camadas (traço atrás, cor por cima) = 8 caminhos.
    expect(container.querySelectorAll('[data-slot="ornamento"] path[fill="none"]')).toHaveLength(4)
    expect(
      container.querySelectorAll('[data-slot="ornamento"] path[fill="currentColor"]'),
    ).toHaveLength(4)
  })

  // Guarda do defeito que só apareceu ao RASTERIZAR, com a suíte verde: traço é
  // centrado na borda, então metade dele invade a forma. Num shape de LINHA (o
  // galpão dos Fornecedores, os anéis do Boletim) a faixa pintada tem ~1,5px na
  // tela e um traço de 3,5px a engole — o desenho fica preto e a cor some.
  // Desenhar o traço ATRÁS e a cor POR CIMA esconde a metade de dentro.
  it('o traço vai ATRÁS da cor — senão ele engole o shape de linha', () => {
    const { container } = render(<Ornamento shape="boletim" tom="modulo" tamanho={128} />)
    const caminhos = [...container.querySelectorAll('[data-slot="ornamento"] path')]
    const primeiroDeCor = caminhos.findIndex((p) => p.getAttribute('fill') === 'currentColor')
    const ultimoDeTraco = caminhos.map((p) => p.getAttribute('fill')).lastIndexOf('none')
    expect(ultimoDeTraco).toBeLessThan(primeiroDeCor)
  })

  it('todo shape sai contornado, em qualquer tamanho', () => {
    for (const tamanho of [16, 24, 128]) {
      const { container } = render(<Ornamento shape="clientes" tom="modulo" tamanho={tamanho} />)
      const path = primeiroPath(container)
      expect(path).toHaveAttribute('stroke', 'hsl(var(--foreground))')
      expect(Number(path.getAttribute('stroke-width'))).toBeGreaterThan(0)
    }
  })

  // Guarda de um defeito que seria MUDO: com o traço em unidade de `viewBox`,
  // 1,1 num `viewBox` de ~250 renderiza a 0,08px e o contorno simplesmente não
  // aparece — sem erro, sem teste vermelho, sem nada no console.
  it('o traço é px de TELA — sem isso ele some no viewBox de 250 unidades', () => {
    const { container } = render(<Ornamento shape="produtos" tom="modulo" tamanho={16} />)
    expect(primeiroPath(container)).toHaveAttribute('vector-effect', 'non-scaling-stroke')
  })

  it('o traço afina conforme o shape encolhe', () => {
    const { container: g } = render(<Ornamento shape="produtos" tom="modulo" tamanho={128} />)
    const { container: p } = render(<Ornamento shape="produtos" tom="modulo" tamanho={16} />)
    const grosso = Number(primeiroPath(g).getAttribute('stroke-width'))
    const fino = Number(primeiroPath(p).getAttribute('stroke-width'))
    expect(grosso).toBeGreaterThan(fino)
  })

  // O `viewBox` do Figma vem colado na forma; o traço é centrado na borda do
  // caminho, então sem folga metade dele é recortada e o contorno aparece
  // comido de um lado. Também é defeito mudo.
  it('o viewBox ganha folga, senão o contorno é recortado pela borda', () => {
    const { container } = render(<Ornamento shape="produtos" tom="modulo" tamanho={128} />)
    const [, , largura] = (pecaDe(container).getAttribute('viewBox') ?? '').split(' ').map(Number)
    // O arquivo do shape-159 tem 243.7 de largura; com 12% de folga de cada
    // lado, o desenhado tem de ser maior que o original.
    expect(largura).toBeGreaterThan(243.7)
  })

  it('shape CHEIO ganha peso; shape VAZADO não', () => {
    // Produtos (94,7% de cobertura) é massa: o peso dá volume.
    const { container: cheio } = render(<Ornamento shape="produtos" tom="modulo" tamanho={128} />)
    expect(pecaDe(cheio)).toHaveAttribute('data-peso', 'sim')
    expect(pecaDe(cheio).style.filter).toContain('drop-shadow')

    // Fornecedores é o galpão em contorno fino (5,0%) e o Boletim são cinco
    // anéis concêntricos (12,5%): neles o deslocamento FECHA os vãos e o
    // desenho vira mancha. Por isso a regra é medida, não escolhida no olho.
    for (const vazado of ['fornecedores', 'boletim'] as const) {
      const { container } = render(<Ornamento shape={vazado} tom="modulo" tamanho={128} />)
      expect(pecaDe(container)).toHaveAttribute('data-peso', 'nao')
      expect(pecaDe(container).style.filter).toBe('')
    }
  })

  // Preto literal sumiria na bancada escura — é a mesma família do `text-white`
  // que a fase 3 pagou. Traço e peso saem do token que VIRA com o tema.
  it('traço e peso saem de TOKEN, nunca de literal', () => {
    const { container } = render(<Ornamento shape="produtos" tom="modulo" tamanho={128} />)
    expect(pecaDe(container).style.filter).toContain('hsl(var(--foreground))')
    expect(primeiroPath(container).getAttribute('stroke')).not.toMatch(/#|black|rgb/)
  })

  it('cada módulo tem o SEU shape, sempre o mesmo', () => {
    const { container: a } = render(<Ornamento shape="produtos" tom="modulo" tamanho={18} />)
    const { container: b } = render(<Ornamento shape="estoque" tom="modulo" tamanho={18} />)
    expect(primeiroPath(a).getAttribute('d')).not.toBe(primeiroPath(b).getAttribute('d'))
  })

  it('estado de sistema não usa a cor do módulo', () => {
    const { container } = render(<Ornamento shape="busca-vazia" tom="info" tamanho={96} />)
    // Vazio de BUSCA não é módulo vazio: mesma tela, significados diferentes.
    expect(pecaDe(container)).toHaveClass('text-info')
    expect(pecaDe(container)).not.toHaveClass('text-modulo')
  })

  it('no papel de ÍCONE a cor é herdada, não escolhida', () => {
    const { container } = render(<Ornamento shape="fornecedores" tom="icone" tamanho={16} />)
    // O `path` preenche com `currentColor` e o componente NÃO põe classe de
    // cor: o shape segue o `color` do container. É o que permite hover, ativo e
    // desabilitado mexerem numa cor só — sem isto, cada estado precisaria
    // repintar o ornamento à parte.
    expect(pathDeCor(container)).toHaveAttribute('fill', 'currentColor')
    // E não pode sobrar token FIXO no caminho de ícone: uma classe de cor
    // venceria a herança em silêncio e o defeito só apareceria no hover.
    for (const fixo of ['text-modulo', 'text-modulo-suave', 'text-info', 'text-destructive']) {
      expect(pecaDe(container)).not.toHaveClass(fixo)
    }
  })

  it('ícone e decoração são o MESMO desenho — muda a cor, não a técnica', () => {
    const { container: dec } = render(<Ornamento shape="vendas" tom="modulo" tamanho={24} />)
    const { container: ico } = render(<Ornamento shape="vendas" tom="icone" tamanho={14} />)
    expect(primeiroPath(ico).getAttribute('d')).toBe(primeiroPath(dec).getAttribute('d'))
    // O que separa os dois é só de onde vem a cor.
    expect(pecaDe(dec)).toHaveClass('text-modulo')
    expect(pecaDe(ico)).not.toHaveClass('text-modulo')
  })

  // Os furos do Figma (o miolo do losango do crachá, os anéis do Boletim) só
  // existem com `evenodd`; no preenchimento padrão eles fecham e o desenho
  // vira um bloco sólido.
  it('preserva os furos da forma', () => {
    const { container } = render(<Ornamento shape="profissionais" tom="modulo" tamanho={128} />)
    expect(pathDeCor(container)).toHaveAttribute('fill-rule', 'evenodd')
  })
})
