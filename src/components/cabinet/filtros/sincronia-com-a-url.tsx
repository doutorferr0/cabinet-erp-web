import { type ConsultaNaUrl, consultaParaUrl } from '@/components/cabinet/filtros/filtro-na-url'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

/**
 * A CONSULTA PUBLICADA NO ENDEREÇO — sem componente novo na tela.
 *
 * Não desenha nada: existe para que o endereço da janela conte a mesma história
 * que a barra de filtro. Quem lê o endereço de volta é `consultaDoEndereco`, na
 * montagem da listagem.
 *
 * ## `replace`, nunca `push`
 *
 * Filtro não é navegação. Empilhando uma entrada por mudança, `Voltar` desfaria
 * a última condição em vez de sair da tela — e desfazer filtro por filtro até
 * escapar de uma listagem é o oposto do que o botão promete. Com `replace`, o
 * endereço fica compartilhável e recarregável, e `Voltar` continua significando
 * "a tela anterior".
 *
 * Como a publicação não empilha, também não há de onde vir uma mudança de
 * endereço para reagir: a leitura é uma só, na montagem. Assinar as duas pontas
 * criaria o laço (estado escreve URL → URL reescreve estado) que faz o valor
 * piscar embaixo do cursor enquanto se digita.
 *
 * ## Sem router, não faz nada — de propósito
 *
 * A `VitraDataTable` também roda fora do router: a janela de busca (padrão 5)
 * monta a MESMA tabela dentro de um dialog, e teste de componente isolado usa
 * `renderWithQuery`. Nesses casos não existe endereço que valha a pena mexer, e
 * `useRouter({ warn: false })` é o que permite descobrir isso sem derrubar a
 * tela. O `useNavigate` fica no filho justamente porque hook não se chama sob
 * condição — quem é condicional é o filho.
 */
export function SincroniaComAUrl(consulta: ConsultaNaUrl) {
  const router = useRouter({ warn: false })
  if (!router) return null
  return <PublicaNoEndereco {...consulta} />
}

/** Tipo frouxo de propósito: a listagem é genérica e não conhece a rota que a monta. */
type BuscaDaRota = Record<string, unknown>

function PublicaNoEndereco({ q, filtros, juncao }: ConsultaNaUrl) {
  const navigate = useNavigate()
  const parametros = consultaParaUrl({ q, filtros, juncao })
  // O array de filtros muda de identidade a cada tecla; o que interessa é o
  // TEXTO que iria para o endereço. Sem isso o efeito republicaria a cada
  // render e a barra de endereço trabalharia à toa.
  const assinatura = JSON.stringify(parametros)
  // O efeito depende da assinatura, mas ESCREVE o objeto: o `undefined` que
  // apaga um parâmetro não sobrevive a `JSON.stringify`, e reconstruí-lo do
  // texto deixaria no endereço o `filters` da consulta anterior.
  const atual = useRef(parametros)
  atual.current = parametros

  // biome-ignore lint/correctness/useExhaustiveDependencies: `assinatura` é o GATILHO — o efeito escreve `atual.current`, e depender do objeto republicaria a cada render.
  useEffect(() => {
    navigate({
      // O que não é da consulta continua no endereço: `modo=consulta`, o
      // `redirect` do login e o que mais a rota tenha posto lá. Escrever só os
      // nossos apagaria os alheios, e o defeito apareceria longe daqui.
      search: (anterior: BuscaDaRota) => ({ ...anterior, ...atual.current }),
      replace: true,
    } as never)
  }, [assinatura, navigate])

  return null
}
