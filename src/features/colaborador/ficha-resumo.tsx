import type { EmployeeDto } from '@/api/gerado'
import type { ParDoCartao } from '@/components/cabinet/cartao-lateral'

/**
 * O cartão `Resumo` do colaborador (D19, #487) — hoje ele nunca monta, e a
 * função existe para que isso seja uma DECISÃO escrita e não um esquecimento.
 *
 * `EmployeeDto` tem cinco campos: `id`, `name`, `active`, `jobTitle`, `sector`.
 * Os três primeiros já estão no cabeçalho e no cartão de identidade; `jobTitle`
 * e `sector` já estão nos módulos da ficha. Não sobra nada que a coluna de
 * apoio possa dizer sem repetir o que está dois cliques à direita — e repetir é
 * o que gasta a coluna que existe para dizer o que a ficha não diz.
 *
 * "Últimos registros" do colaborador (atividades, tarefas, comissões) tem
 * caminho no contrato, mas por OUTRO recurso: abrir essa fronteira é trabalho
 * de dado, não de desenho, e entra quando alguém a pedir pelo nome.
 */
export function resumoDoColaborador(_dto: EmployeeDto | null | undefined): ParDoCartao[] {
  return []
}
