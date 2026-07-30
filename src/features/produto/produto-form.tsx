import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CadastroForm } from '@/components/vitra/cadastro-form'
import {
  CheckboxField,
  DateField,
  LookupField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/vitra/form-controls'
import { FormGrid } from '@/components/vitra/form-grid'
import { lookupOptions } from '@/mocks/lookups'
import {
  ACABAMENTOS,
  EMPRESAS_COMPRADORAS,
  ORIGENS_PRODUTO,
  type Produto,
  TIPOS_VALOR,
  UNIDADES,
} from '@/mocks/produtos'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

const dimensoesSchema = z.object({
  altura: z.string(),
  largura: z.string(),
  comprimento: z.string(),
  raio: z.string(),
})

// TODO(contract): Zod do codegen substituirá este schema na integração.
export const produtoSchema = z.object({
  id: z.number(),
  nossoCodigo: z.string().min(1, 'Nosso Código é obrigatório'),
  codigoEspecial: z.string(),
  codigoReduzido: z.string(),
  nossaDescricao: z.string().min(1, 'Nossa Descrição é obrigatória'),
  fornecedores: z.array(
    z.object({
      padrao: z.boolean(),
      fornecedor: z.string(),
      codProdFornecedor: z.string(),
      descricaoFornecedor: z.string(),
    }),
  ),
  dtVigencia: z.string().nullable(),
  tipoProduto: z.string(),
  tipoPeca: z.string().nullable(),
  tipoLinha: z.string().nullable(),
  unidadeEntradaUnidade: z.string().nullable(),
  unidadeEntradaQuantidade: z.string(),
  unidadeSaidaUnidade: z.string().nullable(),
  unidadeSaidaQuantidade: z.string(),
  classificacao: z.string().nullable(),
  empresaCompradora: z.string().nullable(),
  designerModelo: z.string().nullable(),
  fabrica: z.string(),
  marca: z.string(),
  descricaoComplementar: z.string(),
  foraDeLinha: z.boolean(),
  consultarValor: z.boolean(),
  ativo: z.boolean(),
  sobreMedida: z.boolean(),
  qtdLampadasPorReator: z.string(),
  consumoWatts: z.string(),
  tensaoVolts: z.string(),
  tensaoBiVolts: z.string(),
  temperaturaCor: z.string(),
  angulo: z.string(),
  vaoLivre: z.string(),
  tempoInstalacaoMin: z.string(),
  corteNicho: z.string(),
  pesoLiquido: z.string(),
  pesoBruto: z.string(),
  lumen: z.string(),
  garantiaMeses: z.string(),
  dimensoesProduto: dimensoesSchema,
  dimensoesEmbalagem: dimensoesSchema,
  descricaoLivre: z.string(),
  publicarNoSite: z.boolean(),
  valorTabelaCentavos: z.number(),
  variantes: z.array(
    z.object({
      ativo: z.boolean(),
      acabamento: z.string(),
      tamanho: z.string(),
      valorTabelaCentavos: z.number().nullable(),
      indice: z.string(),
      estoqueMinimo: z.string(),
      tipoValor: z.string().nullable(),
    }),
  ),
  localizacoes: z.array(
    z.object({
      acabamento: z.string(),
      estoque: z.string(),
      predio: z.string(),
      rua: z.string(),
      numero: z.string(),
      apto: z.string(),
    }),
  ),
  gruposRelacionados: z.array(
    z.object({ nomeGrupo: z.string(), padrao: z.boolean(), ativo: z.boolean() }),
  ),
  codigoProduto: z.string().nullable(),
  itensGrupo: z.array(
    z.object({
      codFornecedor: z.string(),
      descricaoFornecedor: z.string(),
      acabamento: z.string(),
      quantidade: z.string(),
      padrao: z.boolean(),
    }),
  ),
  origemProduto: z.string().nullable(),
  ncm: z.string(),
  cest: z.string(),
  impostoPadrao: z.string().nullable(),
  impostosNfe: z.array(
    z.object({
      codigo: z.string(),
      descricao: z.string(),
      operacao: z.string(),
      cfop: z.string(),
      consumidorFinal: z.boolean(),
      uf: z.string(),
      ativo: z.boolean(),
    }),
  ),
})

/** Coluna direita da aba 1 (§6.1): imagem + marcações do produto. */
function ControlesLaterais() {
  return (
    <div className="flex w-40 shrink-0 flex-col gap-2">
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        Imagem
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => console.info('[mock] Incluir Foto')}
      >
        Incluir Foto
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => console.info('[mock] Retirar Foto')}
      >
        Retirar Foto
      </Button>
      <CheckboxField name="foraDeLinha" label="Fora de Linha" />
      <CheckboxField name="consultarValor" label="Consultar Valor" />
      <CheckboxField name="ativo" label="Ativo" />
      <CheckboxField name="sobreMedida" label="Sobre Medida" />
    </div>
  )
}

