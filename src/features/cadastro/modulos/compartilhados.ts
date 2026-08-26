import type { ModuloCadastro } from './tipos'

/**
 * MÓDULOS COMPARTILHADOS — endereço, contatos, bancário e observação.
 *
 * Mudou aqui, mudou em todas as entidades: é o ponto da issue #100. O que os
 * separava antes era acidente — Fornecedor tinha um bloco de Endereço escrito à
 * mão, Cliente outro, Profissional um terceiro.
 *
 * **São FUNÇÕES e não constantes**, e a razão é o schema Zod de cada entidade:
 * o endereço mora em `endereco.*` no Cliente e no Fornecedor, e o profissional
 * ainda tem um SEGUNDO endereço (`enderecoBanco.*`). Telefone é pior: o Cliente
 * guarda `foneComercial` na raiz e o Profissional guarda `telefones.foneComercial`.
 * Constante com caminho fixo obrigaria a copiar o módulo para mudar um prefixo,
 * que é exatamente o que a issue veio desfazer. O prefixo entra por parâmetro;
 * a estrutura é uma só.
 *
 * TODOS levam `cor` desde 2026-08-17 (ordem do user: "cadastro assim em todas as
 * opções, com as cores mais fortes"). O mapa segue o mockup aprovado
 * (`mockup-cadastro-hierarquia.html`), que foi desenhado SOBRE a paleta de
 * módulo: endereço cyan = `produtos`, contato laranja = `boletim`, redes no
 * magenta de `compras` (o fúcsia do mockup é a cor de `clientes` e colidiria
 * com a Identificação do Cliente). Bancário é o único remapeado: o verde do
 * mockup é o verde de DINHEIRO, que tem dono e não vira faixa — veste o verde
 * neon de `crm`, o vizinho de matiz. Observação continua neutra de propósito:
 * no mockup ela é cinza, e o bloco apagado no meio dos coloridos é o desenho.
 */

/** Prefixo do caminho no schema Zod, com o ponto. Vazio = campos na raiz. */
function em(prefixo: string, campo: string): string {
  return prefixo ? `${prefixo}.${campo}` : campo
}

/**
 * Endereço. `Cidade` é a única que vira coluna no mockup, e faz sentido: é o
 * recorte por que o operador procura ("clientes de Campinas").
 *
 * **Desde #244 o contrato publica endereço, e os campos ganham `dto`** — o
 * `PartnerAddress`, com o caminho pontuado (`address.city`) porque o endereço
 * viaja como objeto, do mesmo jeito que a conta de comissão.
 *
 * **Publicar não ligou a coluna, e é assim de propósito:** nenhum campo de
 * endereço está na whitelist de `sortBy`/`filters` de `/api/partners`, então
 * `temLastroDeConsulta` continua os deixando de fora da grade e do filtro. O
 * "clientes de Campinas" do mockup só liga quando o servidor publicar a
 * consulta — e aí o número de `semConsulta` cai sozinho.
 *
 * **Qual endereço do contrato o módulo publica vem por PARÂMETRO, e não do
 * prefixo.** Desde o bloco 2 (#255) o parceiro tem três — `address`,
 * `billingAddress` e `businessAddress` —, e o do banco (`enderecoBanco`, do
 * Profissional) não tem nenhum: o `PartnerPayoutBankInfo` diz por escrito que
 * ele fica fora, e marcá-lo com `address` faria a agência ser gravada como a
 * casa do profissional. Deduzir o `dto` do prefixo dava conta enquanto havia um
 * só; com três, quem sabe qual é a ENTIDADE que monta o módulo.
 */
