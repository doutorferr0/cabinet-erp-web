import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextField } from '@/components/vitra/form-controls'
import { fetchCep, maskCep } from '@/mocks/ceps'
import { Search } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

/**
 * Blocos compartilhados da transcrição (§9 convenções globais).
 * Todos usam `prefix` — os campos vivem no form único da tela como
 * `<prefix>.<campo>` (1 form por tela, nunca por aba).
 */

/** Endereço — transcrição §9: Endereço, Número, Complemento, Bairro, Cidade, UF, CEP. */
export function EnderecoBlock({
  prefix,
  onBuscaCidade,
}: {
  prefix: string
  /** Quando presente, a cidade abre a janela de busca (V5); senão, digitação livre. */
  onBuscaCidade?: () => void
}) {
  const { setValue, watch, register } = useFormContext()
  const uf = watch(`${prefix}.uf`) as string | null
  const cidadeNome = watch(`${prefix}.cidadeNome`) as string | null
  const cidadeCodigo = watch(`${prefix}.cidadeCodigo`) as string | null

  async function buscarCep() {
    const cep = (watch(`${prefix}.cep`) as string | null) ?? ''
    const result = await fetchCep(cep)
    if (!result) return
    setValue(`${prefix}.cep`, result.cep, { shouldDirty: true })
    setValue(`${prefix}.logradouro`, result.logradouro, { shouldDirty: true })
    setValue(`${prefix}.bairro`, result.bairro, { shouldDirty: true })
    setValue(`${prefix}.cidadeCodigo`, result.cidadeCodigo, { shouldDirty: true })
    setValue(`${prefix}.cidadeNome`, result.cidadeNome, { shouldDirty: true })
    setValue(`${prefix}.uf`, result.uf, { shouldDirty: true })
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 sm:col-span-3">
        <Label htmlFor={`${prefix}.cep`}>CEP</Label>
        <div className="flex items-center gap-1">
          <Input
            id={`${prefix}.cep`}
            {...register(`${prefix}.cep`)}
            value={watch(`${prefix}.cep`) ?? ''}
            onChange={(e) =>
              setValue(`${prefix}.cep`, maskCep(e.target.value), { shouldDirty: true })
            }
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Buscar endereço por CEP"
            onClick={buscarCep}
          >
            <Search className="size-4" />
          </Button>
        </div>
      </div>
      <TextField
        name={`${prefix}.logradouro`}
        label="Endereço"
        className="col-span-12 sm:col-span-7"
      />
      <TextField name={`${prefix}.numero`} label="Número" className="col-span-6 sm:col-span-2" />
      <TextField
        name={`${prefix}.complemento`}
        label="Complemento"
        className="col-span-6 sm:col-span-4"
      />
      <TextField name={`${prefix}.bairro`} label="Bairro" className="col-span-12 sm:col-span-4" />
      <div className="col-span-12 sm:col-span-4">
        <Label htmlFor={`${prefix}.cidadeNome`}>Cidade</Label>
        <div className="flex items-center gap-1">
          {cidadeCodigo && (
            <span className="w-12 shrink-0 text-sm text-muted-foreground">{cidadeCodigo}</span>
          )}
          <Input
            id={`${prefix}.cidadeNome`}
            {...register(`${prefix}.cidadeNome`)}
            value={cidadeNome ?? ''}
            readOnly={!!onBuscaCidade}
          />
          {onBuscaCidade && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Buscar cidade"
              onClick={onBuscaCidade}
            >
              <Search className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="col-span-6 sm:col-span-2">
        <Label>UF</Label>
        <p className="flex h-9 items-center text-sm">{uf ?? '—'}</p>
      </div>
    </div>
  )
}

/** Telefones — transcrição §9: Comer., Resid., Celular, FAX (4 variações fixas). */
export function TelefonesBlock({ prefix }: { prefix: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <TextField name={`${prefix}.foneComercial`} label="Fone Comer." />
      <TextField name={`${prefix}.foneResidencial`} label="Fone Resid." />
      <TextField name={`${prefix}.celular`} label="Celular" />
      <TextField name={`${prefix}.fax`} label="FAX" />
    </div>
  )
}

/** Comunicadores — transcrição §9: sempre DOIS pares de [combo] + [texto]. */
export function ComunicadoresBlock({ prefix }: { prefix: string }) {
  const { setValue, watch } = useFormContext()
  const tipos = ['WHATSAPP', 'TELEGRAM', 'SMS', 'E-MAIL'] as const
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {([1, 2] as const).map((n) => (
        <div key={n} className="flex items-end gap-2">
          <div className="w-36">
            <Label htmlFor={`${prefix}.comunicador${n}Tipo`}>Comunicador {n}</Label>
            <select
              id={`${prefix}.comunicador${n}Tipo`}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={(watch(`${prefix}.comunicador${n}Tipo`) as string | null) ?? ''}
              onChange={(e) =>
                setValue(`${prefix}.comunicador${n}Tipo`, e.target.value || null, {
                  shouldDirty: true,
                })
              }
            >
              <option value="">—</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <TextField name={`${prefix}.comunicador${n}Valor`} label=" " className="flex-1" />
        </div>
      ))}
    </div>
  )
}

/** Redes sociais — presente em TODOS os cadastros de pessoa e empresa (§9). */
export function RedesSociaisBlock({ prefix }: { prefix: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextField name={`${prefix}.facebook`} label="FaceBook" />
      <TextField name={`${prefix}.instagram`} label="Instagram" />
    </div>
  )
}
