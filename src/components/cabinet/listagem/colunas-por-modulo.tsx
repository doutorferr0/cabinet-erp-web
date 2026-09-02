import type { GrupoDeColunasOpcionais } from '@/components/cabinet/listagem/menu-de-colunas'
import type { CampoCadastro, EntidadeCadastro, ModuloCadastro } from '@/features/cadastro/modulos'
import { idDoFiltro } from './modulos-da-consulta'

/**
 * COLUNAS AGRUPADAS POR MÓDULO (#104) — o repertório que diz de onde cada
 * coluna vem.
 *
 * Uma lista plana de quarenta caixas não responde "que colunas existem sobre
 * dados bancários"; agrupada por módulo, responde sem ler item por item. E o
 * cabeçalho da grade leva o ponto da cor do módulo de origem, para a resposta
 * continuar valendo depois que o seletor fecha.
 *
 * ## Isto era um COMPONENTE, e virou dado (Reface 2.0)
 *
 * O painel abria embaixo da barra e empurrava a grade para baixo, ao lado de um
 * segundo botão de colunas que a barra 2.0 passou a ter. Dois lugares para
 * "escolher coluna" é a duplicação que o CLAUDE.md proíbe. O que era exclusivo
 * daqui — o agrupamento por módulo e a coluna fixa com o motivo — atravessou
 * para dentro do `MenuDeColunas`, e o que ficou é a função que monta os grupos:
 * quem sabe o que é um módulo é o schema, não o popover.
 *
 * ## Coluna `col` é FIXA e não desmarca — e isso é regra do schema
 *
 * `col: true` no schema significa "esta coluna é a identidade da linha na
 * grade" (código, nome, ativo). Deixar desmarcá-la produziria uma listagem sem
 * como distinguir um registro do outro, e o operador só descobriria depois de
 * fechar o seletor.
 */

/** Campos que podem virar coluna: têm lastro na fonte da entidade. */
function colunasDoModulo(
  entidade: EntidadeCadastro,
  modulo: ModuloCadastro,
): readonly CampoCadastro[] {
  return modulo.campos.filter((campo) => idDoFiltro(entidade, campo))
}

/**
 * Os grupos que o menu de colunas mostra abaixo das colunas da grade.
 *
 * `fixas` são as que a TELA já desenha, e por isso não se desmarcam. Sem elas o
 * "fixa" sairia do `col: true` do schema, que é o que o campo QUER ser — e o
 * que a grade mostra é outra coisa: o cliente declara `CPF / CNPJ` como `col`,
 * e a listagem desenha Código, Nome e Ativo. Marcar como fixa uma coluna que
 * não está na grade faz o seletor descrever uma tela que não existe. Ausente,
 * cai no `col: true` — é o que o schema sozinho sabe.
 */
export function gruposDoModulo(
  entidade: EntidadeCadastro,
  extras: readonly string[],
  fixas?: readonly string[],
): GrupoDeColunasOpcionais[] {
  return entidade.modulos
    .filter((modulo) => colunasDoModulo(entidade, modulo).length > 0)
    .map((modulo) => ({
      id: modulo.id,
      titulo: modulo.titulo,
      colunas: colunasDoModulo(entidade, modulo).map((campo) => {
        const id = idDoFiltro(entidade, campo) as string
        const fixa = fixas ? fixas.includes(id) : campo.col === true
        return { id, rotulo: campo.r, ligada: extras.includes(id), ...(fixa ? { fixa } : {}) }
      }),
    }))
}
