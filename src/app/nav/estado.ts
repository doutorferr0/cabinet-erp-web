import { useCallback, useEffect, useState } from 'react'

/**
 * O ESTADO PESSOAL DA BARRA — o que cada operador deixou aberto, marcado e
 * visitado.
 *
 * ## `localStorage`, e por usuário DENTRO dele
 *
 * O 1.x guardava o colapso em `sessionStorage`: quem trabalhou a manhã inteira
 * com Compras aberto reabria tudo fechado no dia seguinte. A 2.0 é
 * `localStorage` porque isto é preferência de CONTA, não de aba.
 *
 * E `localStorage` é do NAVEGADOR, não da pessoa — no balcão onde dois
 * operadores usam a mesma máquina, um herdaria o mapa do outro, com os
 * favoritos e os registros recentes de quem esteve ali antes. Por isso cada
 * chave guarda um objeto indexado pelo id do operador: uma chave, N gavetas, e
 * a de ninguém encosta na do outro. Sessão sem id conhecido cai numa gaveta
 * `anonimo`, que é o que o site público usa.
 *
 * ## Leitura tolerante, escrita que pode falhar em silêncio
 *
 * Chave corrompida, cota estourada ou armazenamento bloqueado (aba anônima,
 * navegador com cookies de terceiros desligados) devolvem o padrão em vez de
 * derrubar a navegação. Perder a preferência é um aborrecimento; perder a barra
 * é perder o sistema.
 */

const CHAVE_GRUPOS = 'cabinet.nav.grupos'
const CHAVE_COLAPSO = 'cabinet.nav.colapsada'
const CHAVE_FAVORITOS = 'cabinet.nav.favoritos'
const CHAVE_RECENTES = 'cabinet.nav.recentes'

/** Quantos registros a barra lembra. Três é o que o mockup desenha. */
export const MAXIMO_DE_RECENTES = 3

export interface RegistroRecente {
  /** O caminho completo do registro — é ele que o item da barra abre. */
  url: string
  /** O que se lê na linha: `Cliente · 9a1f…`. Quem o compõe é quem registra. */
  rotulo: string
  /** Epoch em ms — o tempo relativo é calculado na hora de desenhar. */
  em: number
}

function lerGaveta<T>(chave: string, usuario: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave)
    if (!bruto) return padrao
    const lido: unknown = JSON.parse(bruto)
    if (typeof lido !== 'object' || lido === null) return padrao
    const gaveta = (lido as Record<string, unknown>)[usuario]
    return gaveta === undefined ? padrao : (gaveta as T)
  } catch {
    return padrao
  }
}

function gravarGaveta(chave: string, usuario: string, valor: unknown): void {
  try {
    const bruto = localStorage.getItem(chave)
    let todas: Record<string, unknown> = {}
    if (bruto) {
      const lido: unknown = JSON.parse(bruto)
      if (typeof lido === 'object' && lido !== null) todas = lido as Record<string, unknown>
    }
    todas[usuario] = valor
    localStorage.setItem(chave, JSON.stringify(todas))
  } catch {
    // Cota estourada ou armazenamento bloqueado: o estado segue em memória.
    // Falhar a gravação não pode fechar o que o operador acabou de abrir.
  }
}

function somenteTextos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : []
}

/**
 * Os GRUPOS ABERTOS.
 *
 * `undefined` como estado inicial é significativo e não é "vazio": quer dizer
 * *"este operador nunca mexeu na barra"*, e é o caso em que vale o padrão —
 * **só o grupo da rota abre**. Depois do primeiro clique quem manda é a lista
 * gravada, mesmo que ela esteja vazia (todos fechados é uma escolha legítima, e
 * tratá-la como "nunca mexeu" reabriria o grupo da rota a cada navegação,
 * desfazendo o que o operador acabou de fazer).
 */
export function useGruposAbertos(usuario: string, grupoDaRota: string | undefined) {
  const [gravados, setGravados] = useState<string[] | undefined>(() =>
    lerGaveta<string[] | undefined>(CHAVE_GRUPOS, usuario, undefined),
  )

  // Trocar de operador na mesma aba (o balcão) recarrega a gaveta certa.
  useEffect(() => {
    setGravados(lerGaveta<string[] | undefined>(CHAVE_GRUPOS, usuario, undefined))
  }, [usuario])

  const abertos = gravados ?? (grupoDaRota ? [grupoDaRota] : [])

  const alternar = useCallback(
    (id: string) => {
      setGravados((atual) => {
        const base = atual ?? (grupoDaRota ? [grupoDaRota] : [])
        const proximo = base.includes(id) ? base.filter((g) => g !== id) : [...base, id]
        gravarGaveta(CHAVE_GRUPOS, usuario, proximo)
        return proximo
      })
    },
    [usuario, grupoDaRota],
  )

  return { abertos, alternar }
}

