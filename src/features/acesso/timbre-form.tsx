import type { CompanyLetterheadWriteRequest } from '@/api/gerado'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAlterarTimbre, useTimbre } from '@/data/empresas-do-grupo-api'
import { useEffect, useState } from 'react'

/**
 * O TIMBRE — o cabeçalho que todo documento impresso repete no alto da página.
 *
 * A `0068` do api pôs as sete coisas em `tenants` e a impressão já as lia; a
 * web#373 publicou `/api/company-letterhead` para gravá-las. O que faltava era
 * a TELA: até aqui o timbre só entrava por SQL semeado, e em produção ninguém
 * conseguia cadastrar — a proposta saía com o endereço que o `seed` escreveu.
 *
 * **Singleton da empresa ATIVA, e o formulário diz isso no título.** O id não
 * viaja na rota de propósito: `tenants` não tem RLS, e aceitar um id do cliente
 * seria deixá-lo escolher o timbre de qual empresa grava. Para editar o de
 * outra empresa, ative-a — a aba oferece o gesto na linha.
 *
 * **O logo fica de fora**, e não é esquecimento: a coluna guarda CAMINHO, o
 * renderizador se recusa a lê-la (um Chromium do servidor buscando URL escolhida
 * pelo cliente é SSRF), e um campo aqui prometeria o que o papel não cumpre.
 */

type Formulario = {
  cnpj: string
  legalName: string
  stateRegistration: string
  zipCode: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  phone: string
  email: string
}

const VAZIO: Formulario = {
  cnpj: '',
  legalName: '',
  stateRegistration: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  phone: '',
  email: '',
}

function Campo({
  id,
  label,
  valor,
  onChange,
  className,
  maxLength,
}: {
  id: string
  label: string
  valor: string
  onChange: (v: string) => void
  className?: string
  maxLength?: number
}) {
  return (
    <div className={`flex flex-col gap-[var(--s-1)] ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={valor}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function TimbreFormDialog({
  aberto,
  somenteLeitura,
  onFechar,
}: {
  aberto: boolean
  somenteLeitura: boolean
  onFechar: () => void
}) {
  const timbre = useTimbre(aberto)
  const alterar = useAlterarTimbre()
  const [campos, setCampos] = useState<Formulario>(VAZIO)

  useEffect(() => {
    if (!aberto) return
    alterar.reset()
    const dados = timbre.data
    if (!dados) return
    setCampos({
      cnpj: dados.cnpj ?? '',
      legalName: dados.legalName ?? '',
      stateRegistration: dados.stateRegistration ?? '',
      zipCode: dados.address?.zipCode ?? '',
      street: dados.address?.street ?? '',
      number: dados.address?.number ?? '',
      complement: dados.address?.complement ?? '',
      district: dados.address?.district ?? '',
      city: dados.address?.city ?? '',
      state: dados.address?.state ?? '',
      phone: dados.phone ?? '',
      email: dados.email ?? '',
    })
  }, [aberto, timbre.data, alterar.reset])

  function mexer(campo: keyof Formulario, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }))
  }

  /**
   * O corpo do `PUT` — **todos os campos, sempre**.
   *
   * O contrato é explícito: campo omitido é 400 e campo `null` APAGA. Mandar só
   * o que mudou não gravaria meio timbre, gravaria uma recusa; e mandar `''`
   * onde não há valor guardaria vazio onde a ausência era a verdade.
   *
   * O ENDEREÇO viaja inteiro ou `null`: endereço com todos os campos em branco
   * é endereço nenhum, e sete nulos dentro de um objeto dizem menos que a
   * ausência do objeto.
   */
  function corpo(): CompanyLetterheadWriteRequest {
    const ou = (v: string) => (v.trim() ? v.trim() : null)
    const endereco = {
      zipCode: ou(campos.zipCode),
      street: ou(campos.street),
      number: ou(campos.number),
      complement: ou(campos.complement),
      district: ou(campos.district),
      city: ou(campos.city),
      state: ou(campos.state),
    }
    const vazio = Object.values(endereco).every((v) => v === null)
    return {
      cnpj: ou(campos.cnpj),
      legalName: ou(campos.legalName),
      stateRegistration: ou(campos.stateRegistration),
      address: vazio ? null : endereco,
      phone: ou(campos.phone),
      email: ou(campos.email),
    }
  }

  const podeGravar = !somenteLeitura && !alterar.isPending

  return (
    <Dialog isOpen={aberto} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>Timbre de {timbre.data?.name ?? 'empresa ativa'}</DialogTitle>
      </DialogHeader>

      <div className="flex max-h-[60vh] flex-col gap-[var(--s-4)] overflow-y-auto">
        <p className="t-meta">
          É o que o cabeçalho de todo documento impresso carimba. A razão social é o nome{' '}
          <strong>registrado</strong> — não é o fantasia, que fica no cadastro da empresa.
        </p>

        <div className="grid grid-cols-6 gap-[var(--s-3)]">
          <Campo
            id="timbre-legal"
            label="Razão social"
            valor={campos.legalName}
            onChange={(v) => mexer('legalName', v)}
            className="col-span-4"
          />
          <Campo
            id="timbre-cnpj"
            label="CNPJ"
            valor={campos.cnpj}
            onChange={(v) => mexer('cnpj', v)}
            maxLength={14}
            className="col-span-2"
          />
          <Campo
            id="timbre-ie"
            label="Inscrição Estadual"
            valor={campos.stateRegistration}
            onChange={(v) => mexer('stateRegistration', v)}
            className="col-span-2"
          />
          <Campo
            id="timbre-fone"
            label="Telefone"
            valor={campos.phone}
            onChange={(v) => mexer('phone', v)}
            className="col-span-2"
          />
          <Campo
            id="timbre-email"
            label="E-mail"
            valor={campos.email}
            onChange={(v) => mexer('email', v)}
            className="col-span-2"
          />
          <Campo
            id="timbre-cep"
            label="CEP"
            valor={campos.zipCode}
            onChange={(v) => mexer('zipCode', v)}
            className="col-span-2"
          />
          <Campo
            id="timbre-rua"
            label="Logradouro"
            valor={campos.street}
            onChange={(v) => mexer('street', v)}
            className="col-span-3"
          />
          <Campo
            id="timbre-numero"
            label="Número"
            valor={campos.number}
            onChange={(v) => mexer('number', v)}
            className="col-span-1"
          />
          <Campo
            id="timbre-complemento"
            label="Complemento"
            valor={campos.complement}
            onChange={(v) => mexer('complement', v)}
            className="col-span-2"
          />
          <Campo
            id="timbre-bairro"
            label="Bairro"
            valor={campos.district}
            onChange={(v) => mexer('district', v)}
            className="col-span-2"
          />
          <Campo
            id="timbre-cidade"
            label="Cidade"
            valor={campos.city}
            onChange={(v) => mexer('city', v)}
            className="col-span-3"
          />
          <Campo
            id="timbre-uf"
            label="UF"
            valor={campos.state}
            onChange={(v) => mexer('state', v.toUpperCase())}
            maxLength={2}
            className="col-span-1"
          />
        </div>

        <ErroDeGravacao erro={alterar.error} mensagem="Falha ao gravar o timbre." />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => alterar.mutate(corpo(), { onSuccess: () => onFechar() })}
          isDisabled={!podeGravar}
        >
          Gravar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
