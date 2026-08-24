import { ErroDoServidor } from '@/components/cabinet/erro-do-servidor'
import { ErroDeCarregamento } from '@/components/cabinet/estado-de-consulta'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { GravacaoEmConstrucao, ModuloEmConstrucao } from '@/components/cabinet/modulo-em-construcao'
import { ErroDaApi } from '@/data/api-provider'
import {
  renderRoute,
  renderWithQuery,
  respostaLookups,
  respostaSessao,
  respostaVinculos,
} from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * MÓDULO EM CONSTRUÇÃO — o que o operador vê quando o servidor responde 501.
 *
 * O contrato reserva o 501 (`urn:cabinet:erro:nao-implementado`) para "o caminho
 * está no contrato e o servidor ainda não serve esta parte dele". Sem
 * tratamento, isso chegava à tela pelo bloco de falha genérico, que diz duas
 * coisas falsas de uma vez: que a consulta não chegou, e que tentar de novo
 * resolve.
 *
 * O que estes testes travam é o par: a frase certa E a ausência do botão que
 * não cumpre nada.
 */

/** 501 como o servidor o manda, já na forma que a fronteira entrega à tela. */
function erro501(caminho = '/api/quotes', detail?: string) {
  return new ErroDaApi(
    'Falha ao consultar orçamentos.',
    501,
    detail,
    { type: 'urn:cabinet:erro:nao-implementado', title: 'Não implementado', status: 501, detail },
    caminho,
  )
}

describe('ModuloEmConstrucao', () => {
  it('nomeia o módulo em vez de falar de "esta parte do sistema"', () => {
    renderWithQuery(<ModuloEmConstrucao erro={erro501()} />)

    expect(screen.getByText('Orçamento em construção')).toBeInTheDocument()
  })

  it('diz O QUE JÁ FUNCIONA — a metade que o servidor não tem como contar', () => {
    renderWithQuery(<ModuloEmConstrucao erro={erro501()} />)

    expect(screen.getByText(/O que já funciona/)).toBeInTheDocument()
    expect(screen.getByText(/itens de produto grava normalmente/)).toBeInTheDocument()
  })

  it('NÃO oferece tentar de novo — repetir dá o mesmo 501', () => {
    renderWithQuery(<ModuloEmConstrucao erro={erro501()} />)

    expect(screen.queryByRole('button', { name: /tentar de novo/i })).not.toBeInTheDocument()
  })

  it('mostra o `detail` do servidor por cima da frase do registro', () => {
    renderWithQuery(<ModuloEmConstrucao erro={erro501('/api/quotes', 'Desconto por grupo.')} />)

    expect(screen.getByText('Desconto por grupo.')).toBeInTheDocument()
    // As duas convivem: o registro diz o que falta no módulo, o `detail` diz o
    // que falhou NESTE pedido. Uma não substitui a outra.
    expect(screen.getByText('Orçamento em construção')).toBeInTheDocument()
  })

  it('caminho fora do registro perde o nome, não o aviso', () => {
    renderWithQuery(<ModuloEmConstrucao erro={erro501('/api/inventado')} />)

    expect(screen.getByText('Módulo em construção')).toBeInTheDocument()
    expect(screen.queryByText(/O que já funciona/)).not.toBeInTheDocument()
  })
})

describe('GravacaoEmConstrucao', () => {
  it('responde primeiro o que o operador quer saber: se perdeu o que digitou', () => {
    renderWithQuery(<GravacaoEmConstrucao erro={erro501()} />)

    expect(screen.getByText(/Nada foi gravado e o que você preencheu continua aqui/)).toBeVisible()
  })

  it('avisa por `role="alert"` — o clique foi no rodapé, longe de onde o aviso nasce', () => {
    renderWithQuery(<GravacaoEmConstrucao erro={erro501()} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/gravação em construção/i)
  })
})

describe('os caminhos que desviam para ele', () => {
  it('a tela de detalhe (ErroDeCarregamento) não mostra falha de carregamento', () => {
    renderWithQuery(
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o orçamento."
        erro={erro501()}
        refazer={vi.fn()}
      />,
    )

    expect(screen.getByText('Orçamento em construção')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tentar de novo/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar o orçamento.')).not.toBeInTheDocument()
  })

  it('o painel do Dashboard (FalhaDoPainel) não pede para esperar a rede voltar', () => {
    renderWithQuery(
      <FalhaDoPainel titulo="Os indicadores não carregaram" erro={erro501()} aoTentar={vi.fn()} />,
    )

    expect(screen.getByText('Orçamento em construção')).toBeInTheDocument()
    expect(screen.queryByText('Os indicadores não carregaram')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tentar de novo/i })).not.toBeInTheDocument()
  })

  it('a gravação (ErroDoServidor) troca a caixa vermelha pela de pendência', () => {
    const { container } = renderWithQuery(
      <ErroDoServidor erro={erro501()} mensagem="Falha ao gravar o orçamento." />,
    )

    // A caixa vermelha existe para erro que TEM conserto: ela mostra `fields[]`,
    // que num 501 não vem, e o vermelho manda procurar o campo errado.
    expect(container.querySelector('[data-slot="erro-do-servidor"]')).toBeNull()
    expect(screen.getByText(/gravação em construção/i)).toBeInTheDocument()
  })
})

describe('a listagem inteira, do 501 do servidor até a tela', () => {
  it('a tela de orçamentos explica em vez de mostrar falha de rede', async () => {
    // Ponta a ponta pelo caminho de verdade: servidor responde 501 em
    // problem+json, o cliente gerado transporta, a fronteira classifica e a
    // listagem desenha. Nenhum dublê de módulo no meio.
    const { container } = renderRoute('/vendas/orcamentos', (entrada) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      const caminho = new URL(url, 'http://localhost').pathname
      if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
      if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
      if (caminho === '/api/catalog-lookups') return Promise.resolve(respostaLookups())
      if (caminho.startsWith('/api/quotes')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              type: 'urn:cabinet:erro:nao-implementado',
              title: 'Não implementado',
              status: 501,
              detail: 'O desconto por grupo ainda não é gravado.',
            }),
            { status: 501, headers: { 'content-type': 'application/problem+json' } },
          ),
        )
      }
      return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
    })

    expect(await screen.findByText('Orçamento em construção')).toBeInTheDocument()
    // A tela BRANCA é o que não pode acontecer: há conteúdo, e ele diz o que há.
    expect(container.textContent).toContain('O que já funciona')
    expect(screen.queryByText(/A consulta não chegou ao servidor/)).not.toBeInTheDocument()
  })
})
