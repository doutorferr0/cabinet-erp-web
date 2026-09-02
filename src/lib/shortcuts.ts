/**
 * Registry único de atalhos (CLAUDE.md): NÃO usar F3-F6 (conflito com browser).
 */
export const SHORTCUTS = {
  /** Abre a janela de busca do contexto atual. */
  busca: 'ctrl+k',
  /** Incluir novo registro na listagem atual. */
  incluir: 'alt+n',
  /** Inserir produto no documento — F6 no legado (§7.4, §8.2). */
  produto: 'alt+p',
  /** Inserir ambiente no orçamento — F5 no legado (§8.2). */
  ambiente: 'alt+a',
  /** Buscar transportadora na ordem de compra — F4 no legado (§7.2). */
  transportadora: 'alt+t',
  /** Mostrar imagem do produto no orçamento — F4 no legado (§8.2). */
  imagemProduto: 'alt+i',
  /**
   * Recolher e reabrir a barra lateral (Reface 2.0, D4).
   *
   * Nasce aqui e não no legado. O CLAUDE.md veta atalho customizado NOVO, e a
   * exceção está pedida por escrito na issue — mas ela também não fere o que
   * aquele veto protege: o colapso tem botão próprio, visível, no rodapé da
   * barra, e nenhum fluxo passa a depender da tecla. É a mesma natureza do
   * `Ctrl+K`, conveniência e não requisito.
   *
   * `[` é a tecla que Linear, Notion e o VS Code usam para a mesma ação, e não
   * consta da lista publicada de atalhos do Chrome nem do Edge.
   */
  barraLateral: '[',
} as const

export type NomeDeAtalho = keyof typeof SHORTCUTS

/**
 * O que o NAVEGADOR faz com a mesma combinação.
 *
 * Medido em 2026-08-28 na documentação oficial de cada um — Chrome
 * (`support.google.com/chrome/answer/157179`, seção Windows & Linux) e Edge
 * (`support.microsoft.com`, atalhos do Windows). É conferência DOCUMENTAL, e a
 * distinção importa: ela diz o que o fabricante publica, não o que a máquina do
 * operador faz com extensão instalada, layout de teclado diferente ou leitor de
 * tela ligado. Quem fecha essa conta é a validação com quem opera — por isso o
 * mapa mostra a coluna e a página de validação pede o teste na máquina real.
 */
export interface ConflitoDeNavegador {
  /** O que o Chrome publica para a combinação; `null` = não consta da lista. */
  chrome: string | null
  /** O mesmo para o Edge. */
  edge: string | null
}

/**
 * O MAPA que o operador consulta — legado à esquerda, tecla de hoje à direita.
 *
 * **Mora no registry de propósito.** A tabela existia em issue e em PR, e as
 * duas envelheceram: a issue #362 listava `Alt+P` ligado em dois formulários
 * quando já eram três. Documentação em prosa não tem como acompanhar o código
 * que ela descreve; aqui a linha fica ao lado da tecla, e
 * `mapa-de-atalhos.test.ts` cobra uma linha por atalho — atalho novo sem
 * documentação não passa no CI.
 *
 * **A coluna `onde` não diz se está ligado.** Quem mede isso é o teste, varrendo
 * os `bindShortcut` do fonte: texto que afirma "ligado em dois lugares" é a
 * mesma afirmação que já venceu duas vezes.
 */
export interface LinhaDoMapa {
  /**
   * Tecla do legado que esta substitui, ou `null` quando a ação nasceu aqui.
   *
   * O legado usa F3-F6, que o CLAUDE.md veta por conflito com o navegador (F3
   * busca, F5 recarrega, F6 troca de painel) — e é por isso que a coluna existe:
   * quem operou o Softlux por anos procura a tecla ANTIGA, e o mapa é o lugar
   * onde ela ainda aparece.
   */
  legado: string | null
  /** O atalho do registry; `null` quando o legado ficou SEM substituto. */
  atalho: NomeDeAtalho | null
  /** O que a tecla faz, na voz de quem opera. */
  acao: string
  /** Em que tela ela vale — `Em qualquer tela` para as globais. */
  onde: string
  navegador: ConflitoDeNavegador
}

const SEM_CONFLITO_PUBLICADO: ConflitoDeNavegador = { chrome: null, edge: null }

