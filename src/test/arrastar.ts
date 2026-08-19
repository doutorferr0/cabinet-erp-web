/**
 * ARRASTAR NO TESTE — a sequência de eventos nativos que o jsdom não tem.
 *
 * `@atlaskit/pragmatic-drag-and-drop` roda sobre a API de arrasto do HTML5:
 * ele escuta `dragstart`/`dragenter`/`dragover`/`drop` e lê o `dataTransfer` do
 * evento. O jsdom não implementa NEM `DragEvent` NEM `DataTransfer` — medido
 * aqui, os dois saem `undefined` no `globalThis` — então `fireEvent.dragStart`
 * sozinho não acorda a biblioteca.
 *
 * A Atlassian publica um pacote só para isto
 * (`@atlaskit/pragmatic-drag-and-drop-unit-testing`). Ele NÃO entra: instalar
 * dependência é do trilho Libs-0, o dono do `package.json`, e a trava de idade
 * de pacote do workspace vale para pacote de teste igual. O que falta é pequeno
 * e cabe aqui: um `dataTransfer` de mentira com os quatro métodos que a
 * biblioteca chama, e os eventos disparados na ordem certa.
 *
 * **O `await` entre os passos não é enfeite.** O adaptador de elemento decide o
 * início do arrasto numa microtarefa depois do `dragstart` — sem ceder o
 * controle, o `dragenter` chega antes de existir arrasto e o alvo ignora tudo.
 * É a diferença entre o teste medir o gesto e medir o silêncio.
 *
 * **E tudo corre dentro de `act`** porque os eventos são NATIVOS: o React não
 * os reconhece como interação sua, o estado do realce cairia fora do lote e o
 * teste veria o DOM de um render atrasado — além do aviso de `act` em toda
 * rodada, que é ruído treinando quem lê a saída a ignorá-la.
 */

import { act } from '@testing-library/react'

/** O mínimo de `DataTransfer` que a biblioteca toca. */
function transferenciaDeMentira() {
  const dados = new Map<string, string>()
  return {
    types: [] as string[],
    items: [] as unknown[],
    files: [] as unknown[],
    effectAllowed: 'move',
    dropEffect: 'move',
    setData(tipo: string, valor: string) {
      dados.set(tipo, valor)
      this.types.push(tipo)
    },
    getData: (tipo: string) => dados.get(tipo) ?? '',
    clearData: () => dados.clear(),
    setDragImage: () => {},
  }
}

function disparar(alvo: Element, tipo: string, transferencia: unknown): void {
  const evento = new Event(tipo, { bubbles: true, cancelable: true }) as Event & {
    dataTransfer?: unknown
    clientX?: number
    clientY?: number
  }
  evento.dataTransfer = transferencia
  // O adaptador lê a posição do ponteiro para montar a `location`; sem número
  // nenhum ele ainda funciona, mas com `NaN` no meio do caminho.
  evento.clientX = 1
  evento.clientY = 1
  alvo.dispatchEvent(evento)
}

/**
 * Arrasta `origem` e solta em `destino`.
 *
 * Devolve depois de a fila de microtarefas girar, então quem chama já pode
 * afirmar sobre o efeito — sem `waitFor` para o gesto em si (o `waitFor` que
 * sobra é o da requisição, que é outra coisa).
 */
export async function arrastarPara(origem: Element, destino: Element): Promise<void> {
  const gesto = await arrastarSobre(origem, destino)
  await gesto.soltar()
}

/**
 * Começa o arrasto e para EM CIMA do destino, sem soltar.
 *
 * É o que permite afirmar sobre o realce de destino — a marca de encaixe e o
 * degrau de elevação existem enquanto o cartão está no ar, e um teste que só
 * solta nunca os vê.
 */
export async function arrastarSobre(
  origem: Element,
  destino: Element,
): Promise<{ soltar: () => Promise<void> }> {
  const transferencia = transferenciaDeMentira()
  await act(async () => {
    disparar(origem, 'dragstart', transferencia)
    await Promise.resolve()
    disparar(destino, 'dragenter', transferencia)
    disparar(destino, 'dragover', transferencia)
    await Promise.resolve()
  })
  return {
    soltar: async () => {
      await act(async () => {
        disparar(destino, 'drop', transferencia)
        await Promise.resolve()
      })
    },
  }
}
