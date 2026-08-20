import type { PartnerDto } from '@/api/gerado'
import { enderecoDoContrato, enderecoOuNulo } from '@/data/parceiros-api'
import type { PapelDeCadastro } from '@/features/parceiro/usar-parceiro'
import { type Profissional, profissionalVazio } from '@/mocks/profissionais'

/**
 * Linha da listagem → registro do formulário.
 *
 * Base em `profissionalVazio`: o que o `PartnerDto` não cobre nasce em branco,
 * e é assim que deve ficar. Herdar de mock daria dado de mentira com cara de
 * dado do servidor. O `id` numérico do mock fica em 0 — a chave real é o uuid,
 * e quem o guarda é a rota, não o formulário.
 */
function dtoParaForm(dto: PartnerDto): Profissional {
  return {
    ...profissionalVazio(0),
    nome: dto.legalName,
    nomeApresentacao: dto.tradeName ?? '',
    cpf: dto.document ?? '',
    email: dto.email ?? '',
    ativo: dto.active,
    // O conselho é do PROFISSIONAL, não da empresa que o contrata: `registration`
    // mora no cadastro, não no vínculo (contrato `Proposto`, 2026-08-13).
    registroProfissional: dto.registration ?? '',
    // A conta vem inteira ou não vem: parceiro sem conta cadastrada manda
    // `payoutBankInfo: null`, e os quatro campos ficam em branco juntos.
    numeroBanco: dto.payoutBankInfo?.bankNumber ?? '',
    nomeBanco: dto.payoutBankInfo?.bankName ?? '',
    numeroAgencia: dto.payoutBankInfo?.branchNumber ?? '',
    numeroConta: dto.payoutBankInfo?.accountNumber ?? '',
    // Os quatro telefones do Profissional moram sob `telefones.` no schema da
    // tela e são campos planos no contrato (#244) — o prefixo é do formulário,
    // não do servidor.
    telefones: {
      celular: dto.mobilePhone ?? '',
      foneComercial: dto.businessPhone ?? '',
      foneResidencial: dto.homePhone ?? '',
      fax: dto.fax ?? '',
    },
    // Só o endereço do CADASTRO. `enderecoBanco` continua sem lastro: o
    // contrato publica um endereço por parceiro, e a descrição do
    // `PartnerPayoutBankInfo` diz por quê.
    endereco: enderecoDoContrato(dto.address),
  }
}

/**
 * A conta só viaja se tiver ALGUMA coisa preenchida.
 *
 * Mandar `{bankNumber:'',bankName:'',…}` gravaria uma conta vazia — registro
 * que existe e não serve para pagar ninguém. O contrato distingue os dois
 * estados de propósito, e quem decide aqui é a tela: quatro campos em branco
 * significam "não tem conta", não "tem uma conta sem números".
 */
function contaDaComissao(values: Profissional) {
  const conta = {
    bankNumber: values.numeroBanco,
    bankName: values.nomeBanco,
    branchNumber: values.numeroAgencia,
    accountNumber: values.numeroConta,
  }
  return Object.values(conta).some((v) => v.trim() !== '') ? conta : null
}

export const papelProfissional: PapelDeCadastro<Profissional> = {
  role: 'professional',
  rota: '/cadastros/profissionais',
  queryKeyListagem: ['profissionais'],
  camposDeEdicao:
    'Nome, Nome de Apresentação, CPF/CNPJ, E-mail, Telefones, Endereço, Registro Profissional, Dados Bancários e Ativo',
  vazio: profissionalVazio,
  dtoParaForm,
  paraEscrita: (values) => ({
    legalName: values.nome,
    tradeName: values.nomeApresentacao,
    document: values.cpf,
    email: values.email,
    active: values.ativo,
    registration: values.registroProfissional,
    payoutBankInfo: contaDaComissao(values),
    mobilePhone: values.telefones.celular,
    businessPhone: values.telefones.foneComercial,
    homePhone: values.telefones.foneResidencial,
    fax: values.telefones.fax,
    address: enderecoOuNulo(values.endereco),
  }),
  paraInclusao: (values) => ({
    legalName: values.nome,
    tradeName: values.nomeApresentacao,
    document: values.cpf,
    email: values.email,
    active: values.ativo,
    registration: values.registroProfissional,
    payoutBankInfo: contaDaComissao(values),
    mobilePhone: values.telefones.celular,
    businessPhone: values.telefones.foneComercial,
    homePhone: values.telefones.foneResidencial,
    fax: values.telefones.fax,
    address: enderecoOuNulo(values.endereco),
  }),
}
