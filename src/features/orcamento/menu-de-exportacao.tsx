/**
 * As saídas do orçamento atrás de UM gatilho — decisão do user na espec do
 * moodboard: "exportações atrás de um ícone único (menu: PDF paginado · PPTX ·
 * imprimir), nunca botões soltos". O bloco de ações da aba Principal já tinha
 * quatro botões lado a lado; somar mais um por formato faria a fileira crescer
 * a cada fase da frente.
 *
 * O `Orçamento` (imprimir) continua sendo o mesmo mock de antes — ele entra
 * aqui como item porque é uma SAÍDA do documento, não porque a fase D mexeu
 * nele. O PDF `template=moodboard` é da fase A, que vive no servidor, e por
 * isso ainda não aparece na lista.
 */
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type DocumentoDaApresentacao,
  exportarApresentacao,
} from '@/features/orcamento/apresentacao-pptx'
import { FileText, Presentation, Share2 } from 'lucide-react'
import { useState } from 'react'

export interface MenuDeExportacaoProps {
  /**
   * O documento COMO ESTÁ NA TELA, lido no momento do clique.
   *
   * É função e não valor por duas razões que andam juntas: a apresentação é
   * feita para ser mostrada ao cliente na hora, e exportar o registro
   * carregado deixaria de fora a linha que o consultor acabou de acrescentar;
   * e ler o formulário inteiro a cada render (`useWatch` sem `name`) faria a
   * grade de itens redesenhar a cada tecla por causa de um menu fechado.
   */
  obterDocumento: () => DocumentoDaApresentacao
  /** A impressão do orçamento — hoje ainda mock, como era no botão solto. */
  onImprimir?: () => void
}

export function MenuDeExportacao({ obterDocumento, onImprimir }: MenuDeExportacaoProps) {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function exportar(comValores: boolean) {
    setGerando(true)
    setErro(null)
    try {
      await exportarApresentacao(obterDocumento(), { comValores })
    } catch {
      // A montagem roda no NAVEGADOR e não tem servidor para recusar em
      // problem+json: o que pode falhar é o carregamento do módulo (rede) ou o
      // download. Silenciar deixaria o operador esperando um arquivo que nunca
      // vem — o mesmo defeito do `console.info` que este bloco substitui.
      setErro('Não foi possível gerar a apresentação. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <DropdownMenuTrigger>
        <Button type="button" variant="outline" size="sm" isDisabled={gerando}>
          <Share2 className="size-4" aria-hidden="true" />
          {gerando ? 'Gerando…' : 'Exportar'}
        </Button>
        <DropdownMenu placement="bottom start" className="min-w-64">
          <DropdownMenuLabel>Saídas do documento</DropdownMenuLabel>
          <DropdownMenuItem textValue="Orçamento (imprimir)" onAction={() => onImprimir?.()}>
            <span className="flex items-center gap-1.5">
              <FileText aria-hidden="true" /> Orçamento (imprimir)
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            textValue="Apresentação (PPTX)"
            onAction={() => {
              void exportar(true)
            }}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <Presentation aria-hidden="true" /> Apresentação (PPTX)
              </span>
              <span className="text-muted-foreground text-xs">Um slide por ambiente, editável</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            textValue="Apresentação sem valores (PPTX)"
            onAction={() => {
              void exportar(false)
            }}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <Presentation aria-hidden="true" /> Apresentação sem valores (PPTX)
              </span>
              <span className="text-muted-foreground text-xs">
                A versão que o arquiteto circula
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenu>
      </DropdownMenuTrigger>
      {erro ? (
        <p role="alert" className="text-destructive text-xs">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
