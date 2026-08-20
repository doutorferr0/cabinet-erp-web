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
    // Fase 1 (#250): quatro campos que a tela já desenhava sobre o vazio.
    // `profissional` é o ESPECIFICADOR — o combo `Profissional que indicou`,
    // que no contrato é `specifierId` e não tem nada a ver com `parentId`.
    inscEstProdutorRural: dto.ruralProducerRegistration ?? '',
    categoria: dto.categoryId ?? null,
    profissional: dto.specifierId ?? null,
    observacao: dto.notes ?? '',
    redesSociais: {
      facebook: dto.facebook ?? '',
      instagram: dto.instagram ?? '',
    },
  }
}

/**
 * Formulário → campos editáveis. Contato, endereço e os campos da fase 1
 * viajam SEMPRE a partir daqui: a tela de Cliente desenha os blocos inteiros,
 * então omitir qualquer um seria devolver como veio um campo que o operador
 * acabou de editar.
 */
function contatoEEndereco(values: Cliente) {
  return {
    mobilePhone: textoOuNulo(values.celular),
    businessPhone: textoOuNulo(values.foneComercial),
    homePhone: textoOuNulo(values.foneResidencial),
    fax: textoOuNulo(values.fax),
    address: enderecoParaContrato(values.endereco),
    // Fase 1 (#250). Os dois de VÍNCULO não passam por `textoOuNulo`: o combo
    // já entrega `null` quando ninguém escolheu, e id não é texto a aparar.
    ruralProducerRegistration: textoOuNulo(values.inscEstProdutorRural),
    categoryId: values.categoria,
    specifierId: values.profissional,
    notes: textoOuNulo(values.observacao),
    facebook: textoOuNulo(values.redesSociais.facebook),
    instagram: textoOuNulo(values.redesSociais.instagram),
    // `stateRegistration` NÃO entra: a tela de Cliente não tem campo de IE
    // (só a de Fornecedor tem), e mandar `null` daqui apagaria a IE que o
    // cadastro tenha por outro caminho. Volta como veio — ver `corpoDeEscrita`.
  }
}

export const papelCliente: PapelDeCadastro<Cliente> = {
  role: 'customer',
  rota: '/cadastros/clientes',
  queryKeyListagem: ['clientes'],
  camposDeEdicao:
    'Nome, CPF/CNPJ, E-mail, Telefones, Endereço, IE Produtor Rural, Categoria, Profissional que indicou, Observação, Redes sociais e Ativo',
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
