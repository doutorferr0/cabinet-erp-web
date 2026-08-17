import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import type { CampoCadastro, EntidadeCadastro } from '@/features/cadastro/modulos'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { idDoFiltro } from './modulos-da-consulta'

/**
 * COLUNAS OPCIONAIS DA GRADE (#104) — o que o seletor `Colunas` liga de verdade.
 *
 * O `ColunasPorModulo` sabe DIZER quais colunas existem; este arquivo é o que
 * transforma a escolha em coluna na grade. Sem ele o seletor seria um controle
 * que marca e desmarca sem efeito — pior que não existir, porque o operador
 * confia no que a tela mostra.
 *
 * ## O que a tela já declara não entra aqui
 *
 * A coluna declarada é a identidade da linha e vem com o rótulo e a célula que
 * aquela tela escolheu (`Nome` usa `<Nome>`, `Ativo` usa o carimbo). Derivá-la
 * de novo aqui daria duas fontes para a mesma coluna, e a segunda apareceria
 * duplicada ao lado da primeira. O corte é pela GRADE, não pelo `col: true` do
 * schema: `col` é o que o campo QUER ser, e o cliente declara `CPF / CNPJ` como
 * `col` sem que a listagem o desenhe.
 *
 * ## Ordenação NÃO é dada de graça
 *
 * O cabeçalho só ordena quando o servidor aceita o nome (CLAUDE.md: `sortBy`
 * fora da whitelist volta 400, e só ao CLICAR — defeito que a tela não mostra
 * enquanto ninguém clica). Em fonte `mock` quem ordena é o provider em memória,
 * sobre o mesmo objeto do schema, e aí não há whitelist a respeitar.
 *
 * A invariante de `invariantes.test.ts` cobre os campos com `fil`; um campo que
 * vira coluna sem ser filtro (o `E-mail` do cliente é o caso) não passa por
 * ela — por isso a conferência é feita aqui, e não presumida.
 */

/** O nome que a coluna usa é o MESMO que viaja no filtro: `dto` em http, `campo` em mock. */
export function idDaColuna(entidade: EntidadeCadastro, campo: CampoCadastro): string | undefined {
  return idDoFiltro(entidade, campo)
}

/**
 * Os ids das colunas que a TELA declarou.
 *
 * É a lista de quem já está na grade, e é ela — não o `col: true` do schema —
 * que diz o que não se pode desmarcar. `accessorKey` é o nome que viaja; `id`
 * cobre a coluna que não acessa campo (a de seleção, por exemplo).
 */
export function idsDeclarados<T>(columns: readonly ColumnDef<T>[]): readonly string[] {
  return columns.flatMap((coluna) => {
    const id = coluna.id ?? ('accessorKey' in coluna ? String(coluna.accessorKey) : undefined)
    return id ? [id] : []
  })
}

/** Os campos que o seletor pode oferecer como coluna OPCIONAL, na ordem do schema. */
export function camposOpcionais(
  entidade: EntidadeCadastro,
  declaradas: readonly string[] = [],
): readonly CampoCadastro[] {
  return entidade.modulos
    .flatMap((modulo) => modulo.campos)
    .filter((campo) => {
      const id = idDaColuna(entidade, campo)
      return id !== undefined && !declaradas.includes(id)
    })
}

function celula(campo: CampoCadastro, valor: unknown): ReactNode {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return <CelulaAtivo ativo={valor} />
  if (campo.grana && typeof valor === 'number') return formatMoneyBRL(valor)
  if (campo.t === 'data' && typeof valor === 'string') return formatDateBR(valor)
  return String(valor)
}

/**
 * As colunas extras, na ordem do SCHEMA e não na de clique.
 *
 * Ordem de clique faria a mesma seleção desenhar grades diferentes conforme a
 * sequência em que o operador marcou as caixas, e a consulta salva reabriria a
 * tela com as colunas embaralhadas.
 */
export function colunasDaGrade<T>(
  entidade: EntidadeCadastro,
  extras: readonly string[],
  declaradas: readonly string[] = [],
): ColumnDef<T>[] {
  if (extras.length === 0) return []
  const ordenavel = (id: string) =>
    entidade.fonte === 'mock' || (entidade.whitelist?.includes(id) ?? false)

  return camposOpcionais(entidade, declaradas).flatMap((campo) => {
    const id = idDaColuna(entidade, campo) as string
    if (!extras.includes(id)) return []
    return [
      {
        id,
        accessorKey: id,
        header: campo.r,
        enableSorting: ordenavel(id),
        ...(campo.grana ? { meta: { numeric: true } } : {}),
        cell: ({ getValue }) => celula(campo, getValue()),
      } as ColumnDef<T>,
    ]
  })
}
