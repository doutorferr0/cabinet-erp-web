import type { PartnerDto } from '@/api/gerado'
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
  }
}

export const papelFornecedor: PapelDeCadastro<Fornecedor> = {
  role: 'supplier',
  rota: '/cadastros/fornecedores',
  queryKeyListagem: ['fornecedores'],
  camposDeEdicao: 'Razão Social, Nome Fantasia, CNPJ/CPF, E-mail e Ativo',
  vazio: fornecedorVazio,
  dtoParaForm,
  paraEscrita: (values) => ({
    legalName: values.razaoSocial,
    tradeName: values.nomeFantasia,
    document: values.cnpjCpf,
    email: values.email,
    active: values.ativo,
  }),
  paraInclusao: (values) => ({
    legalName: values.razaoSocial,
    tradeName: values.nomeFantasia,
    document: values.cnpjCpf,
    email: values.email,
    active: values.ativo,
  }),
}
