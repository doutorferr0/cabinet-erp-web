import { CARGOS, SETORES } from '@/mocks/colaboradores'
import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * SENTINELA: a ficha mostra o RÓTULO da lista de apoio, nunca o id.
 *
 * Hoje isto passa sozinho — os cadastros ainda guardam o texto legível
 * (`setor: 'VENDAS'`), então imprimir o valor guardado dá o rótulo por
 * acidente. O teste não existe pelo hoje: existe pelo dia em que o registro
 * passar a guardar **id**.
 *
 * ## O defeito que este arquivo espera pegar
 *
 * A PR #133 (issue #94, `LookupCombo` por `value=id`) troca a semente dos mocks
 * por id — `setor: idDeApoio('SETOR', 'VENDAS')` — e cria o
 * `VOCABULARIO_DE_APOIO` com os 19 kinds. A ficha de consulta imprime
 * `textoDoCampo`, que devolve o valor guardado quando não recebe `rotulos`, e
 * **nenhuma rota passa esse mapa hoje** (a pendência está declarada no
 * docstring do `FichaDeCadastro`). Com a #133 dentro e nada mais, a consulta de
 * Colaborador exibe id cru em Setor, Cargo, Vínculo, Nacionalidade, Grau de
 * instrução, Profissão, Raça/cor e Estado civil.
 *
 * **As duas PRs são disjuntas por arquivo** — nenhum caminho em comum, `merge`
 * limpo, `tsc` limpo, e a suíte inteira verde, porque os testes da ficha aferem
 * `nome`/`legalName`, que não são lookup. É a classe "premissa vencida não vira
 * conflito": o merge não acusa nada, e quem paga é a tela.
 *
 * ## Por que a asserção é contra a LISTA, não contra o formato do id
 *
 * Cobrar "não parece um id" amarraria este teste ao formato que a #133
 * escolher, que é decisão de outra zona e pode mudar. Cobrar que o texto exibido
 * **pertence à lista de apoio** trava a regra de verdade — o operador lê o
 * vocabulário que ele conhece — e falha em qualquer id, de qualquer formato.
 *
 * Os dois campos aferidos são os que têm lista exportada do mock (`SETORES`,
 * `CARGOS`). Os outros seis mudam junto e não têm lista pública para comparar;
 * quando a #133 entrar, o conserto (a rota passar `rotulos`) cobre os oito de
 * uma vez, e estes dois bastam como sentinela.
 *
 * ## Validado por mutação, e o número é o argumento
 *
 * Simulei a #133 trocando a semente do mock por id (`setor: 'SETOR-1'`) e rodei
 * a suíte INTEIRA: **981 passaram e só este teste falhou** (`expected [
 * 'VENDAS', … ] to include 'SETOR-1'`). Mutação revertida em seguida.
 *
 * Ou seja, sem esta sentinela o defeito entra mudo — nem a listagem, nem os
 * formulários, nem os outros testes da ficha acusam id cru na tela. Um teste que
 * só passa não prova nada; o que dá valor a este é ter falhado onde devia.
 */

/** O par de leitura é rótulo + valor, lado a lado — o valor é o irmão seguinte. */
function valorDoCampo(rotulo: string): string {
  const etiqueta = screen.getByText(rotulo)
  const valor = etiqueta.nextElementSibling?.textContent ?? ''
  return valor.trim()
}

describe('ficha em consulta: valor de lista de apoio é legível', () => {
  it('Setor e Cargo mostram o rótulo do vocabulário, não o id', async () => {
    renderRoute('/cadastros/colaboradores/1?modo=consulta')

    await screen.findByRole('heading', { level: 1 })

    const setor = valorDoCampo('Setor')
    // O rótulo é o do schema, literal — `Cargo / função`, não `Cargo`.
    const cargo = valorDoCampo('Cargo / função')

    // Não basta "tem alguma coisa": um id também tem. O que se cobra é
    // pertencer ao vocabulário que o operador reconhece.
    expect(SETORES).toContain(setor)
    expect(CARGOS).toContain(cargo)
  })
})
