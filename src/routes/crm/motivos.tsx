import type { CrmLostReasonDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motivosDePerda, useAlterarMotivoDePerda, useCriarMotivoDePerda } from '@/data/crm-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { CelulaEditavel } from '@/features/crm/celula-editavel'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/crm/motivos')({
  component: MotivosPage,
})

/**
 * Cadastro de motivos de perda. É catálogo, e não texto livre, porque a
 * pergunta que ele responde é "por que perdemos" SOMADA no ano — texto livre
 * vira trinta grafias da mesma coisa e nenhuma análise.
 *
 * ## A linha É o formulário (D22, padrão D27)
 *
 * O diálogo saiu. O contrato não publica `GET /api/crm/lost-reasons/{id}`
 * porque a LINHA da listagem já é o registro inteiro — dois campos —, e essa
 * mesma verdade que justificava o diálogo justifica melhor a edição no lugar:
 * se a linha é o registro, editar a linha é editar o registro, e um diálogo por
 * cima era um passo a mais para dizer a mesma coisa. `Alterar` e `Consul.` da
 * barra abrem a MESMA célula; `Incluir` põe o cursor na linha nova do rodapé.
 *
 * ## Reativar é livre; desativar confirma
 *
 * A coluna `Ativo` mostra o carimbo e, no motivo desligado, um botão `Reativar`.
 * Desligar continua passando pelo `ConfirmarDesativacao` da barra, porque as
 * duas direções não custam o mesmo: reativar não desfaz nada, e desativar tira o
 * motivo da escolha de quem está perdendo um negócio agora. Um controle que
 * fizesse as duas coisas cobraria o preço do gesto caro pelo barato.
 */

