import type { PartnerDto } from '@/api/gerado'
import { corpoDeEscrita } from '@/data/parceiros-api'
import { papelCliente } from '@/features/parceiro/papeis/cliente'
import { enderecoParaContrato } from '@/features/parceiro/papeis/contato-e-endereco'
import { papelFornecedor } from '@/features/parceiro/papeis/fornecedor'
import { papelProfissional } from '@/features/parceiro/papeis/profissional'
import { parceiro } from '@/test/parceiros'
import { describe, expect, it } from 'vitest'

/**
 * IDA E VOLTA DE CONTATO E ENDEREÇO (#244).
 *
 * O defeito que originou a issue foi medido no par local: o operador preencheu
 * `Celular` no cadastro de cliente, gravou, e o valor não voltou. Não era bug de
 * tela — o corpo do `POST` é montado a partir do CONTRATO, e o contrato não
 * publicava o campo, então ele era descartado no caminho, em silêncio.
 *
 * Cobrir só o contrato não fecharia isso: o campo publicado e não traduzido pelo
 * papel dá exatamente o mesmo silêncio. Por isso a volta é medida de ponta a
 * ponta — `PartnerDto` → formulário → corpo do `PUT` —, e por campo, que é a
 * única forma de pegar `district` gravado onde vai `street`.
 */

const ENDERECO_COMPLETO = {
  zipCode: '13010001',
  street: 'RUA BARÃO DE JAGUARA',
  number: '1200',
  complement: 'SALA 8',
  district: 'CENTRO',
  city: 'CAMPINAS',
  state: 'SP',
}

/** Um parceiro como o servidor o devolve, com contato e endereço preenchidos. */
function linhaCompleta(over: Record<string, unknown> = {}): PartnerDto {
  return parceiro({
    mobilePhone: '19998887766',
    businessPhone: '1933334444',
    homePhone: '1933335555',
    fax: '1933336666',
    address: ENDERECO_COMPLETO,
    ...over,
  }) as PartnerDto
}

describe('cliente — a tela que mediu o defeito', () => {
  it('lê os quatro telefones e as sete linhas do endereço', () => {
    const form = papelCliente.dtoParaForm(linhaCompleta())

    expect(form.celular).toBe('19998887766')
    expect(form.foneComercial).toBe('1933334444')
    expect(form.foneResidencial).toBe('1933335555')
    expect(form.fax).toBe('1933336666')
    // Campo a campo: um mapa trocado (bairro na rua) passaria por uma asserção
    // de objeto inteiro montada a partir do mesmo mapa errado.
    expect(form.endereco.cep).toBe('13010001')
    expect(form.endereco.logradouro).toBe('RUA BARÃO DE JAGUARA')
    expect(form.endereco.numero).toBe('1200')
    expect(form.endereco.complemento).toBe('SALA 8')
    expect(form.endereco.bairro).toBe('CENTRO')
    expect(form.endereco.cidadeNome).toBe('CAMPINAS')
    expect(form.endereco.uf).toBe('SP')
  })

  it('grava o que o operador digitou — a volta que faltava', () => {
    const linha = linhaCompleta()
    const form = papelCliente.dtoParaForm(linha)
    form.celular = '19911112222'
    form.endereco.numero = '1500'

    const corpo = corpoDeEscrita(linha, papelCliente.paraEscrita(form, linha))

    expect(corpo.mobilePhone).toBe('19911112222')
    expect(corpo.address).toEqual({ ...ENDERECO_COMPLETO, number: '1500' })
  })

  it('a INCLUSÃO leva contato e endereço, não só o nome', () => {
    // O caso exato da issue: cadastro NOVO pela tela de Cliente. Aqui não há
    // linha anterior para preservar nada — o que a tela não mandar nasce nulo.
    const form = papelCliente.dtoParaForm(linhaCompleta())
    const editaveis = papelCliente.paraInclusao(form)

    expect(editaveis.mobilePhone).toBe('19998887766')
    expect(editaveis.address).toEqual(ENDERECO_COMPLETO)
  })

  it('campo em branco volta como NULO, não como texto vazio', () => {
    const linha = linhaCompleta({ homePhone: null })
    const form = papelCliente.dtoParaForm(linha)

    // `dtoParaForm` faz `?? ''` porque input controlado precisa de string;
    // devolver `''` trocaria "não informado" por "texto vazio" a cada Gravar.
    expect(form.foneResidencial).toBe('')
    expect(papelCliente.paraEscrita(form, linha).homePhone).toBeNull()
  })
})

