import {
  type CampoFiltravel,
  type FiltroDaTabela,
  dispensaValor,
  operadoresDaVariante,
} from '@/lib/filtro-de-consulta'
import { formatDateBR } from '@/lib/formatters'

/**
 * A FRASE DA PÍLULA — o filtro lido de longe, sem abrir nada.
 *
 * A pílula (#199) troca três controles encostados por uma frase e um `×`. A
 * troca só se paga se a frase disser a mesma coisa que os controles diziam:
 * "Nome contém STELLA" cabe num relance, `[Nome][contém][STELLA]` cobra três
 * leituras e ocupa o triplo da barra. O que se EDITA continua sendo o controle
 * — ele mora no popover da própria pílula.
 *
 * ## O valor aparece como o operador o LÊ, não como o dado o guarda
 *
 * Data em ISO na pílula (`2026-08-18`) seria a única data em ISO da tela
 * inteira; `select` mostrando o id da opção seria um código onde a pessoa
 * escolheu um nome. Os dois casos fariam o operador abrir o popover só para
 * confirmar o que já filtrou — que é exatamente o clique que a pílula existe
 * para poupar. **Só a EXIBIÇÃO muda:** o que viaja continua sendo o valor
 * gravado no filtro (ver `filtrosNormalizados`).
 */

/** Quantos itens de múltipla escolha ainda cabem por nome antes de virar contagem. */
const NOMES_ATE = 2

function rotuloDoOperador(filtro: FiltroDaTabela): string {
  return (
    operadoresDaVariante(filtro.variante).find((o) => o.valor === filtro.operador)?.rotulo ??
    filtro.operador
  )
}

function rotuloDaOpcao(campo: CampoFiltravel, valor: string): string {
  return campo.opcoes?.find((o) => o.valor === valor)?.rotulo ?? valor
}

function comoLista(valor: string | string[]): string[] {
  return (Array.isArray(valor) ? valor : [valor]).filter((v) => v !== '')
}

function valorLegivel(filtro: FiltroDaTabela, campo: CampoFiltravel): string {
  const itens = comoLista(filtro.valor)
  if (itens.length === 0) return ''

  if (filtro.operador === 'isBetween') {
    // Faltando uma das pontas a frase fica pela metade ("entre 10 e"), e o
    // filtro incompleto nem sai da tela (`filtrosValidos`). Mostrar a ponta que
    // existe é mais honesto que inventar a outra.
    const [de = '', ate = ''] = Array.isArray(filtro.valor) ? filtro.valor : [filtro.valor, '']
    const formatar = (v: string) => (filtro.variante === 'date' ? formatDateBR(v) : v)
    if (de && ate) return `${formatar(de)} e ${formatar(ate)}`
    return formatar(de || ate)
  }

  if (filtro.variante === 'boolean') return itens[0] === 'true' ? 'Sim' : 'Não'
  if (filtro.variante === 'date') return formatDateBR(itens[0] ?? '')
  if (filtro.variante === 'select') return rotuloDaOpcao(campo, itens[0] ?? '')

  if (filtro.variante === 'multiSelect') {
    // Dois nomes cabem; cinco viram uma pílula do tamanho da barra. A contagem
    // continua dizendo o essencial — quantas coisas a pergunta cobre — e o
    // popover mostra quais.
    if (itens.length <= NOMES_ATE) return itens.map((v) => rotuloDaOpcao(campo, v)).join(', ')
    return `${itens.length} opções`
  }

  return itens[0] ?? ''
}

/**
 * A pílula inteira: campo, operador e valor numa frase só.
 *
 * Filtro sem valor ainda montado (o operador acabou de escolher o campo) fica
 * em "Nome contém…" — as reticências dizem "falta você digitar" sem que a
 * pílula suma da barra no meio da montagem.
 */
export function resumoDoFiltro(filtro: FiltroDaTabela, campo: CampoFiltravel): string {
  const frase = `${campo.rotulo} ${rotuloDoOperador(filtro)}`
  if (dispensaValor(filtro.operador)) return frase
  const valor = valorLegivel(filtro, campo)
  return valor ? `${frase} ${valor}` : `${frase}…`
}

/**
 * A mesma frase repartida para o CHIP, que pinta cada pedaço de um jeito
 * (`Situação: **Enviada, Confirmada**`).
 *
 * ## O operador PADRÃO some do chip, e só ele
 *
 * "Situação está em Enviada" gasta duas palavras dizendo o que os dois-pontos
 * já dizem: o operador padrão da variante é o que o `+ Filtro` monta sozinho, e
 * escrevê-lo em toda barra empurraria os chips seguintes para a segunda linha.
 * Operador ESCOLHIDO continua escrito — "Preço maior que 100" e "Preço 100" são
 * perguntas diferentes, e omitir a diferença seria mentir sobre o que filtrou.
 */
export interface PartesDoChip {
  rotulo: string
  /** `undefined` quando é o operador padrão da variante — os dois-pontos bastam. */
  operador?: string | undefined
  /** `''` enquanto a pessoa ainda não digitou; o chip mostra `…` no lugar. */
  valor: string
}

export function partesDoChip(filtro: FiltroDaTabela, campo: CampoFiltravel): PartesDoChip {
  const padrao = operadoresDaVariante(filtro.variante)[0]?.valor
  const operador = filtro.operador === padrao ? undefined : rotuloDoOperador(filtro)
  if (dispensaValor(filtro.operador)) {
    return { rotulo: campo.rotulo, operador: rotuloDoOperador(filtro), valor: '' }
  }
  return { rotulo: campo.rotulo, operador, valor: valorLegivel(filtro, campo) }
}
