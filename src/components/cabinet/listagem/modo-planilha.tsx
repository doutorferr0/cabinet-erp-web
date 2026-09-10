import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './modo-planilha.css'

/**
 * MODO PLANILHA (D33 · pesquisa §7) — a terceira densidade da listagem.
 *
 * A ponte com quem passou dez anos na grade do Softlux: a unidade deixa de ser
 * a LINHA e passa a ser a CÉLULA. Setas andam, Enter edita (ou abre o
 * registro), Esc desfaz, Tab avança, `⌘C` copia — e Shift+setas estende uma
 * faixa que sai em TSV, que é o formato que a planilha do operador cola sem
 * perguntar nada.
 *
 * ## Por que num arquivo próprio
 *
 * A `VitraDataTable` já passa de duas mil linhas, e nada disto aqui depende
 * dela: o que o modo precisa saber é quantas linhas e quantas colunas existem,
 * quais colunas aceitam edição, e o que fazer quando o operador aperta Enter
 * numa que não aceita. A grade fica dona do desenho; este arquivo, do gesto.
 *
 * ## Coordenada VISUAL, não índice de dado
 *
 * `linha` é a posição na tela — com agrupamento ligado, é a ordem depois de as
 * faixas partirem a lista, e grupo fechado simplesmente não tem linhas. Usar
 * `row.index` faria a seta para baixo pular para dentro de um grupo colapsado e
 * o foco sumiria da tela sem nada explicar.
 *
 * ## O DOM é a fonte do TEXTO
 *
 * A cópia lê `textContent` da célula, e não o dado cru. É deliberado: o que o
 * operador copia tem de ser o que ele VÊ — `R$ 1.234,56`, `12/03/2026`,
 * `Enviada` —, não `123456` nem um ISO. Copiar o dado cru daria uma planilha
 * que não bate com a tela de onde saiu, e a diferença só apareceria na
 * conferência de outra pessoa.
 */

export interface CelulaDaPlanilha {
  linha: number
  coluna: number
}

/** A faixa, já normalizada: `de` é sempre o canto superior esquerdo. */
export interface FaixaDaPlanilha {
  de: CelulaDaPlanilha
  ate: CelulaDaPlanilha
}

/**
 * A DICA da barra — mono, porque é lista de teclas, e tecla é dado.
 *
 * Escrita aqui e não na barra: quem sabe o que cada tecla faz é este arquivo, e
 * uma frase copiada na barra envelheceria calada no dia em que o gesto mudasse.
 */
export const DICA_DA_PLANILHA = '↑↓←→ navega · Enter edita · Esc cancela · ⌘C copia'

/** `data-celula` — o endereço da célula no DOM, que é como o hook a acha. */
export function enderecoDaCelula(celula: CelulaDaPlanilha): string {
  return `${celula.linha}:${celula.coluna}`
}

function normalizar(a: CelulaDaPlanilha, b: CelulaDaPlanilha): FaixaDaPlanilha {
  return {
    de: { linha: Math.min(a.linha, b.linha), coluna: Math.min(a.coluna, b.coluna) },
    ate: { linha: Math.max(a.linha, b.linha), coluna: Math.max(a.coluna, b.coluna) },
  }
}

function dentroDaFaixa(faixa: FaixaDaPlanilha, celula: CelulaDaPlanilha): boolean {
  return (
    celula.linha >= faixa.de.linha &&
    celula.linha <= faixa.ate.linha &&
    celula.coluna >= faixa.de.coluna &&
    celula.coluna <= faixa.ate.coluna
  )
}

/**
 * O TSV da faixa, lido do DOM.
 *
 * Tabulação entre colunas e quebra de linha entre linhas — é o formato que
 * Excel, LibreOffice e Google Sheets colam em células separadas sem diálogo de
 * importação. CSV pediria aspas e escaparia vírgula, e metade dos valores desta
 * grade (`R$ 1.234,56`) tem vírgula dentro.
 */
export function textoDaFaixa(raiz: HTMLElement | null, faixa: FaixaDaPlanilha): string {
  if (!raiz) return ''
  const linhas: string[] = []
  for (let linha = faixa.de.linha; linha <= faixa.ate.linha; linha += 1) {
    const colunas: string[] = []
    for (let coluna = faixa.de.coluna; coluna <= faixa.ate.coluna; coluna += 1) {
      const celula = raiz.querySelector(`[data-celula="${enderecoDaCelula({ linha, coluna })}"]`)
      colunas.push((celula?.textContent ?? '').trim())
    }
    linhas.push(colunas.join('\t'))
  }
  return linhas.join('\n')
}

