import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { BandaDeIdentidade } from '@/components/vitra/banda-identidade'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, X } from 'lucide-react'
import { type DefaultValues, type FieldValues, type Resolver, useForm } from 'react-hook-form'
import type { z } from 'zod'

export interface CadastroFormProps<T extends FieldValues> {
  /** TODO(contract): o Zod do codegen substituirá estes schemas na integração. */
  schema: z.ZodTypeAny
  defaultValues: DefaultValues<T>
  onGravar: (values: T) => void
  onCancelar: () => void
  /**
   * Gravação em curso (mutation HTTP pendente): o Gravar desabilita para não
   * mandar a mesma escrita duas vezes — num clique duplo, duas requisições
   * idênticas virariam dois registros ou um 409 sem explicação.
   */
  gravando?: boolean
  /**
   * Modo `Consul.` da barra de ações (§9 padrão 8): mesma tela, sem edição.
   * Desabilita TODO o conteúdo via `<fieldset disabled>` — inclusive botões de
   * busca e de incluir linha nas grades — e o rodapé vira só `Fechar`.
   */
  readOnly?: boolean
  /**
   * Nome da tela, literal da transcrição. Presente, o formulário abre com a
   * banda de identidade (DESIGN.md §CadastroForm) — o `<h1>` da tela passa a
   * ser dela, e a rota para de montar o título à mão.
   */
  titulo?: string
  /**
   * O que qualifica o título: o modo (`Consulta`, `Incluir`) ou o registro
   * aberto. Vai em Meta, ao lado do nome — antes era sufixo `— X` colado no
   * `<h1>`, o que fazia o leitor de tela anunciar modo e nome como uma coisa só.
   */
  contexto?: string
  /**
   * Aviso que vale para a tela inteira (cobertura do contrato, erro de
   * gravação): entra SOB o título e SOBRE os campos.
   *
   * Existe como lugar nomeado porque, solto na rota, ele era irmão do
   * formulário — e como a banda mora aqui dentro, o aviso acabava impresso
   * ANTES do nome da tela. Aviso antes do título faz o operador ler a ressalva
   * sem saber ainda do que ela fala.
   */
  aviso?: React.ReactNode
  children: React.ReactNode
}

/**
 * Padrão "form com abas" da transcrição (§9): shadcn Tabs + RHF, 1 form por
 * tela (as abas ficam em `children`), rodapé fixo Gravar/Cancelar.
 */
export function CadastroForm<T extends FieldValues>({
  schema,
  defaultValues,
  onGravar,
  onCancelar,
  gravando = false,
  readOnly = false,
  titulo,
  contexto,
  aviso,
  children,
}: CadastroFormProps<T>) {
  const form = useForm<T>({
    // zodResolver tipa pelo schema; com T genérico o casamento é garantido pelo caller.
    resolver: zodResolver(schema as unknown as z.ZodType<T, FieldValues>) as unknown as Resolver<T>,
    defaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onGravar)} className="flex min-h-0 flex-1 flex-col gap-4">
        {/* `disabled` no fieldset cobre todo descendente sem prop por campo.
            O `gap-4` mora aqui: regiões da tela (fileira de cabeçalho, tira de
            abas, barra de rodapé) se separam por `{spacing.lg}` uma vez só, em
            vez de cada tela repetir `mt-2`/`pt-3` no olho. */}
        {/* Fora do `<fieldset disabled>`: a banda é identidade, não campo — em
            modo consulta ela continua legível, não apagada com o formulário. */}
        {titulo ? <BandaDeIdentidade titulo={titulo} {...(contexto ? { contexto } : {})} /> : null}
        {aviso}
        <fieldset disabled={readOnly} className="flex min-h-0 flex-1 flex-col gap-4 border-0 p-0">
          {children}
        </fieldset>
        {/* Rodapé é Documento (`bg-card`): senta na folha; régua superior em
            Régua Forte (DESIGN.md) — separa a tira de ações do conteúdo. */}
        {/* Padding nos dois lados: `sticky bottom-0` sem `pb` encosta o botão na moldura. */}
        <div className="sticky bottom-0 flex justify-end gap-2 rule-strong-top bg-card py-3">
          {readOnly ? (
            <Button type="button" variant="outline" onClick={onCancelar}>
              <X />
              Fechar
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onCancelar}>
                <X />
                Cancelar
              </Button>
              <Button type="submit" disabled={gravando}>
                <Check />
                Gravar
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  )
}
