import type { PartnerDto } from '@/api/gerado'
import { enderecoDoContrato, enderecoOuNulo } from '@/data/parceiros-api'
import type { PapelDeCadastro } from '@/features/parceiro/usar-parceiro'
import { type Cliente, clienteVazio } from '@/mocks/clientes'

/**
 * Linha da listagem → registro do formulário.
 *
 * Base em `clienteVazio`: o que o `PartnerDto` não cobre nasce em branco, e é
 * assim que deve ficar. Herdar de mock daria dado de mentira com cara de dado do
 * servidor. O `id` numérico do mock fica em 0 — a chave real é o uuid, e quem o
 * guarda é a rota, não o formulário.
 */
function dtoParaForm(dto: PartnerDto): Cliente {
  return {
    ...clienteVazio(0),
    nome: dto.legalName,
    cpf: dto.document ?? '',
    email: dto.email ?? '',
    ativo: dto.active,
    // Contato e endereço passaram a existir no contrato (#244): o que era bloco
    // desenhado sobre o vazio agora carrega o que o servidor guardou.
    celular: dto.mobilePhone ?? '',
    foneComercial: dto.businessPhone ?? '',
    foneResidencial: dto.homePhone ?? '',
    fax: dto.fax ?? '',
    endereco: enderecoDoContrato(dto.address),
  }
}

export const papelCliente: PapelDeCadastro<Cliente> = {
  role: 'customer',
  rota: '/cadastros/clientes',
  queryKeyListagem: ['clientes'],
  camposDeEdicao: 'Nome, CPF/CNPJ, Celular, E-mail, Telefones, Endereço e Ativo',
  vazio: clienteVazio,
  dtoParaForm,
  paraEscrita: (values, linha) => ({
    legalName: values.nome,
    // `tradeName` volta como veio: a tela de Clientes não tem Nome Fantasia,
    // e mandar `null` apagaria o que outra tela gravou.
    tradeName: linha.tradeName,
    document: values.cpf,
    email: values.email,
    active: values.ativo,
    mobilePhone: values.celular,
    businessPhone: values.foneComercial,
    homePhone: values.foneResidencial,
    fax: values.fax,
    address: enderecoOuNulo(values.endereco),
  }),
  paraInclusao: (values) => ({
    legalName: values.nome,
    tradeName: null,
    document: values.cpf,
    email: values.email,
    active: values.ativo,
    mobilePhone: values.celular,
    businessPhone: values.foneComercial,
    homePhone: values.foneResidencial,
    fax: values.fax,
    address: enderecoOuNulo(values.endereco),
  }),
}