export interface ModoPlanilhaOpts {
  /**
   * O `<table>`. É por ele que o hook acha a célula de destino para focar e lê
   * o texto que o `⌘C` copia — o DOM é a fonte, não o dado cru.
   */
  raiz: RefObject<HTMLElement | null>
  /** Ligado só na densidade `planilha` — nas outras o hook não escuta nada. */
  ativo: boolean
  /** Quantas linhas a grade mostra AGORA (já sem as de grupo fechado). */
  linhas: number
  /** Quantas colunas de DADO a grade mostra (sem checkbox, numeração e ações). */
  colunas: number
  /** A coluna aceita edição inline? Sem isso, Enter abre o registro. */
  editavel?: (coluna: number) => boolean
  /** Enter numa coluna que não edita: abre o registro daquela linha. */
  aoAbrir?: (linha: number) => void
  /** Enter/Tab confirmando a edição de uma célula. */
  aoGravar?: (celula: CelulaDaPlanilha, valor: string) => void
}

export interface ModoPlanilha {
  ativa: CelulaDaPlanilha
  editando: CelulaDaPlanilha | null
  /** `role="grid"` + o teclado, no elemento `<table>`. */
  propsDaGrade: {
    role: 'grid'
    'aria-multiselectable': true
    onKeyDown: (evento: ReactKeyboardEvent<HTMLTableElement>) => void
  }
  /** O que cada `<td>` de dado recebe. */
  propsDaCelula: (celula: CelulaDaPlanilha) => {
    role: 'gridcell'
    tabIndex: number
    'data-celula': string
    'aria-selected'?: boolean
    onFocus: () => void
    onMouseDown: () => void
  }
  /** Esta célula está com o editor aberto? */
  editorAberto: (celula: CelulaDaPlanilha) => boolean
  /** Fecha o editor sem gravar — o `blur` e o Esc terminam aqui. */
  cancelarEdicao: () => void
  /** Grava e fecha; `avancar` leva o foco para a célula da direita (Tab). */
  confirmarEdicao: (valor: string, avancar: boolean) => void
}

