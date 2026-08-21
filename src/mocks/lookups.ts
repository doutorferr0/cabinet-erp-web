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