export function moduloEndereco(
  prefixo = 'endereco',
  opcoes: { dto?: string; titulo?: string; resumo?: string } = {},
): ModuloCadastro {
  const principal = prefixo === 'endereco'
  const raiz = opcoes.dto ?? (principal ? 'address' : null)
  const publicado = (nome: string) => (raiz ? { dto: `${raiz}.${nome}` } : {})
  /**
   * Coluna e filtro são SÓ do endereço principal.
   *
   * O recorte que o mockup pede — "clientes de Campinas" — é sobre onde o
   * cliente está, não sobre onde fica a empresa dele nem para onde vai o
   * boleto. Repetir `col`/`fil` nos três daria três colunas `Cidade` na mesma
   * grade, e três filtros com o mesmo rótulo dizendo coisas diferentes.
   */
  const consulta = <T extends object>(pedido: T) => (principal ? pedido : ({} as Partial<T>))
  return {
    id: principal ? 'endereco' : prefixo,
    titulo: opcoes.titulo ?? 'Endereço',
    cor: 'produtos',
    resumo: opcoes.resumo ?? 'CEP preenche rua, bairro, cidade e UF automaticamente',
    campos: [
      {
        k: 'cep',
        r: 'CEP',
        t: 'busca',
        w: 'medio',
        campo: em(prefixo, 'cep'),
        ...publicado('zipCode'),
      },
      {
        k: 'logradouro',
        r: 'Logradouro',
        campo: em(prefixo, 'logradouro'),
        ...publicado('street'),
      },
      {
        k: 'numero',
        r: 'Número',
        w: 'curto',
        campo: em(prefixo, 'numero'),
        ...publicado('number'),
      },
      {
        k: 'complemento',
        r: 'Complemento',
        campo: em(prefixo, 'complemento'),
        ...publicado('complement'),
      },
      {
        k: 'bairro',
        r: 'Bairro',
        ...consulta({ fil: 'texto' }),
        campo: em(prefixo, 'bairro'),
        ...publicado('district'),
      },
      {
        k: 'cidade',
        r: 'Cidade',
        t: 'busca',
        ...consulta({ col: true, fil: 'texto' }),
        campo: em(prefixo, 'cidadeNome'),
        ...publicado('city'),
      },
      {
        k: 'uf',
        r: 'UF',
        t: 'select',
        w: 'curto',
        ...consulta({ fil: 'sel' }),
        campo: em(prefixo, 'uf'),
        ...publicado('state'),
      },
    ],
  }
}

/**
 * Outros contatos — os telefones que não são o celular do bloco obrigatório,
 * mais os comunicadores. O par combo+texto do comunicador é o
 * `<ComunicadoresBlock>` que já existe; aqui ele é declarado, não redesenhado.
 */
export function moduloContatos({
  prefixo = '',
  comunicadores = true,
}: { prefixo?: string; comunicadores?: boolean } = {}): ModuloCadastro {
  // `comunicadores: false` NÃO tira os campos do módulo — deixa os dois pares
  // sem `campo`. Cliente não guarda comunicador hoje, e o mockup mostra que
  // deveria: apagar da espec faria a lacuna sumir; declarada, ela é contável
  // por `semLastro` e visível para quem for migrar a tela.
  const guardado = (caminho: string) => (comunicadores ? { campo: caminho } : {})
  return {
    id: 'contatos',
    titulo: 'Outros contatos',
    cor: 'boletim',
    resumo: 'Contatos do cadastro · Telefone comercial · Residencial · Fax · Comunicadores',
    campos: [
      // A GRADE de contatos, declarada como SUB-RECURSO (#293). Ela já é
      // desenhada aqui dentro — `<ContatosDoParceiro>`, montado ao lado de
      // `CamposDoModulo` no Cliente e no Profissional — e a espec era a única
      // parte do repo que ainda não sabia disso. Mesma marca que o módulo
      // `representante` do Fornecedor usa desde #270.
      //
      // Sem `campo` e sem `dto` de propósito: não é campo do registro e não
      // viaja no corpo do `PUT` do parceiro. É `sub` que o tira das DUAS
      // contagens de lacuna — `semLastro` (que já o excluía) e `Pendencias`
      // (que passou a excluir nesta mesma leva).
      { k: 'contatos', r: 'Contatos', sub: '/api/partners/{partnerId}/contacts' },
      // Os três ganharam `dto` em #244. O prefixo continua importando: o mesmo
      // telefone comercial mora em `foneComercial` no Cliente e em
      // `telefones.foneComercial` no Profissional, e o contrato tem um nome só.
      //
      // `w: 'medio'` entrou quando o Cliente parou de desenhá-los à mão: sem
      // largura declarada o render genérico dá a linha inteira (metade da
      // grade por campo), e três telefones ocupariam duas fileiras onde a tela
      // sempre teve uma. Telefone é campo CURTO em qualquer das três fichas —
      // a largura é do dado, não da tela, e por isso mora aqui.
      {
        k: 'comercial',
        r: 'Telefone comercial',
        w: 'medio',
        campo: em(prefixo, 'foneComercial'),
        dto: 'businessPhone',
      },
      {
        k: 'residencial',
        r: 'Telefone residencial',
        w: 'medio',
        campo: em(prefixo, 'foneResidencial'),
        dto: 'homePhone',
      },
      { k: 'fax', r: 'Fax', w: 'medio', campo: em(prefixo, 'fax'), dto: 'fax' },
      {
        k: 'com1tipo',
        r: 'Comunicador',
        t: 'select',
        w: 'medio',
        ...guardado('comunicadores.comunicador1Tipo'),
      },
      { k: 'com1valor', r: 'Identificador', ...guardado('comunicadores.comunicador1Valor') },
      {
        k: 'com2tipo',
        r: 'Comunicador',
        t: 'select',
        w: 'medio',
        ...guardado('comunicadores.comunicador2Tipo'),
      },
      { k: 'com2valor', r: 'Identificador', ...guardado('comunicadores.comunicador2Valor') },
    ],
  }
}

