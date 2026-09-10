import type { PartnerDto } from '@/api/gerado'
import {
  enderecoDoContrato,
  enderecoParaContrato,
  textoOuNulo,
} from '@/features/parceiro/papeis/contato-e-endereco'
import {
  ausentesNoServidor,
  tipoDePessoaDoContrato,
  tipoDePessoaParaContrato,
} from '@/features/parceiro/papeis/pessoa'
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
    // Bloco 2 (#293): cobrança e comercial. Antes disto o contrato publicava os
    // seis e NENHUMA tela os desenhava — o cadastro do legado tinha a aba, o
    // servidor tinha a coluna, e o operador não tinha onde ver.
    enderecoCobranca: enderecoDoContrato(dto.billingAddress),
    enderecoComercial: enderecoDoContrato(dto.businessAddress),
    empresaComercial: dto.businessName ?? '',
    cargoComercial: dto.businessRole ?? '',
    cnpjComercial: dto.businessDocument ?? '',
    dtFundacaoComercial: dto.foundedOn ?? null,
    // Fase 1 (#250/#254). A IE da empresa (`Cli_IE_rg`) entrou com a tela que
    // a desenha: enquanto o campo não existia aqui, o Cliente devolvia a IE
    // como veio, e quem editava era só o Fornecedor.
    inscEst: dto.stateRegistration ?? '',
    // `profissional` é o ESPECIFICADOR — o combo `Profissional que indicou`,
    // que no contrato é `specifierId` e não tem nada a ver com `parentId`.
    inscEstProdutorRural: dto.ruralProducerRegistration ?? '',
    categoria: dto.categoryId ?? null,
    profissional: dto.specifierId ?? null,
    // Só para EXIBIR: o combo mostra este nome quando o id escolhido não está
    // entre os profissionais que a empresa ativa lista. Não volta em
    // `paraEscrita` — nome guardado é nome que um dia diverge do id.
    profissionalNome: dto.specifierName ?? null,
    observacao: dto.notes ?? '',
    redesSociais: {
      facebook: dto.facebook ?? '',
      instagram: dto.instagram ?? '',
    },
    // Bloco 3 (#270). Os seis campos da aba `Principal` que o operador via na
    // tela e o contrato não guardava: até aqui ele digitava o RG, gravava, e
    // o valor voltava em branco — o mesmo defeito que a #244 conserta para o
    // telefone, com seis campos a mais.
    tipoPessoa: tipoDePessoaDoContrato(dto.personType),
    rg: dto.identityDocument ?? '',
    orgaoExpedicao: dto.identityIssuer ?? '',
    ufRg: dto.identityIssuerState ?? null,
    sexo: dto.gender ?? null,
    dtNascimento: dto.birthDate ?? null,
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
    // Bloco 2 (#293). Viajam SEMPRE: a tela desenha os dois blocos inteiros,
    // então omitir qualquer um devolveria como veio um campo que o operador
    // acabou de editar. `foundedOn` é data ISO e não passa por `textoOuNulo`:
    // o `DateField` já entrega `null` quando ninguém preencheu.
    billingAddress: enderecoParaContrato(values.enderecoCobranca),
    businessAddress: enderecoParaContrato(values.enderecoComercial),
    businessName: textoOuNulo(values.empresaComercial),
    businessRole: textoOuNulo(values.cargoComercial),
    businessDocument: textoOuNulo(values.cnpjComercial),
    foundedOn: values.dtFundacaoComercial,
    // Fase 1 (#250). Os dois de VÍNCULO não passam por `textoOuNulo`: o combo
    // já entrega `null` quando ninguém escolheu, e id não é texto a aparar.
    stateRegistration: textoOuNulo(values.inscEst),
    ruralProducerRegistration: textoOuNulo(values.inscEstProdutorRural),
    categoryId: values.categoria,
    specifierId: values.profissional,
    notes: textoOuNulo(values.observacao),
    facebook: textoOuNulo(values.redesSociais.facebook),
    instagram: textoOuNulo(values.redesSociais.instagram),
    // Bloco 3 (#270). `personType` passa pela TABELA e não por `textoOuNulo`:
    // o contrato tem `enum: [individual, company, null]`, e mandar o rótulo do
    // radio dá 400 — medido no par local.
    personType: tipoDePessoaParaContrato(values.tipoPessoa),
    identityDocument: textoOuNulo(values.rg),
    identityIssuer: textoOuNulo(values.orgaoExpedicao),
    identityIssuerState: values.ufRg,
    gender: values.sexo,
    birthDate: values.dtNascimento,
  }
}

export const papelCliente: PapelDeCadastro<Cliente> = {
  role: 'customer',
  rota: '/cadastros/clientes',
  rotaDoDocumento: (clienteId) => ({
    to: '/cadastros/clientes/$clienteId',
    params: { clienteId },
    // `replace`: o `/novo` já gravado não é destino de volta (#405).
    replace: true,
  }),
  queryKeyListagem: ['clientes'],
  camposDeEdicao:
    'Nome, CPF/CNPJ, E-mail, Telefones, Endereço, Endereço de cobrança, Endereço comercial (com Empresa, Cargo, CNPJ e Fundação), Tipo de pessoa, RG, Órgão expedidor, UF do RG, Sexo, Data de nascimento, Inscrição Estadual, IE Produtor Rural, Categoria, Profissional que indicou, Observação, Redes sociais e Ativo',
  vazio: clienteVazio,
  dtoParaForm,
  ausentesNoServidor,
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
