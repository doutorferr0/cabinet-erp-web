import { VOCABULARIO_DE_APOIO } from '@/mocks/lookups'
import { ID_DO_COLABORADOR, stubDeColaboradores } from '@/test/colaboradores'
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
 * ## A tela migrou para HTTP, e a sentinela ficou MAIS forte
 *
 * Em 2026-08-25 `data.colaboradores` virou `GET /api/employees`, e o "passa
 * sozinho" descrito acima ACABOU: `daFichaDoServidor` guarda o **id** em `setor`
 * e `cargo` (é o que o formulário precisa para gravar), então o dia que este
 * teste esperava chegou. O rótulo só aparece porque a rota passa `rotulos` de
 * `useRotulosDeApoio` — tire a tradução e a ficha imprime `lk-SETOR-1` na cara
 * do operador, que é exatamente o que a asserção abaixo recusa.
 *
 * O vocabulário conferido passou a ser o de `src/mocks/lookups.ts`
 * (`VOCABULARIO_DE_APOIO`), que é o que `respostaLookups()` publica ao stub —
 * antes eram `SETORES`/`CARGOS` do fixture de colaborador, que a tela não lê
 * mais. Mesma regra, medida contra a lista que hoje manda.
 *
 * Os dois campos aferidos são os que têm lista no vocabulário (`SETOR`,
 * `CARGO`). Os outros seis mudam junto e não têm lista pública para comparar;
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
    renderRoute(
      `/cadastros/colaboradores/${ID_DO_COLABORADOR}?modo=consulta`,
      stubDeColaboradores(),
    )

    // A espera é pelo NOME do colaborador, e não por `heading level 1`: quem
    // desenha o título da ficha é a banda do cadastro, e o esqueleto de
    // carregamento não o tem. Esperar o nome garante que a FICHA chegou — antes
    // dele, `valorDoCampo` leria de uma tela ainda em branco.
    await screen.findAllByText('CARLA SOUZA')

    const setor = valorDoCampo('Setor')
    // O rótulo é o do schema, literal — `Cargo / função`, não `Cargo`.
    const cargo = valorDoCampo('Cargo / função')

    // Não basta "tem alguma coisa": um id também tem. O que se cobra é
    // pertencer ao vocabulário que o operador reconhece.
    expect(VOCABULARIO_DE_APOIO.SETOR).toContain(setor)
    expect(VOCABULARIO_DE_APOIO.CARGO).toContain(cargo)
  })
})
