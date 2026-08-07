import { Ornamento } from '@/components/cabinet/ornamento'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Ornamento', () => {
  it('é decoração — não entra na árvore de acessibilidade', () => {
    const { container } = render(<Ornamento shape="produtos" tom="modulo" tamanho={128} />)
    const peca = container.querySelector('[data-slot="ornamento"]')
    expect(peca).toHaveAttribute('aria-hidden', 'true')
    // Nada de texto: quem explica o estado é a frase ao lado.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('recolore por MÁSCARA — o `fill` do SVG nunca é tocado', () => {
    const { container } = render(<Ornamento shape="clientes" tom="modulo" tamanho={24} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    // A forma entra como RECORTE e a cor vem da classe de token. O SVG chega
    // intacto — `fill="white"` preservado, que é a prova de que ninguém editou
    // o arquivo à mão: editar o fill quebraria as máscaras internas do Figma.
    // (Vem como data URI: o Vite inlineia asset pequeno em vez de servir arquivo.)
    expect(peca.style.maskImage).toMatch(/^url\(/)
    // Aspas simples: ao inlinear, o Vite troca `"` por `'` para caber na URL.
    expect(decodeURIComponent(peca.style.maskImage)).toMatch(/fill=['"]white['"]/)
    expect(peca).toHaveClass('bg-modulo-cheia')
  })

  // Guarda de uma falha que ficou VERDE por semanas e apagou o ornamento no
  // app inteiro: o data URI do Vite traz aspas SIMPLES (`xmlns='...'`), e um
  // `url()` sem aspas não pode conter aspas — o browser considera a declaração
  // inválida e a descarta, sobrando o `background-color` a pintar o retângulo.
  // O jsdom aceita a forma inválida, então só asserção sobre a STRING pega.
  it('a URL da máscara vai entre aspas — sem elas o browser descarta', () => {
    const { container } = render(<Ornamento shape="fornecedores" tom="modulo" tamanho={16} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    expect(peca.style.maskImage.startsWith('url("')).toBe(true)
    // E a razão de precisarem existir: há aspas simples cruas dentro da URL.
    expect(peca.style.maskImage).toContain("'")
  })

  it('cada módulo tem o SEU shape, sempre o mesmo', () => {
    const { container: a } = render(<Ornamento shape="produtos" tom="modulo" tamanho={18} />)
    const { container: b } = render(<Ornamento shape="estoque" tom="modulo" tamanho={18} />)
    const shapeA = (a.querySelector('[data-slot="ornamento"]') as HTMLElement).style.maskImage
    const shapeB = (b.querySelector('[data-slot="ornamento"]') as HTMLElement).style.maskImage
    expect(shapeA).not.toBe(shapeB)
  })

  it('estado de sistema não usa a cor do módulo', () => {
    const { container } = render(<Ornamento shape="busca-vazia" tom="info" tamanho={96} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    // Vazio de BUSCA não é módulo vazio: mesma tela, significados diferentes.
    expect(peca).toHaveClass('bg-info')
    expect(peca).not.toHaveClass('bg-modulo-cheia')
  })

  it('no papel de ÍCONE a cor é herdada, não escolhida', () => {
    const { container } = render(<Ornamento shape="fornecedores" tom="icone" tamanho={16} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    // `bg-current` = `background-color: currentColor`: o shape segue o `color`
    // do container. É o que permite hover/ativo/desabilitado mexerem numa cor
    // só — sem isto, cada estado precisaria repintar o ornamento à parte.
    expect(peca).toHaveClass('bg-current')
    // E não pode sobrar token FIXO no caminho de ícone: um `bg-*` de token
    // venceria a herança em silêncio e o defeito só apareceria no hover.
    for (const fixo of ['bg-modulo-cheia', 'bg-modulo', 'bg-info', 'bg-destructive']) {
      expect(peca).not.toHaveClass(fixo)
    }
    // Nem `background-color` inline, que venceria a classe pela especificidade.
    expect(peca.style.backgroundColor).toBe('')
  })

  it('ícone e decoração são o MESMO desenho — muda a cor, não a técnica', () => {
    const { container: dec } = render(<Ornamento shape="vendas" tom="modulo" tamanho={24} />)
    const { container: ico } = render(<Ornamento shape="vendas" tom="icone" tamanho={14} />)
    const decoracao = dec.querySelector('[data-slot="ornamento"]') as HTMLElement
    const icone = ico.querySelector('[data-slot="ornamento"]') as HTMLElement
    // Mesma máscara: o papel de ícone não trocou `mask-image` por `fill`, que é
    // a proposta descartada em §@ornamentos — o ganho seria bicolor, que
    // ninguém pediu, e o custo seria inline/svgr para os 320 shapes.
    expect(icone.style.maskImage).toBe(decoracao.style.maskImage)
    expect(icone.style.maskImage).toMatch(/^url\(/)
  })

  it('a empresa ativa tem cor FIXA — não a do módulo', () => {
    const { container } = render(<Ornamento shape="empresa" tom="empresa" tamanho={16} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    // O rodapé responde "de qual empresa é o que estou vendo", e a resposta não
    // muda de tela para tela. Ler o par do `[data-modulo]` faria a marca da
    // empresa trocar de cor a cada navegação.
    expect(peca).toHaveClass('bg-empresa')
    expect(peca).not.toHaveClass('bg-modulo-cheia')
    expect(peca).not.toHaveClass('bg-modulo')
  })

  it('emblema e marca são desenhos DIFERENTES', () => {
    const { container: a } = render(<Ornamento shape="emblema" tom="marca" tamanho={28} />)
    const { container: b } = render(<Ornamento shape="marca" tom="marca" tamanho={128} />)
    const emblema = (a.querySelector('[data-slot="ornamento"]') as HTMLElement).style.maskImage
    const marca = (b.querySelector('[data-slot="ornamento"]') as HTMLElement).style.maskImage
    // `emblema` é o selo que fica na sidebar as oito horas; `marca` é a
    // composição de boas-vindas do login. Colapsar os dois numa chave só
    // devolveria a estrela de meia tela para um canto de 28px.
    expect(emblema).not.toBe(marca)
  })

  it('o tamanho é o da escala pedida, em px', () => {
    const { container } = render(<Ornamento shape="boletim" tom="modulo" tamanho={24} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    expect(peca.style.width).toBe('24px')
    expect(peca.style.height).toBe('24px')
  })
})
