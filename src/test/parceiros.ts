import { URL_PARCEIROS } from '@/data/parceiros-api'
import { json } from '@/test/servidor'
import { type FetchStub, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'

/**
 * Servidor falso das três telas de parceiro (Fornecedor, Cliente, Profissional).
 *
 * Existe compartilhado porque os três consomem o MESMO `GET /api/partners`,
 * mudando só o `role` — repetir o stub em cada arquivo faria três versões do
 * mesmo shape, e a divergência apareceria como teste verde sobre resposta que o
 * servidor não devolve.
 */

/** O endereço do contrato, como o helper o monta — um só tipo para os três
 *  campos de endereço do parceiro (cadastro, cobrança e comercial). */
interface PartnerAddress {
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
}

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
    // Entraram no contrato em 2026-08-13, vindos da extração do legado. Nascem
    // NULOS no helper e não preenchidos: o padrão do cadastro é não ter conselho
    // nem conta — só o Profissional Externo os tem, e o teste que quiser um
    // profissional completo passa os dois pelo `over`, à vista.
    registration: null as string | null,
    payoutBankInfo: null as {
      bankNumber: string | null
      bankName: string | null
      branchNumber: string | null
      accountNumber: string | null
    } | null,
    // Hierarquia pai/filho (#91). Nascem NULOS pelo mesmo motivo dos dois acima:
    // o padrão do cadastro é não pender de ninguém. Quem testa o vínculo passa
    // os dois pelo `over`, à vista — e os dois andam JUNTOS, como o contrato diz.
    parentId: null as string | null,
    parentName: null as string | null,
    // Contato e endereço (#244). Nascem NULOS, e as chaves existem SEMPRE: o
    // `corpoDeEscrita` recusa gravar quando o registro chega sem um campo que o
    // `PUT` substitui, e um helper que omitisse ensinaria a suíte a não ver a
    // diferença entre ausente e nulo — que é justamente a que apaga endereço.
    mobilePhone: null as string | null,
    businessPhone: null as string | null,
    homePhone: null as string | null,
    fax: null as string | null,
    address: null as PartnerAddress | null,
    // Fase 1 (#250). Nascem NULOS e a chave EXISTE: é a distinção que a guarda
    // de `corpoDeEscrita` lê — ausente é "a listagem não mandou", `null` é "não
    // tem". O helper representa a linha COMPLETA do contrato, não a que o
    // backend serve hoje; quem quiser testar a linha incompleta tira a chave à
    // mão, e é assim que o caso da recusa se escreve.
    stateRegistration: null as string | null,
    ruralProducerRegistration: null as string | null,
    categoryId: null as string | null,
    categoryName: null as string | null,
    specifierId: null as string | null,
    specifierName: null as string | null,
    notes: null as string | null,
    facebook: null as string | null,
    instagram: null as string | null,
    // Bloco 2 (#255): cobrança, comercial e o vínculo de trabalho. Nascem
    // NULOS e as chaves EXISTEM — a distinção que a guarda de `corpoDeEscrita`
    // lê. `PartnerAddress` reusado, e por isso o tipo é o mesmo do `address`.
    billingAddress: null as PartnerAddress | null,
    businessAddress: null as PartnerAddress | null,
    businessName: null as string | null,
    businessRole: null as string | null,
    businessDocument: null as string | null,
    foundedOn: null as string | null,
    // Bloco 3 (#270): a metade que faltava da aba `Principal`. Nascem NULOS e
    // as chaves EXISTEM, pela mesma razão do bloco 2 acima.
    personType: null as 'individual' | 'company' | null,
    identityDocument: null as string | null,
    identityIssuer: null as string | null,
    identityIssuerState: null as string | null,
    gender: null as string | null,
    birthDate: null as string | null,
    ...over,
  }
}

export interface ChamadaDeParceiro {
  metodo: string
  caminho: string
  corpo: unknown
}

/**
 * Como `stubDeParceiros`, mas guardando as chamadas — para o teste conferir o
 * CORPO do `PUT`, que é onde mora a promessa de não apagar campo que a tela não
 * mostra.
 */
export interface OpcoesDoServidor {
  /** Faz o `POST` responder o 409 de documento repetido, com a extensão da RFC 9457. */
  documentoRepetido?: string
  /**
   * Faz a ESCRITA responder o 400 de validação com `fields[]`, no formato que o
   * handler mock já usa (`{ path, message }`). Existe porque `fields[]` é a
   * única parte do problem+json que a tela precisa TRADUZIR — path do contrato
   * → campo da tela — e sem um servidor que o mande, a tradução não teria como
   * ser cobrada.
   */
  camposRecusados?: readonly { path: string; message: string }[]
}

