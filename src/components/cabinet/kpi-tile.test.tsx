import {
  DURACAO_DA_CONTAGEM,
  FaixaDeKpi,
  KpiTile,
  MAXIMO_DE_KPIS,
  MISTURA_DO_ROTULO,
  NumeroHeroi,
  PESO_DO_HEROI,
} from '@/components/cabinet/kpi-tile'
import { TotalBox } from '@/components/cabinet/total-box'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A suíte roda com `matchMedia` devolvendo `matches: false` para tudo
 * (`src/test/setup.ts`), então o padrão dos casos é COM movimento — a contagem
 * acontece de verdade e quem lê o número final espera por ele.
 *
 * `pedirMenosMovimento` inverte só a consulta de `prefers-reduced-motion`, e
 * não o `matchMedia` inteiro: trocar o dublê todo faria o `use-mobile` e o
 * `use-theme` responderem `true` de tabela, e o caso mediria outra coisa.
 */
function pedirMenosMovimento() {
  const original = window.matchMedia
  window.matchMedia = ((consulta: string) =>
    original(consulta) && {
      ...original(consulta),
      matches: consulta.includes('prefers-reduced-motion'),
    }) as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

/**
 * FAIXA DE KPI (#479, D11). O que estes casos guardam não é a aparência — é o
 * MOTIVO de ela ser assim, que some junto quando alguém "só acrescenta mais um
 * número".
 */
describe('KpiTile', () => {
  it('o rótulo é o NOME acessível do valor, não texto solto ao lado', () => {
    // Sem isto o leitor de tela anuncia "trinta e oito mil" sem dizer de quê —
    // e a faixa existe justamente para dizer de quê antes do detalhe.
    render(<KpiTile rotulo="Em aberto" valorCentavos={3_841_000} />)
    expect(screen.getByLabelText('Em aberto')).toHaveTextContent('38.410')
  })

  it('separa símbolo, inteiros e centavos — a ordem de grandeza lê primeiro', () => {
    render(<KpiTile rotulo="Em aberto" valorCentavos={3_841_000} />)
    const saida = screen.getByLabelText('Em aberto')
    // Três nós, não uma string: é o que permite os centavos saírem mais leves.
    // Emendado num texto só, `,00` disputaria peso com os inteiros a 20px.
    expect(saida.textContent?.replace(/\s/g, '')).toContain('R$38.410,00')
    expect(saida.querySelectorAll('span').length).toBeGreaterThanOrEqual(3)
  })

  it('negativo escreve em vermelho — a convenção do ledger vale no resumo', () => {
    render(<KpiTile rotulo="Saldo" valorCentavos={-5000} />)
    expect(screen.getByLabelText('Saldo')).toHaveStyle({ color: 'var(--bad)' })
  })

  it('`alerta` pinta o valor mesmo com número positivo', () => {
    // Atrasadas = 2 é positivo e é problema. Sem a prop, o único jeito de
    // marcar o KPI ruim seria a tela pintar por fora — cor decorativa em dado,
    // que a régua proíbe.
    render(<KpiTile rotulo="Atrasadas" valor="2" alerta />)
    expect(screen.getByLabelText('Atrasadas')).toHaveStyle({ color: 'var(--bad)' })
  })

  it('delta ausente ou null NÃO desenha nada', () => {
    // Base zero não tem variação. `+100%` ali seria mentira aritmética que o
    // operador não tem como desconfiar — e empresa no primeiro mês cai
    // exatamente nesse caso, que é o mês em que ela mais olha o número.
    const { container, rerender } = render(
      <KpiTile rotulo="Mês" valorCentavos={100} delta={null} />,
    )
    expect(container.querySelector('[data-slot="kpi-delta"]')).toBeNull()

    rerender(<KpiTile rotulo="Mês" valorCentavos={100} />)
    expect(container.querySelector('[data-slot="kpi-delta"]')).toBeNull()

    rerender(<KpiTile rotulo="Mês" valorCentavos={100} delta={12} />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
    rerender(<KpiTile rotulo="Mês" valorCentavos={100} delta={-3} />)
    expect(screen.getByText('-3%')).toBeInTheDocument()
  })

  it('delta ZERO desenha — parado é informação, ausente não é', () => {
    render(<KpiTile rotulo="Mês" valorCentavos={100} delta={0} />)
    expect(screen.getByText('+0%')).toBeInTheDocument()
  })

  it('sparkline com menos de dois pontos não desenha', () => {
    // Um ponto é uma bolinha, e bolinha no canto do tile parece tendência sem
    // ser nenhuma. Empresa nova tem série curta, e o contrato já declara que
    // menos de doze pontos é resposta legítima.
    const { container, rerender } = render(<KpiTile rotulo="Mês" valor="1" serie={[5]} />)
    expect(container.querySelector('[data-slot="kpi-sparkline"]')).toBeNull()

    rerender(<KpiTile rotulo="Mês" valor="1" serie={[]} />)
    expect(container.querySelector('[data-slot="kpi-sparkline"]')).toBeNull()

    rerender(<KpiTile rotulo="Mês" valor="1" serie={[5, 9]} />)
    expect(container.querySelector('[data-slot="kpi-sparkline"]')).not.toBeNull()
  })

  it('série achatada vira reta no meio, e não some por divisão por zero', () => {
    // Amplitude zero dividindo daria NaN, e a curva sumiria sem erro nenhum —
    // o pior jeito de um gráfico falhar, porque parece "sem dado".
    const { container } = render(<KpiTile rotulo="Mês" valor="1" serie={[7, 7, 7]} />)
    const d = container.querySelector('[data-slot="kpi-sparkline"] path')?.getAttribute('d') ?? ''
    expect(d).not.toContain('NaN')
    expect(d).toBe('M0 9 L30 9 L60 9')
  })

  it('a sparkline é decorativa: o leitor de tela não lê forma sem dado', () => {
    const { container } = render(<KpiTile rotulo="Mês" valor="1" serie={[1, 2, 3]} />)
    expect(container.querySelector('[data-slot="kpi-sparkline"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  it('o tint é por ASSUNTO e sai no dado, não só na folha de estilo', () => {
    // `data-tint` existe para o teste e para a captura com overlay: cor que só
    // vive no `style` não tem como ser conferida por ninguém.
    const { container } = render(<KpiTile rotulo="Compras" valor="9" tint="lilac" />)
    expect(container.querySelector('[data-slot="kpi-tile"]')).toHaveAttribute('data-tint', 'lilac')
  })

  it('sem tint é o padrão — cor que está em todo tile não significa nada', () => {
    const { container } = render(<KpiTile rotulo="Compras" valor="9" />)
    expect(container.querySelector('[data-slot="kpi-tile"]')).toHaveAttribute('data-tint', 'nenhum')
  })

  it('o rótulo consome o degrau da régua, nunca tamanho literal', () => {
    // §Hierarquia: `--t-rotulo` é o único uppercase, e em KPI ele vai a n-700.
    // Tamanho escrito na peça reabre a deriva que a régua fechou.
    const { container } = render(<KpiTile rotulo="Em aberto" valor="9" />)
    const rotulo = container.querySelector('[data-slot="kpi-rotulo"]')
    expect(rotulo?.className).toContain('t-rotulo')
    // Rodada 5: o rótulo carrega o MATIZ do assunto, em vez do n-700 fixo.
    // Continua sendo cor, não tamanho — o degrau segue vindo da classe, e é
    // isso que o caso guarda.
    expect(rotulo).toHaveStyle({
      color: `color-mix(in oklab, var(--kc) ${MISTURA_DO_ROTULO}%, var(--n-900))`,
    })
    expect(rotulo?.getAttribute('style') ?? '').not.toMatch(/font-size/)
  })

  it('o matiz do assunto entra UMA vez, e as três peças o leem dali', () => {
    // Sombra ambiente, faixa de 3px e rótulo pintam do mesmo `--kc`. Três
    // valores próprios daria um tile com uma cor na sombra e outra na faixa.
    const { container } = render(<KpiTile rotulo="Compras" valor={9} tint="lilac" />)
    const tile = container.querySelector('[data-slot="kpi-tile"]') as HTMLElement
    expect(tile.style.getPropertyValue('--kc')).toBe('var(--indigo-400)')
  })

  it('sem assunto o matiz é NEUTRO — relevo cinza, não relevo colorido', () => {
    const { container } = render(<KpiTile rotulo="Itens" valor={9} />)
    const tile = container.querySelector('[data-slot="kpi-tile"]') as HTMLElement
    expect(tile.style.getPropertyValue('--kc')).toBe('var(--n-400)')
  })

  it('a faixa inferior de 3px é do tile, não de quem o monta', () => {
    // `::after` no matiz (mockup, `.kpi::after`). Como pseudo-elemento não cabe
    // em `style` inline, ele vive na classe — e o par `relative`/`overflow` é o
    // que o mantém dentro do raio do card.
    const { container } = render(<KpiTile rotulo="Itens" valor={9} />)
    const tile = container.querySelector('[data-slot="kpi-tile"]') as HTMLElement
    expect(tile.className).toContain('after:h-[3px]')
    expect(tile.className).toContain('after:bg-[var(--kc)]')
    expect(tile.className).toContain('relative')
    expect(tile.className).toContain('overflow-hidden')
  })

  it('as três escalas são 30 / 36 / 44, e nenhuma escreve o número na peça', () => {
    // §Hierarquia proíbe `font-size` literal em componente: as três saem por
    // token com fallback, que é o que a regra 4 do regime paralelo autoriza
    // enquanto D1 não promove o degrau.
    const medidas: Record<string, string> = {
      padrao: 'var(--t-kpi-valor, 30px)',
      destaque: 'var(--t-kpi-valor-big, 36px)',
      heroi: 'var(--t-kpi-valor-heroi, 44px)',
    }
    for (const [escala, medida] of Object.entries(medidas)) {
      const { container, unmount } = render(
        <KpiTile rotulo="Mês" valor={9} escala={escala as 'padrao'} />,
      )
      const saida = container.querySelector('[data-slot="kpi-valor"]') as HTMLElement
      expect(saida.style.fontSize).toBe(medida)
      // Tracking fechado nos três (§6): a 40px o padrão da mono abre os grupos
      // de milhar até parecerem números separados.
      expect(saida.style.letterSpacing).toBe('-.03em')
      expect(saida.style.fontVariantNumeric).toBe('tabular-nums')
      unmount()
    }
  })

  it('a curva cresce com o número: 60×18 no padrão, 120×32 no herói', () => {
    const { container, rerender } = render(
      <KpiTile rotulo="Mês" valor={9} serie={[1, 2, 3]} escala="padrao" />,
    )
    const medida = () => {
      const svg = container.querySelector('[data-slot="kpi-sparkline"]') as SVGElement
      return `${svg.getAttribute('width')}x${svg.getAttribute('height')}`
    }
    expect(medida()).toBe('60x18')
    rerender(<KpiTile rotulo="Mês" valor={9} serie={[1, 2, 3]} escala="destaque" />)
    expect(medida()).toBe('60x18')
    rerender(<KpiTile rotulo="Mês" valor={9} serie={[1, 2, 3]} escala="heroi" />)
    expect(medida()).toBe('120x32')
  })

  it('o traço se desenha com `cab-draw`, e a classe é o que o liga ao sistema', () => {
    // A guarda de `prefers-reduced-motion` de `tokens-2.0.css` desliga animação
    // por CLASSE (`.cab-motion`). Svg sem ela animaria para quem pediu que nada
    // animasse — e ninguém veria o defeito, porque ele só existe com a
    // preferência ligada.
    const { container } = render(<KpiTile rotulo="Mês" valor={9} serie={[1, 5, 3]} />)
    const svg = container.querySelector('[data-slot="kpi-sparkline"]') as SVGElement
    expect(svg.getAttribute('class')).toContain('cab-motion')
    const traco = svg.querySelector('path') as SVGPathElement
    expect(traco.style.animation).toContain('cab-draw')
    // O `stroke-dasharray` é o PAR do keyframe (ele anda de offset 120 a zero),
    // não um número solto: sem ele o traço nasce inteiro e nada se desenha.
    expect(traco.style.strokeDasharray).toBe('120')
  })
})

/**
 * CONTAGEM CRESCENTE (`pesquisa` §6, D34) — 600 ms na entrada, tabular, só a
 * parte inteira. Os casos guardam as três coisas que podem sair erradas sem
 * ninguém notar: o valor final, a máscara, e o respeito à preferência do
 * sistema.
 */
describe('KpiTile — contagem crescente', () => {
  const desfazer: Array<() => void> = []
  afterEach(() => {
    while (desfazer.length > 0) desfazer.pop()?.()
  })

  it('termina no valor EXATO, com a máscara do formatador do repo', async () => {
    // O último quadro devolve a palavra a `formatMoneyBRL` em vez de reformatar
    // o número: se o agrupador daqui divergisse da máscara do repo, a
    // divergência ficaria justamente no quadro que permanece na tela.
    render(
      <FaixaDeKpi>
        <KpiTile rotulo="Vendido" valorCentavos={18_240_000} />
      </FaixaDeKpi>,
    )
    await waitFor(() =>
      expect(screen.getByLabelText('Vendido').textContent?.replace(/\s/g, '')).toBe('R$182.400,00'),
    )
  })

  // count-up desligado (user, 2026-09-04) — o hook existe, o KPI não o chama.

  it.skip('começa longe do alvo — senão não há contagem nenhuma', () => {
    // Sem esta asserção o caso acima passaria com a contagem removida.
    render(
      <FaixaDeKpi>
        <KpiTile rotulo="Vendido" valorCentavos={18_240_000} />
      </FaixaDeKpi>,
    )
    expect(screen.getByLabelText('Vendido').textContent).not.toContain('182.400')
  })

  // count-up desligado (user, 2026-09-04) — o hook existe, o KPI não o chama.

  it.skip('conta a CONTAGEM também, e agrupa milhar em pt-BR', async () => {
    render(
      <FaixaDeKpi>
        <KpiTile rotulo="Variantes" valor={38_410} unidade="SKUs" />
      </FaixaDeKpi>,
    )
    // `38.410`, com ponto — nunca `38,410` nem `38410`.
    await waitFor(() => expect(screen.getByLabelText('Variantes')).toHaveTextContent('38.410'))
    expect(screen.getByLabelText('Variantes')).not.toHaveTextContent('38,410')
  })

  it('anima só a parte INTEIRA — os centavos ficam parados', () => {
    render(
      <FaixaDeKpi>
        <KpiTile rotulo="Vendido" valorCentavos={18_240_099} />
      </FaixaDeKpi>,
    )
    // No primeiro quadro os inteiros ainda estão em zero e o `,99` já está lá:
    // animar dois dígitos de centavo daria movimento sem leitura.
    expect(screen.getByLabelText('Vendido').textContent).toContain(',99')
  })

  // count-up desligado (user, 2026-09-04) — o hook existe, o KPI não o chama.

  it.skip('`prefers-reduced-motion` PULA a contagem — não a encurta', () => {
    // Síncrono de propósito: com a preferência ligada o PRIMEIRO quadro já tem
    // o número final. Encurtar a duração ainda seria movimento, e a preferência
    // do sistema não pede menos movimento — pede nenhum.
    desfazer.push(pedirMenosMovimento())
    render(
      <FaixaDeKpi>
        <KpiTile rotulo="Vendido" valorCentavos={18_240_000} />
      </FaixaDeKpi>,
    )
    expect(screen.getByLabelText('Vendido').textContent?.replace(/\s/g, '')).toBe('R$182.400,00')
  })

  // count-up desligado (user, 2026-09-04) — o hook existe, o KPI não o chama.

  it.skip('o fecho do documento NÃO conta — o total muda a cada tecla na grade', () => {
    // `TotalBox` é este componente fora de uma faixa. Contar 600 ms por
    // alteração faria o total nunca ficar parado enquanto se preenche um
    // orçamento, e é por isso que o gatilho é o contexto da faixa.
    render(<TotalBox valorCentavos={18_240_000} />)
    expect(screen.getByLabelText('Total').textContent?.replace(/\s/g, '')).toBe('R$182.400,00')
  })

  // count-up desligado (user, 2026-09-04) — o hook existe, o KPI não o chama.

  it.skip('o valor que MUDA depois da entrada salta, sem recontar', async () => {
    const { rerender } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Vendido" valorCentavos={1000} />
      </FaixaDeKpi>,
    )
    await waitFor(() => expect(screen.getByLabelText('Vendido')).toHaveTextContent('10,00'))
    rerender(
      <FaixaDeKpi>
        <KpiTile rotulo="Vendido" valorCentavos={900_000} />
      </FaixaDeKpi>,
    )
    // Sem espera: refetch do agregado é "o dado mudou", não "a tela chegou".
    expect(screen.getByLabelText('Vendido')).toHaveTextContent('9.000,00')
  })

  // count-up desligado (user, 2026-09-04) — o hook existe, o KPI não o chama.

  it.skip('600 ms é a duração da pesquisa, e ela é DADO, não número solto no meio', () => {
    expect(DURACAO_DA_CONTAGEM).toBe(600)
  })

  it('a mistura do rótulo é MEDIDA — 70% reprova o contraste no tema claro', () => {
    // `docs/design/medir-rotulo-kpi.py` lê esta constante e mede os oito pares
    // tinta→fundo nos dois temas. A 70% (o valor do mockup) `sand` dá 3,69:1 e
    // `mint` 4,29:1 no claro, contra o piso de 4,5:1 — e `mint` é a tinta do
    // herói. Este caso existe para que subir o número exija remedir.
    expect(MISTURA_DO_ROTULO).toBeLessThanOrEqual(60)
  })
})

/**
 * SOMBRA AMBIENTE (`pesquisa` §5) — no matiz, por baixo da dura, e só onde
 * cabe. A pesquisa nomeia o risco antes de recomendar a técnica: "performance
 * em grade — NUNCA em linha".
 */
describe('KpiTile — sombra ambiente', () => {
  it('na faixa, a ambiente entra POR BAIXO da dura, no matiz', () => {
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Vendido" valorCentavos={1000} tint="mint" />
      </FaixaDeKpi>,
    )
    const tile = container.querySelector('[data-slot="kpi-tile"]') as HTMLElement
    // A dura vem PRIMEIRO na lista: box-shadow desenha na ordem declarada, e
    // invertê-la poria o blur colorido sobre o relevo de tinta.
    expect(tile.style.boxShadow).toMatch(/^var\(--hard-1\),/)
    expect(tile.style.boxShadow).toContain('var(--kc) 45%')
    expect(tile.style.boxShadow).toContain('28px -14px')
  })

  it('o hover sobe para 3px e 18px, e só onde a ambiente existe', () => {
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Vendido" valorCentavos={1000} />
      </FaixaDeKpi>,
    )
    const tile = container.querySelector('[data-slot="kpi-tile"]') as HTMLElement
    expect(tile.className).toContain('hover:shadow-')
    expect(tile.className).toContain('var(--kc)_55%')
  })

  it('tile solto fica com a dura SOZINHA — o fecho não ganha halo', () => {
    const { container } = render(<TotalBox valorCentavos={1000} />)
    const tile = container.querySelector('[data-slot="total-box"]') as HTMLElement
    expect(tile.style.boxShadow).toBe('var(--hard-1)')
    expect(tile.className).not.toContain('hover:shadow-')
  })
})

/**
 * BENTO (`pesquisa` §11) — a MESMA `FaixaDeKpi` com `heroi`, e não uma segunda
 * peça. Duas peças divergiriam no teto, no `throw`, no gap e na contagem; a
 * segunda decisão é sempre a que ninguém revisa.
 */
describe('FaixaDeKpi com herói (bento)', () => {
  it('o herói é o PRIMEIRO no DOM — ordem visual que discorda da leitura é o defeito clássico do bento', () => {
    const { container } = render(
      <FaixaDeKpi heroi={<KpiTile rotulo="Vendas do mês" valorCentavos={100} escala="heroi" />}>
        <KpiTile rotulo="Orçamentos" valor={6} />
      </FaixaDeKpi>,
    )
    const rotulos = [...container.querySelectorAll('[data-slot="kpi-rotulo"]')].map(
      (n) => n.textContent,
    )
    expect(rotulos).toEqual(['Vendas do mês', 'Orçamentos'])
  })

  it('carrega a proporção 1,6 do mockup, e quebra por flex-wrap — nunca por @media', () => {
    // `1.6fr 1fr 1fr 1fr` não sobrevive à regra 7 da rodada: trilha fixa não
    // encolhe, e `repeat(auto-fit, …)` não pode conviver com trilha flexível
    // no mesmo `grid-template-columns` (declaração inválida). `flex-grow: 1.6`
    // reparte a linha na proporção pedida e a fileira quebra sozinha.
    const { container } = render(
      <FaixaDeKpi heroi={<KpiTile rotulo="Herói" valor={1} escala="heroi" />}>
        <KpiTile rotulo="Um" valor={1} />
      </FaixaDeKpi>,
    )
    const faixa = container.querySelector('[data-slot="faixa-de-kpi"]') as HTMLElement
    expect(faixa).toHaveAttribute('data-bento')
    expect(faixa.className).toContain('flex-wrap')
    expect(faixa.style.gridTemplateColumns).toBe('')
    const heroi = container.querySelector('[data-slot="faixa-heroi"]') as HTMLElement
    expect(heroi.style.flexGrow).toBe(String(PESO_DO_HEROI))
    const celula = container.querySelector('[data-slot="faixa-celula"]') as HTMLElement
    expect(celula.style.flexGrow).toBe('1')
  })

  it('sem herói continua a fileira de IGUAIS, em auto-fit — bento é errado em listagem', () => {
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Um" valor={1} />
      </FaixaDeKpi>,
    )
    const faixa = container.querySelector('[data-slot="faixa-de-kpi"]') as HTMLElement
    expect(faixa).not.toHaveAttribute('data-bento')
    expect(faixa.style.gridTemplateColumns).toContain('auto-fit')
  })

  it('a célula vem da FAIXA, não da tela — peso errado por fora seria um segundo herói', () => {
    const { container } = render(
      <FaixaDeKpi heroi={<KpiTile rotulo="Herói" valor={1} escala="heroi" />}>
        <KpiTile rotulo="Um" valor={1} />
        <KpiTile rotulo="Dois" valor={2} />
      </FaixaDeKpi>,
    )
    const pesos = [...container.querySelectorAll('[data-slot="faixa-celula"]')].map(
      (n) => (n as HTMLElement).style.flexGrow,
    )
    expect(pesos).toEqual(['1', '1'])
  })

  it('o herói conta para o teto de quatro, e o quinto recusa alto', () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <FaixaDeKpi heroi={<KpiTile rotulo="Herói" valor={1} escala="heroi" />}>
          <KpiTile rotulo="Um" valor={1} />
          <KpiTile rotulo="Dois" valor={2} />
          <KpiTile rotulo="Três" valor={3} />
          <KpiTile rotulo="Quatro" valor={4} />
        </FaixaDeKpi>,
      ),
    ).toThrow(/no máximo 4 KPIs e recebeu 5/)
    silencio.mockRestore()
  })

  // count-up desligado (user, 2026-09-04) — o hook existe, o KPI não o chama.

  it.skip('o bento também liga a contagem e a ambiente — é faixa, com outra medida', () => {
    const { container } = render(
      <FaixaDeKpi heroi={<KpiTile rotulo="Herói" valorCentavos={1000} escala="heroi" />}>
        <KpiTile rotulo="Um" valor={1} />
      </FaixaDeKpi>,
    )
    const tile = container.querySelector('[data-slot="kpi-tile"]') as HTMLElement
    expect(tile.style.boxShadow).toContain('var(--kc) 45%')
  })
})

