import type { CampoCadastro, ModuloCadastro } from '@/features/cadastro/modulos'

/**
 * LEITURA DO REGISTRO PELO SCHEMA — a metade sem JSX da ficha (issue #103).
 *
 * O schema de módulos diz onde cada campo mora (`campo: 'endereco.cidadeNome'`);
 * estas funções vão buscar. Ficam separadas do componente porque a regra
 * "módulo vazio" é o que decide o desenho inteiro da ficha, e regra que decide
 * desenho merece teste próprio, sem montar árvore de React para exercitá-la.
 */

/** Valor de um caminho pontilhado. `undefined` quando o caminho não existe. */
export function valorNoCaminho(registro: unknown, caminho: string): unknown {
  return caminho
    .split('.')
    .reduce<unknown>(
      (atual, parte) =>
        atual && typeof atual === 'object' ? (atual as Record<string, unknown>)[parte] : undefined,
      registro,
    )
}

/**
 * O que a ficha imprime para um campo. `null` = **não informado**, e a diferença
 * importa: a ficha escreve "não informado" dentro de um módulo cheio, e some só
 * com o módulo INTEIRAMENTE vazio (regra da issue). Sem separar os dois, um
 * campo em branco no meio de um módulo preenchido sumiria — e o operador não
 * saberia se o dado não existe ou se a tela esqueceu de mostrá-lo.
 *
 * `rotulos` traduz o valor guardado no texto que se lê — é por onde o id de uma
 * lista de apoio vira nome. A ficha NÃO consulta lista nenhuma: ela é
 * apresentação, e quem tem as listas é a tela.
 */
export function textoDoCampo(
  registro: unknown,
  campo: CampoCadastro,
  rotulos?: Readonly<Record<string, string>>,
): string | null {
  if (!campo.campo) return null
  const valor = valorNoCaminho(registro, campo.campo)

  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  if (Array.isArray(valor)) return valor.length > 0 ? `${valor.length} item(ns)` : null

  const texto = String(valor)
  return rotulos?.[texto] ?? texto
}

/** Campos do módulo que TÊM valor. */
export function camposPreenchidos(
  registro: unknown,
  modulo: ModuloCadastro,
  rotulos?: Readonly<Record<string, string>>,
): readonly CampoCadastro[] {
  return modulo.campos.filter((campo) => textoDoCampo(registro, campo, rotulos) !== null)
}

/**
 * Módulo VAZIO: nenhum campo com valor.
 *
 * Campo que o repo ainda não guarda (`campo` ausente no schema) conta como
 * vazio, e é o certo: ele não tem onde ter valor. Um módulo feito só desses —
 * `Metas e comissão` do Colaborador é o caso — aparece recolhido, com o convite
 * para preencher, que é a verdade sobre ele.
 */
export function moduloVazio(
  registro: unknown,
  modulo: ModuloCadastro,
  rotulos?: Readonly<Record<string, string>>,
): boolean {
  return camposPreenchidos(registro, modulo, rotulos).length === 0
}

// `modulosComDado` morava aqui, escrita na #137 com a nota "o índice lateral usa
// isto" — e quando o índice existiu de verdade ele usou `camposPreenchidos`,
// porque precisa da CONTAGEM por módulo, não da lista dos que têm dado. Ficou
// exportada e sem chamador por uma janela inteira. Removida: função escrita para
// um consumidor futuro é a mesma dívida que prop sem consumidor, e a varredura
// de exportados sem chamador a pegou junto com as outras.
