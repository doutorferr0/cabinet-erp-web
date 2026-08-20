import type { PartnerDto } from '@/api/gerado'
import {
  enderecoDoContrato,
  enderecoParaContrato,
  textoOuNulo,
} from '@/features/parceiro/papeis/contato-e-endereco'
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
    // Contato e endereço (#244). Antes disto o formulário desenhava os dois
    // blocos e o `Celular` obrigatório sobre `clienteVazio` — o operador
    // digitava, gravava e o valor não voltava, porque o corpo é montado a
    // partir do contrato e o contrato não publicava o campo.
    celular: dto.mobilePhone ?? '',
    foneComercial: dto.businessPhone ?? '',
    foneResidencial: dto.homePhone ?? '',
    fax: dto.fax ?? '',
    endereco: enderecoDoContrato(dto.address),
  }
}

/**
 * Formulário → campos editáveis. Os cinco de contato e endereço viajam SEMPRE
 * a partir daqui: a tela de Cliente desenha os dois blocos inteiros, então
 * omitir qualquer um seria devolver como veio um campo que o operador acabou
 * de editar.
 */
function contatoEEndereco(values: Cliente) {
  return {
    mobilePhone: textoOuNulo(values.celular),
    businessPhone: textoOuNulo(values.foneComercial),
    homePhone: textoOuNulo(values.foneResidencial),
    fax: textoOuNulo(values.fax),
    address: enderecoParaContrato(values.endereco),
  }
}

export const papelCliente: PapelDeCadastro<Cliente> = {
  role: 'customer',
  rota: '/cadastros/clientes',
  queryKeyListagem: ['clientes'],
  camposDeEdicao: 'Nome, CPF/CNPJ, E-mail, Telefones, Endereço e Ativo',
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
    ...contatoEEndereco(values),
  }),
  paraInclusao: (values) => ({
    legalName: values.nome,
    tradeName: null,
    document: values.cpf,
    email: values.email,
    active: values.ativo,
    ...contatoEEndereco(values),
  }),
}
