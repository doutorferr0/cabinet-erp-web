import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { SITUACAO_DA_ORDEM, useEnviarOrdemDeCompra } from '@/data/compras-api'
import { OrdemCompraForm } from '@/features/ordem-compra/ordem-compra-form'
import { formatDateBR } from '@/lib/formatters'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'
import { Send } from 'lucide-react'

/**
 * `dePedido` + `fornecedor`: de onde a ordem NOVA veio.
 *
 * Viajam na URL, e não em estado de navegação, pela mesma razão do `?modo=` —
 * a URL é o estado compartilhável, e o voltar do browser desfaz a origem sem
 * desfazer o resto. Só valem em `/novo`: numa ordem que já existe, quem diz de
 * onde ela veio são as linhas dela.
 */
function validarBusca(search: Record<string, unknown>) {
  return {
    ...validateModoSearch(search),
    ...(typeof search.dePedido === 'string' && search.dePedido !== ''
      ? { dePedido: search.dePedido }
      : {}),
    ...(typeof search.fornecedor === 'string' && search.fornecedor !== ''
      ? { fornecedor: search.fornecedor }
      : {}),
  }
}

export const Route = createFileRoute('/compras/ordens/$ordemId')({
  component: OrdemCompraEditPage,
  validateSearch: validarBusca,
})

function OrdemCompraEditPage() {
  const { ordemId } = Route.useParams()
  const busca = Route.useSearch()
  const readOnly = isConsulta(busca)
  const isNovo = ordemId === 'novo'
  const semente =
    isNovo && busca.dePedido && busca.fornecedor
      ? { pedidoId: busca.dePedido, fornecedorId: busca.fornecedor }
      : undefined

  /**
   * `Enviar ao fornecedor` subiu do rodapé do formulário para a PRÓXIMA AÇÃO do
   * cabeçalho (D19, #487), e por isso a mutação passou a ser da rota.
   *
   * Era um botão de contorno numa fileira com `Reagendar` e `Cancelar`, com o
   * mesmo peso deles — e é ele que decide o resto: enviada, a ordem não se
   * reescreve (`PUT` é 409) e passa a só se reagendar. Os outros dois são o que
   * o operador faz DEPOIS de enviar, e continuam onde estão.
   *
   * **`Confirmar recebimento` — o que a especificação pede para a ordem
   * `sent` — não entrou, e não é omissão:** o recebimento é outro documento
   * (`/api/goods-receipts`), está em `ROTAS_NO_MOCK` e não tem tela nem
   * fronteira em `src/data/`. Uma primária que não leva a lugar nenhum é pior
   * que primária ausente — é o que o `DadosDoCabecalho` diz com todas as
   * letras. Ordem enviada fica sem próxima ação até o recebimento ter tela.
   */
  const enviar = useEnviarOrdemDeCompra()

  return (
    <TelaDeDocumento
      provider={data.ordensCompra}
      queryKeyBase="ordem-compra"
      idParam={ordemId}
      titulo="Ordem de Compra"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(o) => o.numero}
      naoEncontrado="Ordem de compra não encontrada."
      erroAoCarregar="Não foi possível carregar a ordem de compra."
      cabecalho={(ordem) => ({
        badge: {
          tom: ordem.situacao === 'cancelled' ? 'bad' : ordem.situacao === 'sent' ? 'ok' : 'info',
          label: SITUACAO_DA_ORDEM[ordem.situacao],
        },
        meta: [ordem.fornecedor, formatDateBR(ordem.dataOrdem)].filter(Boolean).join(' · '),
        ...(ordem.id && ordem.situacao === 'draft' && !readOnly
          ? {
              proximaAcao: {
                id: 'enviar',
                label: 'Enviar ao fornecedor',
                icon: Send,
                disabled: enviar.isPending,
                onClick: () => enviar.mutate({ id: ordem.id }),
              },
            }
          : {}),
      })}
      // A lateral da ordem monta DENTRO do formulário (D18): fornecedor,
      // transportadora e condição de pagamento são CAMPOS, e fora do
      // `FormProvider` do `CadastroForm` eles não teriam onde escrever. É a
      // única das quatro fichas de documento em que a coluna de apoio é
      // editável — nas outras três ela só consulta, e por isso viaja pela prop
      // `lateral` desta tela.
    >
      {(ordem) => (
        <>
          {/* A falha do envio ACOMPANHA o gesto: ele saiu do rodapé, e o
              `ErroDeGravacao` que ficava lá junto com ele saiu também. Aqui, no
              topo da coluna principal, ele fica logo abaixo do botão que o
              provocou. */}
          <ErroDeGravacao
            mutacao={enviar}
            erro={enviar.error}
            mensagem="Não foi possível enviar a ordem ao fornecedor."
          />
          <OrdemCompraForm ordem={ordem} readOnly={readOnly} {...(semente ? { semente } : {})} />
        </>
      )}
    </TelaDeDocumento>
  )
}
