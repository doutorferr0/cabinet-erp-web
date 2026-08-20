import {
  type CampoCadastro,
  type EntidadeCadastro,
  type ModuloCadastro,
  filtrosDe,
} from '@/features/cadastro/modulos'
import type { FiltroDaTabela, VarianteDeFiltro } from '@/lib/filtro-de-consulta'
import { novoFiltroId, operadorPadrao } from '@/lib/filtro-de-consulta'

/**
 * O SCHEMA DE MÓDULOS VIRA CONSULTA — a diretriz 4 do lado da listagem.
 *
 * O mesmo objeto que já alimenta o formulário (#101) e a ficha (#103) diz aqui
 * o que dá para filtrar, o que vira coluna e a que módulo cada uma pertence. A
 * barra de filtro plana não escala: com quarenta campos por entidade o operador
 * não sabe o que é filtrável, e cada tela decidia sozinha — que é como
 * Fornecedor e Profissional divergiram.
 *
 * ## Este arquivo TRADUZ, não inventa vocabulário
 *
 * O filtro estruturado da `VitraDataTable` já existe (#76) e tem o seu
 * vocabulário: `FiltroDaTabela {id, variante, operador, valor}`, com `id` sendo
 * o nome que VIAJA para o servidor. O schema de módulos tem outro, mais curto
 * (`fil: 'texto'|'sel'|'data'|'faixa'|'bool'`), porque nasceu do mockup.
 *
 * Um mapa de cinco linhas entre os dois é mais barato que unificá-los, e mantém
 * cada um livre para crescer: `fil` descreve INTENÇÃO ("isto se filtra por
 * período"), `variante` descreve o CONTROLE que a DataTable sabe desenhar.
 *
 * ## O `id` do filtro é o que a FONTE entende, e é aqui que isso se decide
 *
 * Entidade `http` filtra pelo `dto` (o nome na whitelist do contrato — campo
 * fora dela é 400); entidade `mock` filtra pelo `campo` (o caminho no schema
 * Zod, que o provider em memória resolve). `filtrosDe` já derruba quem não tem
 * lastro nenhum, então aqui basta escolher o lado certo.
 */

const VARIANTE_POR_FIL: Record<NonNullable<CampoCadastro['fil']>, VarianteDeFiltro> = {
  texto: 'text',
  sel: 'select',
  data: 'date',
  faixa: 'number',
  bool: 'boolean',
}

/** O nome que viaja: `dto` no servidor, `campo` no provider em memória. */
export function idDoFiltro(entidade: EntidadeCadastro, campo: CampoCadastro): string | undefined {
  return entidade.fonte === 'http' ? campo.dto : campo.campo
}

/** Um módulo com os campos que ele oferece para filtrar — vazio some da faixa. */
export interface ModuloFiltravel {
  modulo: ModuloCadastro
  campos: readonly CampoCadastro[]
}

/**
 * Os módulos que têm ao menos um campo filtrável, na ordem do schema.
 *
 * Módulo sem campo filtrável **não vira chip**: um chip que abre painel vazio
 * é pior que a ausência dele — o operador clica, não encontra nada e não sabe
 * se é a tela que está quebrada ou se ele entendeu errado a pergunta.
 */
export function modulosFiltraveis(entidade: EntidadeCadastro): readonly ModuloFiltravel[] {
  // Deriva de `filtrosDe`, e não de `idDoFiltro` sozinho: desde #244 existe
  // campo PUBLICADO no contrato e fora da whitelist de `filters` (telefone e
  // endereço do parceiro). Ter `dto` deixou de bastar — oferecer um chip de
  // `Endereço` que responde 400 no primeiro recorte é pior que não oferecê-lo,
  // porque o operador conclui que a tela está quebrada.
  const comLastro = new Set(filtrosDe(entidade))
  return entidade.modulos
    .map((modulo) => ({
      modulo,
      campos: modulo.campos.filter((campo) => comLastro.has(campo)),
    }))
    .filter((item) => item.campos.length > 0)
}

/** A que módulo pertence o campo que este filtro consulta. */
export function moduloDoFiltro(
  entidade: EntidadeCadastro,
  filtroId: string,
): ModuloCadastro | undefined {
  return entidade.modulos.find((modulo) =>
    modulo.campos.some((campo) => idDoFiltro(entidade, campo) === filtroId),
  )
}

/** O campo, pelo nome que viaja. É dele que sai o rótulo da pill. */
export function campoDoFiltro(
  entidade: EntidadeCadastro,
  filtroId: string,
): CampoCadastro | undefined {
  return entidade.modulos
    .flatMap((modulo) => modulo.campos)
    .find((campo) => idDoFiltro(entidade, campo) === filtroId)
}

/**
 * Monta a linha de filtro que a `VitraDataTable` consome.
 *
 * `isBetween` guarda `[min, max]` — é o formato que o filtro estruturado já
 * usa, e é o que faz período e faixa caberem sem variante nova.
 */
export function filtroDoCampo(
  entidade: EntidadeCadastro,
  campo: CampoCadastro,
  valor: string | string[],
): FiltroDaTabela | undefined {
  const id = idDoFiltro(entidade, campo)
  if (!id || !campo.fil) return undefined
  const variante = VARIANTE_POR_FIL[campo.fil]
  return {
    filtroId: novoFiltroId(),
    id,
    variante,
    // Período e faixa pedem os dois extremos; o resto usa o operador natural da
    // variante (`iLike` em texto, `eq` em seleção e booleano).
    operador:
      campo.fil === 'data' || campo.fil === 'faixa' ? 'isBetween' : operadorPadrao(variante),
    valor,
  }
}

/**
 * Quantos filtros ativos são deste módulo — o número no chip.
 *
 * Conta LINHA de filtro, não campo: duas condições sobre o mesmo campo são dois
 * filtros ativos, e é isso que o operador precisa saber para entender por que a
 * listagem está estreita.
 */
export function ativosDoModulo(
  entidade: EntidadeCadastro,
  modulo: ModuloCadastro,
  filtros: readonly FiltroDaTabela[],
): number {
  const ids = new Set(
    modulo.campos.map((campo) => idDoFiltro(entidade, campo)).filter(Boolean) as string[],
  )
  return filtros.filter((filtro) => ids.has(filtro.id)).length
}