describe('FaixaDeKpi', () => {
  it('aceita quatro', () => {
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Um" valor="1" />
        <KpiTile rotulo="Dois" valor="2" />
        <KpiTile rotulo="Três" valor="3" />
        <KpiTile rotulo="Quatro" valor="4" />
      </FaixaDeKpi>,
    )
    expect(container.querySelectorAll('[data-slot="kpi-tile"]')).toHaveLength(MAXIMO_DE_KPIS)
    expect(container.querySelector('[data-slot="faixa-de-kpi"]')).toHaveAttribute('data-kpis', '4')
  })

  it('RECUSA o quinto, e recusa alto', () => {
    // O quinto não encolhe a faixa: quebra para uma segunda fileira e empurra a
    // grade para fora da dobra — o detalhe que a faixa existe para introduzir.
    // Um aviso no console deixaria o quinto publicado e ele viraria o normal.
    // O `throw` obriga a decidir QUAL DOS QUATRO SAI, que é a decisão real.
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <FaixaDeKpi>
          <KpiTile rotulo="Um" valor="1" />
          <KpiTile rotulo="Dois" valor="2" />
          <KpiTile rotulo="Três" valor="3" />
          <KpiTile rotulo="Quatro" valor="4" />
          <KpiTile rotulo="Cinco" valor="5" />
        </FaixaDeKpi>,
      ),
    ).toThrow(/no máximo 4 KPIs e recebeu 5/)
    silencio.mockRestore()
  })

  it('conta o que EXISTE — condicional que não renderizou não ocupa vaga', () => {
    // `{atrasadas > 0 && <KpiTile/>}` devolve `false`, não um filho. Contar o
    // `false` faria a faixa recusar quatro tiles porque um quinto não apareceu.
    const semAtraso = false
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Um" valor="1" />
        <KpiTile rotulo="Dois" valor="2" />
        <KpiTile rotulo="Três" valor="3" />
        <KpiTile rotulo="Quatro" valor="4" />
        {semAtraso && <KpiTile rotulo="Atrasadas" valor="0" />}
      </FaixaDeKpi>,
    )
    expect(container.querySelector('[data-slot="faixa-de-kpi"]')).toHaveAttribute('data-kpis', '4')
  })

  it('quebra por auto-fit, nunca por @media', () => {
    // O que decide quantos cabem é a largura DISPONÍVEL — que muda com a
    // sidebar recolhida, não só com a janela. Regra 7 da rodada.
    const { container } = render(
      <FaixaDeKpi>
        <KpiTile rotulo="Um" valor="1" />
      </FaixaDeKpi>,
    )
    const faixa = container.querySelector('[data-slot="faixa-de-kpi"]') as HTMLElement
    expect(faixa.style.gridTemplateColumns).toContain('auto-fit')
    expect(faixa.style.gap).toBe('var(--s-3)')
  })
})

