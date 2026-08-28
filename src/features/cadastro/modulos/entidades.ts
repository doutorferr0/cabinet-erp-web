import {
  moduloBancario,
  moduloContatos,
  moduloEndereco,
  moduloObservacao,
  moduloRedesSociais,
} from './compartilhados'
import type { EntidadeCadastro } from './tipos'

/**
 * AS QUATRO ENTIDADES DE CADASTRO (issue #100).
 *
 * Fonte da estrutura: `mockup-consulta-modelo.html` §`const E` — o user já
 * desenhou o schema nesta forma, e os `k`/`r`/`col`/`fil`/`grana` são os dele.
 * Fonte dos `campo`: os schemas Zod que as telas já validam
 * (`cliente-form.tsx` e irmãos). Fonte dos `dto`: `PartnerDto` e a whitelist
 * que `GET /api/partners` publica no contrato.
 *
 * **Transportadora e Obra ficam de fora**, como manda a issue: não existem como
 * feature no repo. O mockup traz as duas prontas; entram quando a feature entrar.
 *
 * ## O que a leitura cruzada das três fontes revelou
 *
 * O mockup desenha o cadastro que a Vertz QUER e o repo guarda o que a
 * transcrição cobre. As duas listas não coincidem, e a diferença não é pequena:
 * `Limite de crédito`, `Última compra`, `Tabela de preço`, `Como conheceu`,
 * `Regime tributário`, `CNAE`, `Chave PIX`, `Meta mensal`, `% de comissão`,
 * `Perfil de custo`, `Índice de venda` — nada disso tem onde ser gravado hoje.
 *
 * Nenhum deles foi apagado nem inventado: entram **sem `campo`**, e `semLastro`
 * os conta. Apagar encolheria a espec do user em silêncio; fingir que existem
 * daria formulário que grava no vácuo. A mesma economia do `AvisoDeCobertura`:
 * a lacuna fica visível em vez de virar surpresa na hora de migrar a tela.
 */

/** Whitelist de `sortBy`/`filters` de `GET /api/partners`, copiada do contrato.
 *  Campo fora dela é 400 — o teste de invariante confere cada `dto` contra ela. */
const WHITELIST_PARCEIRO = ['code', 'legalName', 'tradeName', 'document', 'active'] as const

/**
 * `Código` não é campo de formulário: quem o gera é o servidor. Entra no módulo
 * de identificação sem `campo` e COM `dto`, porque é a primeira coluna de toda
 * listagem de parceiro e o operador procura por ele.
 */
const CAMPO_CODIGO = { k: 'codigo', r: 'Código', col: true, fil: 'texto', dto: 'code' } as const

/** `Ativo` é o 8º padrão: checkbox em todo cadastro, desativação lógica. */
const CAMPO_ATIVO = {
  k: 'ativo',
  r: 'Ativo',
  t: 'check',
  col: true,
  fil: 'bool',
  campo: 'ativo',
  dto: 'active',
} as const

