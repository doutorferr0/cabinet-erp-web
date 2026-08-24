import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { moduloDoErro } from '@/data/modulos-em-construcao'
import { detalheDoErro } from '@/lib/erros'
import { cn } from '@/lib/utils'

/**
 * O que a tela mostra quando o servidor responde **501** — o módulo está no
 * contrato e o backend ainda não o serve.
 *
 * ## Por que não serve o bloco de falha genérico
 *
 * Ele diz "a consulta não chegou ao servidor" e oferece `Tentar de novo`. As
 * duas coisas estão erradas aqui, e erradas de um jeito que custa tempo do
 * operador: a consulta CHEGOU e foi entendida, e repetir devolve o mesmo 501 —
 * o contrato manda em letra que o cliente não reenvie o mesmo corpo. Sem
 * botão, portanto, pela mesma razão que `SemPermissao` não tem um: botão que
 * não resolve é promessa que a tela não cumpre, e o operador clica três vezes
 * antes de desconfiar.
 *
 * ## A cor é de PENDÊNCIA, não de erro
 *
 * Ninguém errou e não há cadastro para corrigir — falta implementação do outro
 * lado, e um dia isto some. É a mesma leitura do `AvisoDeCobertura`, e por isso
 * é a caixa dele que carrega o "o que já funciona": vermelho aqui mandaria o
 * operador procurar defeito no que digitou.
 *
 * ## Três informações, três fontes
 *
 * 1. **o nome do módulo** e **o que já funciona** — do registro do front
 *    (`src/data/modulos-em-construcao.ts`), porque só a tela sabe quais abas
 *    gravam;
 * 2. **o que falta** — do mesmo registro, transcrito do contrato;
 * 3. **`detail`** — a frase daquela ocorrência, escolhida pelo servidor.
 *
 * Nenhuma substitui a outra. Módulo fora do registro perde 1 e 2 e mantém 3 —
 * o aviso fica genérico, que é honesto; nomear a tela por chute não seria.
 */
export function ModuloEmConstrucao({ erro, className }: { erro?: unknown; className?: string }) {
  const modulo = moduloDoErro(erro)
  const detalhe = detalheDoErro(erro)

  return (
    <Empty data-slot="modulo-em-construcao" className={className}>
      <EmptyHeader>
        <EmptyTitle>{modulo ? `${modulo.nome} em construção` : 'Módulo em construção'}</EmptyTitle>
        <EmptyDescription>
          {modulo
            ? `O servidor ainda não guarda ${modulo.falta}. Esta parte do sistema já está desenhada, mas ainda não há onde gravá-la — não adianta tentar de novo.`
            : 'Esta parte do sistema já está desenhada, mas o servidor ainda não a atende. Não adianta tentar de novo.'}
        </EmptyDescription>
        {/* O `detail` é a única informação daquela ocorrência específica.
            Trocá-lo pela frase do registro jogaria fora o que o backend
            escolheu dizer sobre ESTE pedido. */}
        {detalhe ? <EmptyDescription>{detalhe}</EmptyDescription> : null}
      </EmptyHeader>

      {modulo ? (
        <AvisoDeCobertura className="mt-2 text-left">
          <p>
            <span className="font-semibold">O que já funciona:</span> {modulo.funciona}
          </p>
        </AvisoDeCobertura>
      ) : null}
    </Empty>
  )
}

/**
 * O MESMO 501, mas na GRAVAÇÃO — dentro do formulário, no lugar do erro.
 *
 * Separado porque o operador está em outra situação: ele preencheu, apertou
 * `Gravar`, e o que ele precisa saber primeiro é **se perdeu o que digitou**. O
 * contrato responde: o 501 vem *em vez de* gravar metade, então nada foi
 * gravado e o formulário continua com tudo preenchido. Sem essa frase, a saída
 * natural é fechar a tela e refazer.
 *
 * A caixa é a de pendência e não a de erro (`ErroDoServidor`, borda vermelha)
 * pelo mesmo motivo do bloco de tela: não há campo a corrigir, e a lista de
 * `fields[]` que o bloco vermelho existe para mostrar não vem num 501.
 */
export function GravacaoEmConstrucao({ erro, className }: { erro: unknown; className?: string }) {
  const modulo = moduloDoErro(erro)
  const detalhe = detalheDoErro(erro)

  return (
    <AvisoDeCobertura
      // `role="alert"`: a recusa veio DEPOIS do clique em `Gravar`, e o
      // operador está olhando para o rodapé — precisa ser avisado, não
      // descobrir rolando. Mesma escolha do `ErroDoServidor`.
      className={cn('text-left', className)}
    >
      <p role="alert">
        <span className="font-semibold">
          {modulo ? `${modulo.nome}: gravação em construção.` : 'Gravação em construção.'}
        </span>{' '}
        {modulo
          ? `O servidor ainda não guarda ${modulo.falta}.`
          : 'O servidor ainda não guarda esta parte do registro.'}{' '}
        Nada foi gravado e o que você preencheu continua aqui.
      </p>
      {detalhe ? <p className="text-muted-foreground">{detalhe}</p> : null}
      {modulo ? (
        <p>
          <span className="font-semibold">O que já funciona:</span> {modulo.funciona}
        </p>
      ) : null}
    </AvisoDeCobertura>
  )
}