export function servidorDeParceiros(
  linhas: readonly unknown[] = [parceiro()],
  opcoes: OpcoesDoServidor = {},
) {
  const chamadas: ChamadaDeParceiro[] = []

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const url = String(requisicao ? requisicao.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname
    const metodo = (requisicao?.method ?? 'GET').toUpperCase()

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/catalog-lookups') return respostaLookups()

    const texto = requisicao ? await requisicao.clone().text() : ''
    chamadas.push({ metodo, caminho, corpo: texto ? JSON.parse(texto) : null })

    if ((metodo === 'POST' || metodo === 'PUT') && opcoes.camposRecusados) {
      return new Response(
        JSON.stringify({
          type: 'about:blank',
          title: 'Requisição inválida',
          status: 400,
          detail: 'Confira os campos destacados.',
          fields: opcoes.camposRecusados,
        }),
        { status: 400, headers: { 'content-type': 'application/problem+json' } },
      )
    }
    if (caminho === URL_PARCEIROS && metodo === 'GET') {
      return json({ rows: linhas, total: linhas.length })
    }
    // `GET /api/partners/{id}`: o detalhe do link direto e da recarga. Responde o
    // MESMO `PartnerDto` da listagem — não existe DTO de detalhe no contrato.
    if (caminho.startsWith(`${URL_PARCEIROS}/`) && !caminho.endsWith('/link') && metodo === 'GET') {
      const id = caminho.slice(URL_PARCEIROS.length + 1)
      const achado = linhas.find((l) => (l as { id?: string }).id === id)
      return achado ? json(achado) : problemaDeParceiro(404, 'Parceiro não encontrado.')
    }
    // O contrato responde 201 com o `PartnerDto` criado.
    if (caminho === URL_PARCEIROS && metodo === 'POST') {
      if (opcoes.documentoRepetido) {
        // O `existingPartnerId` é MEMBRO DE EXTENSÃO (RFC 9457), fora do schema
        // do `ProblemDetails` — é ele que tira a tela do beco.
        return new Response(
          JSON.stringify({
            type: 'about:blank',
            title: 'Documento já cadastrado no grupo',
            status: 409,
            detail: 'Já usa este documento. Vincular em vez de criar outro.',
            existingPartnerId: opcoes.documentoRepetido,
          }),
          { status: 409, headers: { 'content-type': 'application/problem+json' } },
        )
      }
      const enviado = (chamadas[chamadas.length - 1]?.corpo ?? {}) as Record<string, unknown>
      return json({ ...parceiro(), ...enviado }, 201)
    }
    // Vincular a empresa a um cadastro que já existe no grupo.
    if (caminho.endsWith('/link') && metodo === 'POST') {
      return json(parceiro(), 201)
    }
    // O contrato responde 200 com o `PartnerDto` atualizado — não 204 vazio.
    if (caminho.startsWith(`${URL_PARCEIROS}/`) && metodo === 'PUT') {
      const enviado = (chamadas[chamadas.length - 1]?.corpo ?? {}) as Record<string, unknown>
      return json({ ...parceiro(), ...enviado })
    }
    throw new Error(`fetch sem stub no teste: ${metodo} ${url}`)
  }

  return { stub, chamadas }
}

/** `application/problem+json` (RFC 9457), a forma de erro que o contrato exige. */
function problemaDeParceiro(status: number, detail: string): Response {
  return new Response(JSON.stringify({ type: 'about:blank', title: 'Erro', status, detail }), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  })
}

/** Sessão válida + listagem e detalhe de parceiros; outro caminho rejeita alto. */
export function stubDeParceiros(linhas: readonly unknown[] = [parceiro()]): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
    if (caminho === '/api/catalog-lookups') return Promise.resolve(respostaLookups())
    if (caminho === URL_PARCEIROS) {
      return Promise.resolve(json({ rows: linhas, total: linhas.length }))
    }
    if (caminho.startsWith(`${URL_PARCEIROS}/`)) {
      const id = caminho.slice(URL_PARCEIROS.length + 1)
      const achado = linhas.find((l) => (l as { id?: string }).id === id)
      return Promise.resolve(
        achado ? json(achado) : problemaDeParceiro(404, 'Parceiro não encontrado.'),
      )
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}
