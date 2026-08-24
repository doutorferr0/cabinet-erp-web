import { ModuloEmConstrucao } from '@/components/cabinet/modulo-em-construcao'
import { Ornamento } from '@/components/cabinet/ornamento'
import { Button } from '@/components/ui/button'
import { ehModuloEmConstrucao } from '@/data/modulos-em-construcao'
import { detalheDoErro } from '@/lib/erros'

/**
 * O painel que não carregou.
 *
 * O Dashboard tem cinco consultas independentes, e falha de uma NÃO pode
 * derrubar a tela: quem perdeu a agenda ainda precisa do quadro. Cada painel
 * responde por si, e o que falhou diz o que falhou e oferece a saída.
 *
 * Ornamento `falha-rede` em Tomato, nunca o vermelho de erro: a consulta não
 * chegou, ninguém errou cadastro e não há nada a corrigir. O vermelho faria o
 * operador procurar defeito onde só houve rede fora (memória §@ornamentos).
 *
 * A frase do servidor entra QUANDO existe: o `detail` do problem+json é a única
 * informação acionável da resposta, e trocá-la por "algo deu errado" joga fora o
 * que o backend escolheu dizer.
 */
export function FalhaDoPainel({
  titulo,
  erro,
  aoTentar,
}: {
  titulo: string
  erro: unknown
  aoTentar: () => void
}) {
  const detalhe = detalheDoErro(erro)

  // 501 não é painel que falhou: o módulo está no contrato e o servidor ainda
  // não o serve. O triângulo de indisponibilidade mais o `Tentar de novo`
  // fariam o operador esperar a rede voltar para um painel que ainda não existe
  // do outro lado. O bloco compartilhado explica, e não oferece repetição.
  if (ehModuloEmConstrucao(erro)) return <ModuloEmConstrucao erro={erro} />

  return (
    <div
      data-slot="falha-do-painel"
      className="flex flex-col items-start gap-2 rounded-card border-2 bg-card p-4"
    >
      <Ornamento shape="falha-rede" tom="offline" tamanho={32} />
      <p className="font-semibold">{titulo}</p>
      {detalhe ? <p className="text-sm text-muted-foreground">{detalhe}</p> : null}
      <Button variant="outline" size="sm" onClick={aoTentar}>
        Tentar de novo
      </Button>
    </div>
  )
}