export const cliente: EntidadeCadastro = {
  id: 'cliente',
  nome: 'Cliente',
  plural: 'Clientes',
  cor: 'clientes',
  fonte: 'http',
  whitelist: WHITELIST_PARCEIRO,
  modulos: [
    {
      id: 'identificacao',
      titulo: 'Identificação',
      resumo: 'O mínimo para gravar e já vender',
      cor: 'clientes',
      obrigatorio: true,
      campos: [
        CAMPO_CODIGO,
        {
          k: 'tipo',
          r: 'Tipo de pessoa',
          t: 'seg',
          req: true,
          op: ['Física', 'Jurídica'],
          campo: 'tipoPessoa',
          // Bloco 3 (#270). O contrato fala `individual`/`company` — a
          // tradução do rótulo mora em `papeis/pessoa.ts`, porque mandar
          // `FISICA` dá 400 no enum.
          dto: 'personType',
        },
        {
          k: 'nome',
          r: 'Nome / Razão social',
          req: true,
          col: true,
          fil: 'texto',
          campo: 'nome',
          dto: 'legalName',
        },
        {
          k: 'doc',
          r: 'CPF / CNPJ',
          req: true,
          w: 'medio',
          col: true,
          fil: 'texto',
          campo: 'cpf',
          dto: 'document',
        },
        { k: 'cel', r: 'Celular', req: true, col: true, campo: 'celular', dto: 'mobilePhone' },
        { k: 'email', r: 'E-mail', req: true, campo: 'email', dto: 'email' },
        CAMPO_ATIVO,
      ],
    },
    {
      id: 'documentos',
      titulo: 'Documentos e dados pessoais',
      resumo: 'RG · Nascimento · Estado civil · Profissão · Cônjuge',
      cor: 'estoque',
      campos: [
        // Bloco 3 (#270). Os cinco ganharam `dto` com a tela que os grava: até
        // aqui o operador digitava o RG e o valor não voltava, porque o corpo
        // do PUT é montado a partir do contrato e o contrato não os publicava.
        { k: 'rg', r: 'RG', campo: 'rg', dto: 'identityDocument' },
        {
          k: 'orgao',
          r: 'Órgão expedidor',
          w: 'medio',
          campo: 'orgaoExpedicao',
          dto: 'identityIssuer',
        },
        // A UF do RG é campo PRÓPRIO, não `address.state`: quem tirou o RG em
        // Minas e mora em São Paulo tem as duas divergindo.
        {
          k: 'ufrg',
          r: 'UF do RG',
          t: 'select',
          w: 'curto',
          campo: 'ufRg',
          dto: 'identityIssuerState',
        },
        {
          k: 'nasc',
          r: 'Data de nascimento',
          t: 'data',
          w: 'medio',
          fil: 'data',
          campo: 'dtNascimento',
          dto: 'birthDate',
        },
        { k: 'sexo', r: 'Sexo', t: 'select', w: 'medio', campo: 'sexo', dto: 'gender' },
        // Do mockup, sem onde gravar hoje.
        { k: 'civil', r: 'Estado civil', t: 'select', fil: 'sel' },
        { k: 'profissao', r: 'Profissão', t: 'busca', fil: 'texto' },
      ],
    },
    moduloEndereco(),
    moduloContatos({ comunicadores: false }),
    // A aba `Cobrança\Comercial` da §5 — não capturada na transcrição, e por
    // isso os campos vêm do CONTRATO, que os tirou das colunas do legado
    // (`Cli_*_cob`, `Cli_*_cor`). São dois endereços a mais no mesmo cadastro,
    // e não um terceiro cadastro: o boleto vai para um lugar e a pessoa
    // trabalha em outro.
    moduloEndereco('enderecoCobranca', {
      dto: 'billingAddress',
      titulo: 'Endereço de cobrança',
      resumo: 'Para onde vai o boleto, quando não é o endereço do cadastro',
    }),
    {
      ...moduloEndereco('enderecoComercial', {
        dto: 'businessAddress',
        titulo: 'Endereço comercial e empresa',
        resumo: 'Onde a pessoa trabalha · Empresa · Cargo · CNPJ · Fundação',
      }),
      // Os quatro do vínculo de trabalho vêm DEPOIS do endereço, no mesmo
      // módulo: o contrato os declara juntos ("junto dele vêm `businessName`,
      // `businessRole`, `businessDocument` e `foundedOn`, que descrevem esse
      // mesmo vínculo"), e separá-los daria dois blocos que só fazem sentido
      // lidos como um.
      campos: [
        ...moduloEndereco('enderecoComercial', { dto: 'businessAddress' }).campos,
        { k: 'empresa', r: 'Empresa', campo: 'empresaComercial', dto: 'businessName' },
        { k: 'cargo', r: 'Cargo', w: 'medio', campo: 'cargoComercial', dto: 'businessRole' },
        {
          k: 'cnpjCom',
          r: 'CNPJ comercial',
          w: 'medio',
          campo: 'cnpjComercial',
          dto: 'businessDocument',
        },
        {
          k: 'fundacao',
          r: 'Data de fundação',
          t: 'data',
          w: 'medio',
          campo: 'dtFundacaoComercial',
          dto: 'foundedOn',
        },
      ],
    },
    {
      id: 'fiscal',
      titulo: 'Fiscal',
      resumo: 'Inscrição estadual · Contribuinte — necessário só para emitir NF-e',
      cor: 'vendas',
      campos: [
        // A IE da empresa e a de produtor rural são campos DIFERENTES, e o
        // contrato as separa de propósito: o produtor rural pessoa física tem
        // inscrição de produtor sem ter IE, e guardar as duas no mesmo lugar
        // apagaria uma na primeira gravação.
        { k: 'ie', r: 'Inscrição estadual', campo: 'inscEst', dto: 'stateRegistration' },
        {
          k: 'ieRural',
          r: 'Insc. estadual produtor rural',
          campo: 'inscEstProdutorRural',
          dto: 'ruralProducerRegistration',
        },
        { k: 'contrib', r: 'Contribuinte ICMS', t: 'select', fil: 'sel' },
        { k: 'regime', r: 'Regime tributário', t: 'select', fil: 'sel' },
      ],
    },
    {
      id: 'comercial',
      titulo: 'Comercial',
      resumo: 'Quem indicou · Categoria · Tabela · Limite de crédito',
      cor: 'crm',
      campos: [
        {
          k: 'indicou',
          r: 'Profissional que indicou',
          t: 'busca',
          col: true,
          fil: 'texto',
          campo: 'profissional',
          // O ESPECIFICADOR. `specifierId` e não `parentId`: um é quem indicou
          // o cliente, o outro é o escritório de que um profissional faz parte.
          dto: 'specifierId',
        },
        {
          k: 'categoria',
          r: 'Categoria',
          t: 'select',
          fil: 'sel',
          campo: 'categoria',
          dto: 'categoryId',
        },
        // Do mockup, sem onde gravar hoje.
        { k: 'origem', r: 'Como conheceu', t: 'select', fil: 'sel' },
        { k: 'tabela', r: 'Tabela de preço', t: 'select', fil: 'sel' },
        {
          k: 'limite',
          r: 'Limite de crédito',
          t: 'dinheiro',
          w: 'medio',
          grana: true,
          col: true,
          fil: 'faixa',
        },
        { k: 'ultima', r: 'Última compra', t: 'data', col: true, fil: 'data' },
      ],
    },
    moduloRedesSociais(true),
    moduloObservacao('observacao', 'notes'),
  ],
  // Literais do mockup aprovado (`mockup-consulta-modelo.html`, `kpis` do
  // Cliente). Nenhum tem `campo` nem `dto`: os quatro saem de agregação que o
  // contrato não publica — ver `indicadores` em `tipos.ts`.
  indicadores: [
    { k: 'ano', r: 'Comprado no ano', grana: true },
    { k: 'pedidos', r: 'Pedidos' },
    { k: 'obras', r: 'Obras vinculadas' },
    { k: 'ultima', r: 'Última compra', t: 'data' },
  ],
}

