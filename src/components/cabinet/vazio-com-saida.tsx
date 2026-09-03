import { DetalheTecnico } from '@/components/cabinet/detalhe-tecnico'
import { FormaDoModulo } from '@/components/cabinet/forma'
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
import { SearchX, Unplug } from 'lucide-react'

/**
 * O QUE A LISTAGEM MOSTRA NO LUGAR DAS LINHAS — vazio e falha.
 *
 * Moravam dentro de `data-table.tsx`. Saíram na D29 por duas razões, e as duas
 * continuam valendo depois da rodada de design:
 *
 * 1. **São estados, não tabela.** A D29 é a issue dos estados excepcionais e a
 *    D8 é a da grade; enquanto os dois viviam no mesmo arquivo, mexer no vazio
 *    era mexer na zona da grade.
 * 2. **As VISÕES respondem à mesma consulta.** Um quadro que falha calado, ao
 *    lado de uma tabela que explica, seria a mesma tela contando duas histórias
 *    sobre a mesma requisição. Peça compartilhada é o que impede isso.
 *
 * ## O que mudou no 2.0 — e o que a D35 devolveu
 *
 * A D29 tirou o desenho de 96/128px (um shape de acervo por situação) e pôs
 * ícone lucide de 32px: o desenho era o elemento mais alto e mais saturado de um
 * estado cuja informação inteira é a FRASE e cuja saída inteira é a TECLA.
 *
 * A D35 devolve o desenho ao vazio de MÓDULO, e não é a volta do que saiu: a
 * `<Forma>` é contorno em traço, com o tint na forma e não no bloco, e diz uma
 * coisa que o ícone genérico não dizia — DE QUE MÓDULO está vazia esta tela. No
 * vazio de BUSCA ela não entra: ali a informação é a pergunta que o operador
 * fez, não o lugar onde ele está, e a lupa riscada continua sendo quem a conta.
 * A tomada solta fica na falha, que é de rede e não de módulo.
 */

/**
 * Falhou ≠ vazio: o operador precisa saber se avisa alguém ou se a consulta não
 * tem resultado mesmo. Com o backend real, essa distinção é a diferença entre
 * "some" e "não existe".
 *
 * O ícone é a tomada solta, e não um triângulo de alerta: a consulta não chegou,
 * ninguém fez nada errado e não há cadastro para consertar. Sinal de erro aqui
 * mandaria o operador procurar culpa onde só houve rede.
 */
export function FalhaDaConsulta({ erro, aoTentar }: { erro: unknown; aoTentar: () => void }) {
  // O 501 não é falha de consulta: o módulo está no contrato e o servidor ainda
  // não o serve. Mostrar a tomada solta e `Tentar de novo` diria que a
  // requisição não chegou — ela chegou, foi entendida, e a resposta é que o
  // pedaço ainda não existe. O desvio mora AQUI porque as visões respondem à
  // mesma consulta: quadro e tabela têm de contar a mesma história.
  if (ehModuloEmConstrucao(erro)) return <ModuloEmConstrucao erro={erro} />

  return (
    <Empty data-slot="falha-da-consulta">
      <EmptyMedia>
        <Unplug />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Não foi possível carregar a consulta</EmptyTitle>
        <EmptyDescription>
          {/* Orientação FIXA, e o `detail` do servidor só no colapsável abaixo.
              Até a 1.x esta linha era `mensagemDoErro(erro, …)`, que devolve o
              `detail` quando ele existe — com o `DetalheTecnico` ao lado, a
              mesma frase do servidor saía duas vezes na mesma caixa, uma em
              Inter e outra em mono. Quem opera lê a orientação; quem abre
              chamado abre o detalhe. */}
          A consulta não foi concluída. Tente de novo em instantes.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" onClick={aoTentar}>
          Tentar de novo
        </Button>
        <DetalheTecnico detalhe={detalheDoErro(erro)} />
      </EmptyContent>
    </Empty>
  )
}

/**
 * Os dois vazios NÃO dizem a mesma coisa, e essa é a razão de existirem
 * separados: "não existe registro" pede cadastrar; "a busca não achou" pede
 * corrigir o termo. Tratar os dois com uma frase só é o que faz o operador
 * procurar defeito onde não há.
 *
 * O ícone acompanha: caixa vazia num caso, lupa riscada no outro — vazio de
 * busca não é módulo vazio. Ele é `aria-hidden`; quem informa é o título.
 *
 * FILTRO conta como consulta: listagem estreitada até zero com "Ainda não há
 * nada cadastrado aqui" mandaria cadastrar registro que existe e está do lado de
 * fora do filtro.
 */
export function VazioDaConsulta({
  q,
  temFiltro,
  acao,
  aoLimpar,
}: {
  q: string
  temFiltro: boolean
  acao?: { label: string; onClick: () => void } | undefined
  aoLimpar: () => void
}) {
  const houveConsulta = q !== '' || temFiltro
  return (
    <Empty data-testid="vazio-da-consulta">
      <EmptyMedia className={houveConsulta ? undefined : '[&_svg]:size-auto'}>
        {houveConsulta ? <SearchX /> : <FormaDoModulo tamanho={120} />}
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{houveConsulta ? 'Nenhum registro encontrado' : 'Nenhum registro'}</EmptyTitle>
        <EmptyDescription>
          {q && temFiltro
            ? `A busca por “${q}” com os filtros aplicados não trouxe resultado. Confira o termo ou revise os filtros.`
            : q
              ? `A busca por “${q}” não trouxe resultado. Confira o termo ou limpe a busca.`
              : temFiltro
                ? 'Nenhum registro atende aos filtros aplicados. Revise as condições ou limpe os filtros.'
                : 'Ainda não há nada cadastrado aqui.'}
        </EmptyDescription>
      </EmptyHeader>
      {/* A saída acompanha o diagnóstico, e por isso são DUAS.
          Módulo vazio termina em cadastrar. Consulta vazia termina em DESFAZER
          a pergunta — oferecer `Incluir` aqui mandaria cadastrar de novo um
          registro que provavelmente existe, do lado de fora do termo digitado,
          e o cadastro duplicado só apareceria semanas depois.

          A tecla (primária) é do CADASTRO; desfazer a pergunta sai em `outline`.
          §Hierarquia dá uma tecla por estado, e ela vai para a ação que cria
          alguma coisa, não para a que apaga o que o operador digitou. */}
      <EmptyContent>
        {houveConsulta ? (
          <Button variant="outline" size="sm" onClick={aoLimpar}>
            {q && temFiltro ? 'Limpar busca e filtros' : q ? 'Limpar busca' : 'Limpar filtros'}
          </Button>
        ) : acao ? (
          <Button size="sm" onClick={acao.onClick}>
            {acao.label}
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  )
}