function AbaDadosPrincipais() {
  return (
    <div className="flex flex-col gap-4 pt-4 sm:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-12 items-end gap-3">
          <TextField name="nossoCodigo" label="Nosso Código" className="col-span-6 sm:col-span-2" />
          <TextField
            name="codigoEspecial"
            label="Código Especial"
            className="col-span-6 sm:col-span-2"
          />
          <TextField
            name="codigoReduzido"
            label="Código Reduzido"
            className="col-span-6 sm:col-span-2"
          />
          <TextField
            name="nossaDescricao"
            label="Nossa Descrição"
            className="col-span-12 sm:col-span-6"
          />
        </div>

        <fieldset className="flex flex-col gap-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Fornecedor</legend>
          <FormGrid
            name="fornecedores"
            columns={[
              { key: 'padrao', label: 'Padrão', type: 'check' },
              { key: 'fornecedor', label: 'Fornecedor' },
              { key: 'codProdFornecedor', label: 'Cód. Prod. Fornecedor' },
              { key: 'descricaoFornecedor', label: 'Descrição do Fornecedor' },
            ]}
            newRow={{
              padrao: false,
              fornecedor: '',
              codProdFornecedor: '',
              descricaoFornecedor: '',
            }}
          />
        </fieldset>

        <div className="grid grid-cols-12 items-end gap-3">
          <DateField
            name="dtVigencia"
            label="Dt de Vigência"
            className="col-span-6 sm:col-span-3"
          />
          <SelectField
            name="tipoProduto"
            label="Tipo de Produto"
            options={lookupOptions('tipoProduto')}
            className="col-span-6 sm:col-span-3"
          />
          <LookupField
            name="tipoPeca"
            label="Tipo da Peça"
            kind="tipoPeca"
            className="col-span-6 sm:col-span-3"
          />
          <LookupField
            name="tipoLinha"
            label="Tipo da Linha"
            kind="tipoLinha"
            className="col-span-6 sm:col-span-3"
          />
        </div>

        <div className="grid grid-cols-12 items-end gap-3">
          <SelectField
            name="unidadeEntradaUnidade"
            label="Unid. Entrada"
            options={UNIDADES}
            className="col-span-6 sm:col-span-2"
          />
          <TextField
            name="unidadeEntradaQuantidade"
            label="Qtd. Entrada"
            className="col-span-6 sm:col-span-2"
          />
          <SelectField
            name="unidadeSaidaUnidade"
            label="Unid. Saída"
            options={UNIDADES}
            className="col-span-6 sm:col-span-2"
          />
          <TextField
            name="unidadeSaidaQuantidade"
            label="Qtd. Saída"
            className="col-span-6 sm:col-span-2"
          />
          <SelectField
            name="classificacao"
            label="Classificação do Produto"
            options={lookupOptions('classificacao')}
            className="col-span-12 sm:col-span-4"
          />
        </div>

        <div className="grid grid-cols-12 items-end gap-3">
          <SelectField
            name="empresaCompradora"
            label="Empresa Compradora"
            options={EMPRESAS_COMPRADORAS}
            className="col-span-12 sm:col-span-3"
          />
          <LookupField
            name="designerModelo"
            label="Designer\Modelo"
            kind="designerModelo"
            className="col-span-6 sm:col-span-3"
          />
          <LookupField
            name="fabrica"
            label="Fábrica"
            kind="fabrica"
            className="col-span-6 sm:col-span-3"
          />
          <LookupField
            name="marca"
            label="Marca"
            kind="marca"
            className="col-span-6 sm:col-span-3"
          />
        </div>

        <TextareaField
          name="descricaoComplementar"
          label="Nossa Descrição Complementar (material)"
          rows={3}
        />
      </div>

      <ControlesLaterais />
    </div>
  )
}

