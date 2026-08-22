/**
 * VOCABULÁRIO DAS LISTAS DE APOIO, e o id de cada item.
 *
 * Mora aqui, e não no `src/mocks/api/store.ts`, porque tem DOIS consumidores
 * desde a migração para `value=id` (issue #94): o seed do servidor falso, que
 * publica a lista em `GET /api/catalog-lookups`, e os geradores de registro
 * (`colaboradores.ts`, `produtos.ts`, …), que precisam apontar para itens que
 * existem nela. Quando o vocabulário morava só no store, o registro semeado
 * guardava o NOME — e o nome bastava enquanto o combo escolhia por nome.
 *
 * **Cobre os 19 kinds.** Antes eram oito, e os outros onze combos abriam vazios
 * no modo mock sem que ninguém notasse: o campo exibia o texto que o próprio
 * registro trazia, então lista vazia parecia lista carregada. Escolhendo por
 * id, kind sem lista é campo que não dá para preencher — a lacuna deixou de ser
 * cosmética e por isso foi fechada.
 */
export const VOCABULARIO_DE_APOIO: Record<string, string[]> = {
  MARCA: ['EVOLED', 'STELLA', 'BRILIA', 'SAVE ENERGY'],
  FABRICA: ['FÁBRICA SP', 'FÁBRICA SUL'],
  TIPO_PRODUTO: ['PENDENTE', 'ARANDELA', 'EMBUTIDO', 'PLAFON', 'FITA LED'],
  TIPO_PECA: ['REDONDA', 'QUADRADA', 'LINEAR', 'DIRECIONÁVEL'],
  TIPO_LINHA: ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL'],
  CLASSIFICACAO: ['PADRÃO', 'PREMIUM', 'ECONÔMICO'],
  DESIGNER: ['LINHA PRÓPRIA', 'STUDIO', 'ASSINADO'],
  IMPOSTO_PADRAO: ['NACIONAL', 'IMPORTADO'],
  SETOR: ['VENDAS', 'ESTOQUE', 'FINANCEIRO', 'ADMINISTRATIVO', 'COMPRAS'],
  CARGO: ['VENDEDOR', 'PROJETISTA', 'GERENTE', 'COMPRADOR', 'AUXILIAR DE ESTOQUE'],
  MATERIAIS: ['ALUMÍNIO', 'LATÃO', 'ACRÍLICO'],
  // Motivo do cancelamento de documento de venda — o `Mod_codigo` que o legado
  // gravava junto de `ven_situacao='C'`. **Os rótulos são PROPOSTA**, como o
  // `kind` de atividade: a tabela `Motivo` do legado não foi capturada, então o
  // que existe é a COLUNA, não a lista. Inventar aqui é dado de instalação e
  // troca-se por PR; inventar no contrato seria congelar o vocabulário de uma
  // empresa dentro da especificação.
  MOTIVO_CANCELAMENTO: [
    'DESISTÊNCIA DO CLIENTE',
    'PREÇO',
    'PRAZO DE ENTREGA',
    'ERRO DE DIGITAÇÃO',
    'SUBSTITUÍDO POR OUTRO DOCUMENTO',
  ],
  GRAU_INSTRUCAO: ['FUNDAMENTAL', 'MÉDIO', 'SUPERIOR', 'PÓS-GRADUAÇÃO'],
  PROFISSAO: ['ARQUITETO', 'DESIGNER DE INTERIORES', 'ENGENHEIRO', 'VENDEDOR'],
  RACA_COR: ['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDÍGENA'],
  ESTADO_CIVIL: ['SOLTEIRO(A)', 'CASADO(A)', 'DIVORCIADO(A)', 'VIÚVO(A)', 'UNIÃO ESTÁVEL'],
  NACIONALIDADE: ['BRASILEIRA', 'ESTRANGEIRA'],
  VINCULO: ['CLT', 'PJ', 'ESTÁGIO', 'TEMPORÁRIO'],
  CATEGORIA_CLIENTE: ['ARQUITETO', 'CONSUMIDOR FINAL', 'REVENDA'],
  ORGAO_REGISTRO: ['CREA', 'CAU', 'CFT'],
  CATEGORIA_PROFISSIONAL: ['ARQUITETO', 'DESIGNER', 'ENGENHEIRO', 'LOJISTA'],
}

/**
 * Id do item de apoio a partir do NOME.
 *
 * Deixa a semente ser escrita em linguagem de gente (`'SUPERIOR'`) e guardada em
 * linguagem de chave (`'lk-GRAU_INSTRUCAO-3'`). **Nome fora do vocabulário
 * devolve `null`**, e não um id inventado: registro apontando para item que a
 * lista não tem é exatamente o defeito que a issue #94 veio tirar da tela — o
 * campo abriria em branco e gravar de novo apagaria o valor.
 */
export function idDeApoio(kind: string, nome: string | null | undefined): string | null {
  if (!nome) return null
  const i = VOCABULARIO_DE_APOIO[kind]?.indexOf(nome) ?? -1
  return i < 0 ? null : `lk-${kind}-${i + 1}`
}

/**
 * O NOME do item de apoio a partir do id — o inverso de `idDeApoio`.
 *
 * Existe porque o contrato publica os dois lados nos DTOs de pessoa
 * (`sectorId` + `sector`, `jobTitleId` + `jobTitle`): o id é para escrever, o
 * nome é o que a tela lê. A semente guarda o id, então a conversão para o DTO
 * precisa voltar ao rótulo — e sem este helper cada handler faria a sua, com o
 * índice cru, que é onde `lk-CARGO-3` vira o cargo errado no dia em que o
 * vocabulário ganhar um item no meio.
 *
 * Id fora do vocabulário devolve `null`, pela mesma razão que `idDeApoio`
 * devolve: rótulo inventado é pior que rótulo ausente.
 */
export function nomeDeApoio(id: string | null | undefined): string | null {
  if (!id) return null
  const partes = /^lk-(.+)-(\d+)$/.exec(id)
  if (!partes) return null
  const [, kind, posicao] = partes
  if (!kind || !posicao) return null
  return VOCABULARIO_DE_APOIO[kind]?.[Number(posicao) - 1] ?? null
}
