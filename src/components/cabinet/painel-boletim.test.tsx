import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PainelBoletim } from './painel-boletim'

/**
 * PainelBoletim — moldura dupla colorida (REFACE Boletim, 2026-08-07).
 *
 * O que estes testes travam é a ORIGEM da cor, não o hex: quem declara
 * `data-modulo` deixa a moldura ler `--modulo-01` daquele par, e é isso que faz
 * recalibração de paleta e modo escuro chegarem à peça. Literal de cor na classe
 * já esteve aqui (`border-[hsl(206,100%,50%)]` no azul dos cadastros) e passaria
 * verde num teste que só olhasse a aparência.
 */
describe('PainelBoletim', () => {
  it('região de módulo lê a cor pelo escopo, sem literal na classe', () => {
    render(
      <PainelBoletim cor="boletim" legend="Movimento do dia">
        conteúdo
      </PainelBoletim>,
    )

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.dataset.modulo).toBe('boletim')
    expect(fieldset?.className).toContain('border-double-modulo')
    expect(fieldset?.className).not.toMatch(/border-\[/)
  })

  // `cadastros` EMPRESTA o azure do Estoque — mesmo mecanismo de `aparencia` que
  // rege Dashboard e Colaboradores em `navigation.ts`. Nenhuma nona cor.
  it('cadastros empresta o azure do Estoque pelo escopo de módulo', () => {
    render(<PainelBoletim cor="cadastros">conteúdo</PainelBoletim>)

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.dataset.modulo).toBe('estoque')
    expect(fieldset?.className).toContain('border-double-modulo')
  })

  // Pendência é ESTADO, não módulo: a moldura lê a zona `warn`, e emprestar cor
  // de módulo aqui diria que "Ordens sem Data Envio" pertence a algum cadastro.
  it('pendência lê a zona warn e não declara módulo', () => {
    render(<PainelBoletim cor="foco">conteúdo</PainelBoletim>)

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.dataset.modulo).toBeUndefined()
    expect(fieldset?.className).toContain('border-warn')
    expect(fieldset?.className).toContain('outline-warn')
  })

  // A legenda é a mesma peça do FormBlock: Meta em `text-strong`. Divergir na
  // tinta faria a tela de Boletim parecer de outro sistema.
  it('legend usa a mesma tipografia Meta do FormBlock', () => {
    render(
      <PainelBoletim cor="boletim" legend="Movimento do dia">
        conteúdo
      </PainelBoletim>,
    )

    const legend = screen.getByText('Movimento do dia')
    expect(legend.tagName).toBe('LEGEND')
    expect(legend.className).toContain('font-mono')
    expect(legend.className).toContain('text-[0.75rem]')
    expect(legend.className).toContain('uppercase')
    expect(legend.className).toContain('tracking-[0.06em]')
    expect(legend.className).toContain('text-text-strong')
  })

  it('sem legend, mantém o compartimento e não renderiza <legend> vazio', () => {
    render(<PainelBoletim cor="boletim">conteúdo</PainelBoletim>)

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.className).toContain('bg-paper-grid')
    expect(fieldset?.querySelector('legend')).toBeNull()
  })
})