function BlocoDimensoes({ prefix, legenda }: { prefix: string; legenda: string }) {
  return (
    <fieldset className="rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{legenda}</legend>
      <div className="grid grid-cols-12 items-end gap-3">
        <TextField name={`${prefix}.altura`} label="Altura" className="col-span-6 sm:col-span-3" />
        <TextField
          name={`${prefix}.largura`}
          label="Largura"
          className="col-span-6 sm:col-span-3"
        />
        <TextField
          name={`${prefix}.comprimento`}
          label="Comprimento"
          className="col-span-6 sm:col-span-3"
        />
        <TextField name={`${prefix}.raio`} label="Raio" className="col-span-6 sm:col-span-3" />
      </div>
    </fieldset>
  )
}

function AbaOutrosDados() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="grid grid-cols-12 items-end gap-3">
        <TextField
          name="qtdLampadasPorReator"
          label="Qtd. lâmp. por reator"
          className="col-span-6 sm:col-span-3"
        />
        <TextField
          name="consumoWatts"
          label="Consumo (Watts)"
          className="col-span-6 sm:col-span-3"
        />
        <TextField name="tensaoVolts" label="Tensão (Volts)" className="col-span-6 sm:col-span-3" />
        <TextField
          name="tensaoBiVolts"
          label="Tensão (Bi-Volts)"
          className="col-span-6 sm:col-span-3"
        />
        <TextField
          name="temperaturaCor"
          label="Temperatura Cor"
          className="col-span-6 sm:col-span-3"
        />
        <TextField name="angulo" label="Ângulo" className="col-span-6 sm:col-span-3" />
        <TextField name="vaoLivre" label="Vão Livre" className="col-span-6 sm:col-span-3" />
        <TextField
          name="tempoInstalacaoMin"
          label="Tempo Instalação (Min)"
          className="col-span-6 sm:col-span-3"
        />
        <TextField name="corteNicho" label="Corte\Nicho" className="col-span-6 sm:col-span-3" />
        <TextField name="pesoLiquido" label="Peso Líquido" className="col-span-6 sm:col-span-3" />
        <TextField name="pesoBruto" label="Peso Bruto" className="col-span-6 sm:col-span-3" />
        <TextField name="lumen" label="Lúmen" className="col-span-6 sm:col-span-3" />
        <TextField
          name="garantiaMeses"
          label="Garantia Meses"
          className="col-span-6 sm:col-span-3"
        />
      </div>

      <BlocoDimensoes prefix="dimensoesProduto" legenda="Dimensões do Produto" />
      <BlocoDimensoes prefix="dimensoesEmbalagem" legenda="Dimensões da Embalagem (caixa)" />

      <TextareaField name="descricaoLivre" label="Descrição Livre" rows={5} />
      <CheckboxField name="publicarNoSite" label="Publicar no Site" />
    </div>
  )
}

function AbaValoresLocalizacao() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Escolha o acabamento e tecle F3 para inserir localização do estoque.
      </p>

      <FormGrid
        name="variantes"
        columns={[
          { key: 'ativo', label: 'Ativo', type: 'check' },
          { key: 'acabamento', label: 'Acabamento', type: 'select', options: ACABAMENTOS },
          { key: 'tamanho', label: 'Tamanho' },
          { key: 'valorTabelaCentavos', label: 'Valor de Tabela', type: 'money' },
          { key: 'indice', label: 'Índice' },
          { key: 'estoqueMinimo', label: 'Est.Mínimo' },
          { key: 'tipoValor', label: 'Tipo de Valor', type: 'select', options: TIPOS_VALOR },
        ]}
        newRow={{
          ativo: true,
          acabamento: '',
          tamanho: '',
          valorTabelaCentavos: null,
          indice: '',
          estoqueMinimo: '',
          tipoValor: null,
        }}
      />

      <fieldset className="flex flex-col gap-2 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Localização do Estoque</legend>
        <FormGrid
          name="localizacoes"
          columns={[
            { key: 'acabamento', label: 'Acabamento', type: 'select', options: ACABAMENTOS },
            { key: 'estoque', label: 'Estoque' },
            { key: 'predio', label: 'Prédio' },
            { key: 'rua', label: 'Rua' },
            { key: 'numero', label: 'Número' },
            { key: 'apto', label: 'Apto' },
          ]}
          newRow={{ acabamento: '', estoque: '', predio: '', rua: '', numero: '', apto: '' }}
        />
      </fieldset>
    </div>
  )
}