export function useModoPlanilha({
  raiz,
  ativo,
  linhas,
  colunas,
  editavel,
  aoAbrir,
  aoGravar,
}: ModoPlanilhaOpts): ModoPlanilha {
  const [ativa, setAtiva] = useState<CelulaDaPlanilha>({ linha: 0, coluna: 0 })
  /**
   * A ÂNCORA só existe enquanto há faixa: ela é onde o Shift começou. Nula
   * significa "a faixa é a própria célula ativa", que é o caso de todo dia — e
   * guardar uma âncora igual à ativa faria toda célula nascer `aria-selected`,
   * anunciando ao leitor de tela uma seleção que ninguém fez.
   */
  const [ancora, setAncora] = useState<CelulaDaPlanilha | null>(null)
  const [editando, setEditando] = useState<CelulaDaPlanilha | null>(null)

  /**
   * A célula ativa pode ficar FORA da grade sem ninguém tocar no teclado: uma
   * busca que devolve três linhas depois de o operador estar na décima, uma
   * coluna desligada no menu. Sem este ajuste as setas partiriam de uma
   * coordenada que não existe e o foco não iria a lugar nenhum — o modo pareceria
   * quebrado justo depois de filtrar, que é quando ele mais é usado.
   */
  useEffect(() => {
    if (!ativo) return
    setAtiva((atual) => {
      const linha = Math.min(atual.linha, Math.max(0, linhas - 1))
      const coluna = Math.min(atual.coluna, Math.max(0, colunas - 1))
      return linha === atual.linha && coluna === atual.coluna ? atual : { linha, coluna }
    })
    setAncora(null)
    setEditando(null)
  }, [ativo, linhas, colunas])

  const focar = useCallback(
    (celula: CelulaDaPlanilha) => {
      const alvo = raiz.current?.querySelector<HTMLElement>(
        `[data-celula="${enderecoDaCelula(celula)}"]`,
      )
      // Foco IMPERATIVO, e não por efeito depois do render: a célula de destino
      // já está na árvore (só muda de `tabIndex`), e esperar um ciclo faria a
      // seta segurada perder quadros — o cursor "arrastaria" atrás da tecla.
      alvo?.focus()
    },
    [raiz],
  )

  const irPara = useCallback(
    (celula: CelulaDaPlanilha, estendendo: boolean) => {
      const destino = {
        linha: Math.min(Math.max(celula.linha, 0), Math.max(0, linhas - 1)),
        coluna: Math.min(Math.max(celula.coluna, 0), Math.max(0, colunas - 1)),
      }
      // A ÂNCORA é fixada ANTES de a célula ativa mudar, e fora do updater do
      // `setAtiva`: um `setState` aninhado dentro do updater de outro é
      // executado duas vezes no modo estrito do React, e a segunda passada
      // fixava a âncora na célula de DESTINO — a faixa nascia com uma célula só
      // e o Shift parecia não funcionar.
      if (estendendo) setAncora((atualAncora) => atualAncora ?? ativa)
      else setAncora(null)
      setAtiva(destino)
      focar(destino)
    },
    [ativa, colunas, linhas, focar],
  )

  const faixa = ancora ? normalizar(ancora, ativa) : null

  const copiar = useCallback(() => {
    const texto = textoDaFaixa(raiz.current, faixa ?? normalizar(ativa, ativa))
    // `?.` e `catch` porque a área de transferência é permissão do navegador:
    // negada, a promessa REJEITA, e uma rejeição não tratada derruba o handler
    // de teclado — o operador perderia a navegação inteira por ter dito "não"
    // uma vez a um diálogo do Chrome.
    navigator.clipboard?.writeText(texto).catch(() => {})
  }, [ativa, faixa, raiz])

  const abrirEditor = useCallback(
    (celula: CelulaDaPlanilha) => {
      if (editavel?.(celula.coluna)) {
        setEditando(celula)
        return
      }
      // A coluna não edita: Enter faz o que a linha faz. É o "senão" da própria
      // issue — e é o que impede que a tecla mais apertada da grade não faça
      // nada em nove das dez colunas de uma listagem que ninguém edita ainda.
      aoAbrir?.(celula.linha)
    },
    [aoAbrir, editavel],
  )

  const cancelarEdicao = useCallback(() => {
    setEditando(null)
    focar(ativa)
  }, [ativa, focar])

  const confirmarEdicao = useCallback(
    (valor: string, avancar: boolean) => {
      const celula = editando
      setEditando(null)
      if (celula) aoGravar?.(celula, valor)
      if (avancar && celula) irPara({ linha: celula.linha, coluna: celula.coluna + 1 }, false)
      else if (celula) focar(celula)
    },
    [aoGravar, editando, focar, irPara],
  )

  const onKeyDown = useCallback(
    (evento: ReactKeyboardEvent<HTMLTableElement>) => {
      if (!ativo || editando) return
      // Só a CÉLULA responde. Sem isto, a tecla apertada dentro do checkbox da
      // linha ou de um botão de ação moveria o cursor da planilha por baixo — e
      // o operador veria o foco saltar de onde ele nem estava.
      const alvo = evento.target as HTMLElement
      if (!alvo.hasAttribute?.('data-celula')) return

      const estendendo = evento.shiftKey
      const { linha, coluna } = ativa

      switch (evento.key) {
        case 'ArrowRight':
          evento.preventDefault()
          irPara({ linha, coluna: coluna + 1 }, estendendo)
          return
        case 'ArrowLeft':
          evento.preventDefault()
          irPara({ linha, coluna: coluna - 1 }, estendendo)
          return
        case 'ArrowDown':
          evento.preventDefault()
          irPara({ linha: linha + 1, coluna }, estendendo)
          return
        case 'ArrowUp':
          evento.preventDefault()
          irPara({ linha: linha - 1, coluna }, estendendo)
          return
        case 'Enter':
          evento.preventDefault()
          abrirEditor(ativa)
          return
        case 'Escape':
          // Esc COLAPSA a faixa, e só. Sem faixa ele não é tratado aqui: quem o
          // espera é a barra de lote, que limpa a seleção de LINHAS por um
          // ouvinte no document, e engolir a tecla aqui deixaria a barra escura
          // presa na tela com o foco dentro da grade.
          if (!faixa) return
          evento.preventDefault()
          setAncora(null)
          return
        case 'Tab': {
          // Tab ANDA na planilha, que é o gesto de quem vem do Delphi — mas não
          // PRENDE: na última célula da última linha ele volta a ser o Tab do
          // navegador e leva o foco para o rodapé. Grade que sequestra o Tab é
          // grade de onde não se sai sem mouse.
          const proxima = evento.shiftKey
            ? {
                linha: coluna === 0 ? linha - 1 : linha,
                coluna: coluna === 0 ? colunas - 1 : coluna - 1,
              }
            : {
                linha: coluna >= colunas - 1 ? linha + 1 : linha,
                coluna: coluna >= colunas - 1 ? 0 : coluna + 1,
              }
          if (proxima.linha < 0 || proxima.linha > linhas - 1) return
          evento.preventDefault()
          irPara(proxima, false)
          return
        }
        default:
          if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'c') {
            evento.preventDefault()
            copiar()
          }
      }
    },
    [abrirEditor, ativa, ativo, colunas, copiar, editando, faixa, irPara, linhas],
  )

  const propsDaCelula = useCallback(
    (celula: CelulaDaPlanilha) => {
      const naFaixa = faixa ? dentroDaFaixa(faixa, celula) : false
      return {
        role: 'gridcell' as const,
        // ROVING TABINDEX: uma parada de Tab para a grade inteira. Cinquenta
        // linhas × dez colunas com `tabIndex=0` seriam quinhentas paradas entre
        // a busca e o rodapé — quem navega por teclado nunca mais chegaria à
        // paginação.
        tabIndex: celula.linha === ativa.linha && celula.coluna === ativa.coluna ? 0 : -1,
        'data-celula': enderecoDaCelula(celula),
        ...(naFaixa ? { 'aria-selected': true } : {}),
        // O foco só SINCRONIZA a célula ativa — nunca limpa a faixa. Quem
        // limpa é o `onMouseDown` (o clique é que diz "recomece daqui"), e a
        // diferença foi medida: o `focus()` que a própria navegação por Shift
        // dispara chegava aqui primeiro e apagava a âncora recém-fixada, de
        // modo que a faixa nunca passava de duas células.
        onFocus: () => {
          if (celula.linha !== ativa.linha || celula.coluna !== ativa.coluna) {
            setAtiva(celula)
          }
        },
        // O clique também posiciona o cursor: é de onde a próxima seta parte, e
        // a interface é por clique antes de ser por tecla.
        onMouseDown: () => {
          setAncora(null)
        },
      }
    },
    [ativa, faixa],
  )

  const editorAberto = useCallback(
    (celula: CelulaDaPlanilha) =>
      editando !== null && editando.linha === celula.linha && editando.coluna === celula.coluna,
    [editando],
  )

  return {
    ativa,
    editando,
    propsDaGrade: {
      role: 'grid',
      'aria-multiselectable': true,
      onKeyDown,
    },
    propsDaCelula,
    editorAberto,
    cancelarEdicao,
    confirmarEdicao,
  }
}

