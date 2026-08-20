import type { PartnerAddress } from '@/api/gerado'

/**
 * TRADUÇÃO ENTRE O FORMULÁRIO E O CONTRATO — contato e endereço (#244).
 *
 * Mora aqui, e não em cada papel, porque os três formulários guardam o endereço
 * na MESMA forma (`cep`, `logradouro`, `numero`, `complemento`, `bairro`,
 * `cidadeCodigo`, `cidadeNome`, `uf`) e o contrato tem uma só (`PartnerAddress`).
 * Copiar a conversão em Cliente, Fornecedor e Profissional daria três chances de
 * escrever `district` onde vai `street` — e o operador só descobriria vendo o
 * bairro na rua.
 *
 * ## Vazio é `null`, e isso não é detalhe de estilo
 *
 * Input controlado precisa de string, então o formulário carrega `''` onde o
 * servidor mandou `null`. Devolver `''` trocaria "não informado" por "texto
 * vazio" a cada `Gravar` — o mesmo defeito que `textoOuNulo` já conserta em
 * `parceiros-api`, medido no par local de 2026-08-18.
 *
 * ## `cidadeCodigo` fica de fora, de propósito
 *
 * O formulário guarda o id da cidade que a busca devolveu, e o contrato publica
 * `city` como TEXTO — não há tabela de cidades no contrato. Mandar o id no lugar
 * do nome gravaria `lk-CIDADE-12` no cadastro; mandar os dois pediria um campo
 * que ninguém declarou. O id continua servindo à busca dentro da tela, e o que
 * viaja é o nome.
 */

/** A forma do endereço nos três schemas Zod de parceiro. */
export interface EnderecoDoFormulario {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidadeCodigo: string | null
  cidadeNome: string
  uf: string | null
}

/** Texto de formulário → campo do contrato. Vazio (ou só espaço) é ausência. */
export function textoOuNulo(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim()
  return texto === '' ? null : texto
}

/**
 * Endereço do formulário → `PartnerAddress`; `null` quando NADA foi preenchido.
 *
 * Endereço com sete campos em branco não é um endereço: gravá-lo daria um
 * objeto que existe e não leva a lugar nenhum, e a tela mostraria o bloco como
 * "preenchido". É a mesma decisão que `contaDaComissao` já toma para a conta
 * bancária do profissional — o contrato distingue os dois estados, e quem sabe
 * qual é a tela.
 *
 * Parcial, porém, VIAJA: cidade e UF sem o resto é o que vem do legado na maior
 * parte das fichas.
 */
export function enderecoParaContrato(endereco: EnderecoDoFormulario): PartnerAddress | null {
  const address: PartnerAddress = {
    zipCode: textoOuNulo(endereco.cep),
    street: textoOuNulo(endereco.logradouro),
    number: textoOuNulo(endereco.numero),
    complement: textoOuNulo(endereco.complemento),
    district: textoOuNulo(endereco.bairro),
    city: textoOuNulo(endereco.cidadeNome),
    state: textoOuNulo(endereco.uf),
  }
  return Object.values(address).some((valor) => valor !== null) ? address : null
}

/**
 * `PartnerAddress` → endereço do formulário. `null` vira o bloco em branco.
 *
 * `cidadeCodigo` sai SEMPRE em `null`: o contrato manda o nome da cidade, e
 * inventar um id a partir dele casaria o cadastro com uma linha de apoio que
 * pode não existir. Quem quiser o id de volta usa a busca de cidade da tela,
 * que é onde ele nasce.
 */
export function enderecoDoContrato(
  address: PartnerAddress | null | undefined,
): EnderecoDoFormulario {
  return {
    cep: address?.zipCode ?? '',
    logradouro: address?.street ?? '',
    numero: address?.number ?? '',
    complemento: address?.complement ?? '',
    bairro: address?.district ?? '',
    cidadeCodigo: null,
    cidadeNome: address?.city ?? '',
    uf: address?.state ?? null,
  }
}
