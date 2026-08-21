import { configurarApi } from '@/api/cliente'
import { LookupField, LookupSelectField } from '@/components/cabinet/form-controls'
import { Form } from '@/components/ui/form'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * OS CAMPOS DE LOOKUP LIGADOS AO FORM, depois da migração para `value=id` (#94).
 *
 * O `LookupCombo` tem teste próprio; aqui o que se prova é a LIGAÇÃO: o campo do
 * formulário guarda o id, a tela mostra o nome, e um id que a lista não conhece
 * não some nem vira chave crua na tela.
 *
 * O `<select>` do `LookupSelectField` merece caso próprio por um motivo que
 * custou tempo: **`document.body.innerHTML` não serializa qual `<option>` está
 * selecionado**. Uma foto do DOM sempre mostra a primeira opção, e por isso a
 * conferência visual não serve para este controle — só a asserção serve.
 */

const KIND = 'grauInstrucao'
const OPCOES = ['FUNDAMENTAL', 'MÉDIO', 'SUPERIOR']

function respostaDeApoio() {
  return new Response(
    JSON.stringify({
      rows: OPCOES.map((name, i) => ({
        id: `lk-GRAU_INSTRUCAO-${i + 1}`,
        kind: 'GRAU_INSTRUCAO',
        name,
        active: true,
      })),
      total: OPCOES.length,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function Formulario({
  valores,
  children,
}: {
  valores: Record<string, string | null>
  children: ReactNode
}) {
  const form = useForm({ defaultValues: valores })
  return <Form {...form}>{children}</Form>
}

const TENANT = 'tenant-teste'

/**
 * O dublê responde POR ROTA.
 *
 * Ele já devolveu a lista de apoio para QUALQUER URL, e isso bastou enquanto o
 * combo pedia uma coisa só. Hoje ele também pergunta o PAPEL do vínculo, para
 * esconder o `+...` de quem não escreve lista de apoio — e com o dublê cego
 * `/auth/tenants` respondia `{rows,total}` onde o código espera um array de
 * vínculos. O sintoma não fala de sessão nem de papel: a árvore inteira morre
 * em `empresas.find is not a function` e o teste falha dizendo que o combo não
 * carregou o valor.
 *
 * `owner` porque o assunto deste arquivo é o CAMPO, não a permissão — quem
 * prova o `+...` por papel é `lookup-combo.test.tsx`.
 */
function responder(entrada: RequestInfo | URL) {
  const url = String(entrada instanceof Request ? entrada.url : entrada)
  if (url.includes('/auth/tenants')) {
    return new Response(JSON.stringify([{ tenantId: TENANT, name: 'Matriz', role: 'owner' }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  if (url.includes('/auth/me')) {
    return new Response(JSON.stringify({ activeTenantId: TENANT }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  return respostaDeApoio()
}

beforeEach(() => {
  configurarApi('http://api.teste')
  vi.stubGlobal('fetch', vi.fn(responder))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LookupSelectField ligado por id', () => {
  it('o `<select>` guarda o ID e exibe o NOME', async () => {
    renderWithQuery(
      <Formulario valores={{ grauInstrucao: 'lk-GRAU_INSTRUCAO-3' }}>
        <LookupSelectField name="grauInstrucao" label="Grau de Instrução" kind={KIND} />
      </Formulario>,
    )

    const campo = await screen.findByLabelText<HTMLSelectElement>('Grau de Instrução')
    // Espera a lista chegar: o `<select>` já existe enquanto ela carrega, e sem
    // esta espera a asserção pega o campo antes de haver `<option>` para casar.
    await screen.findByRole('option', { name: 'SUPERIOR' })
    expect(campo.value).toBe('lk-GRAU_INSTRUCAO-3')
    expect(campo.selectedOptions[0]?.textContent).toBe('SUPERIOR')
  })

  it('id fora da lista NÃO some do select — e não vira chave na tela', async () => {
    // Item desativado depois de gravado. A opção precisa existir, senão gravar
    // de novo apagaria o valor; e o texto não pode ser o uuid, senão o operador
    // lê uma chave achando que é o valor.
    renderWithQuery(
      <Formulario valores={{ grauInstrucao: 'lk-GRAU_INSTRUCAO-99' }}>
        <LookupSelectField name="grauInstrucao" label="Grau de Instrução" kind={KIND} />
      </Formulario>,
    )

    const campo = await screen.findByLabelText<HTMLSelectElement>('Grau de Instrução')
    expect(campo.value).toBe('lk-GRAU_INSTRUCAO-99')
    expect(campo.selectedOptions[0]?.textContent).toBe('(item fora da lista)')
  })

  it('com campo irmão de nome, o item fora da lista mostra o nome do registro', async () => {
    renderWithQuery(
      <Formulario
        valores={{ grauInstrucao: 'lk-GRAU_INSTRUCAO-99', grauInstrucaoNome: 'TÉCNICO ANTIGO' }}
      >
        <LookupSelectField
          name="grauInstrucao"
          label="Grau de Instrução"
          kind={KIND}
          rotuloDe="grauInstrucaoNome"
        />
      </Formulario>,
    )

    const campo = await screen.findByLabelText<HTMLSelectElement>('Grau de Instrução')
    expect(campo.selectedOptions[0]?.textContent).toBe('TÉCNICO ANTIGO')
  })
})

describe('LookupField ligado por id', () => {
  it('mostra o nome do id que o formulário guarda', async () => {
    renderWithQuery(
      <Formulario valores={{ grauInstrucao: 'lk-GRAU_INSTRUCAO-2' }}>
        <LookupField name="grauInstrucao" label="Grau de Instrução" kind={KIND} />
      </Formulario>,
    )

    // O nome ACESSÍVEL do gatilho é o rótulo do campo, não o valor: dentro do
    // formulário existe um `<label for>` apontando para ele. Quem carrega o
    // valor é o conteúdo — e é isso que o operador lê.
    const gatilho = await screen.findByRole('button', { name: 'Grau de Instrução' })
    await waitFor(() => expect(gatilho).toHaveTextContent('MÉDIO'))
  })

  it('cai no rótulo do campo irmão quando o id não está na lista', async () => {
    renderWithQuery(
      <Formulario valores={{ grauInstrucao: 'lk-GRAU_INSTRUCAO-99', nomeDele: 'TÉCNICO ANTIGO' }}>
        <LookupField
          name="grauInstrucao"
          label="Grau de Instrução"
          kind={KIND}
          rotuloDe="nomeDele"
        />
      </Formulario>,
    )

    const gatilho = await screen.findByRole('button', { name: 'Grau de Instrução' })
    await waitFor(() => expect(gatilho).toHaveTextContent('TÉCNICO ANTIGO'))
  })
})
