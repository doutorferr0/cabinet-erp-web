import { Label } from '@/components/ui/label'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Rótulo de campo é DISCRETO (fusão v5, decisão do user 2026-08-19): sem caixa,
 * sem borda, sans 10px bold em tinta secundária. Esta é a DECISÃO NOVA que a
 * etiqueta invertida da fase 1.5 pedia para existir ("se mudar, muda por
 * decisão nova") — a crítica P1 do impeccable estava certa: o rótulo-caixa era
 * o elemento mais repetido E mais barulhento do sistema, gritando acima do
 * próprio valor do campo. O teste agora guarda a decisão nova pelo mesmo
 * motivo que guardava a velha: mudança de rótulo é decisão, nunca descuido.
 */
describe('Label — rótulo discreto', () => {
  it('não tem caixa: sem borda, sem fundo, tinta secundária', () => {
    render(<Label htmlFor="x">Razão social</Label>)

    const etiqueta = screen.getByText('Razão social')
    expect(etiqueta.className).not.toContain('border-2')
    expect(etiqueta.className).not.toContain('bg-card')
    expect(etiqueta.className).not.toContain('bg-foreground')
    expect(etiqueta.className).toContain('text-muted-foreground')
  })

  it('fala em sans 10px bold caixa alta — o rótulo sussurra, o valor fala', () => {
    render(<Label htmlFor="x">Razão social</Label>)

    const etiqueta = screen.getByText('Razão social')
    expect(etiqueta.className).toContain('font-sans')
    expect(etiqueta.className).toContain('font-bold')
    expect(etiqueta.className).toContain('text-[10px]')
    expect(etiqueta.className).toContain('uppercase')
    expect(etiqueta.className).toContain('tracking-[0.1em]')
  })

  it('embrulha o texto em vez de esticar na largura do campo', () => {
    render(<Label htmlFor="x">CEP</Label>)

    // Sem `w-fit`/`self-start` a etiqueta viraria faixa — que é outra peça.
    const etiqueta = screen.getByText('CEP')
    expect(etiqueta.className).toContain('w-fit')
    expect(etiqueta.className).toContain('self-start')
  })

  it('não tem raio nenhum: sem caixa não há canto a arredondar', () => {
    render(<Label htmlFor="x">NCM</Label>)

    expect(screen.getByText('NCM').className).not.toContain('rounded-item')
  })

  it('continua um <label> de verdade, associado ao controle', () => {
    render(
      <>
        <Label htmlFor="razao">Razão social</Label>
        <input id="razao" />
      </>,
    )

    // A amostra usa `<span class="rot">`, sem `for` — aqui não: a etiqueta é o
    // rótulo acessível do campo, e clicar nela foca o controle.
    expect(screen.getByLabelText('Razão social')).toBe(screen.getByRole('textbox'))
  })
})
