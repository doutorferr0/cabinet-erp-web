import type { PartnerDto } from '@/api/gerado'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { CampoComBusca } from '@/components/cabinet/campo-com-busca'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { FormBlock } from '@/components/cabinet/form-block'
import { DateField, MoneyField, SelectIdField, TextField } from '@/components/cabinet/form-controls'
import { Nome } from '@/components/cabinet/nome'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import { Input } from '@/components/ui/input'
import { data } from '@/data'
import {
  type Oportunidade,
  useColaboradoresParaEscolha,
  useEstagios,
  useFunis,
  useGravarOportunidade,
  useMotivosDePerda,
} from '@/data/crm-api'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { GerarOrcamento } from './gerar-orcamento'

/**
 * TODO(contract): o Zod do codegen substituirá este schema na integração.
 *
 * **Todo campo do `CrmOpportunityWriteRequest` está declarado**, inclusive
 * `orcamentoId`, que a tela não edita: Zod descarta o que não declara e o `PUT`
 * substitui o registro inteiro — a soma das duas coisas apaga dado sem mudar
 * nada na tela. É a classe de defeito que `cobertura-de-escrita.test.ts` vigia.
 */
export const oportunidadeSchema = z.object({
  id: z.string(),
  nome: z.string().min(1, 'Título da oportunidade é obrigatório'),
  funilId: z.string().nullable(),
  etapaId: z.string().nullable(),
  parceiroId: z.string().nullable(),
  parceiroNome: z.string(),
  contatoNome: z.string(),
  contatoEmail: z.string(),
  contatoTelefone: z.string(),
  responsavelId: z.string().nullable(),
  valorPrevistoCentavos: z.number().nullable(),
  dataPrevista: z.string(),
  origem: z.string(),
  motivoDePerdaId: z.string().nullable(),
  orcamentoId: z.string().nullable(),
})

/** Colunas da janela de busca de parceiro — as mesmas da listagem de clientes. */
const COLUNAS_DE_PARCEIRO: ColumnDef<PartnerDto>[] = [
  { accessorKey: 'code', header: 'Código', cell: ({ getValue }) => getValue<string>() ?? '—' },
  {
    accessorKey: 'legalName',
    header: 'Nome',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
  {
    accessorKey: 'document',
    header: 'CNPJ/CPF',
    cell: ({ getValue }) => getValue<string>() ?? '—',
  },
]

/**
 * O parceiro: id no dado, nome na tela, escolhido pela JANELA DE BUSCA (§9
 * padrão 5) — a mesma DataTable da listagem, com seleção e retorno.
 *
 * Não é combo: a lista de clientes é paginada no servidor e um `<select>` com
 * as 100 primeiras faria "não achei" e "não existe" virarem a mesma coisa.
 */
function CampoDeParceiro({ readOnly }: { readOnly: boolean }) {
  const { setValue } = useFormContext<Oportunidade>()
  const parceiroNome = useWatch<Oportunidade, 'parceiroNome'>({ name: 'parceiroNome' })
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <CampoComBusca
        label="Cliente / prospect"
        ariaLabel="Buscar parceiro"
        className="col-span-12 sm:col-span-6"
        {...(readOnly ? {} : { onBuscar: () => setAberto(true) })}
      >
        {/* Somente leitura no campo: quem escolhe é a janela. Digitação livre
            aqui deixaria o NOME divergir do id que vai ser gravado. */}
        <Input
          readOnly
          value={parceiroNome}
          aria-label="Parceiro escolhido"
          placeholder="Lead ainda sem cadastro"
        />
      </CampoComBusca>

      <SearchDialog<PartnerDto>
        open={aberto}
        onOpenChange={setAberto}
        title="Buscar cliente"
        columns={COLUNAS_DE_PARCEIRO}
        queryKey={['clientes', 'busca-oportunidade']}
        fetcher={data.clientes.list}
        onSelect={(linha) => {
          setValue('parceiroId', linha.id, { shouldDirty: true })
          setValue('parceiroNome', linha.legalName, { shouldDirty: true })
        }}
      />
    </>
  )
}

/**
 * A ETAPA depende do FUNIL escolhido, e a lista muda junto.
 *
 * Etapa de outro funil é 400 no contrato (a FK do banco é composta), então o
 * campo não pode oferecer a etapa errada — oferecer e deixar o servidor recusar
 * seria transformar uma regra conhecida em erro do operador.
 */
function CampoDeEtapa({ registro }: { registro: Oportunidade }) {
  const funilId = useWatch<Oportunidade, 'funilId'>({ name: 'funilId' })
  const etapas = useEstagios(funilId ?? null)

  return (
    <SelectIdField
      name="etapaId"
      label="Etapa"
      className="col-span-12 sm:col-span-4"
      carregando={etapas.isPending && funilId !== null}
      vazio={funilId ? 'Primeira etapa do funil' : 'Escolha o funil primeiro'}
      opcoes={(etapas.data ?? []).map((e) => ({ id: e.id, nome: e.name }))}
      {...(registro.etapaId ? { valorAtual: { id: registro.etapaId, nome: 'Etapa atual' } } : {})}
    />
  )
}

