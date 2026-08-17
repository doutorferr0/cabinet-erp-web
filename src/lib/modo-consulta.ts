/**
 * Modo do formulário — transcrição §9 padrão 8 (consulta somente-leitura).
 *
 * A barra de ações tem `Alterar` e `Consul.` apontando para a MESMA tela; o que
 * muda é o modo. Viaja como search param (`?modo=consulta`) para que a URL de
 * consulta seja compartilhável e o voltar do browser funcione.
 */
export type ModoFormulario = 'edicao' | 'consulta'

export interface ModoSearch {
  modo?: 'consulta'
  /**
   * O módulo em foco na edição (issue #103): o lápis da ficha manda editar
   * AQUELE módulo, não o formulário inteiro, e o bloco dele nasce aberto.
   *
   * Viaja como search param pela mesma razão do `modo` — a URL é o estado
   * compartilhável, e o voltar do browser desfaz o foco sem desfazer a edição.
   * Vale para qualquer id: quem conhece os módulos é o schema da entidade, e um
   * id que não existe simplesmente não abre bloco nenhum.
   */
  modulo?: string
}

/** `validateSearch` das rotas de detalhe: só aceita os valores conhecidos. */
export function validateModoSearch(search: Record<string, unknown>): ModoSearch {
  return {
    ...(search.modo === 'consulta' ? { modo: 'consulta' as const } : {}),
    ...(typeof search.modulo === 'string' && search.modulo !== '' ? { modulo: search.modulo } : {}),
  }
}

export function isConsulta(search: ModoSearch): boolean {
  return search.modo === 'consulta'
}
