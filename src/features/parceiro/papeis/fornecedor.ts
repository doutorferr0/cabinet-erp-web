import type { PartnerDto } from '@/api/gerado'
import { enderecoDoContrato, enderecoOuNulo } from '@/data/parceiros-api'
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
    // O `Telefone` obrigatório do Fornecedor é o COMERCIAL, e é assim que ele
    // viaja (#244). Fornecedor não tem celular nem residencial no cadastro —
    // `mobilePhone` e `homePhone` existem no contrato e esta tela não os toca,
    // então `corpoDeEscrita` os devolve como vieram.
    fone1: dto.businessPhone ?? '',
    fax: dto.fax ?? '',
    endereco: enderecoDoContrato(dto.address),
  }
}

export const papelFornecedor: PapelDeCadastro<Fornecedor> = {
  role: 'supplier',
  rota: '/cadastros/fornecedores',
  queryKeyListagem: ['fornecedores'],
  camposDeEdicao: 'Razão Social, Nome Fantasia, CNPJ/CPF, E-mail, Telefone, Fax, Endereço e Ativo',
  vazio: fornecedorVazio,
  dtoParaForm,
  paraEscrita: (values) => ({
    legalName: values.razaoSocial,
    tradeName: values.nomeFantasia,
    document: values.cnpjCpf,
    email: values.email,
    active: values.ativo,
    businessPhone: values.fone1,
    fax: values.fax,
    address: enderecoOuNulo(values.endereco),
  }),
  paraInclusao: (values) => ({
    legalName: values.razaoSocial,
    tradeName: values.nomeFantasia,
    document: values.cnpjCpf,
    email: values.email,
    active: values.ativo,
    businessPhone: values.fone1,
    fax: values.fax,
    address: enderecoOuNulo(values.endereco),
  }),
}