function AbaProdutosRelacionados() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <FormGrid
        name="gruposRelacionados"
        columns={[
          { key: 'nomeGrupo', label: 'Nome do Grupo' },
          { key: 'padrao', label: 'Padrão', type: 'check' },
          { key: 'ativo', label: 'Ativo', type: 'check' },
        ]}
        newRow={{ nomeGrupo: '', padrao: false, ativo: true }}
      />

      <div className="grid grid-cols-12 items-end gap-3">
        <SelectField
          name="codigoProduto"
          label="Código do Produto"
          options={['Fornecedor', 'Nosso Código', 'Código Reduzido']}
          className="col-span-12 sm:col-span-4"
        />
      </div>

      <FormGrid
        name="itensGrupo"
        columns={[
          { key: 'codFornecedor', label: 'Cód. Fornecedor' },
          { key: 'descricaoFornecedor', label: 'Descrição Forne.' },
          { key: 'acabamento', label: 'Acabamento', type: 'select', options: ACABAMENTOS },
          { key: 'quantidade', label: 'Quantidade' },
          { key: 'padrao', label: 'Padrão', type: 'check' },
        ]}
        newRow={{
          codFornecedor: '',
          descricaoFornecedor: '',
          acabamento: '',
          quantidade: '',
          padrao: false,
        }}
      />
    </div>
  )
}

function AbaTributacao() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="grid grid-cols-12 items-end gap-3">
        <SelectField
          name="origemProduto"
          label="Origem do Produtos"
          options={ORIGENS_PRODUTO}
          className="col-span-12 sm:col-span-8"
        />
        <TextField name="ncm" label="NCM" className="col-span-6 sm:col-span-2" />
        <TextField name="cest" label="CEST" className="col-span-6 sm:col-span-2" />
      </div>

      <fieldset className="rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Impostos para NFe</legend>
        <LookupField
          name="impostoPadrao"
          label="Padrão"
          kind="impostosPadrao"
          className="sm:max-w-md"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">
          Busca automática dos Impostos da NFe vinculada ao NCM
        </legend>
        <FormGrid
          name="impostosNfe"
          columns={[
            { key: 'codigo', label: 'Código' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'operacao', label: 'Operação' },
            { key: 'cfop', label: 'CFOP' },
            { key: 'consumidorFinal', label: 'Consumidor Final', type: 'check' },
            { key: 'uf', label: 'UF' },
            { key: 'ativo', label: 'Ativo', type: 'check' },
          ]}
          newRow={{
            codigo: '',
            descricao: '',
            operacao: '',
            cfop: '',
            consumidorFinal: false,
            uf: '',
            ativo: true,
          }}
        />
      </fieldset>
    </div>
  )
}

export function ProdutoForm({ produto }: { produto: Produto }) {
  const navigate = useNavigate()

  function onGravar(values: Produto) {
    // Mock only: sem backend. Na integração, mutation do TanStack Query.
    console.info('[mock] Gravar produto', values)
    void navigate({ to: '/cadastros/produtos' })
  }

  return (
    <CadastroForm
      schema={produtoSchema}
      defaultValues={produto}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/cadastros/produtos' })}
    >
      <Tabs defaultValue="dadosPrincipais">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dadosPrincipais">Dados Principais</TabsTrigger>
          <TabsTrigger value="outrosDados">Outros Dados</TabsTrigger>
          <TabsTrigger value="valores">Valores\Localização do Estoque</TabsTrigger>
          <TabsTrigger value="relacionados">Produtos Relacionados</TabsTrigger>
          <TabsTrigger value="tributacao">Tributação</TabsTrigger>
        </TabsList>
        <TabsContent value="dadosPrincipais">
          <AbaDadosPrincipais />
        </TabsContent>
        <TabsContent value="outrosDados">
          <AbaOutrosDados />
        </TabsContent>
        <TabsContent value="valores">
          <AbaValoresLocalizacao />
        </TabsContent>
        <TabsContent value="relacionados">
          <AbaProdutosRelacionados />
        </TabsContent>
        <TabsContent value="tributacao">
          <AbaTributacao />
        </TabsContent>
      </Tabs>
    </CadastroForm>
  )
}