/**
 * FECHO do documento: agora um `KpiTile`, com a MESMA assinatura de antes —
 * `form-grid.tsx` e `documento.tsx` montam sem saber que ele trocou de corpo.
 */
describe('TotalBox', () => {
  it('é um KpiTile na tinta de dinheiro, na escala de destaque', () => {
    const { container } = render(<TotalBox valorCentavos={100_000} />)
    const caixa = container.querySelector('[data-slot="total-box"]')
    expect(caixa).not.toBeNull()
    expect(caixa).toHaveAttribute('data-tint', 'mint')
    expect(screen.getByLabelText('Total')).toHaveTextContent('1.000,00')
  })

  it('negativo escreve em vermelho — a convenção do ledger vale no fecho', () => {
    render(<TotalBox valorCentavos={-5000} />)
    expect(screen.getByLabelText('Total')).toHaveStyle({ color: 'var(--bad)' })
  })

  it('positivo NÃO usa a tinta de erro', () => {
    render(<TotalBox valorCentavos={5000} />)
    expect(screen.getByLabelText('Total')).not.toHaveStyle({ color: 'var(--bad)' })
  })

  it('o rótulo é o NOME acessível do valor, não texto solto ao lado', () => {
    render(<TotalBox label="Total geral" valorCentavos={1} />)
    expect(screen.getByLabelText('Total geral')).toHaveTextContent('0,01')
  })
})

