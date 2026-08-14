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
 * Nenhum deles leva `cor`: os quatro aparecem no mockup em cores que ou têm DONO
 * (verde de dinheiro no bancário) ou não correspondem a módulo nenhum do ERP
 * (cinza na observação). Ver a nota de `cor` em `tipos.ts`.
 */

/** Prefixo do caminho no schema Zod, com o ponto. Vazio = campos na raiz. */
function em(prefixo: string, campo: string): string {
  return prefixo ? `${prefixo}.${campo}` : campo
}

/**
 * Endereço. `Cidade` é a única que vira coluna no mockup, e faz sentido: é o
 * recorte por que o operador procura ("clientes de Campinas"). Só ganha `dto`
 * quando o contrato publicar endereço — `PartnerDto` ainda não publica.
 */
export function moduloEndereco(prefixo = 'endereco'): ModuloCadastro {
  return {
    id: prefixo === 'endereco' ? 'endereco' : prefixo,
    titulo: 'Endereço',
    resumo: 'CEP preenche rua, bairro, cidade e UF automaticamente',
    campos: [
      { k: 'cep', r: 'CEP', t: 'busca', w: 'medio', campo: em(prefixo, 'cep') },
      { k: 'logradouro', r: 'Logradouro', campo: em(prefixo, 'logradouro') },
      { k: 'numero', r: 'Número', w: 'curto', campo: em(prefixo, 'numero') },
      { k: 'complemento', r: 'Complemento', campo: em(prefixo, 'complemento') },
      { k: 'bairro', r: 'Bairro', fil: 'texto', campo: em(prefixo, 'bairro') },
      {
        k: 'cidade',
        r: 'Cidade',
        t: 'busca',
        col: true,
        fil: 'texto',
        campo: em(prefixo, 'cidadeNome'),
      },
      { k: 'uf', r: 'UF', t: 'select', w: 'curto', fil: 'sel', campo: em(prefixo, 'uf') },
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
    resumo: 'Telefone comercial · Residencial · Fax · Comunicadores',
    campos: [
      { k: 'comercial', r: 'Telefone comercial', campo: em(prefixo, 'foneComercial') },
      { k: 'residencial', r: 'Telefone residencial', campo: em(prefixo, 'foneResidencial') },
      { k: 'fax', r: 'Fax', campo: em(prefixo, 'fax') },
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
