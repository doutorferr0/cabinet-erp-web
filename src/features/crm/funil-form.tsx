import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { FormBlock } from '@/components/cabinet/form-block'
import { CheckboxField, TextField } from '@/components/cabinet/form-controls'
import { FormGrid } from '@/components/cabinet/form-grid'
import { type Funil, estagioVazio, useGravarFunil } from '@/data/crm-api'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

/**
 * TODO(contract): o Zod do codegen substituirá este schema na integração.
 *
 * **Todo campo do `CrmPipelineWriteRequest` está declarado aqui**, inclusive o
 * que a tela não deixa editar: Zod DESCARTA o que não declara, e `PUT`
 * substitui o registro inteiro — campo fora do schema sobrevive à leitura e
 * some no `parse` do submit, apagando dado sem sintoma nenhum na hora. É a
 * classe de defeito que `cobertura-de-escrita.test.ts` existe para pegar.
 */
export const funilSchema = z.object({
  id: z.string(),
  nome: z.string().min(1, 'Nome do funil é obrigatório'),
  ordem: z.string(),
  padrao: z.boolean(),
  ativo: z.boolean(),
  estagios: z.array(
    z.object({
      id: z.string().nullable(),
      nome: z.string(),
      ordem: z.string(),
      probabilidade: z.number().nullable(),
      ganho: z.boolean(),
      perdido: z.boolean(),
      apodreceEmDias: z.string(),
    }),
  ),
})

/**
 * CADASTRO DE FUNIL — o cabeçalho e as COLUNAS do quadro, numa tela só.
 *
 * As colunas ficam aqui, e não em tela própria, porque estágio não existe fora
 * do funil: o contrato as publica como sub-recurso (`/pipelines/{id}/stages`) e
 * a FK do banco é composta. Configurar as duas coisas em telas separadas faria
 * "criar funil" ser um trabalho pela metade — funil nasce sem coluna nenhuma.
 *
 * **O `Gravar` vira N requisições, e isso é visível de propósito.** O funil vai
 * por `PUT`/`POST`; cada coluna nova ou alterada vai no endpoint dela. Não há
 * transação entre elas — o contrato não oferece uma — então a falha diz QUAL
 * coluna caiu e manda reabrir. Ver `gravarEstagios` em `src/data/crm-api.ts`.
 */
export function FunilForm({
  funil,
  readOnly = false,
  contexto,
}: {
  funil: Funil
  readOnly?: boolean
  /** Modo ou registro aberto, ao lado do título na banda. */
  contexto?: string
}) {
  const navigate = useNavigate()
  const gravar = useGravarFunil()

  function onGravar(values: Funil) {
    // O registro COMO VEIO do servidor viaja junto: é comparando com ele que a
    // gravação decide o que da grade mudou — coluna intocada não vira escrita.
    gravar.mutate(
      { values, original: funil.id ? funil : null },
      { onSuccess: () => void navigate({ to: '/crm/funis' }) },
    )
  }

  return (
    <CadastroForm
      schema={funilSchema}
      defaultValues={funil}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/crm/funis' })}
      readOnly={readOnly}
      gravando={gravar.isPending}
      titulo="Cadastro de Funis"
      {...(contexto ? { contexto } : {})}
    >
      {/* `message` e `detail` continuam ambos à vista, agora em papéis
          separados: a `message` é a que diz qual COLUNA caiu e que o funil já
          foi gravado, e o `detail` é a frase que o servidor escolheu. Perder
          qualquer uma das duas deixa o operador clicando de novo sobre um
          estado que já mudou. */}
      <ErroDeGravacao mutacao={gravar} erro={gravar.error} mensagem="Falha ao gravar o funil." />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="nome" label="Funil" className="col-span-12 sm:col-span-6" />
          <TextField name="ordem" label="Ordem" className="col-span-6 sm:col-span-2" />
          <div className="col-span-12 flex flex-col gap-2 sm:col-span-4">
            {/* `Padrão` é fato operacional: a oportunidade criada sem escolha
                explícita cai neste funil. Um só por empresa — quem desmarca o
                anterior é o servidor, na mesma transação, e por isso a tela não
                tenta manter a exclusividade por conta própria. */}
            <CheckboxField name="padrao" label="Funil padrão da empresa" />
            <CheckboxField name="ativo" label="Ativo" />
          </div>
        </div>

        <FormBlock legend="Etapas do funil">
          <p className="text-sm text-muted-foreground">
            As colunas do quadro, na ordem em que a oportunidade caminha. Ganho e Perdido são
            propriedades da ETAPA: quem entra numa etapa de perda precisa informar o motivo.
          </p>

          <FormGrid
            name="estagios"
            columns={[
              { key: 'nome', label: 'Etapa', voz: 'nome' },
              { key: 'ordem', label: 'Ordem' },
              { key: 'probabilidade', label: 'Probabilidade', type: 'percent' },
              { key: 'ganho', label: 'Ganho', type: 'check' },
              { key: 'perdido', label: 'Perdido', type: 'check' },
              { key: 'apodreceEmDias', label: 'Apodrece em (dias)' },
            ]}
            // Sem id: a linha ainda não existe no servidor, e é o `null` que faz
            // o Gravar criar a etapa em vez de tentar alterar uma inexistente.
            newRow={{ ...estagioVazio }}
            addLabel="Incluir etapa"
          />

          {/* O contrato não tem DELETE de estágio, e não é esquecimento: apagar
              coluna com cartão dentro obrigaria o servidor a escolher para onde
              os cartões vão, e essa escolha é do operador. Dizer isso aqui é o
              que impede "tirei a linha e gravei" de parecer exclusão. */}
          <p className="text-[0.75rem] text-muted-foreground">
            Tirar uma linha da grade não apaga a etapa no servidor — ela continua no funil, com as
            oportunidades que estiverem nela. Etapa fora de uso se resolve movendo os cartões e
            deixando a coluna vazia.
          </p>
        </FormBlock>
      </div>
    </CadastroForm>
  )
}
