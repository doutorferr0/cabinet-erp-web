import type { AnyRouter } from '@tanstack/react-router'

/**
 * VIEW TRANSITIONS NA TROCA DE ROTA (#527) — a lista vira a ficha, e o título
 * atravessa.
 *
 * Por que existe: sem isto, trocar de tela é um corte seco, e o operador perde
 * o fio de onde estava. Com a API, o browser tira uma foto do antes, deixa o
 * router trocar o DOM e faz o cruzamento — a SAÍDA em 90 ms e a ENTRADA em
 * 160 ms (a regra do movimento de artesão: quem sai já foi decidido; quem
 * entra precisa ser lido). O desenho mora no CSS (`tokens-2.0.css`,
 * `::view-transition-*`); aqui fica só a mecânica.
 *
 * **Por que não é um `useEffect` que reage ao pathname.** Quando o efeito roda,
 * o DOM novo já está pintado — não há mais "antes" para fotografar. A foto tem
 * de ser tirada ANTES da troca, e o único ponto que existe antes dela é o
 * evento `onBeforeNavigate` do router. Daí a assinatura: esta função assina
 * dois eventos e devolve como desassinar.
 *
 * **Três guardas, e cada uma paga um defeito concreto:**
 *
 * 1. `startViewTransition` ausente (Safari < 18, Firefox antigo) → não faz
 *    nada. A navegação acontece igual, sem transição: degrada, não quebra.
 * 2. `prefers-reduced-motion` → não faz nada. Movimento de tela inteira é
 *    justamente o que a preferência pede para não acontecer.
 * 3. `document.readyState !== 'complete'` → não faz nada. Transição durante o
 *    carregamento fotografa uma tela pela metade e cruza para outra pela
 *    metade; o efeito é pior que o corte seco.
 *
 * **O teto de tempo não é paranoia.** Enquanto o callback não resolve, o browser
 * segura a tela congelada na foto. Uma navegação que espera dado lento
 * (`onRendered` demorando) deixaria o operador olhando para um retrato. Passado
 * o teto, a transição termina sozinha e a tela volta a ser tela.
 */

/** Nome do shared element. O mesmo string está no `tokens-2.0.css`. */
export const NOME_DO_TITULO = 'titulo-da-pagina'

/** Teto de espera pelo render antes de soltar a tela congelada. */
export const TETO_MS = 400

/**
 * Marca o título da página como shared element — e SÓ quando ele é único.
 *
 * Dois nós com o mesmo `view-transition-name` abortam a transição inteira, e o
 * browser reclama no console de um jeito que ninguém lê. Como o `h1` é "um por
 * tela" por convenção e não por garantia, a checagem é aqui: com dois títulos,
 * a troca continua acontecendo, só sem o elemento compartilhado.
 */
export function marcarTitulo(doc: Document = document): HTMLElement | null {
  const titulos = doc.querySelectorAll<HTMLElement>('main h1')
  if (titulos.length !== 1) return null
  const titulo = titulos[0] as HTMLElement
  titulo.style.viewTransitionName = NOME_DO_TITULO
  return titulo
}

export function desmarcarTitulos(doc: Document = document): void {
  for (const titulo of doc.querySelectorAll<HTMLElement>('main h1')) {
    if (titulo.style.viewTransitionName === NOME_DO_TITULO) titulo.style.viewTransitionName = ''
  }
}

export function ligarTransicaoDeRota(router: AnyRouter, doc: Document = document): () => void {
  // O tipo já vem da lib DOM; o que a checagem resolve é o RUNTIME — Safari
  // antigo e Firefox não têm o método, e ali a navegação acontece sem
  // transição em vez de estourar.
  if (typeof doc.startViewTransition !== 'function') return () => {}

  let liberar: (() => void) | null = null
  let expiracao: ReturnType<typeof setTimeout> | null = null

  const encerrar = () => {
    if (expiracao !== null) {
      clearTimeout(expiracao)
      expiracao = null
    }
    const solta = liberar
    liberar = null
    solta?.()
  }

  const naSaida = router.subscribe('onBeforeNavigate', () => {
    // Navegação em cima de navegação: a primeira transição continua mandando —
    // começar outra descartaria a foto que já está na tela.
    if (liberar !== null) return
    if (doc.readyState !== 'complete') return
    // Aba oculta (ou captura de tela via CDP): o navegador aborta a transição
    // com InvalidStateError e a foto fica presa até o teto. Não vale começar.
    if (doc.visibilityState === 'hidden') return
    if (doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches === true) return

    marcarTitulo(doc)
    const espera = new Promise<void>((resolve) => {
      liberar = resolve
    })
    expiracao = setTimeout(encerrar, TETO_MS)
    let transicao: ViewTransition
    try {
      transicao = doc.startViewTransition(() => espera)
    } catch {
      // Sem transição possível agora (estado inválido): navega sem foto.
      encerrar()
      desmarcarTitulos(doc)
      return
    }
    // `ready` rejeita quando o navegador aborta (aba oculta, outra transição,
    // captura) — sem o catch vira exceção não tratada no console.
    void transicao.ready?.catch?.(() => {})
    void transicao.finished.catch(() => {}).finally(() => desmarcarTitulos(doc))
  })

  // O título novo é outro nó (a folha remonta por `key`), então ele precisa ser
  // marcado DEPOIS do render e ANTES de soltar a foto — é entre estas duas
  // linhas que o shared element existe dos dois lados.
  const naChegada = router.subscribe('onRendered', () => {
    if (liberar === null) return
    marcarTitulo(doc)
    encerrar()
  })

  return () => {
    naSaida()
    naChegada()
    encerrar()
  }
}