export const MAPA_DE_ATALHOS: readonly LinhaDoMapa[] = [
  {
    legado: null,
    atalho: 'busca',
    acao: 'Abrir a busca: achar tela, incluir registro e procurar cliente, produto, orçamento ou pedido pelo nome ou número',
    onde: 'Em qualquer tela',
    navegador: {
      chrome: 'Pesquisar a partir de qualquer lugar da página',
      edge: 'Abrir uma consulta de busca na barra de endereço',
    },
  },
  {
    legado: null,
    atalho: 'incluir',
    acao: 'Incluir um registro na listagem aberta',
    onde: 'Nas listagens',
    navegador: SEM_CONFLITO_PUBLICADO,
  },
  {
    legado: 'F6',
    atalho: 'produto',
    acao: 'Inserir produto no documento',
    onde: 'Orçamento, pedido de venda e pedido de compra',
    navegador: SEM_CONFLITO_PUBLICADO,
  },
  {
    legado: 'F5',
    atalho: 'ambiente',
    acao: 'Inserir ambiente',
    onde: 'Orçamento e pedido de venda',
    navegador: SEM_CONFLITO_PUBLICADO,
  },
  {
    legado: 'F4',
    atalho: 'transportadora',
    acao: 'Buscar transportadora',
    onde: 'Ordem de compra',
    navegador: SEM_CONFLITO_PUBLICADO,
  },
  {
    legado: 'F4',
    atalho: 'imagemProduto',
    acao: 'Mostrar a imagem do produto',
    onde: 'Orçamento',
    navegador: SEM_CONFLITO_PUBLICADO,
  },
  {
    legado: null,
    atalho: 'barraLateral',
    acao: 'Recolher e reabrir a barra lateral (o mesmo que o botão no pé dela)',
    onde: 'Em qualquer tela',
    navegador: SEM_CONFLITO_PUBLICADO,
  },
  {
    // Fica no mapa JUSTAMENTE por não ter substituto: quem vem do legado procura
    // o F3 e precisa ler que ele não foi remapeado, em vez de concluir que a
    // tecla quebrou. É a linha que a validação com o operador tem de fechar.
    legado: 'F3',
    atalho: null,
    acao: 'Inserir localização do estoque',
    onde: 'Sem tela equivalente no Cabinet — ver a página de validação',
    navegador: SEM_CONFLITO_PUBLICADO,
  },
]

/** Rótulo do atalho para exibir junto do botão (o legado mostra "F6", aqui "Alt+P"). */
export function shortcutLabel(combo: string): string {
  return combo
    .split('+')
    .map((p) => (p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('+')
}

function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  return (
    e.key.toLowerCase() === key &&
    e.ctrlKey === parts.includes('ctrl') &&
    e.altKey === parts.includes('alt') &&
    e.shiftKey === parts.includes('shift') &&
    e.metaKey === parts.includes('meta')
  )
}

/**
 * PILHA POR COMBO — quem ligou por ÚLTIMO atende, e só ele.
 *
 * O registry era único e mesmo assim a tecla não tinha dono: `Ctrl+K` estava
 * ligado à paleta de comandos, que vive no shell e nunca desmonta, E à busca de
 * cidade do cadastro de cliente. Como cada chamada punha o seu próprio listener
 * em `window`, com o cadastro aberto a tecla disparava OS DOIS — abria a paleta
 * e o diálogo de cidade na mesma tecla, um por cima do outro.
 *
 * A pilha resolve pelo escopo, que é como todo sistema com atalho resolve: o
 * mais interno — o que montou depois, o diálogo, o formulário — atende enquanto
 * estiver montado, e ao desmontar a tecla volta sozinha para quem estava
 * embaixo. Sem lista de prioridade para manter e sem o handler global precisar
 * saber quem existe acima dele.
 *
 * **Qual dos dois DEVE vencer é pergunta para quem opera** (issue #362): esta
 * decisão é sobre haver UM dono, não sobre qual. Hoje ganha o formulário aberto.
 */
const pilhas = new Map<string, Array<() => void>>()
const ouvintes = new Map<string, (e: KeyboardEvent) => void>()

/** Liga um atalho do registry a um handler enquanto o componente está montado. */
export function bindShortcut(combo: string, handler: () => void): () => void {
  const pilha = pilhas.get(combo)
  if (pilha) {
    pilha.push(handler)
  } else {
    pilhas.set(combo, [handler])
    const ouvinte = (e: KeyboardEvent) => {
      if (!matches(e, combo)) return
      const atual = pilhas.get(combo)
      const topo = atual?.[atual.length - 1]
      if (!topo) return
      // `Ctrl+K` é do navegador nos dois (ver `MAPA_DE_ATALHOS`): sem isto a
      // barra de endereço rouba a tecla antes de a paleta abrir.
      e.preventDefault()
      topo()
    }
    ouvintes.set(combo, ouvinte)
    window.addEventListener('keydown', ouvinte)
  }

  return () => {
    const atual = pilhas.get(combo)
    if (!atual) return
    // `lastIndexOf` e não `indexOf`: o mesmo handler pode estar duas vezes na
    // pilha (efeito sem lista de dependências re-registra a cada render), e
    // remover a ocorrência de baixo deixaria a de cima órfã de cleanup.
    const i = atual.lastIndexOf(handler)
    if (i >= 0) atual.splice(i, 1)
    if (atual.length > 0) return

    pilhas.delete(combo)
    const ouvinte = ouvintes.get(combo)
    if (ouvinte) {
      window.removeEventListener('keydown', ouvinte)
      ouvintes.delete(combo)
    }
  }
}
