import { URL_PARCEIROS } from '@/data/parceiros-api'
import { json } from '@/test/servidor'
import { type FetchStub, respostaSessao, respostaVinculos } from '@/test/utils'

/**
 * Servidor falso das três telas de parceiro (Fornecedor, Cliente, Profissional).
 *
 * Existe compartilhado porque os três consomem o MESMO `GET /api/partners`,
 * mudando só o `role` — repetir o stub em cada arquivo faria três versões do
 * mesmo shape, e a divergência apareceria como teste verde sobre resposta que o
 * servidor não devolve.
 */

/** Linha no shape EXATO do `PartnerDto`. */
export function parceiro(over: Record<string, unknown> = {}) {
  return {
    id: '7a1d6f30-1f2b-4c8a-9e55-2b3c4d5e6f70',
    code: 'F001',
    legalName: 'STELLA ILUMINAÇÃO LTDA',
    tradeName: 'STELLA',
    document: '12345678000199',
    email: 'contato@stella.com.br',
    isCustomer: false,
    isSupplier: true,
    isProfessional: false,
    paymentTerms: '30/60/90',
    // `active` é o VÍNCULO com a empresa ativa; `registrationActive`, o cadastro
    // do grupo. São coisas diferentes — ver `src/data/parceiros-api.ts`.
    active: true,
    registrationActive: true,
    ...over,
  }
}

/** Sessão válida + listagem de parceiros; qualquer outro caminho rejeita alto. */
export function stubDeParceiros(linhas: readonly unknown[] = [parceiro()]): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
    if (caminho === URL_PARCEIROS) {
      return Promise.resolve(json({ rows: linhas, total: linhas.length }))
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}
