import { DetalheTecnico } from '@/components/cabinet/detalhe-tecnico'
import { GravacaoEmConstrucao } from '@/components/cabinet/modulo-em-construcao'
import { Button } from '@/components/ui/button'
import { ErroDaApi } from '@/data/api-provider'
import { ehModuloEmConstrucao } from '@/data/modulos-em-construcao'
import { type MutacaoObservavel, ehSessaoExpirada } from '@/data/sessao-expirada'
import { ReentrarNaSessao } from '@/features/login/reentrar'
import { cn } from '@/lib/utils'
import { useFormContext } from 'react-hook-form'

/**
 * De que campo da TELA fala este `path` do contrato.
 *
 * O servidor recusa `legalName`; o formulário chama o mesmo campo de `nome` e o
 * operador lê `Nome`. São três vocabulários, e o mapa existe porque nenhum dos
 * três pode ser deduzido dos outros: imprimir o `path` cru manda o operador
 * procurar na tela uma palavra que não está nela, e chamar `setFocus(path)`
 * falaria com um campo que o formulário não tem — silenciosamente, porque o
 * react-hook-form não reclama de nome inexistente.
 */
export interface CampoDoFormulario {
  /** Nome do campo no react-hook-form — é o que o `setFocus` recebe. */
  nome: string
  /** Como o campo se chama NA TELA, do jeito que o `<label>` o escreve. */
  rotulo: string
}

/** Contrato → tela, por `path`. Path fora do mapa continua legível, só não navegável. */
export type CamposDoContrato = Readonly<Record<string, CampoDoFormulario>>

/**
 * O ERRO DO SERVIDOR, na forma que o contrato promete — um só componente.
 *
 * O contrato serve toda falha como `application/problem+json` (RFC 9457) e
 * **todas as 4xx/5xx apontam para o mesmo schema**. Este componente é o outro
 * lado dessa promessa: se o formato é um, a tela que o mostra também deve ser
 * uma. Sem isto, cada tela escreve o seu `<p className="text-destructive">` e as
 * diferenças aparecem onde mais custam — uma mostra `detail`, outra o
 * `message`, a terceira "algo deu errado".
 *
 * ## O que ele mostra, e por quê nessa ordem
 *
 * 1. **`title` do servidor** — rótulo ESTÁVEL do tipo de erro. É o cabeçalho.
 * 2. **a frase de quem chamou** (`mensagem`) — "Falha ao gravar o produto":
 *    diz o que se estava fazendo, que o servidor não tem como saber.
 * 3. **`detail`** — a frase DAQUELA ocorrência, a única parte acionável.
 * 4. **`fields[]`** — a validação por campo, quando veio.
 *
 * Os quatro são fontes diferentes e nenhum substitui o outro: juntar `title` e
 * `detail` numa string só foi o que fez o repo perder, mais de uma vez, a frase
 * que o backend escolheu dizer.
 *
 * ## `fields[]` aparece aqui E no campo — não é redundância
 *
 * O formulário longo rola: o operador que apertou `Gravar` está no RODAPÉ, e o
 * campo recusado pode estar três telas acima. A lista aqui é o índice do que
 * recusou; quem leva ao controle é o `aoIrParaCampo`, que a tela liga ao seu
 * `setFocus` do react-hook-form. Sem a lista, o erro seria invisível de onde o
 * operador está olhando.
 *
 * ## 2.0 (D29): sem "Tentar de novo", e o detalhe fechado
 *
 * A espec da rodada desenha o estado de erro com um `Tentar de novo` ao lado da
 * frase. **Aqui não entra, e a razão é a de sempre nesta peça:** este bloco é
 * de ESCRITA RECUSADA — o servidor respondeu, entendeu o pedido e disse não.
 * Repetir a mesma requisição com o mesmo corpo dá o mesmo não, e o botão
 * prometeria uma saída que a tela não pode cumprir. O `Tentar de novo` do 2.0
 * mora onde ele é verdade: `FalhaDoPainel` e `FalhaDaConsulta`, que são LEITURA
 * que não chegou.
 *
 * O `detail`, sim, mudou: sai da frase corrida e entra no colapsável em mono
 * (`DetalheTecnico`). Ele é escrito para quem abre chamado; impresso ao lado da
 * frase da tela, era lido como continuação dela.
 *
 * ## Não é o `FalhaDoPainel`
 *
 * Aquele é para CONSULTA que não chegou (rede fora, painel do Dashboard) e
 * oferece "Tentar de novo". Este é para ESCRITA recusada: o servidor respondeu,
 * entendeu o pedido e disse não. Repetir a mesma requisição daria o mesmo não —
 * o que falta é o operador corrigir algo.
 */
