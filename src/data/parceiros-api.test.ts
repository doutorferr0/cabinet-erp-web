import { data } from '@/data'
import { ErroDaApi } from '@/data/api-provider'
import {
  ORDENAVEIS,
  URL_PARCEIROS,
  atualizarParceiro,
  corpoDeDesativacao,
  corpoDeEscrita,
  corpoDeInclusao,
  idDoParceiroExistente,
  incluirParceiro,
  parceiros,
  vincularParceiro,
} from '@/data/parceiros-api'
import { parceiro } from '@/test/parceiros'
import { instalarServidor, json, problema } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Contrato da fronteira de parceiros — uma tabela, três papéis.
 *
 * Vale aqui a mesma promessa que `provider.test.ts` cobra dos providers mock
 * (paginação 1-based, total pós-filtro). O `get` entrou quando o backend
 * publicou `GET /api/partners/{id}` (`#35`) — antes disso, a AUSÊNCIA dele é que
 * era asserida, para `get` mock não conviver com listagem real.
 */

/** Campos que as telas editam — o recorte do corpo de escrita. */
const CAMPOS = {
  legalName: 'X',
  tradeName: 'Y',
  document: '1',
  email: 'a@b.c',
  active: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listagem por papel', () => {
  it('manda o papel da tela junto com a consulta da tabela', async () => {
    const servidor = instalarServidor({
      [URL_PARCEIROS]: () => json({ rows: [parceiro()], total: 40 }),
    })

    const pagina = await parceiros('supplier', () => null).list(
      tableState({ q: 'stella', sort: { id: 'legalName', desc: true }, page: 3 }),
    )

    const url = new URL(servidor.em(URL_PARCEIROS)[0]?.url as string)
    expect(url.searchParams.get('role')).toBe('supplier')
    expect(url.searchParams.get('q')).toBe('stella')
    expect(url.searchParams.get('sortBy')).toBe('legalName')
    expect(url.searchParams.get('sortDesc')).toBe('true')
    expect(url.searchParams.get('page')).toBe('3')

    // Total pós-filtro do servidor, dentro do RLS — nunca o tamanho da página.
    expect(pagina.rows).toHaveLength(1)
    expect(pagina.total).toBe(40)
  })

  it.each([
    ['clientes', 'customer'],
    ['fornecedores', 'supplier'],
    ['profissionais', 'professional'],
  ] as const)('%s pede role=%s', async (recurso, papel) => {
    const servidor = instalarServidor({ [URL_PARCEIROS]: () => json({ rows: [], total: 0 }) })

    await data[recurso].list(tableState())

    // Papel fora da lista é 400 no backend, não filtro ignorado: a tela de
    // Fornecedores mostraria clientes e a lista cheia não denunciaria nada.
    const url = new URL(servidor.em(URL_PARCEIROS)[0]?.url as string)
    expect(url.searchParams.get('role')).toBe(papel)
  })

  it('falha do servidor REJEITA, com o detail do problem+json', async () => {
    instalarServidor({
      [URL_PARCEIROS]: () => problema(409, 'Nenhuma empresa ativa na sessão.'),
    })

    const erro = (await data.fornecedores.list(tableState()).catch((e: unknown) => e)) as ErroDaApi
    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(409)
    expect(erro.detail).toBe('Nenhuma empresa ativa na sessão.')
  })
})

