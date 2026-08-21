import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'

/**
 * A COSTURA DO COLABORADOR, dita em voz alta.
 *
 * `GET /api/employees` entrou na lista de passagem porque a família de
 * atividades depende dela: `atividade-dialogo.tsx` escolhe o
 * `assigneeEmployeeId` no combo de `listEmployees`, e atividade no Postgres com
 * pessoa do mock gravaria o uuid de quem o servidor não conhece.
 *
 * **Só que esta TELA continua lendo o mock.** `data.colaboradores` é provider em
 * memória: ele não fala com a rede, então nada quebra — o que acontece é pior de
 * enxergar. Com o par local de pé, o combo de responsável oferece as pessoas do
 * Postgres e este cadastro lista as da semente: **duas listas de quem
 * trabalha aqui**, e o operador vendo a errada dependendo da tela em que estiver.
 *
 * ## Por que a tela ainda não migrou junto
 *
 * Os dois pré-requisitos do lado do MOCK saíram na #276: `GET /api/employees/{id}`
 * agora tem handler, e as duas sementes viraram uma — `crm.colaboradores` deriva
 * de `src/mocks/colaboradores.ts`, que é o que esta tela lê.
 *
 * O que falta agora é do lado da ESCRITA, e não é código: `Gravar` ainda é
 * `console.info`, e `PUT /api/employees/{id}` responde **403** para o papel do
 * usuário demo — `operator-full` não escreve em `/api/employees`, que a matriz
 * do backend reserva a `admin` por razão própria e boa (vínculo é o que decide
 * o papel dos outros). Migrar a tela antes de responder "quem cadastra
 * colaborador?" trocaria um cadastro que finge gravar por um que recusa.
 *
 * ## Por que depende de `VITE_API_PROXY`
 *
 * Sem backend real não existe divergência: o MSW responde o combo e o provider
 * lê o mock, e as duas listas são a mesma ficção coerente — é o caso do site
 * público. Avisar ali inventaria um defeito que aquele ambiente não tem, e aviso
 * que aparece quando não devia é o que ensina o operador a ignorar avisos.
 *
 * **Isso passou a ser verdade na #276, e não era antes.** Esta frase justificava
 * esconder o aviso no site público enquanto o combo oferecia três pessoas e esta
 * tela listava dez outras, com interseção VAZIA — o aviso estava desligado
 * exatamente onde o defeito era visível para todo visitante. A coerência do mock
 * puro é consequência da semente única, e `colaborador-unico.test.ts` é quem a
 * segura: no dia em que alguém escrever uma segunda lista de pessoas, ele
 * reprova antes de a frase voltar a mentir.
 *
 * Some quando a tela migrar.
 */
export function coberturaDoColaboradorVisivel(): boolean {
  return Boolean(import.meta.env.VITE_API_PROXY)
}

export function CoberturaDoColaborador() {
  if (!coberturaDoColaboradorVisivel()) return null

  return (
    <AvisoDeCobertura>
      <p>
        Este cadastro ainda lê a <strong>base de demonstração</strong>, enquanto o combo de
        responsável das atividades já lê o <strong>servidor</strong>. As duas listas de pessoas
        podem não coincidir — quem manda é o servidor, e este cadastro ainda não grava nele.
      </p>
    </AvisoDeCobertura>
  )
}
