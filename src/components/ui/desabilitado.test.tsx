import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A GUARDA DA REGRA "desabilitado em tinta preta" (core @regras, user
 * 2026-08-14; issue #106).
 *
 * Estado desabilitado NUNCA se diz clareando conteúdo. Ícone e rótulo ficam na
 * tinta do tema; quem apaga é a superfície e o traço.
 *
 * Por que a guarda é ESTÁTICA e não visual: o defeito é uma classe de erro que
 * volta em componente NOVO, não neste. Um teste de render só cobre o que já foi
 * escrito — a varredura cobre o que ainda vai ser. E jsdom não roda o Tailwind:
 * `getComputedStyle` num `disabled:opacity-50` devolve string vazia, então
 * medir cor em teste unitário daria verde para o defeito. O que dá para provar
 * aqui é o VOCABULÁRIO; o número de contraste mora em
 * `docs/design/medir-contraste.py --conferir`.
 */

const RAIZ = join(import.meta.dirname, '..', '..')

function fontes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) return fontes(caminho)
    if (!/\.tsx?$/.test(entrada.name) || entrada.name.includes('.test.')) return []
    return [caminho]
  })
}

/**
 * Comentário não pinta pixel — e as notas que explicam a regra citam o defeito
 * literalmente ("substituiu `disabled:` + opacidade"). Sem apagá-los, a guarda
 * acusaria a própria documentação dela. Apaga-se o CONTEÚDO preservando as
 * quebras de linha, para o número da linha continuar apontando o lugar certo.
 */
function semBlocos(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
}

function semComentarios(fonte: string): string {
  return semBlocos(fonte).replace(/\/\/[^\n]*/g, '')
}

/**
 * Um gatilho de desabilitado seguido de utility que mexe em OPACIDADE ou em
 * tinta apagada. O prefixo aceita qualquer forma que o repo usa — `disabled:`,
 * `data-disabled:`, `data-[disabled]:`, `aria-disabled:`, `peer-disabled:`,
 * `has-disabled:`, `group-data-[disabled=true]/grupo:` — porque o que define a
 * violação é a DUPLA (gatilho, clareamento), não a sintaxe da variante.
 */
const PADROES_PROIBIDOS: readonly { nome: string; re: RegExp }[] = [
  {
    nome: 'opacidade atrás de um gatilho de desabilitado',
    re: /[\w[\]/=-]*disabled[\w[\]/=-]*:opacity-/,
  },
  {
    nome: 'a tinta apagada que o token `--text-disabled` publicava',
    re: /text-text-disabled/,
  },
]

describe('a regra do desabilitado — varredura das fontes', () => {
  const arquivos = [
    ...fontes(join(RAIZ, 'components')),
    ...fontes(join(RAIZ, 'features')),
    ...fontes(join(RAIZ, 'app')),
  ]

  it('a varredura enxerga o repo (senão ela passaria vazia)', () => {
    expect(arquivos.length).toBeGreaterThan(40)
  })

  for (const { nome, re } of PADROES_PROIBIDOS) {
    it(`nenhuma fonte usa ${nome}`, () => {
      const culpados = arquivos
        .flatMap((caminho) =>
          semComentarios(readFileSync(caminho, 'utf8'))
            .split('\n')
            .map((linha, i) => ({ caminho, linha, n: i + 1 }))
            .filter(({ linha }) => re.test(linha)),
        )
        .map(({ caminho, n }) => `${caminho.slice(RAIZ.length + 1)}:${n}`)

      // Mensagem no lugar de `toEqual([])` seco: quem quebrar isto precisa
      // saber que existe receita pronta, senão troca por outro clareamento.
      expect(
        culpados,
        `Use a utility \`desabilitado\` (ou \`marca-desabilitada\`) do index.css: o apagamento vai para o FUNDO e o TRAÇO, nunca para o conteúdo.\n${culpados.join('\n')}`,
      ).toEqual([])
    })
  }
})

