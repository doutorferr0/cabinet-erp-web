import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import type { OrigemDosDados } from '@/data/provider'

/**
 * "DADOS DE EXEMPLO" — a tela dizendo que o que ela mostra não é da empresa.
 *
 * ## O defeito que ele fecha
 *
 * Um usuário real, logado no site real, abriu Pedido de Compra e leu **treze
 * pedidos que não existem**: a fixture do Softlux, servida por
 * `createMockProvider` sobre `src/mocks/pedidos-compra.ts`. Nada na tela
 * desmentia — o cabeçalho é o mesmo, a tabela é a mesma, o número do documento
 * tem cara de número de documento. E o `Gravar` dessas telas é `console.info`:
 * quem cadastrasse um pedido ali sairia achando que tinha comprado.
 *
 * O `AvisoDeCobertura` não cobria este caso, e a diferença importa. Ele fala do
 * contrato menor que a tela — dado VERDADEIRO com campo faltando. Aqui o dado
 * inteiro é ficção. São as duas metades da mesma promessa (não mentir sobre a
 * origem do que está na tela) e por isso dividem a caixa: mesma zona de
 * pendência, mesmo lugar, mesmo desenho. Quem já aprendeu a reconhecer a faixa
 * amarela não precisa aprender uma segunda.
 *
 * ## Por que aparece SEMPRE, inclusive no site público
 *
 * Aviso que depende do ambiente já existiu aqui perto: a `CoberturaDoColaborador`
 * só acendia com `VITE_API_PROXY`, porque o que ela denunciava (duas listas de
 * pessoas divergindo) só existia com backend real — e deixou de depender do
 * proxy na #402, quando passou a falar de uma regra de PERMISSÃO, que vale nos
 * dois ambientes. Este aviso é o oposto do primeiro caso: o ambiente onde o
 * defeito foi visto é justamente o 100% mock, que é o que `cabinetonline.cc`
 * serve. Esconder no mock seria esconder exatamente onde dói.
 *
 * Some sozinho: quem decide é `provider.origem`, e ela sai do registry quando o
 * recurso vira HTTP. Ninguém precisa lembrar de apagar o aviso das telas.
 */
export function AvisoDadosDeExemplo({
  origem,
}: {
  /**
   * `data.<recurso>.origem`, cru. OBRIGATÓRIA e podendo ser `undefined`, que
   * sob `exactOptionalPropertyTypes` são coisas diferentes: assim quem monta o
   * aviso é forçado a dizer de onde vem o dado da tela dele, em vez de omitir a
   * prop e ganhar silêncio por descuido.
   */
  origem: OrigemDosDados | undefined
}) {
  if (origem !== 'exemplo') return null

  return (
    <AvisoDeCobertura>
      <p>
        <strong>Dados de exemplo.</strong> Este módulo ainda não grava: o que aparece aqui é
        demonstração, não é da sua empresa, e o que você gravar não será salvo.
      </p>
    </AvisoDeCobertura>
  )
}
