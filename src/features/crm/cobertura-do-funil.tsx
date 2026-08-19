import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'

/**
 * A COSTURA DO QUADRO, dita em voz alta.
 *
 * O funil é a única tela do repo que lê metades de origens diferentes: funis e
 * estágios saem de `/api/crm/pipelines` — que o backend serve — e as
 * oportunidades de `/api/crm/opportunities`, que responde **501**. Com o par
 * local de pé, as colunas vêm do Postgres e os cartões vêm do mock, que nunca
 * viu aquele `pipelineId`: a resposta é `{rows: [], total: 0}`, com status 200.
 *
 * **Zero linhas com status 200 é a forma mais cara de errar.** O quadro montado
 * e vazio se lê como "não há negócio neste funil" — uma afirmação sobre o
 * negócio — quando o que houve foi metade da integração. Não há como a tela
 * distinguir as duas depois do fato: as duas chegam como lista vazia.
 *
 * ## Por que depende de `VITE_API_PROXY`, e não é sempre
 *
 * Sem backend real não existe costura: o MSW responde as DUAS metades, os ids
 * casam e o quadro funciona — é o caso do site público, que é 100% mock. Avisar
 * ali seria inventar um defeito que aquele ambiente não tem, e aviso que
 * aparece quando não devia é o que ensina o operador a ignorar avisos.
 *
 * A leitura é a MESMA variável que liga o proxy e a lista de passagem
 * (`src/mocks/rotas-do-backend.ts`), de propósito: são a mesma decisão, e uma
 * segunda chave poderia divergir em silêncio.
 *
 * Some junto com o 501 — quando `/api/crm/opportunities` entrar na lista de
 * passagem, este componente perde a razão de existir e sai inteiro.
 */
export function coberturaDoFunilVisivel(): boolean {
  return Boolean(import.meta.env.VITE_API_PROXY)
}

export function CoberturaDoFunil() {
  if (!coberturaDoFunilVisivel()) return null

  return (
    <AvisoDeCobertura>
      <p>
        As <strong>etapas</strong> deste funil vêm do servidor, mas as{' '}
        <strong>oportunidades</strong> ainda não: o servidor responde <em>não implementado</em>{' '}
        nelas e quem as monta é a camada de demonstração. O quadro pode aparecer vazio — isso é a
        integração pela metade, e não a ausência de negócios.
      </p>
    </AvisoDeCobertura>
  )
}