describe('a regra do desabilitado — tokens', () => {
  // Sem os blocos `/* … */`: a nota que EXPLICA a remoção cita o token morto
  // pelo nome, e sem isso a guarda acusaria a própria explicação dela.
  const css = semBlocos(readFileSync(join(RAIZ, 'index.css'), 'utf8'))

  it('não existe token de TINTA apagada — o nome é o convite ao defeito', () => {
    expect(css).not.toMatch(/--text-disabled\s*:/)
    expect(css).not.toMatch(/--color-text-disabled\s*:/)
  })

  it('o par superfície+traço existe nos DOIS temas', () => {
    // Duas ocorrências de cada = bloco claro + bloco `.dark`. Um tema só
    // significaria estado morto herdando a cor do outro.
    expect(css.match(/--surface-disabled\s*:/g)).toHaveLength(2)
    expect(css.match(/--rule-disabled\s*:/g)).toHaveLength(2)
  })

  it('a receita apaga fundo e traço, e devolve a tinta do tema', () => {
    const receita = css.slice(css.indexOf('.desabilitado:is('))
    expect(receita).toMatch(/color:\s*hsl\(var\(--foreground\)\)/)
    expect(receita).toMatch(/background-color:\s*hsl\(var\(--surface-disabled\)\)/)
    expect(receita).toMatch(/border-color:\s*hsl\(var\(--rule-disabled\)\)/)
    // `opacity: 1` explícito — sem ele, o clareamento que RAC e cmdk trazem de
    // fábrica voltaria pela dependência.
    expect(receita).toMatch(/opacity:\s*1/)
  })

  it('a receita mora DEPOIS do `*`, e fora de camada', () => {
    // Não é preferência de organização: o `*` é autor SEM camada e vence
    // qualquer regra dentro de `@layer` — inclusive `utilities`, onde todo
    // `@utility` e todo `border-*` são gerados. Escrita como `@utility`, a
    // receita saiu com o traço PRETO na foto. Se alguém a mover para dentro de
    // um `@layer` ou para cima do `*`, o traço apagado morre em silêncio.
    const universal = css.indexOf('* {\n  border-color: hsl(var(--border));')
    const receita = css.indexOf('.desabilitado:is(')
    expect(universal).toBeGreaterThan(-1)
    expect(receita).toBeGreaterThan(universal)
    expect(css).not.toMatch(/@utility\s+desabilitado\b/)
    expect(css).not.toMatch(/@utility\s+marca-desabilitada\b/)
  })
})

describe('a regra do desabilitado — no DOM', () => {
  it('botão morto carrega a receita e continua dizendo o motivo', () => {
    renderWithQuery(
      <Button disabled title="Selecione uma linha">
        Alterar
      </Button>,
    )
    const botao = screen.getByRole('button', { name: 'Alterar' })
    expect(botao).toBeDisabled()
    expect(botao.className).toContain('desabilitado')
    expect(botao.className).not.toMatch(/opacity-\d/)
    // `pointer-events: none` mataria o `title` nativo: o motivo existiria no DOM
    // e nunca na tela.
    expect(botao.className).not.toContain('disabled:pointer-events-none')
    expect(botao).toHaveAttribute('title', 'Selecione uma linha')
  })

  it('campo morto não clareia o valor que o operador precisa ler', () => {
    renderWithQuery(<Input aria-label="CNPJ" defaultValue="12.345.678/0001-90" disabled />)
    const campo = screen.getByLabelText('CNPJ')
    expect(campo).toBeDisabled()
    expect(campo.className).toContain('desabilitado')
    expect(campo.className).not.toMatch(/opacity-\d/)
  })

  it('checkbox morto apaga o quadrado, não o rótulo', () => {
    renderWithQuery(<Checkbox isDisabled>Ativo</Checkbox>)
    const caixa = screen.getByRole('checkbox', { name: 'Ativo' })
    // O clareamento morava na RAIZ, que embrulha o rótulo. Agora ela só troca o
    // cursor; quem apaga é o indicador.
    expect(caixa.className).not.toMatch(/opacity-\d/)
    const indicador = document.querySelector('[data-slot="checkbox-indicator"]')
    expect(indicador?.className).toContain('marca-desabilitada')
  })
})