export const fornecedor: EntidadeCadastro = {
  id: 'fornecedor',
  nome: 'Fornecedor',
  plural: 'Fornecedores',
  cor: 'fornecedores',
  fonte: 'http',
  whitelist: WHITELIST_PARCEIRO,
  modulos: [
    {
      id: 'identificacao',
      titulo: 'Identificação',
      resumo: 'O mínimo para gravar e lançar compra',
      cor: 'fornecedores',
      obrigatorio: true,
      campos: [
        CAMPO_CODIGO,
        {
          k: 'fantasia',
          r: 'Nome fantasia',
          req: true,
          col: true,
          fil: 'texto',
          campo: 'nomeFantasia',
          dto: 'tradeName',
        },
        {
          k: 'nome',
          r: 'Razão social',
          req: true,
          fil: 'texto',
          campo: 'razaoSocial',
          dto: 'legalName',
        },
        { k: 'sigla', r: 'Sigla', w: 'curto', campo: 'sigla' },
        {
          k: 'doc',
          r: 'CNPJ',
          req: true,
          w: 'medio',
          col: true,
          fil: 'texto',
          campo: 'cnpjCpf',
          dto: 'document',
        },
        // `fone1` é o comercial do fornecedor — `businessPhone` no contrato.
        // `fone2` continua sem `dto`: o contrato publica quatro telefones e
        // nenhum é "o segundo comercial" (ver o papel do Fornecedor).
        { k: 'tel', r: 'Telefone', req: true, col: true, campo: 'fone1', dto: 'businessPhone' },
        { k: 'email', r: 'E-mail', req: true, campo: 'email', dto: 'email' },
        CAMPO_ATIVO,
      ],
    },
    {
      id: 'fiscal',
      titulo: 'Fiscal',
      resumo: 'IE · Regime · CNAE — necessário para entrada de nota',
      cor: 'vendas',
      campos: [
        { k: 'ie', r: 'Inscrição estadual', campo: 'inscEst', dto: 'stateRegistration' },
        // Do mockup, sem onde gravar hoje.
        { k: 'regime', r: 'Regime tributário', t: 'select', fil: 'sel' },
        { k: 'cnae', r: 'CNAE principal' },
      ],
    },
    {
      id: 'comercial',
      titulo: 'Comercial e preço',
      resumo: 'Prazo de entrega · Prazo de pagamento · Revenda',
      cor: 'crm',
      campos: [
        {
          k: 'prazoEntrega',
          r: 'Prazo de entrega (dias)',
          w: 'medio',
          col: true,
          fil: 'faixa',
          campo: 'prazoEntregaDias',
        },
        {
          k: 'prazoPgto',
          r: 'Prazo de pagamento (dias)',
          w: 'medio',
          fil: 'faixa',
          campo: 'prazoPagamentoDias',
        },
        {
          k: 'revenda',
          r: 'Fornece para revenda',
          t: 'check',
          fil: 'bool',
          campo: 'forneceRevenda',
        },
        {
          k: 'materiais',
          r: 'Materiais que fornece',
          t: 'busca',
          fil: 'texto',
          campo: 'materiais',
        },
        {
          k: 'compradora',
          r: 'Empresa compradora',
          t: 'select',
          fil: 'sel',
          campo: 'empresaCompradora',
        },
        // Do mockup, sem onde gravar hoje. São os dois de que sai o preço de venda.
        { k: 'custo', r: 'Perfil de custo', t: 'busca', col: true, fil: 'texto' },
        { k: 'indice', r: 'Índice de valor de venda', col: true, fil: 'faixa' },
        { k: 'frete', r: 'Tipo de frete', t: 'select', fil: 'sel' },
        { k: 'minimo', r: 'Pedido mínimo', t: 'dinheiro', w: 'medio', grana: true },
      ],
    },
    {
      id: 'representante',
      titulo: 'Representante e contatos',
      resumo: 'Quem atende a Vertz nesse fornecedor',
      cor: 'boletim',
      // A GRADE de contatos não é campo deste módulo, e desde #293 isso é
      // literal: contato é sub-recurso (`/api/partners/{id}/contacts`), com
      // caminho e gravação próprios, montado como bloco dentro daqui. Enquanto
      // era `{ k: 'contatos', campo: 'contatos' }`, o schema o declarava como
      // um campo sem cobertura — e a ficha, que apaga o que tem `campo` e não
      // tem `dto`, mostrava `Contatos` em branco num cadastro que tem contatos.
      campos: [
        // Sub-recurso, não campo do registro (#270): o contrato publica
        // contato em caminho próprio, com `POST`/`PUT` que o corpo do parceiro
        // não carrega. Quem o desenha é `<ContatosDoParceiro>`.
        { k: 'contatos', r: 'Contatos', sub: '/api/partners/{partnerId}/contacts' },
        { k: 'fone2', r: 'Telefone 2', campo: 'fone2' },
        { k: 'fax', r: 'Fax', campo: 'fax', dto: 'fax' },
        { k: 'site', r: 'Site', campo: 'site' },
        {
          k: 'com1tipo',
          r: 'Comunicador',
          t: 'select',
          w: 'medio',
          campo: 'comunicadores.comunicador1Tipo',
        },
        { k: 'com1valor', r: 'Identificador', campo: 'comunicadores.comunicador1Valor' },
        {
          k: 'com2tipo',
          r: 'Comunicador',
          t: 'select',
          w: 'medio',
          campo: 'comunicadores.comunicador2Tipo',
        },
        { k: 'com2valor', r: 'Identificador', campo: 'comunicadores.comunicador2Valor' },
      ],
    },
    moduloEndereco(),
    moduloRedesSociais(true),
    moduloObservacao('observacao', 'notes'),
  ],
  indicadores: [
    { k: 'produtos', r: 'Produtos ativos' },
    { k: 'ano', r: 'Comprado no ano', grana: true },
    { k: 'indice', r: 'Índice de venda' },
    { k: 'prazo', r: 'Prazo médio' },
  ],
}

