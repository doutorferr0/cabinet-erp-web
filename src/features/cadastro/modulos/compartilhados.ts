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
 * recorte por que o operador procura ("clientes de Campinas") — mas ela só
 * vira coluna DE VERDADE quando o servidor souber ordenar por ela, e a
 * whitelist de `/api/partners` não a publica. Ver `temLastroDeConsulta`.
 *
 * **`publicado` diz se ESTE endereço é o que o contrato guarda** (#244). O
 * parceiro tem um só: o do cadastro. O `enderecoBanco` do Profissional usa o
 * mesmo módulo com outro prefixo e continua sem `dto` — dar-lhe o nome do
 * contrato faria dois blocos da mesma tela apontarem para o mesmo campo do
 * servidor, e o segundo sobrescreveria o primeiro.
 */
export function moduloEndereco(prefixo = 'endereco', publicado = false): ModuloCadastro {
  const dto = (nome: string) => (publicado ? { dto: `address.${nome}` } : {})
  return {
    id: prefixo === 'endereco' ? 'endereco' : prefixo,
    titulo: 'Endereço',
    cor: 'produtos',
    resumo: 'CEP preenche rua, bairro, cidade e UF automaticamente',
    campos: [
      { k: 'cep', r: 'CEP', t: 'busca', w: 'medio', campo: em(prefixo, 'cep'), ...dto('zipCode') },
      { k: 'logradouro', r: 'Logradouro', campo: em(prefixo, 'logradouro'), ...dto('street') },
      { k: 'numero', r: 'Número', w: 'curto', campo: em(prefixo, 'numero'), ...dto('number') },
      {
        k: 'complemento',
        r: 'Complemento',
        campo: em(prefixo, 'complemento'),
        ...dto('complement'),
      },
      { k: 'bairro', r: 'Bairro', fil: 'texto', campo: em(prefixo, 'bairro'), ...dto('district') },
      {
        k: 'cidade',
        r: 'Cidade',
        t: 'busca',
        col: true,
        fil: 'texto',
        campo: em(prefixo, 'cidadeNome'),
        // O NOME da cidade, não o código: é o que o contrato publica, e é por
        // isso que o par id+nome do `LookupCombo` não sobrevive à volta.
        ...dto('city'),
      },
      {
        k: 'uf',
        r: 'UF',
        t: 'select',
        w: 'curto',
        fil: 'sel',
        campo: em(prefixo, 'uf'),
        ...dto('state'),
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
  publicado = false,
}: { prefixo?: string; comunicadores?: boolean; publicado?: boolean } = {}): ModuloCadastro {
  // `comunicadores: false` NÃO tira os campos do módulo — deixa os dois pares
  // sem `campo`. Cliente não guarda comunicador hoje, e o mockup mostra que
  // deveria: apagar da espec faria a lacuna sumir; declarada, ela é contável
  // por `semLastro` e visível para quem for migrar a tela.
  const guardado = (caminho: string) => (comunicadores ? { campo: caminho } : {})
  // Os TRÊS telefones entraram no contrato com o #244; os comunicadores não —
  // são lista, não campo, e a issue os deixou de fora de propósito. `publicado`
  // vale só para os três, e é `false` onde a entidade não é parceiro.
  const doContrato = (nome: string) => (publicado ? { dto: nome } : {})
  return {
    id: 'contatos',
    titulo: 'Outros contatos',
    cor: 'boletim',
    resumo: 'Telefone comercial · Residencial · Fax · Comunicadores',
    campos: [
      {
        k: 'comercial',
        r: 'Telefone comercial',
        campo: em(prefixo, 'foneComercial'),
        ...doContrato('businessPhone'),
      },
      {
        k: 'residencial',
        r: 'Telefone residencial',
        campo: em(prefixo, 'foneResidencial'),
        ...doContrato('homePhone'),
      },
      { k: 'fax', r: 'Fax', campo: em(prefixo, 'fax'), ...doContrato('fax') },
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
export function moduloRedesSociais(): ModuloCadastro {
  return {
    id: 'redes',
    titulo: 'Redes sociais',
    cor: 'compras',
    resumo: 'Instagram · Facebook',
    campos: [
      { k: 'instagram', r: 'Instagram', campo: 'redesSociais.instagram' },
      { k: 'facebook', r: 'Facebook', campo: 'redesSociais.facebook' },
    ],
  }
}

/** Observação interna. Não vira coluna de propósito: texto livre numa grade de
 *  25 linhas empurra todas as colunas úteis para fora da tela. */
export function moduloObservacao(campo = 'observacao'): ModuloCadastro {
  return {
    id: 'observacao',
    titulo: 'Observação interna',
    resumo: 'Só a equipe vê. Não sai em documento.',
    campos: [{ k: 'obs', r: 'Anotações', t: 'area', campo }],
  }
}
