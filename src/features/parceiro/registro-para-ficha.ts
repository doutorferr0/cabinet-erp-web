import { type EntidadeCadastro, camposDe } from '@/features/cadastro/modulos'

/**
 * O REGISTRO QUE A FICHA LÊ — sem os defaults do formulário.
 *
 * Achado com o backend de verdade (2026-08-18): a ficha de um fornecedor que
 * veio do servidor dizia **"Fornece para revenda: Não"**, e a de um cliente com
 * CNPJ de 14 dígitos dizia **"Tipo de pessoa: FISICA"**. O servidor não mandou
 * nem um nem outro — o `PartnerDto` não tem esses campos. Os dois valores são o
 * default de `fornecedorVazio()`/`clienteVazio()`, que o `dtoParaForm` usa como
 * base por um motivo legítimo: **campo de formulário controlado precisa de
 * valor**, e `undefined` faz o input alternar entre controlado e não controlado
 * no meio da digitação.
 *
 * Só que a FICHA não é formulário. Ali o mesmo default deixa de ser andaime e
 * vira afirmação sobre o registro — dado de mentira com cara de dado do
 * servidor, que é o que o `CLAUDE.md` proíbe. E mente duas vezes: o contador do
 * módulo (`1/9` em `Comercial e preço`) conta o valor inventado como campo
 * preenchido, então a barra de progresso do cadastro sobe sozinha.
 *
 * O mock escondia isso porque o mock preenchia tudo: com `forneceRevenda`
 * vindo do dado fake, "Não" podia ser a verdade daquele registro. Com dado real
 * o campo não existe, e o "Não" passou a ser invenção em 100% das linhas.
 *
 * **A regra é a que o schema já sabe:** campo com `dto` é campo que o contrato
 * carrega; campo sem `dto` o servidor não guarda. Este helper apaga os segundos
 * do objeto que vai para a ficha — `textoDoCampo` então devolve `null` e a ficha
 * escreve "não informado", que é a verdade. **O formulário continua recebendo o
 * registro inteiro**: lá o default é necessário, e lá ele não afirma nada.
 *
 * Vale só para registro VINDO DO SERVIDOR. No `Incluir` não há o que corrigir —
 * a ficha nem aparece.
 */
export function registroParaFicha<T extends object>(registro: T, entidade: EntidadeCadastro): T {
  const semCobertura = camposDe(entidade)
    .filter((campo) => campo.campo && !campo.dto)
    .map((campo) => campo.campo as string)

  if (semCobertura.length === 0) return registro

  const copia = structuredClone(registro)
  for (const caminho of semCobertura) apagarCaminho(copia, caminho)
  return copia
}

/**
 * Apaga um caminho pontilhado (`telefones.foneComercial`), sem criar o que não
 * existe: caminho ausente é caso normal — nem todo papel tem todo campo do
 * schema compartilhado.
 */
function apagarCaminho(alvo: unknown, caminho: string): void {
  const partes = caminho.split('.')
  const ultima = partes.pop()
  if (!ultima) return

  let atual = alvo
  for (const parte of partes) {
    if (!atual || typeof atual !== 'object') return
    atual = (atual as Record<string, unknown>)[parte]
  }
  if (!atual || typeof atual !== 'object') return
  delete (atual as Record<string, unknown>)[ultima]
}