describe('escrita', () => {
  // `PUT` substitui o registro inteiro. O que a tela não mostra tem de voltar
  // como veio — senão gravar um Fornecedor apagaria o papel de Cliente do mesmo
  // parceiro, e o operador só descobriria na outra listagem.
  it('devolve intacto o que a tela não edita', () => {
    const original = parceiro({
      code: 'F001',
      paymentTerms: '30/60/90',
      isCustomer: true,
      isSupplier: true,
      // Entraram no contrato em 2026-08-13 e SÓ a tela de Profissional Externo
      // os edita. Gravar por Cliente ou Fornecedor não pode apagá-los.
      registration: 'CREA 12345-6',
      payoutBankInfo: {
        bankNumber: '341',
        bankName: 'ITAÚ',
        branchNumber: '1234',
        accountNumber: '56789-0',
      },
    })

    const corpo = corpoDeEscrita(original, {
      legalName: 'NOVA RAZÃO',
      tradeName: 'NOVO FANTASIA',
      document: '99999999000199',
      email: 'novo@teste.com',
      active: false,
    })

    expect(corpo).toEqual({
      legalName: 'NOVA RAZÃO',
      tradeName: 'NOVO FANTASIA',
      document: '99999999000199',
      email: 'novo@teste.com',
      active: false,
      code: 'F001',
      paymentTerms: '30/60/90',
      isCustomer: true,
      isSupplier: true,
      isProfessional: false,
      registration: 'CREA 12345-6',
      payoutBankInfo: {
        bankNumber: '341',
        bankName: 'ITAÚ',
        branchNumber: '1234',
        accountNumber: '56789-0',
      },
      // Hierarquia pai/filho (#91): nenhuma das três telas tem campo para ela,
      // então ela viaja de volta pela mesma regra do `code` e do `registration`.
      parentId: null,
      // Contato e endereço (#244), na mesma regra: a tela de Fornecedores não
      // desenha celular, e gravar por ela não pode apagar o do Cliente.
      mobilePhone: null,
      businessPhone: null,
      homePhone: null,
      fax: null,
      address: null,
      // Fase 1 (#250): a linha do helper é o cadastro sem nenhum deles, e o
      // que este `toEqual` garante é que as CHAVES estão no corpo — com `PUT`
      // integral, chave ausente é chave apagada.
      stateRegistration: null,
      ruralProducerRegistration: null,
      categoryId: null,
      specifierId: null,
      notes: null,
      facebook: null,
      instagram: null,
      // Fase A0 de COMPRAS (G2), pela MESMA razão: nenhuma tela edita prazo de
      // entrega nem faturamento mínimo, e é justamente por isso que eles têm de
      // estar no corpo. As duas COLEÇÕES voltam `[]` e não `null` — o contrato
      // as declara array, e um `null` ali seria um tipo que o servidor recusa.
      deliveryDays: null,
      minimumBillingCents: null,
      buyingCompanies: [],
      groupMinimums: [],
      // Bloco 2 (#255): nenhuma tela os edita ainda, e é por isso que estar no
      // corpo importa — `PUT` integral apaga a chave que não vier.
      billingAddress: null,
      businessAddress: null,
      businessName: null,
      businessRole: null,
      businessDocument: null,
      foundedOn: null,
      personType: null,
      identityDocument: null,
      identityIssuer: null,
      identityIssuerState: null,
      gender: null,
      birthDate: null,
    })
  })

  // O caminho por onde a perda mais doeria: o `Excluir` da listagem é um `PUT`
  // montado a partir da LINHA, e a listagem de Clientes nem mostra registro
  // profissional. Sem preservar, desativar um profissional pela tela errada
  // apagaria o conselho e a conta bancária dele.
  it('a tela que NÃO edita o registro profissional também não o apaga', () => {
    const original = parceiro({
      isProfessional: true,
      registration: 'CAU A98765-4',
      payoutBankInfo: {
        bankNumber: '001',
        bankName: 'BANCO DO BRASIL',
        branchNumber: '4321',
        accountNumber: '11111-1',
      },
    })

    const corpo = corpoDeEscrita(original, {
      legalName: original.legalName,
      tradeName: original.tradeName,
      document: original.document,
      email: original.email,
      active: false,
    })

    expect(corpo.registration).toBe('CAU A98765-4')
    expect(corpo.payoutBankInfo).toEqual(original.payoutBankInfo)
  })

  // O contrário também precisa valer: quem EDITA manda o valor, inclusive para
  // limpar. `null` explícito é "apaga a conta", e não pode ser confundido com
  // "a tela não tem o campo".
  it('a tela que edita manda o valor, e null apaga de verdade', () => {
    const original = parceiro({
      registration: 'CREA 1',
      payoutBankInfo: {
        bankNumber: '033',
        bankName: 'SANTANDER',
        branchNumber: '1',
        accountNumber: '1',
      },
    })

    const corpo = corpoDeEscrita(original, {
      legalName: original.legalName,
      tradeName: original.tradeName,
      document: original.document,
      email: original.email,
      active: true,
      registration: '',
      payoutBankInfo: null,
    })

    expect(corpo.registration).toBe('')
    expect(corpo.payoutBankInfo).toBeNull()
  })

  it('manda PUT no id e devolve o registro que o servidor gravou', async () => {
    const servidor = instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () => json(parceiro({ legalName: 'GRAVADO' })),
    })

    const salvo = await atualizarParceiro(parceiro().id, corpoDeEscrita(parceiro(), CAMPOS))

    expect(servidor.em(`${URL_PARCEIROS}/${parceiro().id}`)[0]?.metodo).toBe('PUT')
    expect(salvo.legalName).toBe('GRAVADO')
  })

  // 403 é o RLS recusando escopo: a empresa da sessão não é a do registro.
  it('403 rejeita com o detail do servidor', async () => {
    instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () => problema(403, 'Parceiro fora da empresa ativa.'),
    })

    const erro = (await atualizarParceiro(parceiro().id, corpoDeEscrita(parceiro(), CAMPOS)).catch(
      (e: unknown) => e,
    )) as ErroDaApi
    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(403)
    expect(erro.detail).toBe('Parceiro fora da empresa ativa.')
  })

  it.each([
    ['customer', { isCustomer: true, isSupplier: false, isProfessional: false }],
    ['supplier', { isCustomer: false, isSupplier: true, isProfessional: false }],
    ['professional', { isCustomer: false, isSupplier: false, isProfessional: true }],
  ] as const)('inclusão por %s marca só o papel da tela', (papel, esperado) => {
    // O schema exige ao menos um papel; marcar os três faria todo cadastro novo
    // aparecer nas três listagens.
    expect(corpoDeInclusao(papel, CAMPOS)).toMatchObject(esperado)
  })

  it('inclusão nasce sem código nem prazo — são do vínculo, e a tela não os tem', () => {
    expect(corpoDeInclusao('supplier', CAMPOS)).toMatchObject({ code: null, paymentTerms: null })
  })

  // 409 no POST é documento já cadastrado (índice único em partners.document).
  it('409 na inclusão chega com o detail do servidor', async () => {
    instalarServidor({
      [URL_PARCEIROS]: () => problema(409, 'Documento já cadastrado nesta organização.'),
    })

    const erro = (await incluirParceiro(corpoDeInclusao('supplier', CAMPOS)).catch(
      (e: unknown) => e,
    )) as ErroDaApi
    expect(erro.status).toBe(409)
    expect(erro.detail).toBe('Documento já cadastrado nesta organização.')
  })

  // Resposta vazia NÃO é sucesso silencioso: o contrato descreve `200` com o
  // `PartnerDto`, e aceitar corpo vazio seria aceitar resposta não descrita.
  it('corpo vazio no 200 é falha, não sucesso', async () => {
    instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () => new Response('', { status: 204 }),
    })

    await expect(
      atualizarParceiro(parceiro().id, corpoDeEscrita(parceiro(), CAMPOS)),
    ).rejects.toBeInstanceOf(ErroDaApi)
  })
})

