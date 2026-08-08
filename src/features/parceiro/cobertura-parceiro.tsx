import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { Button } from '@/components/ui/button'
import { detalheDoErro } from '@/lib/erros'

export interface CoberturaParceiroProps {
  isNovo: boolean
  erro: unknown
  /** Lista de campos que o Gravar envia na EDIÇÃO — específica de cada papel. */
  camposDeEdicao: string
  /** Presente quando o 409 trouxe o cadastro que já existe no grupo. */
  vincular?: () => void
  vinculando?: boolean
}

/**
 * O contrato cobre 5 campos de um cadastro que tem dezenas. Sem este aviso, aba
 * em branco se lê como cadastro incompleto e `Gravar` parece ter guardado tudo.
 *
 * Idêntico nos três papéis de parceiro exceto a lista de campos da edição — o
 * texto de inclusão nem isso, é literal nos três ({nome, documento, e-mail e
 * situação}), porque o `POST` aceita o mesmo recorte para qualquer papel.
 */
export function CoberturaParceiro({
  isNovo,
  erro,
  camposDeEdicao,
  vincular,
  vinculando,
}: CoberturaParceiroProps) {
  const falha = erro ? (
    <div role="alert" className="flex flex-col items-start gap-2">
      <p className="text-sm text-destructive">Não foi possível gravar. {detalheDoErro(erro)}</p>
      {/* Vincular NÃO edita o cadastro do grupo: liga esta empresa a ele. O
          que a empresa vizinha cadastrou fica como está — ajustar depois é o
          Alterar, que é explícito. */}
      {vincular ? (
        <Button type="button" variant="outline" size="sm" onClick={vincular} disabled={vinculando}>
          {vinculando ? 'Vinculando…' : 'Vincular esta empresa ao cadastro existente'}
        </Button>
      ) : null}
    </div>
  ) : null

  return (
    <AvisoDeCobertura {...(falha ? { erro: falha } : {})}>
      <p>
        {isNovo ? (
          <>
            <strong>Gravar</strong> cria o cadastro com {'{'}nome, documento, e-mail e situação{'}'}{' '}
            e o papel desta tela. Os demais campos não são enviados — o contrato ainda não os tem.
          </>
        ) : (
          <>
            <strong>Gravar</strong> envia ao servidor apenas {camposDeEdicao}. Os demais campos
            aparecem em branco e não são enviados.
          </>
        )}
      </p>
    </AvisoDeCobertura>
  )
}