describe('endereço parcial e endereço nenhum', () => {
  it('cidade e UF sem o resto ATRAVESSAM — é o que vem do legado', () => {
    const parcial = {
      zipCode: null,
      street: null,
      number: null,
      complement: null,
      district: null,
      city: 'SÃO PAULO',
      state: 'SP',
    }
    const linha = linhaCompleta({ address: parcial })
    const form = papelCliente.dtoParaForm(linha)

    expect(form.endereco.cidadeNome).toBe('SÃO PAULO')
    expect(form.endereco.cep).toBe('')
    expect(papelCliente.paraEscrita(form, linha).address).toEqual(parcial)
  })

  it('bloco inteiro em branco vira `null`, não um endereço vazio', () => {
    // Sete nulos gravados são um endereço que EXISTE e não leva a lugar nenhum,
    // e a tela mostraria o bloco como preenchido. Mesma decisão da conta de
    // comissão do profissional.
    expect(
      enderecoParaContrato({
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '   ',
        bairro: '',
        cidadeCodigo: 'lk-CIDADE-12',
        cidadeNome: '',
        uf: null,
      }),
    ).toBeNull()
  })

  it('`cidadeCodigo` não viaja: `city` é TEXTO no contrato', () => {
    const address = enderecoParaContrato({
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidadeCodigo: 'lk-CIDADE-12',
      cidadeNome: 'JUNDIAÍ',
      uf: 'SP',
    })

    // Gravar o id no lugar do nome poria `lk-CIDADE-12` na ficha do cliente.
    expect(address?.city).toBe('JUNDIAÍ')
    expect(JSON.stringify(address)).not.toContain('lk-CIDADE-12')
  })
})

describe('uma tabela, três telas — quem não edita não apaga', () => {
  it('gravar pela tela de Fornecedor preserva celular e residencial', () => {
    // A tela de Fornecedores tem `Fone 1`, `Fone 2` e `FAX`, e nenhum campo de
    // celular. O mesmo cadastro pode ser cliente: o celular que o Cliente
    // gravou não pode sumir porque alguém editou o prazo de entrega.
    const linha = linhaCompleta({ isSupplier: true, isCustomer: true })
    const form = papelFornecedor.dtoParaForm(linha)

    const corpo = corpoDeEscrita(linha, papelFornecedor.paraEscrita(form, linha))

    expect(corpo.mobilePhone).toBe('19998887766')
    expect(corpo.homePhone).toBe('1933335555')
    // O que ela EDITA, ela manda: `fone1` é o comercial do contrato.
    expect(corpo.businessPhone).toBe('1933334444')
    expect(corpo.address).toEqual(ENDERECO_COMPLETO)
  })

  it('o profissional lê e grava os telefones de dentro de `telefones.*`', () => {
    const linha = linhaCompleta({ isProfessional: true })
    const form = papelProfissional.dtoParaForm(linha)

    expect(form.telefones.celular).toBe('19998887766')
    expect(form.telefones.foneComercial).toBe('1933334444')

    form.telefones.celular = '19900001111'
    const corpo = corpoDeEscrita(linha, papelProfissional.paraEscrita(form, linha))
    expect(corpo.mobilePhone).toBe('19900001111')
  })

  it('o endereço da AGÊNCIA não vaza para o endereço do parceiro', () => {
    // O profissional tem dois endereços no schema local e o contrato publica um.
    // Trocar os dois gravaria a agência como a casa dele — campo preenchido,
    // valor errado, e ninguém veria.
    const linha = linhaCompleta({ isProfessional: true })
    const form = papelProfissional.dtoParaForm(linha)
    form.enderecoBanco = {
      cep: '04538133',
      logradouro: 'AV BRIG FARIA LIMA',
      numero: '3400',
      complemento: '',
      bairro: 'ITAIM',
      cidadeCodigo: null,
      cidadeNome: 'SÃO PAULO',
      uf: 'SP',
    }

    const corpo = corpoDeEscrita(linha, papelProfissional.paraEscrita(form, linha))

    expect(corpo.address).toEqual(ENDERECO_COMPLETO)
  })
})
