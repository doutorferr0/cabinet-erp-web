import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { FormGrid } from '@/components/cabinet/form-grid'
import { Button } from '@/components/ui/button'
import {
  type ContatoDaGrade,
  contatoVazio,
  motivoDaRecusa,
  useContatos,
  useGravarContatos,
} from '@/data/contatos-api'
import { avisar } from '@/lib/avisos'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

/**
 * OS CONTATOS DO CADASTRO — a grade `Nome | Vínculo | Fone | FAX` da §4, agora
 * ligada ao servidor (#293).
 *
 * ## Por que não é campo do formulário do parceiro
 *
 * Contato é sub-recurso no contrato (`/api/partners/{id}/contacts`), com `POST`
 * e `PUT` próprios; ele **não entra no corpo do `PUT` do parceiro**. Uma grade
 * ligada ao registro do cadastro pareceria gravar junto com o `Gravar` do rodapé
 * e não gravaria — o operador editaria o contato, leria "Alterações gravadas", e
 * o dado ficaria onde estava. Era exatamente isso que a grade fazia antes desta
 * issue, com uma diferença: no mock ela pelo menos guardava no store, e ligada
 * ao servidor o valor seria descartado no caminho.
 *
 * O arranjo — registro próprio, gravação própria, montado fora do `<form>` — é o
 * que `PainelDeAtividades` já usa, pelo mesmo motivo.
 *
 * ## `FormProvider` sem `<form>`
 *
 * A `FormGrid` compartilhada pede `useFormContext`/`useFieldArray`, não um
 * elemento `<form>`. Montar um `<form>` aqui seria HTML inválido (o bloco vive
 * dentro do formulário do cadastro) e faria o `Enter` de uma célula submeter o
 * cadastro inteiro. O `FormProvider` dá o contexto sem nenhum dos dois.
 *
 * ## Só em cadastro que já existe
 *
 * No `Incluir` não há `partnerId` a que pendurar contato. O bloco não some
 * calado, porém: grade prometida pelo título do módulo e ausente na tela lê-se
 * como defeito. Ele diz por que ainda não está lá e o que a destrava.
 */
export function ContatosDoParceiro({
  partnerId,
  readOnly = false,
}: {
  /** `null` no `Incluir`: sem cadastro gravado não há sub-recurso. */
  partnerId: string | null
  readOnly?: boolean
}) {
  const query = useContatos(partnerId)
  const gravar = useGravarContatos(partnerId ?? '')

  const form = useForm<{ contatos: ContatoDaGrade[] }>({ defaultValues: { contatos: [] } })

  /**
   * A lista COMO O SERVIDOR A TEM, para o plano de sincronização.
   *
   * Fica em `ref` e não em estado: ela não desenha nada, e só muda quando a
   * leitura traz linhas novas — nunca a cada tecla. É contra ela que se decide o
   * que sumiu da grade, e portanto o que vira `active: false`.
   */
  const original = useRef<ContatoDaGrade[]>([])

  useEffect(() => {
    if (!query.data) return
    original.current = query.data.linhas
    form.reset({ contatos: query.data.linhas })
  }, [query.data, form])

  if (partnerId === null) {
    return (
      <p className="text-muted-foreground text-sm">
        Os contatos entram depois de gravar o cadastro — eles pendem do registro, que ainda não
        existe.
      </p>
    )
  }

  async function aoGravar() {
    const atual = form.getValues('contatos')
    await gravar.mutateAsync({ original: original.current, atual })
    avisar('Contatos gravados.')
  }

  const recusa = motivoDaRecusa(gravar.error) ?? motivoDaRecusa(query.error)

  return (
    <div className="flex flex-col gap-3">
      {query.isPending ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Carregando os contatos…
        </p>
      ) : (
        <FormProvider {...form}>
          {/* O `disabled` próprio é o que faz a grade valer na FICHA: lá não há
              o `<fieldset disabled>` do `CadastroForm` em volta, e sem ele o
              `Consul.` mostraria células editáveis sem nada que as gravasse. */}
          <fieldset disabled={readOnly} className="contents">
            <FormGrid
              name="contatos"
              columns={[
                { key: 'nome', label: 'Nome', voz: 'nome' },
                { key: 'vinculo', label: 'Vínculo' },
                { key: 'fone', label: 'Fone' },
                { key: 'celular', label: 'Celular' },
                { key: 'fax', label: 'FAX' },
                { key: 'email', label: 'E-mail' },
              ]}
              newRow={{ ...contatoVazio() }}
              {...(readOnly ? { hideAdd: true } : {})}
            />
          </fieldset>
        </FormProvider>
      )}

      {/* Grade montada com uma página é grade falsa: se o teto cortou, quem lê
          precisa saber que o que está na tela não é tudo (padrão 9). */}
      {query.data?.cortou ? (
        <AvisoDeCobertura>
          Este cadastro tem {query.data.total} contatos e a grade mostra os 100 primeiros.
        </AvisoDeCobertura>
      ) : null}

      {recusa ? (
        // O `detail` do problem+json diz QUAL contato o servidor recusou —
        // trocá-lo por "algo deu errado" jogaria fora a única informação
        // acionável da resposta.
        <AvisoDeCobertura>{recusa}</AvisoDeCobertura>
      ) : null}

      {readOnly ? null : (
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={aoGravar} disabled={gravar.isPending}>
            {gravar.isPending ? 'Gravando…' : 'Gravar contatos'}
          </Button>
          {/* Dizer em voz alta o que o botão do rodapé NÃO faz. Sem isto, o
              arranjo correto (sub-recurso com ciclo próprio) vira surpresa. */}
          <p className="text-muted-foreground text-sm">
            Os contatos têm gravação própria — o <strong>Gravar</strong> do rodapé não os leva.
          </p>
        </div>
      )}
    </div>
  )
}
