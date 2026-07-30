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
}

/** `validateSearch` das rotas de detalhe: só aceita o valor conhecido. */
export function validateModoSearch(search: Record<string, unknown>): ModoSearch {
  return search.modo === 'consulta' ? { modo: 'consulta' } : {}
}

export function isConsulta(search: ModoSearch): boolean {
  return search.modo === 'consulta'
}
