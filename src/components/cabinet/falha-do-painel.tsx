import { DetalheTecnico } from '@/components/cabinet/detalhe-tecnico'
import { ModuloEmConstrucao } from '@/components/cabinet/modulo-em-construcao'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { ehModuloEmConstrucao } from '@/data/modulos-em-construcao'
import { detalheDoErro } from '@/lib/erros'
import { Unplug } from 'lucide-react'

/**
 * O PAINEL QUE NÃO CARREGOU.
 *
 * O Dashboard tem cinco consultas independentes, e falha de uma NÃO pode
 * derrubar a tela: quem perdeu a agenda ainda precisa do quadro. Cada painel
 * responde por si, e o que falhou diz o que falhou e oferece a saída.
 *
 * ## 2.0 (D29): mesma anatomia dos outros estados
 *
 * Era um bloco próprio — desenho de `falha-rede` em 32px, título em semibold,
 * frase, botão — desenhado à mão ao lado dos vazios, que usavam `Empty`. Duas
 * gramáticas para duas situações que o operador lê no mesmo lugar da tela.
 * Agora é `Empty` com ícone lucide, como o vazio da listagem e o 404.
 *
 * O ícone é a TOMADA SOLTA, e não um triângulo de alerta: a consulta não voltou,
 * ninguém errou cadastro e não há nada a corrigir. O vermelho faria o operador
 * procurar defeito onde só houve rede fora.
 *
 * A frase do servidor entra quando existe, e agora entra FECHADA: o `detail` do
 * problem+json é escrito para quem abre chamado, não para quem opera — impresso
 * ao lado da orientação, ele se lia como continuação dela.
 *
 * O card é quiet (traço de 1px, `--hard-soft`): §Hierarquia dá uma sombra dura
 * por tela, e ela não pertence ao painel que falhou.
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
  // 501 não é painel que falhou: o módulo está no contrato e o servidor ainda
  // não o serve. O ícone de indisponibilidade mais o `Tentar de novo` fariam o
  // operador esperar a rede voltar para um painel que ainda não existe do outro
  // lado. O bloco compartilhado explica, e não oferece repetição.
  if (ehModuloEmConstrucao(erro)) return <ModuloEmConstrucao erro={erro} />

  return (
    <Empty
      data-slot="falha-do-painel"
      className="items-start rounded-card border border-border bg-card p-4 text-left shadow-el1"
    >
      <EmptyMedia>
        <Unplug />
      </EmptyMedia>
      <EmptyHeader className="items-start text-left">
        <EmptyTitle>{titulo}</EmptyTitle>
        {/* A MESMA frase do `FalhaDaConsulta`, e é a mesma de propósito: as duas
            peças descrevem leitura que não voltou, e o operador as encontra no
            mesmo lugar da tela. "Não chegou ao SERVIDOR" era a frase antiga e
            era falsa metade das vezes — um 400 chegou, foi lido e foi recusado.
            "Não foi concluída" é verdade nos dois casos. */}
        <EmptyDescription>
          A consulta não foi concluída. Tente de novo em instantes.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="items-start">
        <Button size="sm" onClick={aoTentar}>
          Tentar de novo
        </Button>
        <DetalheTecnico detalhe={detalheDoErro(erro)} />
      </EmptyContent>
    </Empty>
  )
}