describe('documento repetido no grupo', () => {
  const OUTRO = '11111111-1111-4111-8111-111111111111'

  function problemaDeDocumento(id?: string) {
    return new Response(
      JSON.stringify({
        type: 'about:blank',
        title: 'Documento já cadastrado no grupo',
        status: 409,
        detail: 'Vincular em vez de criar outro.',
        ...(id ? { existingPartnerId: id } : {}),
      }),
      { status: 409, headers: { 'content-type': 'application/problem+json' } },
    )
  }

  // Sem a extensão da RFC 9457 a tela teria uma frase descrevendo a saída sem
  // poder tomá-la — o `detail` diz "vincule", mas com quem?
  it('o 409 entrega o id do cadastro que já existe', async () => {
    instalarServidor({ [URL_PARCEIROS]: () => problemaDeDocumento(OUTRO) })

    const erro = await incluirParceiro(corpoDeInclusao('supplier', CAMPOS)).catch((e: unknown) => e)
    expect(idDoParceiroExistente(erro)).toBe(OUTRO)
  })

  it('409 sem a extensão não inventa id', async () => {
    instalarServidor({ [URL_PARCEIROS]: () => problemaDeDocumento() })

    const erro = await incluirParceiro(corpoDeInclusao('supplier', CAMPOS)).catch((e: unknown) => e)
    expect(idDoParceiroExistente(erro)).toBeNull()
  })

  it('erro que não é 409 não vira convite para vincular', async () => {
    instalarServidor({ [URL_PARCEIROS]: () => problema(403, 'Sem escopo.') })

    const erro = await incluirParceiro(corpoDeInclusao('supplier', CAMPOS)).catch((e: unknown) => e)
    expect(idDoParceiroExistente(erro)).toBeNull()
  })

  // Vincular NÃO edita: o corpo só leva o que é do VÍNCULO. Aceitar campos do
  // cadastro faria vincular virar caminho para sobrescrever em silêncio a razão
  // social que a empresa vizinha cadastrou.
  it('vincular manda só o que é do vínculo', async () => {
    const servidor = instalarServidor({
      [`${URL_PARCEIROS}/${OUTRO}/link`]: () => json(parceiro(), 201),
    })

    await vincularParceiro(OUTRO, true)

    const chamada = servidor.em(`${URL_PARCEIROS}/${OUTRO}/link`)[0]
    expect(chamada?.metodo).toBe('POST')
    expect(chamada?.corpo).toEqual({ code: null, paymentTerms: null, active: true })
  })
})

