import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnderecoBlock, RedesSociaisBlock } from '@/components/cabinet/blocks'
import { avisosAtuais, limparAvisos } from '@/lib/avisos'
import { instalarServidor, json } from '@/test/servidor'

function Harness() {
  const form = useForm({
    defaultValues: {
      end: {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidadeCodigo: null,
        cidadeNome: '',
        uf: null,
      },
    },
  })
  return (
    <FormProvider {...form}>
      <EnderecoBlock prefix="end" />
      <RedesSociaisBlock prefix="rs" />
    </FormProvider>
  )
}

describe('blocos compartilhados', () => {
  beforeEach(() => {
    instalarServidor({
      '/api/postal-codes/13010111': () =>
        json({
          zipCode: '13010111',
          street: 'Avenida Francisco Glicério',
          number: null,
          complement: null,
          district: 'Centro',
          city: 'CAMPINAS',
          state: 'SP',
        }),
      '/api/postal-codes/00000000': () => new Response('', { status: 404 }),
    })
  })
  afterEach(() => {
    limparAvisos()
    vi.unstubAllGlobals()
  })
  it('renderiza campos de endereço e redes sociais', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Endereço')).toBeInTheDocument()
    expect(screen.getByLabelText('Número')).toBeInTheDocument()
    expect(screen.getByLabelText('Bairro')).toBeInTheDocument()
    expect(screen.getByLabelText('Cidade')).toBeInTheDocument()
    expect(screen.getByLabelText('FaceBook')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument()
  })

  it('busca CEP mockada preenche endereço, bairro, cidade e UF', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('CEP'), '13010111')
    await user.click(screen.getByRole('button', { name: 'Buscar endereço por CEP' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Endereço')).toHaveValue('Avenida Francisco Glicério')
    })
    expect(screen.getByLabelText('Bairro')).toHaveValue('Centro')
    expect(screen.getByLabelText('Cidade')).toHaveValue('CAMPINAS')
    expect(screen.getByText('SP')).toBeInTheDocument()
  })

  it('avisa quando o CEP não está na base disponível', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('CEP'), '00000000')
    await user.click(screen.getByRole('button', { name: 'Buscar endereço por CEP' }))

    await waitFor(() => {
      expect(avisosAtuais()).toContainEqual(
        expect.objectContaining({ tom: 'warn', texto: expect.stringContaining('CEP') }),
      )
    })
  })
})