/**
 * Dados bancários. `Chave PIX` está no mockup e **não existe em schema nenhum
 * do repo** — entra sem `campo`, declarada e contada, em vez de sumir da espec.
 */
export function moduloBancario(): ModuloCadastro {
  return {
    id: 'bancario',
    titulo: 'Dados bancários',
    cor: 'crm',
    resumo: 'Banco · Agência · Conta · Chave PIX',
    campos: [
      { k: 'numeroBanco', r: 'Nº do banco', w: 'curto', campo: 'numeroBanco' },
      { k: 'nomeBanco', r: 'Nome do banco', t: 'busca', campo: 'nomeBanco' },
      { k: 'agencia', r: 'Agência', campo: 'numeroAgencia' },
      { k: 'conta', r: 'Conta', campo: 'numeroConta' },
      { k: 'pix', r: 'Chave PIX' },
    ],
  }
}

/** Redes sociais. Existe em Cliente, Fornecedor, Profissional e Colaborador —
 *  os quatro guardam o mesmo par. */
export function moduloRedesSociais(publicado = false): ModuloCadastro {
  const doContrato = (nome: string) => (publicado ? { dto: nome } : {})
  return {
    id: 'redes',
    titulo: 'Redes sociais',
    cor: 'compras',
    resumo: 'Instagram · Facebook',
    campos: [
      // Os três papéis de parceiro publicam as duas (#250); o Colaborador é
      // recurso mock e não cita contrato — daí o `publicado`.
      {
        k: 'instagram',
        r: 'Instagram',
        campo: 'redesSociais.instagram',
        ...doContrato('instagram'),
      },
      { k: 'facebook', r: 'Facebook', campo: 'redesSociais.facebook', ...doContrato('facebook') },
    ],
  }
}

/** Observação interna. Não vira coluna de propósito: texto livre numa grade de
 *  25 linhas empurra todas as colunas úteis para fora da tela. */
export function moduloObservacao(campo = 'observacao', dto?: string): ModuloCadastro {
  return {
    id: 'observacao',
    titulo: 'Observação interna',
    resumo: 'Só a equipe vê. Não sai em documento.',
    // O `dto` só existe onde o contrato publica a observação — hoje, o
    // parceiro (`notes`, #250). Colaborador é recurso mock e não cita contrato.
    campos: [{ k: 'obs', r: 'Anotações', t: 'area', campo, ...(dto ? { dto } : {}) }],
  }
}
