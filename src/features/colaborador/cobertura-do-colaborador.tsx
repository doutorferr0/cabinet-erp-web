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
 * Postgres e este cadastro lista as vinte da transcrição: **duas listas de quem
 * trabalha aqui**, e o operador vendo a errada dependendo da tela em que estiver.
 *
 * ## Por que a tela ainda não migrou junto
 *
 * Migrar exige o que ainda não existe do lado do MOCK, e não do servidor: não há
 * handler para `GET /api/employees/{id}`, e as duas sementes de colaborador
 * (`src/mocks/colaboradores.ts` e a do `crm.colaboradores`, que serve a
 * listagem) são conjuntos diferentes. Trocar o provider sem isso deixaria o
 * cadastro sem detalhe **no site público**, que é 100% mock — quebra de produção
 * para ganhar coerência em dev. A troca é trabalho próprio, com o `Gravar`
 * junto (hoje ele é `console.info`).
 *
 * ## Por que depende de `VITE_API_PROXY`
 *
 * Sem backend real não existe divergência: o MSW responde o combo e o provider
 * lê o mock, e as duas listas são a mesma ficção coerente — é o caso do site
 * público. Avisar ali inventaria um defeito que aquele ambiente não tem, e aviso
 * que aparece quando não devia é o que ensina o operador a ignorar avisos.
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
