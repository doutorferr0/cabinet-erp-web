import { rotaMaeDe } from '@/app/navigation'
import { Button } from '@/components/ui/button'
import { useCanGoBack, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

/**
 * A SAÍDA DA TELA — um botão só, sempre no mesmo canto (issue #235; espec da
 * fusão v5, §"Regras fixas de página": *"Voltar/cancelar SEMPRE no canto
 * superior esquerdo"*).
 *
 * ## Por que ele não é opt-in
 *
 * A saída já existiu como prop opcional do `PageHeader` e de três consumidores
 * do cabeçalho UM a passava: o formulário de inclusão, o documento e o detalhe
 * ficavam sem saída visível, e quem chegou por link colado ou recarga dependia
 * do botão do navegador, que numa SPA sai da aplicação com a mesma facilidade
 * com que anda dentro dela.
 *
 * Opt-in não é acidente que se conserte tela a tela: é o desenho errado. Desde
 * a #235 quem decide se há tecla é `rotaMaeDe`, não a tela — e na 2.0 (D5) ela
 * volta a morar no `PageHeader`, colada ao título, porque é ali que o olho já
 * está. O que não voltou foi o opt-in: o padrão do cabeçalho é LIGADO.
 *
 * ## Tecla, não botão com palavra
 *
 * 32px quadrados com a seta e o nome no `aria-label` (mockup 2.0). A palavra
 * "Voltar" ao lado do título competia com ele em peso e empurrava o nome da
 * tela para a direita, quebrando o alinhamento do título entre telas com e sem
 * saída — e a seta apontando para trás é o único ícone que o operador não
 * precisa aprender.
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
 *
 * ## Fora do roteador ele também não existe
 *
 * O cabeçalho de página monta a saída sozinho, e o cabeçalho é montado também
 * em teste de COMPONENTE isolado (`renderWithQuery`), que não tem
 * `RouterProvider`. Sem esta primeira volta, os hooks do roteador derrubariam
 * todo teste de componente que passasse a compor `PageHeader` — e a alternativa
 * (montar um roteador de mentira em cada um) trocaria uma linha aqui por uma
 * em cada arquivo de teste. `warn: false` porque a ausência é esperada: quem
 * avisa é o roteador de verdade, quando falta.
 */
export function BotaoVoltar() {
  const router = useRouter({ warn: false })
  if (!router) return null
  return <TeclaDeVoltar />
}

function TeclaDeVoltar() {
  const { pathname } = useLocation()
  const router = useRouter()
  const podeDesfazer = useCanGoBack()
  const navigate = useNavigate()

  const mae = rotaMaeDe(pathname)
  if (!mae) return null

  return (
    <Button
      type="button"
      // `outline` é a peça da espec: traço forte e a sombra DURA que a tecla
      // (`--key`) desenha. Nada de CSS novo.
      variant="outline"
      size="icon"
      aria-label="Voltar"
      data-slot="botao-voltar"
      // `mt-0.5` alinha a tecla com a PRIMEIRA LINHA do título, não com o
      // bloco inteiro: com subtítulo, `items-start` deixaria a seta colada no
      // topo da caixa de texto, um fio acima da maiúscula.
      className="mt-0.5 size-8 shrink-0"
      onClick={() => {
        if (podeDesfazer) router.history.back()
        else void navigate({ to: mae })
      }}
    >
      <ArrowLeft aria-hidden="true" />
    </Button>
  )
}