/**
 * A barra COLAPSADA (56px, só ícone). Vale para toda rota e sobrevive ao
 * recarregamento: é postura de trabalho — quem precisa de tela larga a fecha e
 * espera que ela continue fechada.
 */
export function useBarraColapsada(usuario: string) {
  const [colapsada, setColapsada] = useState(() =>
    lerGaveta<boolean>(CHAVE_COLAPSO, usuario, false),
  )

  useEffect(() => {
    setColapsada(lerGaveta<boolean>(CHAVE_COLAPSO, usuario, false))
  }, [usuario])

  const alternar = useCallback(() => {
    setColapsada((atual) => {
      gravarGaveta(CHAVE_COLAPSO, usuario, !atual)
      return !atual
    })
  }, [usuario])

  return { colapsada, alternar }
}

/**
 * Os FAVORITOS — as urls que o operador marcou com ★.
 *
 * Aqui é só o gesto e a memória local. A D13 liga isto ao endpoint
 * `saved_views`/favoritos do contrato, e o dia em que ela chegar esta função
 * vira a camada de leitura otimista dele — a assinatura não muda.
 */
export function useFavoritos(usuario: string) {
  const [favoritos, setFavoritos] = useState<string[]>(() =>
    somenteTextos(lerGaveta<unknown>(CHAVE_FAVORITOS, usuario, [])),
  )

  useEffect(() => {
    setFavoritos(somenteTextos(lerGaveta<unknown>(CHAVE_FAVORITOS, usuario, [])))
  }, [usuario])

  const alternar = useCallback(
    (url: string) => {
      setFavoritos((atual) => {
        const proximo = atual.includes(url) ? atual.filter((u) => u !== url) : [...atual, url]
        gravarGaveta(CHAVE_FAVORITOS, usuario, proximo)
        return proximo
      })
    },
    [usuario],
  )

  return { favoritos, alternar }
}

function recentesValidos(valor: unknown): RegistroRecente[] {
  if (!Array.isArray(valor)) return []
  return valor.filter((v): v is RegistroRecente => {
    if (typeof v !== 'object' || v === null) return false
    const r = v as Record<string, unknown>
    return typeof r.url === 'string' && typeof r.rotulo === 'string' && typeof r.em === 'number'
  })
}

/**
 * Os RECENTES — os últimos registros que o operador abriu.
 *
 * REGISTROS, não telas: a lista de clientes é sempre o mesmo lugar e já está na
 * barra; o cliente `9a1f` é onde ele estava trabalhando ontem. Por isso quem
 * alimenta isto é a rota de DETALHE, e nunca a de listagem.
 *
 * Reabrir um registro que já está na lista o traz para o topo em vez de
 * duplicá-lo — a lista responde "onde eu estava", e a mesma resposta duas vezes
 * ocuparia o lugar da anterior.
 */
export function useRecentes(usuario: string) {
  const [recentes, setRecentes] = useState<RegistroRecente[]>(() =>
    recentesValidos(lerGaveta<unknown>(CHAVE_RECENTES, usuario, [])),
  )

  useEffect(() => {
    setRecentes(recentesValidos(lerGaveta<unknown>(CHAVE_RECENTES, usuario, [])))
  }, [usuario])

  const registrar = useCallback(
    (registro: RegistroRecente) => {
      setRecentes((atual) => {
        const semEle = atual.filter((r) => r.url !== registro.url)
        // Já está no topo com o mesmo rótulo: nada mudou, e devolver o mesmo
        // array evita o render (e a gravação) que um `useEffect` de rota
        // dispararia a cada re-render da tela de detalhe.
        if (semEle.length === atual.length - 1 && atual[0]?.url === registro.url) {
          if (atual[0].rotulo === registro.rotulo) return atual
        }
        const proximo = [registro, ...semEle].slice(0, MAXIMO_DE_RECENTES)
        gravarGaveta(CHAVE_RECENTES, usuario, proximo)
        return proximo
      })
    },
    [usuario],
  )

  return { recentes, registrar }
}

/**
 * `há 3 min`, `há 2 h`, `ontem` — a idade de um recente, em pt-BR.
 *
 * Sem biblioteca de data: são cinco faixas e nenhuma delas precisa de fuso,
 * calendário ou locale além do texto. `Intl.RelativeTimeFormat` daria "há 3
 * minutos" por extenso, e a linha do recente tem 236px menos o rótulo.
 */
export function idadeRelativa(em: number, agora: number = Date.now()): string {
  const segundos = Math.max(0, Math.round((agora - em) / 1000))
  if (segundos < 60) return 'agora'
  const minutos = Math.round(segundos / 60)
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias === 1) return 'ontem'
  return `há ${dias} d`
}
