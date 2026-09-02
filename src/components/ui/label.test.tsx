import { Label } from '@/components/ui/label'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O rótulo perdeu a caixa alta, e a razão é de leitura, não de gosto: a
 * etiqueta 1.x usava o vocabulário de `--t-rotulo` (10px bold caixa alta,
 * tracking largo), que na 2.0 pertence a cabeçalho de coluna e rótulo de KPI.
 * Num cadastro de trinta campos aquilo eram trinta linhas de versalete gritando
 * acima de trinta valores.
 */
describe('Label — sussurra, e quem fala é o dado', () => {
  it('não tem caixa alta, nem mono, nem moldura', () => {
    renderWithQuery(<Label htmlFor="x">Razão social</Label>)
    const rotulo = screen.getByText('Razão social')

    expect(rotulo.className).not.toContain('uppercase')
    expect(rotulo.className).not.toContain('font-mono')
    expect(rotulo.className).not.toMatch(/\bborder(-2)?\b|\bbg-/)
  })

  it('consome um degrau da §Hierarquia, nunca font-size literal', () => {
    renderWithQuery(<Label htmlFor="x">Razão social</Label>)
    const rotulo = screen.getByText('Razão social')

    expect(rotulo.className).toContain('t-meta')
    expect(rotulo.className).not.toMatch(/text-\[\d|text-(xs|sm|base)\b/)
    // Peso e cor sobem por utility com `!` porque `.t-meta` mora fora de
    // camada e venceria o Tailwind por ordem de documento (ver o comentário do
    // componente e a nota na #469).
    expect(rotulo.className).toContain('font-medium!')
    expect(rotulo.className).toContain('text-[color:var(--n-700)]!')
  })

  it('obrigatório é um `*` em `::after` — fora do texto do rótulo', () => {
    // A regressão que este caso impede: um `<span>*</span>` de verdade entraria
    // no `textContent` do `<label>`, e é dali que o Testing Library monta o
    // nome de `getByLabelText`. "Razão social" viraria "Razão social*" e as
    // buscas exatas das telas quebrariam no dia em que alguém marcasse o campo
    // como obrigatório. `aria-hidden` NÃO resolveria isso.
    renderWithQuery(
      <>
        <Label htmlFor="cnpj" obrigatorio>
          CNPJ
        </Label>
        <input id="cnpj" required />
      </>,
    )
    const rotulo = screen.getByText('CNPJ')

    expect(rotulo.className).toContain("after:content-['*']")
    expect(rotulo.className).toContain('after:text-[color:var(--bad)]!')
    // O texto continua exatamente o rótulo — e o campo continua achável por ele.
    expect(rotulo.textContent).toBe('CNPJ')
    expect(screen.getByLabelText('CNPJ')).toBe(screen.getByRole('textbox'))
  })

  it('sem `obrigatorio` não aparece asterisco nenhum', () => {
    renderWithQuery(<Label htmlFor="x">CNPJ</Label>)
    expect(screen.getByText('CNPJ').className).not.toContain("after:content-['*']")
  })

  it('a ajuda curta acompanha o rótulo em tinta terciária', () => {
    renderWithQuery(
      <Label htmlFor="x" hint="sem máscara">
        CNPJ
      </Label>,
    )
    const hint = screen.getByText('sem máscara')

    expect(hint.className).toContain('text-[color:var(--n-500)]!')
    expect(hint.className).toContain('font-normal!')
  })

  it('embrulha o texto em vez de esticar na largura do campo', () => {
    renderWithQuery(<Label htmlFor="x">CEP</Label>)

    // Sem `w-fit`/`self-start` a etiqueta viraria faixa — que é outra peça.
    const rotulo = screen.getByText('CEP')
    expect(rotulo.className).toContain('w-fit')
    expect(rotulo.className).toContain('self-start')
  })

  it('continua um <label> de verdade, associado ao controle', () => {
    renderWithQuery(
      <>
        <Label htmlFor="razao">Razão social</Label>
        <input id="razao" />
      </>,
    )

    // Clicar no rótulo foca o campo — a associação sobrevive à troca de pele.
    expect(screen.getByLabelText('Razão social')).toBe(screen.getByRole('textbox'))
  })

  it('campo inválido pinta o rótulo mesmo com o `!` do degrau no caminho', () => {
    // `FormLabel` (ui/form.tsx) injeta `text-destructive` por className. Sem a
    // regra de especificidade dupla no componente, essa utility perderia tanto
    // para `.t-meta` quanto para o `!` da cor normal, e o rótulo do campo
    // inválido continuaria cinza — o único campo do formulário que não avisa.
    renderWithQuery(
      <Label htmlFor="x" className="text-destructive">
        CNPJ
      </Label>,
    )
    const rotulo = screen.getByText('CNPJ')

    expect(rotulo.className).toContain('[&.text-destructive]:text-[color:var(--bad)]!')
    expect(rotulo.className).toContain('text-destructive')
  })
})
