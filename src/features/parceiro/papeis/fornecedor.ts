import type { PartnerDto } from '@/api/gerado'
import {
  enderecoDoContrato,
  enderecoParaContrato,
  textoOuNulo,
} from '@/features/parceiro/papeis/contato-e-endereco'
import type { PapelDeCadastro } from '@/features/parceiro/usar-parceiro'
import { type Fornecedor, fornecedorVazio } from '@/mocks/fornecedores'

/**
 * Linha da listagem → registro do formulário.
 *
 * Base em `fornecedorVazio`: o que o `PartnerDto` não cobre nasce em branco, e é
 * assim que deve ficar. Herdar de mock daria dado de mentira com cara de dado do
 * servidor. O `id` numérico do mock fica em 0 — a chave real é o uuid, e quem o
 * guarda é a rota, não o formulário.
 */
function dtoParaForm(dto: PartnerDto): Fornecedor {
  return {
    ...fornecedorVazio(0),
    razaoSocial: dto.legalName,
    nomeFantasia: dto.tradeName ?? '',
    cnpjCpf: dto.document ?? '',
    email: dto.email ?? '',
    ativo: dto.active,
    // Contato e endereço (#244). A tela de Fornecedor desenha `Fone 1`,
    // `Fone 2`, `FAX` e o bloco de Endereço; celular e telefone residencial ela
    // não tem, e por isso não aparecem aqui nem viajam na escrita.
    fone1: dto.businessPhone ?? '',
    fax: dto.fax ?? '',
    endereco: enderecoDoContrato(dto.address),
  }
}

/**
 * Formulário → campos editáveis.
 *
 * **`fone2` fica de fora, declarado e não escondido:** o contrato publica
 * quatro telefones e nenhum deles é "o segundo comercial". Mandá-lo em
 * `homePhone` gravaria um residencial que ninguém digitou; mandá-lo em
 * `mobilePhone` inventaria um celular. Ele continua vivo no schema local, e o
 * dia em que o contrato publicar um quinto telefone, é aqui que ele se liga.
 *
 * `mobilePhone` e `homePhone` são OMITIDOS de propósito na edição: omitir é o
 * que faz `corpoDeEscrita` devolvê-los como vieram. O celular que o Cliente
 * gravou não pode sumir porque o mesmo cadastro foi editado pela tela de
 * Fornecedores — é a mesma tabela, com três telas.
 */
function contatoEEndereco(values: Fornecedor) {
  return {
    businessPhone: textoOuNulo(values.fone1),
    fax: textoOuNulo(values.fax),
    address: enderecoParaContrato(values.endereco),
  }
}

export const papelFornecedor: PapelDeCadastro<Fornecedor> = {
  role: 'supplier',
  rota: '/cadastros/fornecedores',
  queryKeyListagem: ['fornecedores'],
  camposDeEdicao: 'Razão Social, Nome Fantasia, CNPJ/CPF, E-mail, Fone 1, FAX, Endereço e Ativo',
  vazio: fornecedorVazio,
  dtoParaForm,
  paraEscrita: (values) => ({
    legalName: values.razaoSocial,
    tradeName: values.nomeFantasia,
    document: values.cnpjCpf,
    email: values.email,
    active: values.ativo,
    ...contatoEEndereco(values),
  }),
  paraInclusao: (values) => ({
    legalName: values.razaoSocial,
    tradeName: values.nomeFantasia,
    document: values.cnpjCpf,
    email: values.email,
    active: values.ativo,
    ...contatoEEndereco(values),
  }),
}
