import { EnderecoBlock, RedesSociaisBlock, TelefonesBlock } from '@/components/vitra/blocks'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

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
      <TelefonesBlock prefix="tel" />
      <RedesSociaisBlock prefix="rs" />
    </FormProvider>
  )
}

describe('blocos compartilhados', () => {
  it('renderiza campos de endereço, telefones e redes sociais', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Endereço')).toBeInTheDocument()
    expect(screen.getByLabelText('Número')).toBeInTheDocument()
    expect(screen.getByLabelText('Bairro')).toBeInTheDocument()
    expect(screen.getByLabelText('Cidade')).toBeInTheDocument()
    expect(screen.getByLabelText('Fone Comer.')).toBeInTheDocument()
    expect(screen.getByLabelText('Celular')).toBeInTheDocument()
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
})
