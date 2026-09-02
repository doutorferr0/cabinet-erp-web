import type { ItemDoInbox } from '@/mocks/inbox'

/**
 * AS TRÊS VIEWS da caixa de entrada, e por que são VIEWS e não filtros.
 *
 * Filtro é o que o operador monta (campo + operador + valor, padrão 1 do repo);
 * view é um recorte NOMEADO que já vem pronto, escolhido por um clique e
 * publicado no endereço. "Não lidas" e "Menções" são a pergunta que se faz ao
 * abrir a caixa — não algo que se remonta toda vez. Por isso vivem aqui, como
 * dado, e não numa barra de filtro: a lista de views é conferível, e a padrão é
 * declarada num lugar só.
 */
export const VIEWS = [
  {
    id: 'nao-lidas',
    rotulo: 'Não lidas',
    /** O que ainda pede trabalho — a razão de a caixa existir. */
    aceita: (item: ItemDoInbox) => !item.lido,
    vazio: 'Nada esperando você. A caixa está limpa.',
  },
  {
    id: 'mencoes',
    rotulo: 'Menções',
    /** Onde alguém escreveu seu nome — lido ou não: menção não some por ter sido vista. */
    aceita: (item: ItemDoInbox) => item.natureza === 'mencao',
    vazio: 'Ninguém mencionou você por enquanto.',
  },
  {
    id: 'tudo',
    rotulo: 'Tudo',
    aceita: () => true,
    vazio: 'A caixa de entrada está vazia.',
  },
] as const

export type ViewDoInbox = (typeof VIEWS)[number]['id']

/**
 * A view que abre por padrão. "Não lidas" e não "Tudo": quem abre a caixa quer
 * o que falta, e o histórico está a um clique de distância.
 */
export const VIEW_PADRAO: ViewDoInbox = 'nao-lidas'

export function ehView(valor: unknown): valor is ViewDoInbox {
  return VIEWS.some((view) => view.id === valor)
}

export function viewPorId(id: ViewDoInbox) {
  // `find` sobre um `as const` que já contém o id — o `??` existe só para o
  // tipo, e cai no primeiro elemento, que é o padrão.
  return VIEWS.find((view) => view.id === id) ?? VIEWS[0]
}

export function itensDaView(itens: readonly ItemDoInbox[], id: ViewDoInbox): ItemDoInbox[] {
  return itens.filter(viewPorId(id).aceita)
}

/**
 * MONOGRAMA — as iniciais de quem agiu, no máximo duas.
 *
 * Primeira e última palavra: "Marina Alves" → MA, "Stella Iluminação" → SI,
 * "Sistema" → S. Nome de uma palavra não vira duas letras artificiais.
 */
export function monogramaDe(autor: string): string {
  const palavras = autor.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return '?'
  const primeira = palavras[0]?.[0] ?? ''
  const ultima = palavras.length > 1 ? (palavras[palavras.length - 1]?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

const MINUTOS_POR_HORA = 60
const MINUTOS_POR_DIA = 60 * 24
const MINUTOS_POR_SEMANA = MINUTOS_POR_DIA * 7

/**
 * O tempo CURTO, que é o que entra na coluna mono da direita ("2 h", "3 d").
 *
 * Função pura de minutos atrás — não lê o relógio. Ver `ItemDoInbox.minutosAtras`
 * para o porquê: rótulo que depende de `Date.now()` muda de valor entre a
 * escrita do teste e a rodada dele.
 */
export function tempoCurto(minutosAtras: number): string {
  if (minutosAtras < 1) return 'agora'
  if (minutosAtras < MINUTOS_POR_HORA) return `${Math.floor(minutosAtras)} min`
  if (minutosAtras < MINUTOS_POR_DIA) return `${Math.floor(minutosAtras / MINUTOS_POR_HORA)} h`
  if (minutosAtras < MINUTOS_POR_SEMANA) return `${Math.floor(minutosAtras / MINUTOS_POR_DIA)} d`
  return `${Math.floor(minutosAtras / MINUTOS_POR_SEMANA)} sem`
}

/** O mesmo tempo POR EXTENSO — vai no `title`, para quem passa o mouse ou lê por leitor de tela. */
export function tempoPorExtenso(minutosAtras: number): string {
  if (minutosAtras < 1) return 'agora mesmo'
  if (minutosAtras < MINUTOS_POR_HORA) {
    const n = Math.floor(minutosAtras)
    return `há ${n} ${n === 1 ? 'minuto' : 'minutos'}`
  }
  if (minutosAtras < MINUTOS_POR_DIA) {
    const n = Math.floor(minutosAtras / MINUTOS_POR_HORA)
    return `há ${n} ${n === 1 ? 'hora' : 'horas'}`
  }
  if (minutosAtras < MINUTOS_POR_SEMANA) {
    const n = Math.floor(minutosAtras / MINUTOS_POR_DIA)
    return `há ${n} ${n === 1 ? 'dia' : 'dias'}`
  }
  const n = Math.floor(minutosAtras / MINUTOS_POR_SEMANA)
  return `há ${n} ${n === 1 ? 'semana' : 'semanas'}`
}