/**
 * O EDITOR de uma célula — `<input>`, não `contenteditable`.
 *
 * O mockup usa `contenteditable` porque ali é uma página estática; aqui o valor
 * volta para um formulário e passa por validação. `contenteditable` num nó que
 * o React controla é a receita conhecida de cursor que pula para o começo a
 * cada tecla, e o conteúdo colado chega com marcação dentro.
 */
export function EditorDaCelula({
  valorInicial,
  aoConfirmar,
  aoCancelar,
  rotulo,
}: {
  valorInicial: string
  aoConfirmar: (valor: string, avancar: boolean) => void
  aoCancelar: () => void
  rotulo: string
}) {
  const [valor, setValor] = useState(valorInicial)
  const campo = useRef<HTMLInputElement | null>(null)
  /**
   * Abre FOCADO e com o texto todo selecionado — a próxima tecla substitui, que
   * é o que Excel e a grade do Softlux fazem. Obrigar um clique depois do Enter
   * cobraria duas vezes pelo mesmo gesto, e obrigar a apagar antes de digitar
   * cobraria uma terceira.
   *
   * Por efeito e não por `autoFocus`: o atributo rouba o foco na montagem de
   * qualquer árvore que contenha este campo, inclusive uma que o navegador
   * hidrate fora da tela.
   *
   * `useLayoutEffect` e não `useEffect`, e a diferença foi MEDIDA na suíte
   * cheia: o efeito passivo é agendado depois da pintura, então entre o Enter e
   * o foco havia um quadro em que o campo estava na tela e a tecla seguinte ia
   * para a célula de trás. Sob máquina carregada o quadro esticava e o teste
   * reprovava — no uso, seria a primeira letra do valor digitado se perdendo.
   */
  useLayoutEffect(() => {
    // `focus()` ANTES de `select()`, e não só o segundo: pela especificação,
    // `select()` marca o conteúdo e NÃO move o foco. Sozinho, ele deixava o
    // editor aberto e selecionado com o foco ainda na célula de trás — a
    // digitação seguinte não chegava ao campo e o Enter reabria o editor.
    campo.current?.focus()
    campo.current?.select()
  }, [])
  return (
    <input
      ref={campo}
      aria-label={rotulo}
      className="editor-da-planilha t-corpo"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onKeyDown={(e) => {
        // O editor trata as três teclas e PARA a propagação: sem isso o mesmo
        // Enter que confirma chegaria à grade e abriria outro editor no quadro
        // seguinte.
        if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          aoConfirmar(valor, false)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          aoCancelar()
        } else if (e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          aoConfirmar(valor, true)
        }
      }}
      // Clicar fora é desistir, não gravar: o operador que aperta Enter está
      // dizendo "é isto"; o que clica noutro lugar não disse nada.
      onBlur={aoCancelar}
    />
  )
}