export function ErroDoServidor({
  erro,
  mensagem,
  campos: mapaDeCampos,
  aoIrParaCampo,
  className,
}: {
  /** O erro como veio da fronteira. Não-`ErroDaApi` cai no texto genérico. */
  erro: unknown
  /** O que a TELA estava fazendo — "Falha ao gravar o produto." */
  mensagem: string
  /**
   * Como cada `path` do contrato se chama nesta tela. Sem o mapa a lista sai
   * com o nome do contrato (`legalName`), que é jargão de API impresso para
   * quem está lendo `Razão Social` na etiqueta ao lado.
   */
  campos?: CamposDoContrato
  /**
   * Levar o foco ao controle recusado. Ausente: a lista continua legível, só
   * não navegável — tela sem formulário (uma exclusão, por exemplo) não tem
   * para onde levar.
   */
  aoIrParaCampo?: (path: string) => void
  className?: string
}) {
  if (!erro) return null

  // 501 na ESCRITA: o servidor entendeu, não gravou nada e o que falta é
  // implementação do outro lado. A caixa vermelha existe para erro que tem
  // conserto — ela mostra `fields[]`, que num 501 não vem, e o vermelho manda o
  // operador procurar o campo errado. O desvio fica aqui, e não em cada tela,
  // porque toda gravação do repo passa por este bloco.
  if (ehModuloEmConstrucao(erro)) {
    return <GravacaoEmConstrucao erro={erro} {...(className ? { className } : {})} />
  }

  const daApi = erro instanceof ErroDaApi ? erro : null
  const campos = daApi?.campos ?? []

  return (
    <div
      // `role="alert"`: a escrita foi recusada DEPOIS de um clique do operador —
      // ele está olhando para outro lugar (o rodapé, o botão) e precisa ser
      // avisado, não descobrir rolando.
      role="alert"
      data-slot="erro-do-servidor"
      // Borda de 1.5px, como as outras superfícies do 2.0, e em `destructive`:
      // é a ÚNICA ferramenta de separação aqui — sem tint por baixo, senão
      // seriam duas na mesma fronteira. O vermelho é do traço, nunca do fundo.
      className={cn(
        'flex flex-col gap-1 rounded-item border-[1.5px] border-destructive bg-card p-3',
        className,
      )}
    >
      <p className="t-bloco text-destructive">{daApi?.titulo ?? mensagem}</p>

      {/* Quando o `title` do servidor ocupou o cabeçalho, a frase da tela entra
          aqui: as duas dizem coisas diferentes e a de baixo é a que dá contexto. */}
      {daApi?.titulo ? <p className="t-corpo">{mensagem}</p> : null}

      {daApi ? <DetalheTecnico detalhe={daApi.detail} /> : null}

      {!daApi ? (
        // Erro que não é do servidor (rede fora, exceção de código): não há
        // `detail` para mostrar, e inventar um seria pior que a frase da tela.
        <p className="t-meta">{erro instanceof Error ? erro.message : 'Erro inesperado.'}</p>
      ) : null}

      {campos.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-0.5">
          {campos.map((campo) => {
            const naTela = mapaDeCampos?.[campo.path]
            return (
              <li key={campo.path} className="flex items-baseline gap-2">
                {aoIrParaCampo ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-1 py-0 underline underline-offset-2"
                    onClick={() => aoIrParaCampo(campo.path)}
                  >
                    {naTela?.rotulo ?? campo.path}
                  </Button>
                ) : (
                  // Sem tradução o `path` sai em MONO: assim ele se lê como
                  // nome técnico, e não como a etiqueta de um campo da tela que
                  // o operador procuraria em vão.
                  <span className={naTela ? 't-ui' : 't-dado-meta'}>
                    {naTela?.rotulo ?? campo.path}
                  </span>
                )}
                <span className="t-meta">{campo.message}</span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * O MESMO erro, dentro de um formulário — a forma que as telas usam.
 *
 * A diferença é só quem liga o `aoIrParaCampo`: aqui ele sai do
 * `react-hook-form` que já está no ar, sem a tela precisar passar `setFocus`
 * por prop até o lugar onde o aviso é desenhado. Isso importa porque o aviso é
 * montado FORA do formulário (a rota o entrega ao `CadastroForm` na prop
 * `aviso`) e RENDERIZADO dentro dele — quem lê o contexto tem que ser o
 * componente, não o closure de quem o criou.
 *
 * `useFormContext` devolve `null` fora de um formulário, e isso é caso REAL, não
 * defesa: a ficha (`Consul.`) monta o mesmo bloco de aviso sem formulário
 * nenhum. Sem contexto, a lista continua legível — só não leva a lugar nenhum,
 * porque não há campo para focar.
 */
export function ErroDeGravacao<TVars>({
  erro,
  mensagem,
  campos,
  className,
  mutacao,
}: {
  erro: unknown
  mensagem: string
  campos?: CamposDoContrato
  className?: string
  /**
   * A mutação que produziu o erro — só para o caso da SESSÃO VENCIDA (#124).
   *
   * Quando o 401 chega, "Não foi possível gravar" é verdade e é inútil: não
   * houve nada de errado com o que o operador digitou, e a única saída é entrar
   * de novo. Com a mutação em mãos, o bloco troca a mensagem pelo caminho —
   * reautenticar aqui mesmo e reenviar o payload que o React Query guardou.
   *
   * Opcional porque nem toda chamada tem uma mutação para oferecer (a ficha
   * mostra erro de LEITURA); sem ela o 401 cai na mensagem genérica, como antes.
   */
  mutacao?: MutacaoObservavel<TVars>
}) {
  const form = useFormContext()
  const podeFocar = form !== null && campos !== undefined

  // A recusa por sessão vencida não é recusa do documento: mostrar as duas
  // coisas faria o operador procurar o campo errado antes de reparar na frase
  // que resolve.
  if (mutacao && ehSessaoExpirada(erro)) {
    return <ReentrarNaSessao mutacao={mutacao} />
  }

  return (
    <ErroDoServidor
      erro={erro}
      mensagem={mensagem}
      {...(campos ? { campos } : {})}
      {...(className ? { className } : {})}
      {...(podeFocar
        ? {
            aoIrParaCampo: (path: string) => {
              // Path fora do mapa não vira `setFocus` de nome inventado: o
              // react-hook-form aceita qualquer string calado, e o operador
              // clicaria num link que não faz nada.
              const nome = campos[path]?.nome
              if (nome) form.setFocus(nome)
            },
          }
        : {})}
    />
  )
}
