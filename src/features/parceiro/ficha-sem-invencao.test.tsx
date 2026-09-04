import { parceiro } from '@/test/parceiros'
import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O QUE O BACKEND DE VERDADE REVELOU (2026-08-18, par local ligado).
 *
 * O `PartnerDto` tem 16 campos; o cadastro desenhado tem dezenas. O que falta
 * aparecia com o valor do REGISTRO VAZIO do formulário — e o registro vazio não
 * é neutro: `clienteVazio()` nasce `tipoPessoa: 'FISICA'` e `fornecedorVazio()`
 * nasce `forneceRevenda: false`, porque campo de formulário controlado precisa
 * de valor. Na ficha isso deixava de ser andaime e virava afirmação sobre o
 * registro.
 *
 * Estes dois casos são os que o dado real expôs, com o parceiro que o backend
 * devolveu: CNPJ de 14 dígitos lido como "FISICA", e um fornecedor que o
 * servidor nunca classificou lido como "não fornece para revenda".
 *
 * **Por que o mock escondia:** ele preenchia tudo. Com `forneceRevenda` vindo
 * do dado fake, "Não" podia ser a verdade daquele registro; com dado real o
 * campo não existe, e o "Não" passou a ser invenção em toda linha.
 */

const CNPJ = '12345678000199'

function servidorComParceiro(over: Record<string, unknown>) {
  const dto = parceiro({ id: 'p1', code: null, document: CNPJ, ...over })
  return (entrada: RequestInfo | URL) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/partners/')) {
      return new Response(JSON.stringify(dto), { headers: { 'content-type': 'application/json' } })
    }
    return undefined
  }
}

describe('a ficha não inventa o que o contrato não cobre', () => {
  it('cliente com CNPJ não é declarado pessoa FÍSICA', async () => {
    renderRoute(
      '/cadastros/clientes/p1?modo=consulta',
      servidorComParceiro({ legalName: 'PROVA CURL LTDA', isCustomer: true }) as never,
    )

    expect(await screen.findByText('Tipo de pessoa')).toBeInTheDocument()
    // O documento tem 14 dígitos. Dizer "Física" seria contradizer o único dado
    // que o servidor mandou sobre a natureza deste cadastro.
    expect(screen.queryByText('FISICA')).not.toBeInTheDocument()
    expect(screen.queryByText('Física')).not.toBeInTheDocument()
  })

  it('fornecedor não é declarado "não fornece para revenda"', async () => {
    renderRoute(
      '/cadastros/fornecedores/p1?modo=consulta',
      servidorComParceiro({ legalName: 'STELLA ILUMINAÇÃO LTDA', isSupplier: true }) as never,
    )

    await screen.findByText('STELLA ILUMINAÇÃO LTDA')
    // O módulo inteiro é de campos que o contrato não cobre: ele aparece
    // RECOLHIDO, com o convite para preencher — e não com respostas.
    expect(screen.queryByText('Fornece para revenda')).not.toBeInTheDocument()
    expect(
      await screen.findByText(/Prazo de entrega · Prazo de pagamento · Revenda/),
    ).toBeInTheDocument()
  })

  it('o contador do módulo não conta o default do formulário', async () => {
    renderRoute(
      '/cadastros/fornecedores/p1?modo=consulta',
      servidorComParceiro({ legalName: 'STELLA ILUMINAÇÃO LTDA', isSupplier: true }) as never,
    )

    await screen.findByText('STELLA ILUMINAÇÃO LTDA')
    // Era `1/9` — o único "preenchido" era o `false` inventado. A barra de
    // progresso do cadastro subia sozinha, sem ninguém ter digitado nada.
    expect(await screen.findByText('0/9')).toBeInTheDocument()
  })

  it('o que o servidor MANDOU continua na ficha', async () => {
    renderRoute(
      '/cadastros/clientes/p1?modo=consulta',
      servidorComParceiro({ legalName: 'PROVA CURL LTDA', isCustomer: true }) as never,
    )

    // A correção apaga o que o contrato não carrega — não pode levar junto o
    // que ele carrega.
    // O nome aparece duas vezes de propósito — no cabeçalho da ficha e no
    // campo do módulo —, então a asserção é sobre existir, não sobre ser único.
    expect((await screen.findAllByText('PROVA CURL LTDA')).length).toBeGreaterThan(0)
    // O documento também aparece duas vezes desde a D19 (#487): o cartão de
    // identidade da lateral traz nome + documento + cidade, e o módulo
    // `Identificação` traz o campo. Mesma razão do nome logo acima — a asserção
    // é sobre existir, não sobre ser único.
    expect(screen.getAllByText(CNPJ).length).toBeGreaterThan(0)
  })
})