export const profissional: EntidadeCadastro = {
  id: 'profissional',
  nome: 'Profissional',
  plural: 'Profissionais',
  cor: 'profissionais',
  fonte: 'http',
  whitelist: WHITELIST_PARCEIRO,
  modulos: [
    {
      id: 'identificacao',
      titulo: 'Identificação',
      resumo: 'O mínimo para gravar o cadastro',
      cor: 'profissionais',
      obrigatorio: true,
      campos: [
        CAMPO_CODIGO,
        {
          k: 'tipo',
          r: 'Tipo de pessoa',
          t: 'seg',
          req: true,
          op: ['Física', 'Jurídica'],
          campo: 'tipoPessoa',
          // Bloco 3 (#270). O contrato fala `individual`/`company` — a
          // tradução do rótulo mora em `papeis/pessoa.ts`, porque mandar
          // `FISICA` dá 400 no enum.
          dto: 'personType',
        },
        {
          k: 'apres',
          r: 'Nome de apresentação',
          req: true,
          col: true,
          fil: 'texto',
          campo: 'nomeApresentacao',
          dto: 'tradeName',
        },
        { k: 'nome', r: 'Nome completo', req: true, fil: 'texto', campo: 'nome', dto: 'legalName' },
        {
          k: 'doc',
          r: 'CPF / CNPJ',
          req: true,
          w: 'medio',
          col: true,
          fil: 'texto',
          campo: 'cpf',
          dto: 'document',
        },
        {
          k: 'cel',
          r: 'Celular',
          req: true,
          col: true,
          campo: 'telefones.celular',
          dto: 'mobilePhone',
        },
        { k: 'email', r: 'E-mail', req: true, campo: 'email', dto: 'email' },
        CAMPO_ATIVO,
      ],
    },
    {
      id: 'documentos',
      titulo: 'Documentos e dados pessoais',
      resumo: 'RG · Nascimento · Estado civil · Cônjuge · PIS · CREA/CAU/CFT',
      cor: 'estoque',
      campos: [
        {
          k: 'registro',
          r: 'Registro profissional',
          col: true,
          fil: 'texto',
          campo: 'registroProfissional',
        },
        { k: 'profissao', r: 'Profissão', t: 'busca', fil: 'sel', campo: 'profissao' },
        // Bloco 3 (#270). A §3 desenha RG e nascimento, e não tem órgão
        // expedidor, UF do RG nem sexo — por isso só estes dois têm `dto`
        // aqui, e os outros três continuam voltando como vieram.
        { k: 'rg', r: 'RG', campo: 'rg', dto: 'identityDocument' },
        {
          k: 'nasc',
          r: 'Data de nascimento',
          t: 'data',
          w: 'medio',
          fil: 'data',
          campo: 'dtNascimento',
          dto: 'birthDate',
        },
        { k: 'civil', r: 'Estado civil', t: 'select', fil: 'sel', campo: 'estadoCivil' },
        { k: 'conjuge', r: 'Nome do cônjuge', campo: 'nomeConjuge' },
        { k: 'nascConjuge', r: 'Nasc. do cônjuge', t: 'data', w: 'medio', campo: 'dtNascConjuge' },
        { k: 'pis', r: 'PIS / PASEP / NIS', campo: 'pisPasepNis' },
      ],
    },
    moduloEndereco(),
    moduloContatos({ prefixo: 'telefones' }),
    moduloBancario(),
    // O endereço da agência é um SEGUNDO endereço no mesmo schema, e é por isso
    // que o módulo compartilhado recebe prefixo em vez de caminho fixo.
    {
      ...moduloEndereco('enderecoBanco'),
      titulo: 'Endereço da agência',
      resumo: 'Só quando o banco exige',
    },
    {
      id: 'participacao',
      titulo: 'Participação padrão',
      resumo: '% de indicação aplicado quando este profissional entra na venda',
      cor: 'vendas',
      campos: [
        // Do mockup, sem onde gravar hoje.
        { k: 'pct', r: '% padrão de indicação', w: 'medio', col: true, fil: 'faixa' },
        { k: 'operador', r: 'Operador', t: 'select', w: 'medio', fil: 'sel' },
        { k: 'indicados', r: 'Clientes indicados', col: true },
        { k: 'gerado', r: 'Gerado no ano', t: 'dinheiro', grana: true, col: true },
      ],
    },
    moduloRedesSociais(true),
    // A observação é do PARCEIRO, e o contrato publica uma só (`notes`) para os
    // três papéis. A CATEGORIA não veio junto de propósito: o contrato publica
    // `categoryId` apontando para `CATEGORIA_CLIENTE`, e não há campo de
    // categoria do profissional. Oferecer o combo de `CATEGORIA_PROFISSIONAL`
    // aqui gravaria o item de uma lista no campo da outra — o campo aceitaria a
    // escolha e a ficha do cliente leria "ARQUITETO" vindo da lista errada.
    moduloObservacao('observacao', 'notes'),
  ],
  // `Gerado no ano` e `Clientes indicados` também são CAMPO do módulo Comercial
  // (com `col`, para a listagem) — e repetir aqui não é engano: no módulo eles
  // são atributo do registro que o legado guarda; aqui são o número do topo,
  // que sai de agregação. Mesma palavra, origens diferentes.
  indicadores: [
    { k: 'gerado', r: 'Gerado no ano', grana: true },
    { k: 'indicados', r: 'Clientes indicados' },
    { k: 'pct', r: '% padrão' },
    { k: 'obras', r: 'Obras ativas' },
  ],
}

