import type { ProductDto } from '@/api/gerado'
import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { FormBlock } from '@/components/cabinet/form-block'
import {
  CheckboxField,
  DateField,
  LookupField,
  LookupSelectField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/cabinet/form-controls'
import { FormGrid } from '@/components/cabinet/form-grid'
import { posGravar } from '@/components/cabinet/pos-gravar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGravarProduto } from '@/data/produtos-api'
import { tabelas } from '@/data/tabelas'
import { PrecoEMargem } from '@/features/produto/preco-e-margem'
import { parseQuantidade } from '@/lib/formatters'
import type { Produto } from '@/mocks/produtos'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

const dimensoesSchema = z.object({
  altura: z.string(),
  largura: z.string(),
  comprimento: z.string(),
  raio: z.string(),
})

/**
 * O contrato v1 de produtos cobre `code`, `description`, `active` e as variantes;
 * o resto é campo da §6 que o backend ainda não conhece e continua validado aqui.
 * TODO(contract): trocar pelo schema do codegen quando o DTO cobrir a tela.
 */
export const produtoSchema = z.object({
  /** uuid do contrato; vazio no "Incluir" (o servidor atribui). */
  id: z.string(),
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
  /**
   * Os IDs da classificação, que a tela NÃO edita e precisa carregar.
   *
   * O Zod tira do registro tudo que ele não declara. Sem estas três linhas, os
   * ids sobrevivem na leitura, somem no `parse` do submit e o `PUT` — que
   * substitui o registro inteiro — apaga a classificação do produto. Foi o
   * teste do corpo do POST que mostrou isso; nenhum campo VISÍVEL da tela
   * mudaria, e o operador só descobriria na próxima abertura do cadastro.
   */
  tipoProdutoId: z.string().nullable(),
  fabricaId: z.string().nullable(),
  marcaId: z.string().nullable(),
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
      // `null` na linha recém-incluída: é o que manda a gravação fazer POST em
      // vez de PUT. Não tem coluna na grade — é chave, não campo.
      id: z.string().nullable(),
      ativo: z.boolean(),
      acabamento: z.string(),
      tamanho: z.string(),
      valorTabelaCentavos: z.number().nullable(),
      indice: z.string(),
      // O contrato quer número; a grade é texto. Recusar aqui é o que impede
      // "1o2" virar `null` no servidor — apagar o mínimo em silêncio.
      estoqueMinimo: z
        .string()
        .refine((t) => parseQuantidade(t) !== undefined, 'Est.Mínimo precisa ser um número'),
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
  /**
   * `relatedProducts` do contrato — produto×produto, com `quantidade`
   * discriminando kit de sugestão. Mora ao lado de `itensGrupo` e não no lugar
   * dele: são modelos diferentes do §6.4, e qual sobrevive é decisão em aberto
   * (api#117). O `id` e o `produtoId` viajam para não se perderem na volta.
   */
  produtosRelacionados: z.array(
    z.object({
      id: z.string(),
      produtoId: z.string(),
      codigo: z.string(),
      descricao: z.string(),
      quantidade: z.string(),
      ordem: z.number(),
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
    // A coluna lateral tem duas partes: a peça foto (moldura + seus dois botões,
    // colados em `{spacing.sm}`) e as marcações do produto, a um degrau real de
    // distância. Um só valor aqui achataria as duas em uma lista indistinta.
    <div className="flex w-40 shrink-0 flex-col gap-3">
      <div className="flex flex-col gap-2">
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
      </div>
      <div className="flex flex-col gap-2">
        <CheckboxField name="foraDeLinha" label="Fora de Linha" />
        <CheckboxField name="consultarValor" label="Consultar Valor" />
        <CheckboxField name="ativo" label="Ativo" />
        <CheckboxField name="sobreMedida" label="Sobre Medida" />
      </div>
    </div>
  )
}

function AbaDadosPrincipais() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
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

        <FormBlock legend="Fornecedor">
          <FormGrid
            name="fornecedores"
            columns={[
              { key: 'padrao', label: 'Padrão', type: 'check' },
              { key: 'fornecedor', label: 'Fornecedor', voz: 'nome' },
              { key: 'codProdFornecedor', label: 'Cód. Prod. Fornecedor' },
              { key: 'descricaoFornecedor', label: 'Descrição do Fornecedor', voz: 'produto' },
            ]}
            newRow={{
              padrao: false,
              fornecedor: '',
              codProdFornecedor: '',
              descricaoFornecedor: '',
            }}
          />
        </FormBlock>

        <div className="grid grid-cols-12 items-end gap-3">
          <DateField
            name="dtVigencia"
            label="Dt de Vigência"
            className="col-span-6 sm:col-span-3"
          />
          <LookupSelectField
            name="tipoProdutoId"
            rotuloDe="tipoProduto"
            label="Tipo de Produto"
            kind="tipoProduto"
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
            options={tabelas.unidades}
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
            options={tabelas.unidades}
            className="col-span-6 sm:col-span-2"
          />
          <TextField
            name="unidadeSaidaQuantidade"
            label="Qtd. Saída"
            className="col-span-6 sm:col-span-2"
          />
          <LookupSelectField
            name="classificacao"
            label="Classificação do Produto"
            kind="classificacao"
            className="col-span-12 sm:col-span-4"
          />
        </div>

        <div className="grid grid-cols-12 items-end gap-3">
          <SelectField
            name="empresaCompradora"
            label="Empresa Compradora"
            options={tabelas.empresasCompradoras}
            className="col-span-12 sm:col-span-3"
          />
          <LookupField
            name="designerModelo"
            label="Designer\Modelo"
            kind="designerModelo"
            className="col-span-6 sm:col-span-3"
          />
          <LookupField
            name="fabricaId"
            rotuloDe="fabrica"
            label="Fábrica"
            kind="fabrica"
            className="col-span-6 sm:col-span-3"
          />
          <LookupField
            name="marcaId"
            rotuloDe="marca"
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
    <FormBlock legend={legenda}>
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
    </FormBlock>
  )
}

function AbaOutrosDados() {
  return (
    <div className="flex flex-col gap-4">
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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Escolha o acabamento e tecle F3 para inserir localização do estoque.
      </p>

      <FormGrid
        name="variantes"
        columns={[
          { key: 'ativo', label: 'Ativo', type: 'check' },
          { key: 'acabamento', label: 'Acabamento', type: 'select', options: tabelas.acabamentos },
          { key: 'tamanho', label: 'Tamanho' },
          { key: 'valorTabelaCentavos', label: 'Valor de Tabela', type: 'money' },
          { key: 'indice', label: 'Índice' },
          { key: 'estoqueMinimo', label: 'Est.Mínimo' },
          { key: 'tipoValor', label: 'Tipo de Valor', type: 'select', options: tabelas.tiposValor },
        ]}
        newRow={{
          // Sem id: a linha ainda não existe no servidor, e é o `null` que faz
          // o Gravar criar a variante em vez de tentar alterar uma inexistente.
          id: null,
          ativo: true,
          acabamento: '',
          tamanho: '',
          valorTabelaCentavos: null,
          indice: '',
          estoqueMinimo: '',
          tipoValor: null,
        }}
      />

      <FormBlock legend="Localização do Estoque">
        <FormGrid
          name="localizacoes"
          columns={[
            {
              key: 'acabamento',
              label: 'Acabamento',
              type: 'select',
              options: tabelas.acabamentos,
            },
            { key: 'estoque', label: 'Estoque' },
            { key: 'predio', label: 'Prédio' },
            { key: 'rua', label: 'Rua' },
            { key: 'numero', label: 'Número' },
            { key: 'apto', label: 'Apto' },
          ]}
          newRow={{ acabamento: '', estoque: '', predio: '', rua: '', numero: '', apto: '' }}
        />
      </FormBlock>
    </div>
  )
}

function AbaProdutosRelacionados() {
  return (
    <div className="flex flex-col gap-4">
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
          options={tabelas.codigoProduto}
          className="col-span-12 sm:col-span-4"
        />
      </div>

      <FormGrid
        name="itensGrupo"
        columns={[
          { key: 'codFornecedor', label: 'Cód. Fornecedor' },
          { key: 'descricaoFornecedor', label: 'Descrição Forne.' },
          { key: 'acabamento', label: 'Acabamento', type: 'select', options: tabelas.acabamentos },
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

      <FormBlock legend="Relacionados do servidor (kit e sugestão)">
        <FormGrid
          name="produtosRelacionados"
          columns={[
            { key: 'codigo', label: 'Código' },
            { key: 'descricao', label: 'Descrição', voz: 'produto' },
            { key: 'quantidade', label: 'Quantidade (vazio = sugestão)' },
            { key: 'ordem', label: 'Ordem' },
          ]}
          newRow={{ id: '', produtoId: '', codigo: '', descricao: '', quantidade: '', ordem: 0 }}
        />
      </FormBlock>
    </div>
  )
}

function AbaTributacao() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 items-end gap-3">
        <SelectField
          name="origemProduto"
          label="Origem do Produtos"
          options={tabelas.origensProduto}
          className="col-span-12 sm:col-span-8"
        />
        <TextField name="ncm" label="NCM" className="col-span-6 sm:col-span-2" />
        <TextField name="cest" label="CEST" className="col-span-6 sm:col-span-2" />
      </div>

      <FormBlock legend="Impostos para NFe">
        <LookupField
          name="impostoPadrao"
          label="Padrão"
          kind="impostosPadrao"
          className="sm:max-w-md"
        />
      </FormBlock>

      <FormBlock legend="Busca automática dos Impostos da NFe vinculada ao NCM">
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
      </FormBlock>
    </div>
  )
}

/**
 * O que o contrato recusa, e como esses campos se chamam NESTA tela.
 *
 * Produto ainda não vem do schema de módulos (só os quatro cadastros vêm), então
 * aqui o mapa é escrito — curto de propósito: são os dois campos que o servidor
 * valida hoje (`code`, `description`). Path fora dele continua legível na lista,
 * só não vira link para um campo que não existe.
 */
const CAMPOS_DO_CONTRATO = {
  code: { nome: 'nossoCodigo', rotulo: 'Nosso Código' },
  description: { nome: 'nossaDescricao', rotulo: 'Nossa Descrição' },
} as const

export function ProdutoForm({
  produto,
  readOnly = false,
  contexto,
  aviso,
}: {
  produto: Produto
  readOnly?: boolean
  /** Modo ou registro aberto, ao lado do título na banda. */
  contexto?: string
  /** Aviso da tela — vai sob o título, acima dos campos. */
  aviso?: React.ReactNode
}) {
  const navigate = useNavigate()
  const gravar = useGravarProduto()

  /**
   * As variantes COMO O SERVIDOR AS TEM — não as do formulário.
   *
   * A aba de preço pede `/api/table-prices/{variantId}`, e `variantId` é o id
   * do servidor. Ler do rascunho do RHF ofereceria também a linha que o
   * operador acabou de acrescentar e ainda não gravou, cujo `id` é `null` — a
   * aba pediria preço para uma variante que não existe e receberia 404, com
   * cara de erro do sistema em vez de "grave primeiro".
   */
  const variantesGravadas = (produto.variantes ?? [])
    .filter((variante): variante is typeof variante & { id: string } => Boolean(variante.id))
    .map((variante) => ({
      id: variante.id,
      rotulo: [variante.acabamento, variante.tamanho].filter(Boolean).join(' · ') || variante.id,
    }))

  function onGravar(values: Produto) {
    // Sem tradução no meio (issue #94): o combo já escolheu por ID, e é o id
    // que o contrato grava. O que existia aqui era `classificacaoResolvida`,
    // que convertia o NOME escolhido no id e tinha de recusar em voz alta
    // quando o nome sumia da lista, era homônimo, ou a lista vinha truncada —
    // os três casos deixam de existir quando a escolha já é por id.
    //
    // O registro COMO VEIO do servidor viaja junto: é comparando com ele que a
    // gravação decide o que da grade mudou — linha intocada não vira escrita.
    // O DESTINO é a regra única da #405 (`components/cabinet/pos-gravar.ts`):
    // cadastro novo abre o produto que nasceu — com o id e o código que o
    // servidor deu —, alteração permanece na tela com o toast.
    gravar.mutate(
      { values, original: produto },
      {
        onSuccess: posGravar<ProductDto>({
          eraNovo: !produto.id,
          abrirDocumento: (produtoId) =>
            void navigate({
              to: '/cadastros/produtos/$produtoId',
              params: { produtoId },
              replace: true,
            }),
        }),
      },
    )
  }

  return (
    <CadastroForm
      schema={produtoSchema}
      defaultValues={produto}
      onGravar={onGravar}
      onCancelar={() => void navigate({ to: '/cadastros/produtos' })}
      readOnly={readOnly}
      gravando={gravar.isPending}
      gravou={gravar.isSuccess}
      titulo="Cadastro de Produtos"
      familia="products"
      {...(contexto ? { contexto } : {})}
      {...(aviso ? { aviso } : {})}
    >
      {/* Falha do Gravar em destaque, ANTES das abas: o `detail` do problem+json
          é a frase que o backend escolheu (400 validação, 403 escopo, 409
          conflito). Sem ele o operador não saberia POR QUE o registro não gravou.
          A `message` entra junto porque a falha de VARIANTE é a que diz qual
          linha caiu e que o produto já foi gravado — perder isso deixaria o
          operador tentando de novo sobre um estado que já mudou. */}
      {/* O componente ÚNICO de erro do servidor (#138). Era uma string só, com
          `message` e `detail` colados — o que separava os quatro papéis já
          existia no repo e não tinha consumidor. O mapa é curto porque a
          validação do contrato para produto é curta: o mock recusa `code` e
          `description`, e são esses dois que o operador precisa alcançar. */}
      <ErroDeGravacao
        erro={gravar.error}
        mensagem="Não foi possível gravar o produto."
        campos={CAMPOS_DO_CONTRATO}
      />
      <Tabs defaultValue="dadosPrincipais">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dadosPrincipais">Dados Principais</TabsTrigger>
          <TabsTrigger value="outrosDados">Outros Dados</TabsTrigger>
          <TabsTrigger value="valores">Valores\Localização do Estoque</TabsTrigger>
          <TabsTrigger value="relacionados">Produtos Relacionados</TabsTrigger>
          <TabsTrigger value="preco">Preço e Margem</TabsTrigger>
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
        {/* A aba de PREÇO não é um bloco de campos do formulário: ela tem
            endpoint próprio (`/api/table-prices/{variantId}`), gravação própria
            e papel próprio (`precos:gerenciar`). Recebe as variantes JÁ
            GRAVADAS porque preço pende da variante — linha que o operador
            acabou de acrescentar na grade ainda não tem id do servidor, e
            oferecê-la aqui pediria preço para uma peça que não existe. */}
        <TabsContent value="preco">
          <PrecoEMargem variantes={variantesGravadas} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="tributacao">
          <AbaTributacao />
        </TabsContent>
      </Tabs>
    </CadastroForm>
  )
}
