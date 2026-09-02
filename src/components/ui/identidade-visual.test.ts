import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A GUARDA DA FUNDAÇÃO 2.0 (#469, D1) — e antes dela, a da união Polaris.
 *
 * O arquivo nasceu em 2026-08-18 porque a leva Polaris levou junto três peças
 * que são a identidade deste sistema (o contorno de tinta, o anel de foco
 * amarelo e a receita que dá contraste a ele). Nenhuma caiu por decisão: caíram
 * porque o valor de um token mudou e ninguém tinha como saber que aquele valor
 * era carregado. Por que ESTE teste existe e não uma linha a mais no DESIGN.md:
 * a regra já estava escrita na página quando foi desfeita. Página não reprova
 * build.
 *
 * Na 2.0 o que ele guarda mudou de natureza, e para melhor. O `index.css`
 * deixou de guardar cor: ele é a PONTE, e todo nome 1.x aponta para um token de
 * `styles/tokens-2.0.css`. O primeiro caso abaixo é a guarda dessa regra —
 * qualquer valor literal que reapareça ali é uma cor que o próximo agente vai
 * trocar em um lugar e esquecer no outro, que é exatamente como este sistema
 * publicou três números de contraste errados.
 *
 * O que este arquivo NÃO faz: medir contraste. jsdom não roda o Tailwind e
 * `getComputedStyle` devolveria string vazia. Número mora em
 * `docs/design/medir-contraste.py --conferir`.
 */

const RAIZ = join(import.meta.dirname, '..', '..')
const CSS = readFileSync(join(RAIZ, 'index.css'), 'utf-8')
const TOKENS = readFileSync(join(RAIZ, 'styles', 'tokens-2.0.css'), 'utf-8')

/** Corpo do primeiro bloco `<seletor> {` de um arquivo. */
function bloco(css: string, seletor: string): string {
  const corpo = css.split(`${seletor} {`)[1]?.split('\n}')[0]
  if (corpo === undefined) throw new Error(`bloco ${seletor} não existe`)
  return corpo
}

/** Pares `--nome: valor` de um corpo, já sem comentário de fim de linha. */
function pares(corpo: string): Map<string, string> {
  const sem = corpo.replace(/\/\*[\s\S]*?\*\//g, '')
  return new Map(
    [...sem.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, nome, valor]) => [
      nome as string,
      (valor as string).trim(),
    ]),
  )
}

function token(css: string, seletor: string, nome: string): string {
  const valor = pares(bloco(css, seletor)).get(nome)
  if (valor === undefined) throw new Error(`token --${nome} não existe em ${seletor}`)
  return valor
}