/**
 * CADASTRO DE OPORTUNIDADE — o mesmo registro que o quadro mostra como cartão.
 *
 * Lead e negócio são a MESMA linha (`crm_opportunities`): não há "converter
 * lead", há mudar de etapa. Por isso a tela tem os dois blocos ao mesmo tempo —
 * o parceiro cadastrado e o contato solto de quem ainda não é cadastro.
 *
 * **Mudar a etapa por aqui manda o cartão para o FIM da coluna** e reinicia a
 * contagem de "parado desde": posicionar é o `PATCH .../stage`, que é o menu do
 * quadro. O contrato diz isso, e a tela repete em texto para o operador.
 */
export function OportunidadeForm({
  oportunidade,
  readOnly = false,
  contexto,
}: {
  oportunidade: Oportunidade
  readOnly?: boolean
  contexto?: string
}) {
  const navigate = useNavigate()
  const gravar = useGravarOportunidade()
  const funis = useFunis()
  const motivos = useMotivosDePerda()
  const colaboradores = useColaboradoresParaEscolha()

  function voltar() {
    void navigate(
      oportunidade.funilId
        ? { to: '/crm/funil/$funilId', params: { funilId: oportunidade.funilId } }
        : { to: '/crm/funil' },
    )
  }

  return (
    <CadastroForm
      schema={oportunidadeSchema}
      defaultValues={oportunidade}
      onGravar={(valores: Oportunidade) => gravar.mutate(valores, { onSuccess: voltar })}
      onCancelar={voltar}
      readOnly={readOnly}
      gravando={gravar.isPending}
      titulo="Oportunidade"
      {...(contexto ? { contexto } : {})}
    >
      <ErroDeGravacao erro={gravar.error} mensagem="Falha ao gravar a oportunidade." />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="nome" label="Título do negócio" className="col-span-12 sm:col-span-8" />
          <MoneyField
            name="valorPrevistoCentavos"
            label="Valor previsto"
            className="col-span-6 sm:col-span-4"
          />

          <SelectIdField
            name="funilId"
            label="Funil"
            className="col-span-12 sm:col-span-4"
            carregando={funis.isPending}
            vazio="Funil padrão da empresa"
            opcoes={(funis.data ?? []).map((f) => ({ id: f.id, nome: f.name }))}
          />
          <CampoDeEtapa registro={oportunidade} />
          <DateField
            name="dataPrevista"
            label="Previsão de fechamento"
            className="col-span-6 sm:col-span-4"
          />
        </div>

        <p className="text-[0.75rem] text-muted-foreground">
          Trocar a etapa aqui manda o cartão para o fim da coluna nova e reinicia a contagem de
          tempo parado. Para escolher a posição, use o menu do cartão no quadro.
        </p>

        <FormBlock legend="Quem">
          <div className="grid grid-cols-12 items-end gap-3">
            <CampoDeParceiro readOnly={readOnly} />
            <SelectIdField
              name="responsavelId"
              label="Responsável"
              className="col-span-12 sm:col-span-6"
              carregando={colaboradores.isPending}
              vazio="Sem responsável"
              opcoes={(colaboradores.data ?? []).map((c) => ({ id: c.id, nome: c.name }))}
            />
          </div>

          {/* O contato solto existe para o LEAD que ainda não é cadastro — é o
              que o schema chama de `contact_*`. Some quando o parceiro entra?
              Não: o cadastro pode ser a empresa e o contato, a pessoa que
              atende. Esconder um por causa do outro perderia dado real. */}
          <div className="grid grid-cols-12 items-end gap-3">
            <TextField name="contatoNome" label="Contato" className="col-span-12 sm:col-span-4" />
            <TextField
              name="contatoEmail"
              label="E-mail do contato"
              className="col-span-12 sm:col-span-4"
            />
            <TextField
              name="contatoTelefone"
              label="Telefone do contato"
              className="col-span-12 sm:col-span-4"
            />
          </div>
        </FormBlock>

        <FormBlock legend="Origem e desfecho">
          <div className="grid grid-cols-12 items-end gap-3">
            <TextField name="origem" label="Origem do lead" className="col-span-12 sm:col-span-6" />
            {/* O motivo só vale em etapa de perda — quem exige é o servidor, no
                movimento do quadro. Aqui ele fica editável porque o registro
                pode chegar já perdido, e o `PUT` inteiro precisa levá-lo. */}
            <SelectIdField
              name="motivoDePerdaId"
              label="Motivo da perda"
              className="col-span-12 sm:col-span-6"
              carregando={motivos.isPending}
              vazio="Não se aplica"
              opcoes={(motivos.data ?? []).map((m) => ({ id: m.id, nome: m.name }))}
            />
          </div>
        </FormBlock>

        {/* O orçamento fica em bloco PRÓPRIO, e não junto do desfecho: perder é
            desfecho, gerar documento é o começo da venda. Juntá-los faria o
            operador procurar a conversão embaixo do motivo da perda. */}
        <FormBlock legend="Orçamento">
          <GerarOrcamento readOnly={readOnly} />
        </FormBlock>
      </div>
    </CadastroForm>
  )
}