/**
 * SOBREVIVENTE 1.x. `NumeroHeroi` continua exportado enquanto `documento.tsx`
 * (D15) e `indicadores.tsx` (D20) o montam — apagá-lo aqui quebraria duas
 * branches em curso. Os casos que sobraram são os que ainda dizem verdade: a
 * família vem por TOKEN e as três escalas são fechadas. Os que justificavam a
 * medida pela métrica da Bebas saíram junto com a fonte.
 */
describe('NumeroHeroi (1.x, sai em D15/D20)', () => {
  it('fala pelo token da família, nunca pelo nome da fonte', () => {
    render(<NumeroHeroi escala="total">1.234</NumeroHeroi>)
    const n = screen.getByText('1.234')
    expect(n.className).toContain('font-[family-name:var(--font-display-condensada)]')
    // O token agora aponta para a Gambarino (D1 removeu a Bebas). Se a peça
    // dissesse o nome da fonte, continuaria pedindo em silêncio uma que o repo
    // não carrega mais — que é exatamente o que aconteceu com o comentário.
    expect(n.className).not.toContain('Bebas')
  })

  it('a escala é fechada — não há tamanho livre para cada tela escolher', () => {
    // @ts-expect-error — 'grande' não é escala do desenho.
    render(<NumeroHeroi escala="grande">9</NumeroHeroi>)
    expect(screen.getByText('9')).toBeInTheDocument()
  })
})
