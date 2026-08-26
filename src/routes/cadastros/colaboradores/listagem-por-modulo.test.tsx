import { stubDeColaboradores } from '@/test/colaboradores'
import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * ESTE ARQUIVO MUDOU DE LADO em 2026-08-25, e a inversão é o assunto dele.
 *
 * Ele provava que a faixa de chips por módulo aparecia nesta tela e que filtrar
 * por setor estreitava a listagem **de verdade** — Colaborador era a tela piloto
 * do filtro estruturado do lado MOCK, e quem respondia `campo + operador +
 * valor` era o provider em memória.
 *
 * Com a listagem em `GET /api/employees`, quem responde é o servidor, e **ele
 * não publica o parâmetro `filters`**: medido contra a main `2ee954b` do api,
 * pedir `filters` responde 400 `urn:cabinet:erro:filtro-invalido` — "Este
 * recurso não publica o parâmetro filters". Os campos filtráveis saíram da tela.
 *
 * ## Por que o arquivo não foi apagado
 *
 * Porque a regra que ele guarda continua existindo — só trocou de sinal. Sem
 * ele, alguém que devolvesse `modoDeFiltro="modulo"` a esta tela não teria nada
 * vermelho: `filtrosDaTabela` só lança quando um filtro é REALMENTE montado, e
 * até lá a faixa de chips aparece bonita. O operador é quem descobriria, com um
 * 400 que ele não fez nada para merecer.
 *
 * **O piloto não se perdeu.** `modoDeFiltro="modulo"` segue em Cliente e
 * Fornecedor (`/cadastros/clientes`, `/cadastros/fornecedores`), que são HTTP e
 * cujo contrato publica `filters` — é lá que o caminho de verdade é exercitado.
 * O que esta tela perdeu foi o filtro sobre FICÇÃO.
 *
 * Volta a ser o arquivo de antes — com as duas asserções invertidas de novo — no
 * dia em que o contrato publicar `filters` para `/api/employees`, que é PR neste
 * repo (dono do contrato) e depois handler no api.
 */
describe('listagem de Colaborador sem filtro estruturado', () => {
  it('não oferece a faixa de chips por módulo enquanto o servidor não filtra', async () => {
    renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    expect(await screen.findByText('Cadastro de Colaboradores')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Identificação/ })).not.toBeInTheDocument()
  })

  /**
   * A busca por texto CONTINUA, e é ela que sobrou: `q` é o parâmetro que
   * `/api/employees` serve. Sem este caso, "tirar o filtro" poderia ser lido
   * como "tirar a busca", e a tela ficaria sem nenhum jeito de achar alguém.
   */
  it('continua oferecendo a busca por texto, que é o que o servidor serve', async () => {
    renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    await screen.findByText('Cadastro de Colaboradores')
    expect(screen.getByLabelText('Busca')).toBeInTheDocument()
  })
})
