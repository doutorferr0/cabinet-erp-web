import { CampoComBusca } from '@/components/cabinet/campo-com-busca'
import { TextField } from '@/components/cabinet/form-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchCep, maskCep } from '@/mocks/ceps'
import { Search } from 'lucide-react'
import { Fragment } from 'react'
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
    // `items-end` é o que impede a fileira de desalinhar: este bloco mistura
    // input, input+botão e rótulo derivado (UF), de alturas de rótulo diferentes.
    <div className="grid grid-cols-12 items-end gap-3">
      {/* Campos fora do FormField replicam à mão o par rótulo→campo do FormItem
          (`flex flex-col gap-1`) — senão o rótulo encosta no controle. */}
      <div className="col-span-12 flex flex-col gap-1 sm:col-span-3">
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
      <CampoComBusca
        label="Cidade"
        inputId={`${prefix}.cidadeNome`}
        ariaLabel="Buscar cidade"
        onBuscar={onBuscaCidade}
        className="col-span-12 sm:col-span-4"
      >
        {cidadeCodigo && (
          <span className="w-12 shrink-0 text-sm text-muted-foreground">{cidadeCodigo}</span>
        )}
        <Input
          id={`${prefix}.cidadeNome`}
          {...register(`${prefix}.cidadeNome`)}
          value={cidadeNome ?? ''}
          readOnly={!!onBuscaCidade}
        />
      </CampoComBusca>
      {/* UF é rótulo derivado da cidade (transcrição §5), não campo: `h-9` casa a
          altura do input para a fileira fechar. */}
      <div className="col-span-6 flex flex-col gap-1 sm:col-span-2">
        <Label>UF</Label>
        <p className="flex h-9 items-center text-sm">{uf ?? '—'}</p>
      </div>
    </div>
  )
}

/** Comunicadores — transcrição §9: sempre DOIS pares de [combo] + [texto]. */
export function ComunicadoresBlock({ prefix }: { prefix: string }) {
  const { setValue, watch } = useFormContext()
  const tipos = ['WHATSAPP', 'TELEGRAM', 'SMS', 'E-MAIL'] as const
  return (
    // Os dois pares [combo]+[texto] são quatro células de doze avos, não dois
    // flex com largura fixa: `w-36` não alinhava com fileira nenhuma.
    <div className="grid grid-cols-12 items-end gap-3">
      {([1, 2] as const).map((n) => (
        <Fragment key={n}>
          <div className="col-span-5 flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor={`${prefix}.comunicador${n}Tipo`}>Comunicador {n}</Label>
            <select
              id={`${prefix}.comunicador${n}Tipo`}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
          <TextField
            name={`${prefix}.comunicador${n}Valor`}
            label=" "
            className="col-span-7 sm:col-span-4"
          />
        </Fragment>
      ))}
    </div>
  )
}

/** Redes sociais — presente em TODOS os cadastros de pessoa e empresa (§9). */
export function RedesSociaisBlock({ prefix }: { prefix: string }) {
  return (
    <div className="grid grid-cols-12 items-end gap-3">
      <TextField
        name={`${prefix}.facebook`}
        label="FaceBook"
        className="col-span-12 sm:col-span-6"
      />
      <TextField
        name={`${prefix}.instagram`}
        label="Instagram"
        className="col-span-12 sm:col-span-6"
      />
    </div>
  )
}
