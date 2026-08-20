import { rotaMaeDe } from '@/app/navigation'
import { Button } from '@/components/ui/button'
import { useCanGoBack, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

/**
 * A SAÍDA DA TELA — um botão só, sempre no mesmo canto (issue #235; espec da
 * fusão v5, §"Regras fixas de página": *"Voltar/cancelar SEMPRE no canto
 * superior esquerdo"*).
 *
 * ## Por que ele é do frame e não da tela
 *
 * A saída já existia, como prop `voltar` do `PageHeader`, e era **opt-in**: de
 * três consumidores do cabeçalho, um a passava. O resultado é o que se vê na
 * `main` antes desta PR — o formulário de inclusão, o documento e o detalhe não
 * têm saída visível, e quem chegou por link colado ou recarga depende do botão
 * do navegador, que numa SPA sai da aplicação com a mesma facilidade com que
 * anda dentro dela.
 *
 * Opt-in não é acidente que se conserte tela a tela: é o desenho errado. Posto
 * na folha (`PageFrame`), tela nova nasce com saída sem que ninguém precise
 * lembrar, e a posição do botão é a mesma em todas — que é o ponto da regra da
 * espec.
 *
 * ## Voltar é DESFAZER a navegação, com um piso declarado
 *
 * `history.back()` quando há o que desfazer: quem veio de Fornecedores volta
 * para Fornecedores, e não para a listagem de Clientes só porque está numa tela
 * de cliente. É o significado que o operador já atribui à palavra.
 *
 * Quando NÃO há histórico — link colado, recarga, aba nova — `back()` levaria
 * para fora da aplicação. Aí vale a **rota-mãe declarada** (`rotaMaeDe`), que é
 * a tela que o menu publica logo acima desta. Sem o piso, o botão que promete
 * voltar entrega a página anterior do navegador, que pode ser outro site.
 *
 * ## Quando ele não existe
 *
 * Tela que o menu publica não ganha botão: voltar levaria ao lugar onde o
 * operador já está. É `rotaMaeDe` devolvendo `undefined`, e o componente some
 * inteiro — não fica desabilitado. Botão morto ocupa o canto que a próxima tela
 * vai querer.
 */
export function BotaoVoltar() {
  const { pathname } = useLocation()
  const router = useRouter()
  const podeDesfazer = useCanGoBack()
  const navigate = useNavigate()

  const mae = rotaMaeDe(pathname)
  if (!mae) return null

  return (
    <Button
      type="button"
      // `outline` é a peça da espec: traço forte e a sombra DURA de 3px que o
      // `lift-control` já dá — a mesma `--shadow-el2` que a v5 reserva para
      // primário, Voltar e número do documento. Nada de CSS novo.
      variant="outline"
      size="sm"
      data-slot="botao-voltar"
      // `self-start` porque a folha é coluna: sem isto o botão esticaria na
      // largura inteira e viraria uma faixa.
      className="mb-3 self-start"
      onClick={() => {
        if (podeDesfazer) router.history.back()
        else void navigate({ to: mae })
      }}
    >
      <ArrowLeft aria-hidden="true" />
      Voltar
    </Button>
  )
}
