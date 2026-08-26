import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { FormGrid } from '@/components/cabinet/form-grid'
import { ComboDeEscolha } from '@/components/cabinet/lookup-combo'
import { Button } from '@/components/ui/button'
import {
  type FaixaDaGrade,
  OPERADORES_DE_FAIXA,
  type PortaDePerfil,
  faixaVazia,
  motivoDaRecusa,
  useFaixas,
  useGravarFaixas,
} from '@/data/comissoes-api'
import { useLookupOptions } from '@/data/lookups-api'
import { avisar } from '@/lib/avisos'
import { Loader2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

/**
 * O PERFIL DE PARTICIPAÇÃO — as faixas por grupo de uma pessoa.
 *
 * `IndicacaoGrupProd` (perfil do profissional, 7.569 linhas no legado) e
 * `ComissaoPremiacaoGrup` (perfil do colaborador, 16 linhas) carregam o MESMO
 * trio percentual · desconto · operador, e o contrato guarda um schema só para
 * os dois. O que muda é a PORTA — `/api/employees/{id}/…` × `/api/partners/{id}/…`
 * — e o que o ganho vira depois: comissão de um lado, Reserva Técnica do outro.
 *
 * ## O que a faixa quer dizer
 *
 * `operator` compara a faixa contra o desconto do DOCUMENTO, não o da linha:
 * quanto mais desconto o vendedor dá, menor a participação. Por isso não são
 * "12 grupos": são VÁRIAS faixas por grupo, uma por condição de desconto — o que
 * explica as 232.415 linhas da tabela congelada do legado.
 *
 * A leitura está declarada como de confiança MÉDIA no próprio contrato, e ela é
 * DADO e não regra em código exatamente por isso: mudar a leitura muda linha de
 * tabela, não muda tela.
 *
 * ## O cadastro NÃO tem vigência, e é de propósito
 *
 * Quem protege a apuração de ontem de um perfil editado hoje é o CONGELAMENTO no
 * documento (`ParticipacaoDoPedido`), não uma data aqui. Sem esse congelamento a
 * ausência de vigência seria defeito; com ele é simplificação correta — e fica
 * escrito para quem for tentado a acrescentá-la.
 *
 * ## `Ativo` e `Excluir linha` NÃO são a mesma coisa, e a grade tem os dois
 *
 * O `PUT` substitui o conjunto: tirar a linha da grade APAGA a faixa do perfil,
 * e o contrato diz isso por escrito ("faixa que não vier é faixa removida").
 * Desmarcar `Ativo` é o outro gesto — o padrão 8 deste produto: a faixa sai do
 * cálculo e continua no cadastro.
 *
 * Nos dois casos a apuração ANTIGA fica de pé, porque quem a protege é o
 * congelamento no documento, não esta tela. A diferença é sobre o CADASTRO, e
 * por isso ela está dita em voz alta no rodapé da grade — botão que apaga e
 * caixa que desativa, lado a lado, sem ninguém explicar, é o par que se erra.
 */
export function FaixasDeComissao({
  porta,
  pessoaId,
  readOnly = false,
}: {
  /** `employee` (comissão) ou `partner` (Reserva Técnica) — só a porta muda. */
  porta: PortaDePerfil
  /** `null` no `Incluir`: sem cadastro gravado não há sub-recurso. */
  pessoaId: string | null
  readOnly?: boolean
}) {
  const query = useFaixas(porta, pessoaId)
  const gravar = useGravarFaixas(porta, pessoaId ?? '')
  const grupos = useLookupOptions('grupoProduto')

  const [grupoEscolhido, setGrupoEscolhido] = useState<string | null>(null)
  const [comboAberto, setComboAberto] = useState(false)
  const idDoCombo = useId()

  const form = useForm<{ faixas: FaixaDaGrade[] }>({ defaultValues: { faixas: [] } })

  useEffect(() => {
    if (!query.data) return
    form.reset({ faixas: [...query.data] })
  }, [query.data, form])

  if (pessoaId === null || pessoaId === '') {
    return (
      <p className="text-muted-foreground text-sm">
        As faixas entram depois de gravar o cadastro — elas pendem do registro, que ainda não
        existe.
      </p>
    )
  }

  /**
   * O grupo é escolhido ANTES de a linha existir, e não numa célula.
   *
   * A condição da faixa é (grupo, operador, desconto) — é a CHAVE, e o contrato
   * responde 400 a duas linhas com a mesma. Trocar o grupo de uma linha que já
   * tem `id` seria, para o servidor, a mesma linha com outra condição; incluir
   * a linha com o grupo já decidido deixa a chave visível no gesto.
   */
  function incluir(grupoId: string | null) {
    const nome = grupos.options.find((o) => o.id === grupoId)?.nome ?? ''
    form.setValue(
      'faixas',
      [...form.getValues('faixas'), { ...faixaVazia(), grupoId, grupoNome: nome }],
      { shouldDirty: true },
    )
    setGrupoEscolhido(null)
  }

  async function aoGravar() {
    await gravar.mutateAsync(form.getValues('faixas'))
    avisar('Perfil de participação gravado.')
  }

  const recusa = motivoDaRecusa(gravar.error)
  const semGrupos = !grupos.carregando && !grupos.erro && grupos.options.length === 0

  return (
    <div className="flex flex-col gap-3">
      {query.isPending ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Carregando as faixas…
        </p>
      ) : (
        <FormProvider {...form}>
          {readOnly ? null : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs" htmlFor={idDoCombo}>
                  Grupo de Produto
                </label>
                <ComboDeEscolha
                  label="Grupo de Produto"
                  options={grupos.options}
                  truncada={grupos.truncada}
                  carregando={grupos.carregando}
                  erro={grupos.erro}
                  value={grupoEscolhido}
                  onChange={setGrupoEscolhido}
                  id={idDoCombo}
                  open={comboAberto}
                  onOpenChange={setComboAberto}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!grupoEscolhido}
                onClick={() => incluir(grupoEscolhido)}
              >
                Incluir faixa do grupo
              </Button>
              {/* A faixa GERAL é a de `productGroupId` nulo — não é ausência de
                  dado: é a linha que responde por todo grupo sem linha própria,
                  e é ela que vira o percentual do participante no documento. */}
              <Button type="button" variant="outline" size="sm" onClick={() => incluir(null)}>
                Incluir faixa geral
              </Button>
            </div>
          )}

          {semGrupos ? (
            <AvisoDeCobertura>
              <p>
                A empresa não tem <strong>grupo de produto</strong> cadastrado nas listas de apoio,
                então só a <strong>faixa geral</strong> pode ser incluída aqui. As faixas por grupo
                que já existirem continuam legíveis e editáveis na grade.
              </p>
            </AvisoDeCobertura>
          ) : null}

          <FormGrid
            name="faixas"
            hideAdd
            columns={[
              {
                key: 'grupoNome',
                label: 'Grupo de Produto',
                type: 'computed',
                // Faixa GERAL não tem grupo, e "—" a esconderia entre as que
                // ainda não carregaram o nome. O rótulo diz o que ela é.
                compute: (row) => (row.grupoId ? String(row.grupoNome ?? '') : 'Faixa geral'),
              },
              {
                key: 'operador',
                label: 'Condição',
                type: 'select',
                options: OPERADORES_DE_FAIXA,
              },
              { key: 'descontoPercentual', label: 'Desconto %', type: 'percent' },
              { key: 'percentual', label: 'Participação %', type: 'percent' },
              { key: 'ativo', label: 'Ativo', type: 'check' },
            ]}
            newRow={{ ...faixaVazia() }}
          />
        </FormProvider>
      )}

      <p className="text-muted-foreground text-sm">
        A condição compara o desconto do <strong>documento</strong>: quanto mais desconto na venda,
        menor a participação. O que a apuração paga é a faixa do grupo do item — e a
        <strong> faixa geral</strong> responde por serviço e por grupo sem linha própria.
      </p>
      <p className="text-muted-foreground text-sm">
        Desmarcar <strong>Ativo</strong> tira a faixa do cálculo e a mantém no cadastro;{' '}
        <strong>Excluir linha</strong> a apaga do perfil. Os documentos já emitidos não mudam nos
        dois casos — eles carregam a cópia congelada da faixa.
      </p>

      {recusa ? <AvisoDeCobertura>{recusa}</AvisoDeCobertura> : null}

      {readOnly ? null : (
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={aoGravar} disabled={gravar.isPending}>
            {gravar.isPending ? 'Gravando…' : 'Gravar faixas'}
          </Button>
          <p className="text-muted-foreground text-sm">
            As faixas têm gravação própria — o <strong>Gravar</strong> do rodapé não as leva.
          </p>
        </div>
      )}
    </div>
  )
}