describe('identidade visual — o que a próxima leva de UI não pode levar junto', () => {
  it('o index.css é PONTE: nenhum alias guarda cor própria', () => {
    // A regra inteira da D1 em uma asserção. Enquanto todo nome 1.x for
    // `var(--token-2.0)`, trocar o papel do sistema é trocar `--n-*` num
    // arquivo só. Um hex ou um triplet reaparecendo aqui é uma segunda fonte de
    // verdade nascendo — e ela envelhece calada, porque nada a compara com a
    // primeira.
    const fugitivos = [...pares(bloco(CSS, ':root')).entries()].filter(
      ([, valor]) => !/^var\(--[a-z0-9-]+\)$/.test(valor),
    )
    expect(fugitivos).toEqual([])
  })

  it('a cor de módulo também vem da escala, e o boletim é a única tinta pura', () => {
    for (const seletor of ['[data-modulo="compras"]', '[data-modulo="crm"]']) {
      for (const valor of pares(bloco(CSS, seletor)).values()) {
        expect(valor).toMatch(/^var\(--(mod|tint)-[a-z]+\)$/)
      }
    }
    expect(token(CSS, '[data-modulo="boletim"]', 'modulo-01')).toBe('var(--n-900)')
  })

  it('o anel de foco é AMARELO, e continua andando com o fio de tinta', () => {
    // O azul Polaris #005BD3 ocupou este token e saiu: passava sozinho e por
    // isso pareceu equivalente, mas trocou a marca de foco que o operador
    // reconhece de longe por um anel de admin genérico. Amarelo sozinho dá
    // 1,56:1 sobre a folha — a WCAG 1.4.11 pede 3:1, e quem cumpre é o fio por
    // fora. Tirar o fio e manter o amarelo é o mesmo defeito, sem aviso nenhum.
    expect(token(TOKENS, ':root', 'ring')).toBe('#ffd23f')
    const receita = CSS.split('@utility focus-ring {')[1]?.split('}')[0] ?? ''
    expect(receita).toContain('outline: 3px solid var(--ring)')
    expect(receita).toContain('box-shadow: 0 0 0 4px var(--foreground)')
  })

  it('o acento é FILL: a tinta em cima dele não vira com o tema', () => {
    // Chartreuse é o mesmo nos dois temas (decisão da rodada), então o que se
    // lê em cima dele é escuro nos dois. Se `--main-fg` virasse junto com a
    // escala, o par no escuro daria ~1,1:1 — texto invisível sobre o botão
    // primário. Quem precisa do acento em TEXTO usa `--main-text`.
    expect(token(TOKENS, ':root', 'main')).toBe('var(--lime-400)')
    expect(token(TOKENS, ':root', 'main-fg')).toBe('var(--n-900)')
    expect(token(TOKENS, '.dark,\n[data-theme="dark"]', 'main-fg')).toBe('#16140f')
    expect(token(TOKENS, '.dark,\n[data-theme="dark"]', 'main-text')).toBe('var(--lime-200)')
  })

  it('três famílias, três papéis — e as duas cópias da pilha não divergem', () => {
    // A pilha literal aparece no `@theme inline` (que precisa do valor para
    // inlinar na utility) e em `tokens-2.0.css` (que é a fonte). Escrever
    // `--font-display: var(--font-display)` no @theme seria circular, então a
    // duplicação é obrigatória — e é por isso que ela precisa de guarda.
    for (const familia of ['font-display', 'font-sans', 'font-mono']) {
      expect(token(CSS, '@theme inline', familia)).toBe(token(TOKENS, ':root', familia))
    }
    expect(token(TOKENS, ':root', 'font-display')).toContain('Gambarino')
    expect(token(TOKENS, ':root', 'font-sans')).toContain('Inter')
    expect(token(TOKENS, ':root', 'font-mono')).toContain('JetBrains Mono')
    // Os nomes da 1.5 ainda têm consumidor e viram alias até D30 apagá-los.
    expect(token(CSS, '@theme inline', 'font-nome')).toBe('var(--font-display)')
    expect(token(CSS, '@theme inline', 'font-display-condensada')).toBe('var(--font-display)')
  })

  it('os onze degraus de tipo dizem o mesmo como token e como classe', () => {
    // A classe serve à marcação, o token serve ao componente que já tem classe
    // própria. Divergir é o caminho mais curto para dois "13,5px Inter 600" que
    // não são o mesmo degrau.
    const degraus = pares(bloco(TOKENS, ':root'))
    for (const [nome, valor] of degraus) {
      if (!nome.startsWith('t-')) continue
      // `peso tamanho/entrelinha familia`, e o Biome escreve a barra com
      // espaços em volta (`400 30px / 1.05 …`) — casar por regex e não por
      // `split(' ')`, senão a formatação do repo quebra a guarda.
      const forma = /^(\d+)\s+([\d.]+px)\s*\/\s*([\d.]+)\s+(var\(--font-[a-z]+\))$/.exec(valor)
      expect(forma, `--${nome} fora da forma da régua: ${valor}`).not.toBeNull()
      const [, peso, tamanho, entrelinha, familia] = forma as RegExpExecArray
      const classe = bloco(TOKENS, `.${nome}`)
      expect(classe).toContain(`font-weight: ${peso};`)
      expect(classe).toContain(`font-size: ${tamanho};`)
      expect(classe).toContain(`line-height: ${entrelinha};`)
      expect(classe).toContain(`font-family: ${familia};`)
    }
    expect([...degraus.keys()].filter((n) => n.startsWith('t-'))).toHaveLength(11)
  })

  it('a sombra é hard-offset de TINTA e nunca preta', () => {
    // Sombra preta vira buraco na tela; a escada dura é tinta do tema sobre
    // papel do tema, e por isso ela existe nos dois. Blur aqui seria a sombra
    // de outro sistema.
    expect(token(TOKENS, ':root', 'hard-1')).toBe('2px 2px 0 0 var(--n-900)')
    expect(token(TOKENS, ':root', 'hard-soft')).toBe('3px 3px 0 0 var(--n-300)')
    expect(token(TOKENS, '.dark,\n[data-theme="dark"]', 'hard-1')).toBe('2px 2px 0 0 var(--n-300)')
    // Os nomes 1.x continuam apontando para a escada nova, sem valor próprio.
    expect(token(CSS, '@theme inline', 'shadow-el3')).toBe('var(--hard-1)')
    expect(token(CSS, '@theme inline', 'shadow-macia')).toBe('var(--hard-soft)')
  })
})