describe('desativação (o Excluir da listagem)', () => {
  // A promessa do padrão 8: `Excluir` na UI de cadastro NUNCA apaga. E como o
  // `PUT` substitui o registro inteiro, desativar não pode ser desculpa para
  // zerar o resto — o corpo tem de ser a linha de volta com `active: false`.
  it('muda SÓ o active, devolvendo o resto da linha como veio', () => {
    const linha = parceiro({
      code: 'C007',
      paymentTerms: '30/60/90',
      isCustomer: true,
      isSupplier: true,
      tradeName: 'STELLA',
    })

    const corpo = corpoDeDesativacao(linha)

    expect(corpo).toEqual({
      legalName: linha.legalName,
      tradeName: 'STELLA',
      document: linha.document,
      email: linha.email,
      code: 'C007',
      paymentTerms: '30/60/90',
      isCustomer: true,
      isSupplier: true,
      isProfessional: false,
      active: false,
      // Desativar não é apagar cadastro: o que a linha traz volta como veio.
      registration: linha.registration ?? null,
      payoutBankInfo: linha.payoutBankInfo ?? null,
      // Inclusive a hierarquia (#91): o `Excluir` da listagem é um `PUT`
      // montado da LINHA, e desativar um arquiteto não pode desligá-lo do
      // escritório — quem reativar depois encontraria o vínculo perdido.
      parentId: linha.parentId ?? null,
      // E o contato e o endereço (#244): desativar um cliente não pode apagar
      // onde ele mora. Quem reativa depois encontraria a ficha esvaziada.
      mobilePhone: linha.mobilePhone ?? null,
      businessPhone: linha.businessPhone ?? null,
      homePhone: linha.homePhone ?? null,
      fax: linha.fax ?? null,
      address: linha.address ?? null,
      // E os sete da fase 1 (#250), pela mesma razão: desativar um cliente não
      // pode levar junto a categoria, quem o indicou e a observação da equipe.
      stateRegistration: linha.stateRegistration ?? null,
      ruralProducerRegistration: linha.ruralProducerRegistration ?? null,
      categoryId: linha.categoryId ?? null,
      specifierId: linha.specifierId ?? null,
      notes: linha.notes ?? null,
      facebook: linha.facebook ?? null,
      instagram: linha.instagram ?? null,
      // E a fase A0 de COMPRAS (G2): desativar um fornecedor não pode levar
      // junto o faturamento mínimo que o comprador negociou nem o histórico de
      // empresa compradora — quem reativar depois encontraria a ficha esvaziada,
      // e a próxima ordem passaria sem validação nenhuma.
      deliveryDays: linha.deliveryDays ?? null,
      minimumBillingCents: linha.minimumBillingCents ?? null,
      buyingCompanies: linha.buyingCompanies ?? [],
      groupMinimums: linha.groupMinimums ?? [],
      // E o bloco 2 (#255): desativar um cliente não pode apagar o endereço de
      // cobrança dele — quem reativar depois encontraria a ficha esvaziada.
      billingAddress: linha.billingAddress ?? null,
      businessAddress: linha.businessAddress ?? null,
      businessName: linha.businessName ?? null,
      businessRole: linha.businessRole ?? null,
      businessDocument: linha.businessDocument ?? null,
      foundedOn: linha.foundedOn ?? null,
      personType: linha.personType ?? null,
      identityDocument: linha.identityDocument ?? null,
      identityIssuer: linha.identityIssuer ?? null,
      identityIssuerState: linha.identityIssuerState ?? null,
      gender: linha.gender ?? null,
      birthDate: linha.birthDate ?? null,
    })
  })

  it('vai como PUT no id da linha', async () => {
    const servidor = instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () => json(parceiro({ active: false })),
    })

    const salvo = await atualizarParceiro(parceiro().id, corpoDeDesativacao(parceiro()))

    const chamada = servidor.em(`${URL_PARCEIROS}/${parceiro().id}`)[0]
    expect(chamada?.metodo).toBe('PUT')
    expect(chamada?.corpo).toMatchObject({ active: false })
    expect(salvo.active).toBe(false)
  })
})

