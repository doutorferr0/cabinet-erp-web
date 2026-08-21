import type { PartnerDto } from '@/api/gerado'
import {
  enderecoDoContrato,
  enderecoParaContrato,
  textoOuNulo,
} from '@/features/parceiro/papeis/contato-e-endereco'
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
    // Contato e endereço (#244). Os quatro telefones do Profissional moram sob
    // `telefones.*` no schema local — o mesmo dado, outro caminho —, e é por
    // isso que a tradução é por campo e não por espalhamento do objeto.
    telefones: {
      celular: dto.mobilePhone ?? '',
      foneComercial: dto.businessPhone ?? '',
      foneResidencial: dto.homePhone ?? '',
      fax: dto.fax ?? '',
    },
    endereco: enderecoDoContrato(dto.address),
    // Fase 1 (#250/#254): redes sociais e observação, que a tela §3 desenha.
    // IE, categoria e especificador NÃO são campos desta tela — `categoryId` é
    // a categoria do CLIENTE (`CATEGORIA_CLIENTE`), e o contrato não publica
    // campo para a categoria do profissional.
    redesSociais: {
      facebook: dto.facebook ?? '',
      instagram: dto.instagram ?? '',
    },
    observacao: dto.notes ?? '',
  }
}

/**
 * Formulário → campos editáveis.
 *
 * **O endereço da AGÊNCIA (`enderecoBanco`) não viaja**, e a ausência é
 * declarada: o contrato publica UM endereço por parceiro, e o próprio
 * `PartnerPayoutBankInfo` já diz por escrito que o endereço do banco fica de
 * fora. Mandá-lo em `address` gravaria a agência no lugar da casa do
 * profissional — o campo existe, o valor estaria errado, e ninguém veria.
 */
function contatoEEndereco(values: Profissional) {
  return {
    mobilePhone: textoOuNulo(values.telefones.celular),
    businessPhone: textoOuNulo(values.telefones.foneComercial),
    homePhone: textoOuNulo(values.telefones.foneResidencial),
    fax: textoOuNulo(values.telefones.fax),
    address: enderecoParaContrato(values.endereco),
    notes: textoOuNulo(values.observacao),
    facebook: textoOuNulo(values.redesSociais.facebook),
    instagram: textoOuNulo(values.redesSociais.instagram),
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
    'Nome, Nome de Apresentação, CPF/CNPJ, E-mail, Registro Profissional, Dados Bancários, Telefones, Endereço, Observação, Redes sociais e Ativo',
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
    ...contatoEEndereco(values),
  }),
  paraInclusao: (values) => ({
    legalName: values.nome,
    tradeName: values.nomeApresentacao,
    document: values.cpf,
    email: values.email,
    active: values.ativo,
    registration: values.registroProfissional,
    payoutBankInfo: contaDaComissao(values),
    ...contatoEEndereco(values),
  }),
}