export const colaborador: EntidadeCadastro = {
  id: 'colaborador',
  nome: 'Colaborador',
  plural: 'Colaboradores',
  // Púrpura de Pessoas, por ordem do user (2026-08-17: "cores fortes em todas
  // as opções"). Colaborador não tem módulo próprio no ERP; veste a cor de
  // `profissionais` porque os dois são o domínio Pessoas — o azure do mockup
  // antigo era a cor do Estoque e colidiria com o bloco Documentos.
  cor: 'profissionais',
  // `http` desde 2026-08-25: a tela lê `GET /api/employees`. É esta linha que
  // faz `idDoFiltro` passar a usar o `dto` de cada campo em vez do caminho no
  // schema Zod — com ela em `mock`, o seletor de colunas ligaria `nome` numa
  // linha que só tem `name`, e a coluna sairia vazia em toda linha.
  fonte: 'http',
  // A whitelist de ORDENAÇÃO, medida em 25/08 contra a main `2ee954b` do api:
  // pedir `sortBy=nome` responde 400 `urn:cabinet:erro:ordenacao-invalida`
  // nomeando estes quatro. Não foi lida do `openapi-v1.json` — o contrato não
  // publica a lista, o servidor é que a diz.
  whitelist: ['name', 'sector', 'jobTitle', 'active'],
  // **VAZIA, e vazia é a medição.** `/api/employees` recusa o parâmetro
  // `filters` inteiro: 400 `urn:cabinet:erro:filtro-invalido` — "Este recurso
  // não publica o parâmetro filters". Enquanto for assim a tela não oferece
  // filtro estruturado, e a invariante de `invariantes.test.ts` cobra que ela
  // não o ofereça. Sai desta linha no dia em que o contrato publicar `filters`
  // para o recurso — PR neste repo, e depois handler no api.
  whitelistDeFiltro: [],
  // A LINHA da listagem é o `EmployeeDto`, e não o `EmployeeDetailDto`: é ele
  // que a grade recebe, e é contra ele que cada `dto` tem de existir. Conferir
  // contra o detalhe deixaria passar `hiredAt` como coluna — campo que a ficha
  // tem e a listagem não manda, isto é, coluna vazia em toda linha.
  dtoDoContrato: 'EmployeeDto',
  modulos: [
    {
      id: 'identificacao',
      titulo: 'Identificação',
      resumo: 'O mínimo para gravar e vincular a vendas',
      cor: 'profissionais',
      obrigatorio: true,
      campos: [
        // `dto:` entrou nos quatro em 2026-08-25, quando a tela migrou para
        // `GET /api/employees`: a GRADE recebe o `EmployeeDto` cru, e sem o nome
        // do contrato o seletor de colunas ligaria `nome` numa linha que só tem
        // `name` — coluna vazia em toda linha, que é o defeito que o caso de
        // Clientes em `colunas-chegam-na-grade.test.tsx` já nomeia.
        {
          k: 'nome',
          r: 'Nome completo',
          req: true,
          col: true,
          fil: 'texto',
          campo: 'nome',
          dto: 'name',
        },
        {
          k: 'cargo',
          r: 'Cargo / função',
          t: 'busca',
          req: true,
          col: true,
          fil: 'sel',
          campo: 'cargo',
          dto: 'jobTitle',
        },
        {
          k: 'admissao',
          r: 'Data de admissão',
          t: 'data',
          req: true,
          w: 'medio',
          // **SEM `col`, e a ausência é medição.** `EmployeeDto` tem CINCO
          // campos (`id`, `name`, `sector`, `jobTitle`, `active`) — a admissão
          // só existe no `EmployeeDetailDto`, isto é, na ficha. Oferecê-la no
          // seletor de colunas acrescentaria à grade uma coluna vazia em toda
          // linha, e o operador leria isso como "ninguém tem data de admissão".
          // Volta a ter `col` no dia em que a LISTAGEM publicar o campo.
          fil: 'data',
          campo: 'dataAdmissao',
        },
        { k: 'setor', r: 'Setor', t: 'select', fil: 'sel', campo: 'setor', dto: 'sector' },
        {
          k: 'atendente',
          r: 'É atendente — pode ser vinculado a venda',
          t: 'check',
          fil: 'bool',
          campo: 'atendimentoCliente',
        },
        {
          k: 'ativo',
          r: 'Ativo',
          t: 'check',
          col: true,
          fil: 'bool',
          campo: 'ativo',
          dto: 'active',
        },
        // Do mockup, sem onde gravar hoje. Colaborador é usuário do sistema
        // (issue #105) e o e-mail de login é o que falta para isso ser verdade.
        { k: 'login', r: 'E-mail de login', fil: 'texto' },
        { k: 'cel', r: 'Celular' },
      ],
    },
    {
      id: 'empresas',
      titulo: 'Empresas e perfil',
      resumo: 'Um colaborador pode atuar em mais de uma empresa, com papel diferente em cada',
      cor: 'fornecedores',
      campos: [
        // Os dois perderam o `col` pelo mesmo motivo da admissão: nenhum existe
        // no `EmployeeDto`. `empresa` nem no `EmployeeDetailDto` — a empresa é a
        // ATIVA da sessão, não uma coluna da pessoa; e `perfil` é o vínculo,
        // que o detalhe publica como `roleName`. Seletor de coluna só oferece o
        // que a LISTAGEM traz.
        { k: 'empresa', r: 'Empresa', t: 'select', fil: 'sel', campo: 'empresa' },
        // O perfil por empresa é o escopo da issue #105 (Acesso-1).
        { k: 'perfil', r: 'Perfil', t: 'select', fil: 'sel' },
      ],
    },
    {
      id: 'documentos',
      titulo: 'Documentos e dados pessoais',
      resumo: 'Nascimento · Estado civil · Filiação · Naturalidade · Instrução',
      cor: 'estoque',
      campos: [
        {
          k: 'nasc',
          r: 'Data de nascimento',
          t: 'data',
          w: 'medio',
          fil: 'data',
          campo: 'dtNascimento',
        },
        // `Sexo` e `Raça / cor` saíram deste módulo em 2026-08-28: dado
        // sensível (LGPD art. 5º II) sem finalidade nem regra de acesso no
        // produto. A decisão vale para o COLABORADOR — o Cliente mantém `sexo`,
        // que é `PartnerDto.gender` e já grava. Ver `Colaborador`, no mock.
        { k: 'civil', r: 'Estado civil', t: 'select', fil: 'sel', campo: 'estadoCivil' },
        { k: 'conjuge', r: 'Nome do cônjuge', campo: 'nomeConjuge' },
        { k: 'nascConjuge', r: 'Nasc. do cônjuge', t: 'data', w: 'medio', campo: 'dtNascConjuge' },
        { k: 'pai', r: 'Nome do pai', campo: 'nomePai' },
        { k: 'mae', r: 'Nome da mãe', campo: 'nomeMae' },
        { k: 'instrucao', r: 'Grau de instrução', t: 'select', fil: 'sel', campo: 'grauInstrucao' },
        { k: 'profissao', r: 'Profissão', t: 'busca', fil: 'texto', campo: 'profissao' },
        { k: 'cidadeNatal', r: 'Naturalidade', t: 'busca', campo: 'naturalidade.cidadeNome' },
        { k: 'ufNatal', r: 'UF de nascimento', t: 'select', w: 'curto', campo: 'naturalidade.uf' },
        { k: 'nacionalidade', r: 'Nacionalidade', t: 'select', campo: 'nacionalidade' },
        { k: 'anoChegada', r: 'Ano de chegada', w: 'curto', campo: 'anoChegada' },
      ],
    },
    {
      id: 'trabalhistas',
      titulo: 'Dados trabalhistas',
      resumo: 'Vínculo · Salário · Admissão · Demissão',
      cor: 'boletim',
      campos: [
        { k: 'vinculo', r: 'Vínculo', t: 'select', fil: 'sel', campo: 'vinculo' },
        {
          k: 'salario',
          r: 'Salário',
          t: 'dinheiro',
          w: 'medio',
          grana: true,
          fil: 'faixa',
          campo: 'salario',
        },
        {
          k: 'demissao',
          r: 'Data de demissão',
          t: 'data',
          w: 'medio',
          fil: 'data',
          campo: 'dataDemissao',
        },
      ],
    },
    {
      id: 'metas',
      titulo: 'Metas e comissão',
      resumo: '% interna · % externa · Meta mensal',
      cor: 'vendas',
      campos: [
        // Módulo inteiro do mockup, sem lastro: comissão e meta não existem em
        // schema nenhum. É o maior buraco medido nesta issue, e o que o user
        // mais citou no mockup.
        { k: 'comissaoInterna', r: '% comissão interna', w: 'medio', col: true },
        { k: 'comissaoExterna', r: '% comissão externa', w: 'medio' },
        { k: 'meta', r: 'Meta mensal', t: 'dinheiro', w: 'medio', grana: true, fil: 'faixa' },
      ],
    },
    moduloRedesSociais(),
  ],
  indicadores: [
    { k: 'vendido', r: 'Vendido no mês', grana: true },
    { k: 'meta', r: 'Meta', grana: true },
    { k: 'pedidos', r: 'Pedidos no mês' },
    { k: 'empresa', r: 'Empresas' },
  ],
}

export const ENTIDADES: Readonly<Record<string, EntidadeCadastro>> = {
  cliente,
  colaborador,
  fornecedor,
  profissional,
}