describe('leitura por id (link direto e recarga)', () => {
  // A entrada do registry ficou SEM `get` enquanto o contrato não tinha leitura
  // por id — `get` mock ao lado de listagem real casaria uuid do servidor com id
  // inventado. Com o `#35` do backend, o `get` passou a ser de verdade.
  it.each(['clientes', 'fornecedores', 'profissionais'] as const)(
    '%s expõe get, agora que GET /api/partners/{id} existe',
    (recurso) => {
      expect(typeof data[recurso].get).toBe('function')
    },
  )

  it('busca no endpoint do contrato e devolve o PartnerDto', async () => {
    const servidor = instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () => json(parceiro({ legalName: 'DO SERVIDOR' })),
    })

    const achado = await data.clientes.get(parceiro().id)

    expect(servidor.em(`${URL_PARCEIROS}/${parceiro().id}`)[0]?.metodo).toBe('GET')
    expect(achado?.legalName).toBe('DO SERVIDOR')
  })

  it('404 devolve null — o parceiro não está lá', async () => {
    instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () =>
        problema(404, 'Parceiro não encontrado.', 'Not Found'),
    })

    await expect(data.fornecedores.get(parceiro().id)).resolves.toBeNull()
  })

  // 409 é "nenhuma empresa ativa na sessão". Virar `null` diria "esse parceiro
  // não existe" a quem só não escolheu empresa.
  it('409 REJEITA com o detail do servidor, não vira "não encontrado"', async () => {
    instalarServidor({
      [`${URL_PARCEIROS}/${parceiro().id}`]: () =>
        problema(409, 'Nenhuma empresa ativa na sessão.'),
    })

    const erro = (await data.profissionais.get(parceiro().id).catch((e: unknown) => e)) as ErroDaApi
    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(409)
    expect(erro.detail).toBe('Nenhuma empresa ativa na sessão.')
  })

  it('o registro em branco do Incluir continua local', () => {
    expect(data.fornecedores.empty(1)).toHaveProperty('id', 1)
    expect(data.clientes.empty(2)).toHaveProperty('id', 2)
    expect(data.profissionais.empty(3)).toHaveProperty('id', 3)
  })
})

describe('whitelist de ordenação', () => {
  // Espelha `PartnerEndpoints.Ordenaveis` do backend. Coluna chaveada fora desta
  // lista responde 400 ao clicar no cabeçalho — `paymentTerms`, `email` e
  // `registrationActive` estão de fora de propósito.
  //
  // `parentId` entrou em 2026-08-14 com a hierarquia pai/filho (#91): ordenar
  // por uuid não serve a ninguém, mas a whitelist do contrato é UMA só para
  // `sortBy` e `filters`, e é como `filters` que a tela do pai pede os filhos.
  it('é a mesma lista que o backend aceita', () => {
    expect(ORDENAVEIS).toEqual(['code', 'legalName', 'tradeName', 'document', 'active', 'parentId'])
  })
})