function MotivosPage() {
  const { readOnly } = useReadOnlyPorPapel('crm')
  const alterar = useAlterarMotivoDePerda()
  const criar = useCriarMotivoDePerda()

  /** A linha em edição — id do registro, ou `null`. */
  const [emEdicao, setEmEdicao] = useState<string | null>(null)
  const [aDesativar, setADesativar] = useState<CrmLostReasonDto | null>(null)
  const [nomeNovo, setNomeNovo] = useState('')
  const linhaNova = useRef<HTMLInputElement>(null)

  /**
   * `PUT` com o registro INTEIRO — o contrato substitui tudo, e corpo parcial
   * apagaria o campo que não veio. É a mesma regra do `useDesativarFunil`: o
   * corpo se monta da linha, não do que mudou.
   */
  const { mutate: gravarMotivo, reset: limparErroDeGravacao } = alterar
  const gravarLinha = useCallback(
    (linha: CrmLostReasonDto, mudanca: Partial<CrmLostReasonDto>) => {
      limparErroDeGravacao()
      gravarMotivo({
        id: linha.id,
        corpo: { name: mudanca.name ?? linha.name, active: mudanca.active ?? linha.active },
      })
    },
    [gravarMotivo, limparErroDeGravacao],
  )

  /**
   * `useMemo` não é otimização aqui: a `VitraDataTable` recebe `columns` e a
   * TanStack Table reconstrói o modelo a cada identidade nova. Montado no corpo
   * do componente, o array nascia diferente em todo render e a tabela resetava
   * em laço — medido: a listagem ficava SEM LINHA NENHUMA e os testes achavam
   * a tela vazia. As dependências são o que a célula fecha por cima.
   */
  const columns: ColumnDef<CrmLostReasonDto>[] = useMemo(
    () => [
      {
        // `accessorKey` é o nome do campo NO CONTRATO — ele viaja como `sortBy`,
        // e a whitelist do servidor é em inglês (`name`, `active`).
        accessorKey: 'name',
        header: 'Motivo',
        cell: ({ row }) => (
          <CelulaEditavel
            valor={row.original.name}
            rotulo="Motivo de perda"
            readOnly={readOnly}
            editando={emEdicao === row.original.id}
            pendente={alterar.isPending}
            aoEditar={() => setEmEdicao(row.original.id)}
            aoDesistir={() => setEmEdicao(null)}
            aoGravar={(nome) => {
              setEmEdicao(null)
              gravarLinha(row.original, { name: nome })
            }}
          />
        ),
      },
      {
        accessorKey: 'active',
        header: 'Ativo',
        /**
         * Carimbo quando ativo; BOTÃO quando não — e não uma caixa de marcar.
         *
         * Uma segunda `role="checkbox"` na linha colide com a caixa de SELEÇÃO
         * da tabela: o operador teria duas caixas encostadas querendo dizer
         * coisas opostas ("marquei esta linha" × "este motivo está no ar"), e o
         * helper compartilhado `acaoNaLinha`, que dez telas usam, deixa de saber
         * qual delas marcar. Medido: os testes de `Alterar` e `Excluir`
         * quebraram nas duas.
         *
         * O botão só existe onde há o que fazer. Desligar continua passando pelo
         * `ConfirmarDesativacao` da barra, porque as duas direções não custam o
         * mesmo: reativar não desfaz nada, e desativar tira o motivo da escolha
         * de quem está perdendo um negócio agora.
         */
        cell: ({ row }) =>
          row.original.active || readOnly ? (
            <CelulaAtivo ativo={row.original.active} />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={alterar.isPending}
              onClick={() => gravarLinha(row.original, { active: true })}
            >
              Reativar
            </Button>
          ),
      },
    ],
    [emEdicao, readOnly, alterar.isPending, gravarLinha],
  )

  const actions = cadastroActions<CrmLostReasonDto>({
    entidade: 'motivo de perda',
    readOnly,
    // Não há tela para abrir: `Incluir` põe o cursor na linha nova do rodapé,
    // que é onde o registro nasce.
    onIncluir: () => linhaNova.current?.focus(),
    onAbrir: (m) => setEmEdicao(m.id),
    // `Consul.` abre a mesma célula: com dois campos, uma versão somente
    // leitura seria a mesma tela sem poder corrigir um erro de digitação à vista.
    onConsultar: (m) => setEmEdicao(m.id),
    onExcluir: (m) => {
      alterar.reset()
      setADesativar(m)
    },
  })

  function incluir() {
    const nome = nomeNovo.trim()
    if (!nome) return
    criar.reset()
    criar.mutate({ name: nome, active: true }, { onSuccess: () => setNomeNovo('') })
  }

  return (
    <TelaDeListagem
      titulo="Motivos de Perda"
      columns={columns}
      queryKey={['crm', 'motivos-de-perda', 'listagem']}
      fetcher={motivosDePerda.list}
      actions={actions}
      rodape={
        readOnly ? null : (
          <div className="flex flex-col gap-[var(--s-2)]">
            {/* A LINHA NOVA no rodapé (padrão D27): catálogo se preenche de uma
                sentada, e voltar ao topo a cada item cobraria um gesto por
                registro. Enter grava e o campo continua no lugar, pronto para o
                próximo. */}
            <div className="flex items-center gap-[var(--s-2)]">
              <Input
                ref={linhaNova}
                value={nomeNovo}
                aria-label="Novo motivo de perda"
                placeholder="Novo motivo de perda"
                disabled={criar.isPending}
                onChange={(e) => setNomeNovo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  incluir()
                }}
                className="max-w-80"
              />
              <Button
                type="button"
                onClick={incluir}
                disabled={!nomeNovo.trim() || criar.isPending}
              >
                <Plus aria-hidden="true" />
                Incluir
              </Button>
            </div>
            <ErroDeGravacao
              erro={criar.error ?? alterar.error}
              mensagem="Falha ao gravar o motivo."
            />
          </div>
        )
      }
      desativacao={{
        entidade: 'motivo de perda',
        registro: aDesativar,
        nome: (m) => m.name,
        ativo: (m) => m.active,
        pendente: alterar.isPending,
        erro: alterar.error,
        onFechar: () => setADesativar(null),
        onConfirmar: () => {
          if (!aDesativar) return
          // `PUT` substitui o registro inteiro: o nome viaja junto do
          // `active: false`, senão desativar apagaria o motivo.
          alterar.mutate(
            { id: aDesativar.id, corpo: { name: aDesativar.name, active: false } },
            { onSuccess: () => setADesativar(null) },
          )
        },
      }}
    />
  )
}
