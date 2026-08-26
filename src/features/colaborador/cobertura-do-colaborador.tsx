import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'

/**
 * A COSTURA DO COLABORADOR, dita em voz alta — e ela MUDOU DE LADO em 25/08.
 *
 * ## O que este aviso dizia, e por que deixou de ser verdade
 *
 * Ele nasceu para uma divergência de LEITURA: `GET /api/employees` estava na
 * lista de passagem porque a família de atividades depende dela
 * (`atividade-dialogo.tsx` escolhe o `assigneeEmployeeId` no combo de
 * `listEmployees`), enquanto ESTA tela lia `src/mocks/colaboradores.ts`. Com o
 * par local de pé havia **duas listas de quem trabalha aqui**, e o operador via
 * a errada dependendo da tela em que estivesse.
 *
 * **Essa metade acabou.** `data.colaboradores` é HTTP desde 25/08
 * (`colaboradores-api.ts`): a listagem e a ficha saem do mesmo `/api/employees`
 * que o combo já lia, e as duas telas voltaram a falar da mesma pessoa.
 *
 * ## O que sobrou, e não é código
 *
 * `Gravar` continua sendo `console.info`. `POST /api/employees` e
 * `PUT /api/employees/{id}` existem e respondem — mas com **403
 * `urn:cabinet:erro:papel-insuficiente`** para `operator-full`, o papel da
 * semente e do usuário demo (medido em 25/08 contra a main `2ee954b`). A matriz
 * do api reserva esta família a `admin` por razão própria e boa: o vínculo é o
 * que decide o papel dos OUTROS, e quem pode editá-lo pode promover a si mesmo.
 *
 * Ligar a escrita agora trocaria um cadastro que finge gravar por um que
 * recusa, e a pergunta de produto — "quem cadastra colaborador?" — segue sem
 * resposta. Por isso o aviso não sumiu: ele **encolheu** para o que ainda é
 * verdade, que é a metade da escrita.
 *
 * ## Por que continua dependendo de `VITE_API_PROXY`
 *
 * Sem backend real o `Gravar` do mock é coerente com o mock que a tela lê — é o
 * caso do site público. Avisar ali inventaria um defeito que aquele ambiente não
 * tem, e aviso que aparece quando não devia é o que ensina o operador a ignorar
 * avisos.
 *
 * Some quando a escrita migrar — ou quando o produto decidir que este cadastro
 * é só de leitura, que também é resposta.
 */
export function coberturaDoColaboradorVisivel(): boolean {
  return Boolean(import.meta.env.VITE_API_PROXY)
}

export function CoberturaDoColaborador() {
  if (!coberturaDoColaboradorVisivel()) return null

  return (
    <AvisoDeCobertura>
      <p>
        Este cadastro <strong>lê o servidor</strong>, e é a mesma lista que o combo de responsável
        das atividades usa. O que ele ainda <strong>não faz é gravar</strong>: alterar colaborador é
        reservado ao papel de administrador, e o botão Gravar desta tela ainda não chega ao
        servidor.
      </p>
    </AvisoDeCobertura>
  )
}
