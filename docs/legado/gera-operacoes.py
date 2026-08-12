#!/usr/bin/env python3
"""Gera docs/legado/operacoes.html — fichas de OPERAÇÃO do Softlux.

Não é documentação da tela do Delphi: é o que cada operação de negócio exige,
que regras a governam, o que produz e o que dispara depois. Serve de requisito
para o Cabinet, que NÃO replica o legado.

Cada afirmação carrega a procedência. Onde não há fonte, o campo não existe —
não se preenche com suposição.
"""
import os, csv, json, html

BASE = os.path.expanduser('~/projetos/cabinet-erp-web/docs/legado')
SCH = os.path.join(BASE, 'schema')

linhas = {}
with open(os.path.join(SCH, 'bdprincipal-linhas.csv'), encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        linhas[r['tabela'].lower()] = int(r['linhas'])

def vol(t):
    n = linhas.get(t.lower())
    return format(n, ',d').replace(',', '.') if n else ('vazia' if n == 0 else '?')

# ---------------------------------------------------------------- relações
# Mesma lógica do gera-dbml.py: o legado declara 208 FKs para 359 tabelas, então
# o desenho precisa das inferidas para não sair com caixas soltas.
import re, math

def rd(n):
    with open(os.path.join(SCH, n), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

_cols = rd('bdprincipal-colunas.csv')
_fks = rd('bdprincipal-fks.csv')
_idx = rd('bdprincipal-indices.csv')

tcols = {}
for r in _cols:
    tcols.setdefault(r['tabela'], []).append(r)
for t in tcols:
    tcols[t].sort(key=lambda r: int(r['ordem']))

pk = {}
for r in _idx:
    if r['is_primary_key'] == 'True' and r['is_included_column'] != 'True':
        pk.setdefault(r['tabela'], []).append((int(r['key_ordinal']), r['coluna']))
pk = {t: [c for _, c in sorted(v)] for t, v in pk.items()}

tipo_de = {(r['tabela'], r['coluna'].lower()): r['tipo'] for r in _cols}
dono = {}
for t, k in pk.items():
    if len(k) == 1:
        dono.setdefault(k[0].lower(), []).append((t, k[0]))
dono = {c: v[0] for c, v in dono.items() if len(v) == 1}
ocorre = {}
for r in _cols:
    c = r['coluna'].lower()
    ocorre[c] = ocorre.get(c, 0) + 1

SINONIMOS = {'epr_codnosso': ('produtos', 'Pro_codnosso'), 'pre_codnosso': ('produtos', 'Pro_codnosso'),
             'epr_acabamento': ('Acabamento', 'CodAcabamento'), 'pre_acabamento': ('Acabamento', 'CodAcabamento'),
             'pre_fornecedor': ('fornecedor', 'For_codigo')}
RUIDO = {'emp_codigo', 'usr_codigo', 'usr_cod_alteracao', 'usr_cod_inclusao',
         'id', 'codigo', 'cod', 'nome', 'descricao', 'situacao'}

RELS = []          # (origem, coluna, destino, coluna_destino, declarada?)
_vistas = set()
for r in _fks:
    o, co, d, cd = r['tabela_origem'], r['coluna_origem'], r['tabela_destino'], r['coluna_destino']
    k = (o.lower(), co.lower(), d.lower(), cd.lower())
    if k in _vistas or (o.lower(), co.lower()) == (d.lower(), cd.lower()):
        continue
    _vistas.add(k)
    RELS.append((o, co, d, cd, True))
for t, cs in tcols.items():
    for c in cs:
        cl = c['coluna'].lower()
        if cl in SINONIMOS:
            alvo, ac = SINONIMOS[cl]
        else:
            if cl in RUIDO or ocorre.get(cl, 0) > 60:
                continue
            achado = dono.get(cl)
            if not achado:
                continue
            alvo, ac = achado
            if tipo_de.get((t, cl)) != tipo_de.get((alvo, cl)):
                continue
            if len(pk.get(t, [])) == 1 and pk[t][0].lower() == cl:
                continue
        if alvo == t or alvo not in tcols:
            continue
        k = (t.lower(), cl, alvo.lower(), ac.lower())
        if k in _vistas:
            continue
        _vistas.add(k)
        RELS.append((t, c['coluna'], alvo, ac, False))

# ---------------------------------------------------------------- diagrama
CX, CY = 500, 360          # centro do desenho
BW, BH_BASE = 172, 26      # caixa: largura, altura do titulo

def colunas_relevantes(t, ligacoes, limite=4):
    """PK primeiro, depois as colunas que participam de alguma ligação do desenho."""
    chave = pk.get(t, [])
    usadas = []
    for c in chave:
        usadas.append((c, 'pk'))
    for col in ligacoes.get(t, []):
        if not any(c.lower() == col.lower() for c, _ in usadas):
            usadas.append((col, 'fk'))
    total = len(tcols.get(t, []))
    return usadas[:limite], max(0, total - min(len(usadas), limite))

def diagrama(op):
    tabs = [t for t in op['tabelas'] if t in tcols]
    if len(tabs) < 2:
        return ''
    central = tabs[0]
    resto = tabs[1:]
    dentro = set(tabs)
    arestas = [(o, co, d, cd, dec) for o, co, d, cd, dec in RELS if o in dentro and d in dentro]
    ligacoes = {}
    for o, co, d, cd, dec in arestas:
        ligacoes.setdefault(o, []).append(co)
        ligacoes.setdefault(d, []).append(cd)

    # papel de cada tabela, derivado da direção da relação com a central
    papel = {central: 'centro'}
    for t in resto:
        p = 'solta'
        for o, co, d, cd, dec in arestas:
            if o == t and d == central: p = 'item'; break
            if o == central and d == t: p = 'ref'
        papel[t] = p

    # posições: central no meio, satélites em uma ou duas órbitas
    pos = {central: (CX, CY)}
    n = len(resto)
    raio1, raio2 = 250, 250
    prim = resto if n <= 7 else resto[:math.ceil(n/2)]
    seg = [] if n <= 7 else resto[math.ceil(n/2):]
    def espalha(lista, raio, rx, ry, fase=0.0):
        for i, t in enumerate(lista):
            a = fase + 2*math.pi*i/max(1, len(lista))
            pos[t] = (CX + rx*math.cos(a), CY + ry*math.sin(a))
    espalha(prim, raio1, 415, 285, -math.pi/2)
    if seg:
        espalha(seg, raio2, 232, 168, -math.pi/2 + math.pi/len(seg))

    CORES = {'centro': ('#1C1A17', '#FFFDF8'), 'item': ('#0091FF', '#F2F8FF'),
             'ref': ('#2E7D32', '#F3F9F3'), 'solta': ('#8B8377', '#FAF6EE')}
    ROT = {'centro': 'documento', 'item': 'depende dele', 'ref': 'consultada', 'solta': 'sem ligação direta'}

    out = []
    # linhas primeiro, para ficarem atrás das caixas
    for o, co, d, cd, dec in arestas:
        if o not in pos or d not in pos: continue
        x1, y1 = pos[o]; x2, y2 = pos[d]
        tracejado = '' if dec else ' stroke-dasharray="5 4"'
        out.append('<line x1="%.0f" y1="%.0f" x2="%.0f" y2="%.0f" stroke="#C9BFA9" stroke-width="1.4"%s>'
                   '<title>%s.%s → %s.%s%s</title></line>'
                   % (x1, y1, x2, y2, tracejado, o, co, d, cd, '' if dec else '  (inferida)'))
    for t in tabs:
        x, y = pos[t]
        cols, restam = colunas_relevantes(t, ligacoes)
        h = BH_BASE + 15*len(cols) + (13 if restam else 0) + 8
        borda, fundo = CORES[papel[t]]
        larg = BW if t != central else BW + 16
        x0, y0 = x - larg/2, y - h/2
        peso = 2.4 if t == central else 1.3
        # a caixa é clicável: abre a tabela no explorador do schema
        out.append('<a href="softlux-er.html#%s" target="_blank"><g style="cursor:pointer">'
                   '<title>%s — %s linhas · %s (clique abre no explorador)</title>' % (t, t, vol(t), ROT[papel[t]]))
        out.append('<rect x="%.0f" y="%.0f" width="%d" height="%d" rx="7" fill="%s" stroke="%s" stroke-width="%s"/>'
                   % (x0, y0, larg, h, fundo, borda, peso))
        out.append('<text x="%.0f" y="%.0f" font-size="12.5" font-weight="700" fill="%s" text-anchor="middle">%s</text>'
                   % (x, y0 + 17, borda, t[:22]))
        for i, (c, kind) in enumerate(cols):
            marca = '◆' if kind == 'pk' else '·'
            out.append('<text x="%.0f" y="%.0f" font-size="10.5" fill="#5A544B">%s %s</text>'
                       % (x0 + 9, y0 + 33 + 15*i, marca, c[:22]))
        if restam:
            out.append('<text x="%.0f" y="%.0f" font-size="10" fill="#8B8377" font-style="italic">… mais %d colunas</text>'
                       % (x0 + 9, y0 + 33 + 15*len(cols), restam))
        out.append('</g></a>')

    legenda = ('<g font-size="10.5" fill="#5A544B">'
               '<rect x="14" y="14" width="11" height="11" rx="3" fill="#FFFDF8" stroke="#1C1A17" stroke-width="2"/>'
               '<text x="32" y="24">documento da operação</text>'
               '<rect x="14" y="34" width="11" height="11" rx="3" fill="#F2F8FF" stroke="#0091FF"/>'
               '<text x="32" y="44">depende dele</text>'
               '<rect x="14" y="54" width="11" height="11" rx="3" fill="#F3F9F3" stroke="#2E7D32"/>'
               '<text x="32" y="64">consultada pela operação</text>'
               '<line x1="14" y1="79" x2="26" y2="79" stroke="#C9BFA9" stroke-width="1.4" stroke-dasharray="5 4"/>'
               '<text x="32" y="83">ligação inferida, não declarada</text></g>')
    return ('<svg viewBox="0 0 1000 720" xmlns="http://www.w3.org/2000/svg">%s%s</svg>'
            % (legenda, '\n'.join(out)))

# ---------------------------------------------------------------- conteúdo
# F = fonte. banco = engenharia reversa do SQL Server · param = Paramentros ·
# perm = SisPermissao/SisOpcoesEspecial · exe = binário Delphi · pdf = impresso real
OPS = [
{'id':'orcamento','fase':'Venda','nome':'Orçamento',
 'resumo':'A proposta de equipamentos para um projeto luminotécnico, agrupada por ambiente da obra. É o documento central do negócio.',
 'onde':'Orçamento e pedido são <b>o mesmo registro físico</b>, em <code>Venda</code>, separados por <code>Ven_Tipo</code> (<code>O</code> orçamento, <code>P</code> pedido). Converter é trocar o tipo, não copiar dados. Satélites penduram por <code>TpDoc + NDocPre</code>.',
 'tabelas':['Venda','VendaProduto','VendaAmbiente','VendaServico','VendaIndicacao','VendaIndicacaoGrupProd','VendaAtendente','VendaDesconto','Obras','CategoriaVenda'],
 'exige':[('Cliente, e opcionalmente a obra','banco: <code>Obr_codigo</code> na Venda, entidade <code>Obras</code> própria'),
          ('Consultor interno — aceita vários, com percentual e vigência','banco: <code>VendaAtendente</code>'),
          ('Profissional externo (especificador), que recebe comissão','banco: <code>VendaIndicacao</code> + percentual por grupo de produto'),
          ('Ao menos um ambiente — o agrupamento está ligado','param: <code>Par_VendaAmbiente = S</code>'),
          ('Itens com produto, acabamento, tamanho, quantidade, valor e desconto. Quantidade fracionária é normal (perfil por metro)','pdf'),
          ('Categoria da venda — MOSTRAS, DOAÇÃO, VENDA PARA FUNCIONÁRIO e ARQUITETO SEM PGTO <b>não geram financeiro</b>','banco: flag <code>CatVen_Financeiro</code>')],
 'regras':[('Validade da proposta','5 dias','param <code>par_val_orc</code>'),
           ('Desconto por produto ou geral','24.283 × 9.853 registros','banco <code>Ven_TipoDesc</code>'),
           ('Teto de desconto ao cliente','10%','param <code>Par_LimitDescCli</code>'),
           ('Parcelamento','acima de R$100, mínimo R$50, máx 6×','param'),
           ('Preço unitário','líquido de compra × índice do fornecedor','banco: procs de cálculo'),
           ('Filtro padrão da listagem','364 dias','param <code>Par_DiasFiltroOrcamento</code>')],
 'permesp':['Mostrar margem de lucro por venda','Alterar margem de desconto para o cliente','Alterar valor unitário do produto na venda','Atualizar orçamento (repreçar)'],
 'produz':'PDF que vai ao cliente final: cabeçalho da empresa, consultor, arquiteto, validade, bloco do cliente, itens <b>agrupados e numerados por ambiente com soma por ambiente</b>, 12 cláusulas comerciais e linha de assinatura.',
 'depois':'46,1% dos orçamentos viram pedido — taxa estável entre 42% e 50% desde 2014. E 99,8% dos pedidos nascem de um orçamento: pedido avulso praticamente não existe.',
 'defeitos':['Numeração vem de <code>MAX(Ven_CodigoPre)+1</code> realimentando <code>SisSeqTabela</code> — dois operadores simultâneos pegam o mesmo número.',
             '9,8% de tudo está cancelado (<code>Ven_Situacao=C</code>), o que merece atenção no desenho do fluxo.']},

{'id':'pedido','fase':'Venda','nome':'Pedido de venda',
 'resumo':'O orçamento aprovado. Mesmo registro, tipo trocado — é o que autoriza comprar e entregar.',
 'onde':'<code>Venda</code> com <code>Ven_Tipo = P</code>. Todo relatório de venda do sistema filtra <code>Ven_Tipo=\'P\' AND Ven_Situacao=\'A\'</code>: <b>orçamento não conta como venda em nenhuma métrica</b>.',
 'tabelas':['Venda','VendaProduto','VendaAmbiente','VendaServico'],
 'exige':[('Um orçamento existente — 99,8% dos pedidos nascem assim','banco'),
          ('Fechamento grava a data, com ramo próprio por tipo e série','exe: SQL do código')],
 'regras':[('Filtro padrão da listagem','180 dias','param <code>Par_DiasFiltroPedido</code>')],
 'permesp':['Quitar conta pelo módulo de venda','Alterar conta pelo módulo de venda'],
 'produz':'Autorização para o fluxo de compra sob encomenda e para a separação/entrega.',
 'depois':'Gera o pedido de compra, que referencia o pedido de venda. É o começo do fluxo puxado.',
 'defeitos':[]},

{'id':'produto','fase':'Produto e preço','nome':'Cadastro de produto',
 'resumo':'O modelo de dado mais rico do sistema — cinco abas, da identificação ao imposto.',
 'onde':'<code>produtos</code> é o mestre; a variante de venda vive em <code>Preco_Produto</code>, uma linha por acabamento × tamanho.',
 'tabelas':['produtos','ProdutosFornecedores','Preco_Produto','Acabamento','GrupoProduto','Preco_Produto_Log'],
 'exige':[('Três códigos: nosso código, código especial e código reduzido','exe: aba Dados Principais'),
          ('Multi-fornecedor por produto, com o código do produto <i>no</i> fornecedor','banco: <code>ProdutosFornecedores</code>'),
          ('Unidade de entrada diferente da de saída, com fator de conversão','exe'),
          ('Atributos técnicos de iluminação: potência, tensão, temperatura de cor, lúmen, ângulo, garantia, dimensões','exe: aba Outros Dados'),
          ('Variantes por acabamento × tamanho, cada uma com valor de tabela, índice e estoque mínimo','banco'),
          ('Tributação: origem, NCM, CEST, e busca automática de imposto por NCM','exe: aba Tributação')],
 'regras':[('Código especial é único no catálogo','sim','param <code>Par_CodEspecialUnico</code>'),
           ('Produto fictício permitido','sim','param <code>Par_ProdutoFicticio</code> — é o "Pré Produto" do orçamento'),
           ('Histórico de preço','3,1 milhões de linhas','banco <code>Preco_Produto_Log</code>')],
 'permesp':[],
 'produz':'Um produto disponível para orçamento, compra e estoque, em todas as suas variantes.',
 'depois':'A variante é a unidade de tudo o que vem depois: preço, saldo de estoque e item de venda referenciam a combinação produto + acabamento + tamanho.',
 'defeitos':['<code>Preco_Produto_Log</code> tem 3,1 milhões de linhas <b>e nenhuma chave primária</b>.']},

{'id':'preco','fase':'Produto e preço','nome':'Formação de preço',
 'resumo':'Como o preço de venda nasce do custo de compra. É a regra comercial central, e ela é por fornecedor.',
 'onde':'Dois cadastros governam: <code>Custo</code> (perfil de encargos por fornecedor) e <code>Indice_preco</code> (o multiplicador).',
 'tabelas':['Custo','Indice_preco','Preco_Produto'],
 'exige':[('Um perfil de custo do fornecedor: 4 descontos em cascata, IPI, frete, ICMS, embalagem, financeira, Simples, cartão, créditos','banco: <code>Custo</code>, 40 colunas'),
          ('Um índice ligado a esse custo e ao fornecedor','banco: <code>Indice_preco</code>'),
          ('O preço de tabela do fornecedor, por variante','banco: <code>Preco_Produto.Pre_Tabela</code>')],
 'regras':[('Preço de venda','líquido de compra × índice, arredondado a 2 casas','banco: proc de cálculo'),
           ('Momento do imposto','o índice é aplicado ANTES de qualquer imposto de saída; imposto entra só no custo, para apurar lucro','banco'),
           ('Índice','por FORNECEDOR — não por produto nem por categoria','banco'),
           ('Índice praticado','mediana 2,56 · mínimo 1,00 · máximo 6,00','banco: 376 índices'),
           ('Substituição tributária','domina: ST em 317 dos 385 perfis','banco <code>Cus_TributacaoICMS</code>')],
 'permesp':['Mostrar margem de lucro por venda'],
 'produz':'O valor unitário que aparece no orçamento.',
 'depois':'Todo item de venda herda esse preço; alterá-lo na venda é permissão especial.',
 'defeitos':['<b>16 índices estão em 1,0000 e ativos</b> — venda igual ao líquido de compra. Parte é legítima (perfil da própria Vertz, empresa do grupo, pseudo-fornecedores), mas 11 são fornecedores reais. Pergunta comercial em aberto.']},

{'id':'estoque-saldo','fase':'Estoque','nome':'Saldo de estoque',
 'resumo':'Quanto existe de cada variante, em cada depósito, em cada empresa.',
 'onde':'<code>Estoque_produto</code>, com chave primária de <b>cinco colunas</b>: produto, acabamento, tipo de estoque, tamanho e empresa.',
 'tabelas':['Estoque_produto','EstoqueTipo','estoque_produto_dia'],
 'exige':[('O estoque é multi-DEPÓSITO, não só multi-empresa: são 4 locais (PRINCIPAL, CASA HELIO/SILVANIA, PEÇAS USADAS AUTOMAÇÃO, SHOWROOM)','banco: <code>EstoqueTipo</code>')],
 'regras':[('Estoque mínimo','calculado sobre 90 dias de venda, em período de 30','param <code>Par_EstMinVendas</code>, <code>Par_EstMinPerioVend</code>'),
           ('Foto diária do saldo','8,7 milhões de linhas — metade do banco','banco <code>estoque_produto_dia</code>')],
 'permesp':['Alterar quantidade sugerida de produtos para compra'],
 'produz':'A disponibilidade que o orçamento e a compra consultam.',
 'depois':'Alimenta a decisão de comprar: <code>CompraEstoque</code> calcula disponibilidade futura como ordem aberta − reserva − entrada por nota.',
 'defeitos':['O <b>único gatilho do banco</b> (estoque mínimo) lê apenas a primeira linha alterada — quebra em atualização de várias linhas.',
             '<b>O Cabinet precisa de local de estoque como dimensão</b>, não só empresa.']},

{'id':'estoque-mov','fase':'Estoque','nome':'Movimentação de estoque',
 'resumo':'Toda entrada e saída, com origem, quantidade e responsável.',
 'onde':'<code>estoque_log</code> é o razão. As operações são Saída, Entrada, Zerar e Balanço.',
 'tabelas':['estoque_log','Estoque_produto'],
 'exige':[('Origem da movimentação, em texto legível','banco <code>Elg_tipo</code>: PEDIDO DE VENDA 246 mil · NOTA DE ENTRADA 59 mil · ZERAR 56 mil · ESTOQUE MANUAL 16 mil · DEVOLUÇÃO 13 mil · BALANÇO 7,3 mil')],
 'regras':[('Ajuste manual','caiu de 5.650 (2021) para 1 (2026) — o controle melhorou de forma mensurável','banco'),
           ('Balanço formal','apareceu entre 2022 e 2024, com 5.321 em 2024','banco')],
 'permesp':[],
 'produz':'O histórico que explica o saldo.',
 'depois':'É a fonte para conferir divergência de inventário.',
 'defeitos':['<b>O saldo é escrito por valor absoluto</b> (<code>set Epr_estoque = :valor</code>), calculado na aplicação, com o log gravado à parte. Duas baixas simultâneas perdem uma, e log e saldo divergem em silêncio. O ADR-009 do Cabinet (kardex com saldo vindo do banco) existe exatamente para isso.']},

{'id':'pedido-compra','fase':'Compra','nome':'Pedido de compra',
 'resumo':'O que precisa ser comprado para atender um pedido de venda. É venda sob encomenda — fluxo puxado.',
 'onde':'<code>pedido_compra</code> e seu detalhe, <b>vinculados ao pedido de venda</b>.',
 'tabelas':['pedido_compra','Pedido_compra_det'],
 'exige':[('O pedido de venda que originou a necessidade','banco'),
          ('Fornecedor, e itens com acabamento, tamanho e destino','exe')],
 'regras':[('Filtro padrão da listagem','180 dias','param')],
 'permesp':['Estoque e compra pela requisição de produtos'],
 'produz':'A necessidade de compra, ainda não enviada ao fornecedor.',
 'depois':'Vários pedidos de compra são agrupados numa ordem de compra por fornecedor.',
 'defeitos':['Cuidado ao migrar: <code>Pedido_compra_det</code> tem 34.863 linhas e está <b>vivo</b>, apesar de o nome casar com o padrão das tabelas mortas do modelo antigo.']},

{'id':'ordem-compra','fase':'Compra','nome':'Ordem de compra',
 'resumo':'O documento que vai ao fornecedor, agrupando o que foi pedido.',
 'onde':'<code>ordem_compra</code> e seu detalhe.',
 'tabelas':['ordem_compra','ordem_compra_det'],
 'exige':[('Fornecedor e <b>empresa compradora</b> — decide se a compra sai pela Vertz ou pela Via HF','exe + banco'),
          ('Datas de ordem, envio e previsão, com reagendamento','exe'),
          ('Faturamento mínimo do fornecedor','exe'),
          ('Transportadora','exe')],
 'regras':[('Mistura reposição e encomenda','a tela tem "Produtos Estoque" e "Produtos Pedidos"','exe')],
 'permesp':[],
 'produz':'O pedido formal ao fornecedor.',
 'depois':'A chegada da mercadoria entra pela nota do fornecedor.',
 'defeitos':[]},

{'id':'nota-entrada','fase':'Compra','nome':'Nota do fornecedor',
 'resumo':'A entrada da mercadoria: dá saldo ao estoque e cria a obrigação financeira.',
 'onde':'<code>Nota_entrada</code> e seu detalhe.',
 'tabelas':['Nota_entrada','nota_entrada_det'],
 'exige':[('A nota fiscal do fornecedor e seus itens','banco'),
          ('Vínculo com a ordem de compra','exe')],
 'regras':[('Filtro padrão da listagem','180 dias','param')],
 'permesp':['Não criar conta financeira pela entrada da nota do fornecedor','Poder escolher se cria lançamento financeiro'],
 'produz':'Entrada em <code>estoque_log</code> (59 mil movimentações do tipo NOTA DE ENTRADA) e, por padrão, a conta a pagar.',
 'depois':'Com a mercadoria em casa, o pedido de venda pode ser separado e entregue.',
 'defeitos':[]},

{'id':'cliente','fase':'Cadastro','nome':'Cliente',
 'resumo':'Pessoa física ou jurídica que compra — e, no negócio da Vertz, quase sempre vem por um profissional.',
 'onde':'<code>Clientes</code>.',
 'tabelas':['Clientes','Obras','Indicacoes'],
 'exige':[('PF ou PJ, com abas Principal, Pessoais, Cobrança/Comercial, <b>Obra</b>, Contato e Financeiro/Tributário','exe'),
          ('Vínculo com o profissional externo que indicou, mais categoria','exe + banco')],
 'regras':[('Cadastro em caixa alta','sim','param <code>Par_CadClienteCaixaAlta</code>'),
           ('Limite de crédito por venda e total','R$ 300.000','param')],
 'permesp':['Limites de compra (cadastro do cliente)'],
 'produz':'O cadastro que o orçamento consome.',
 'depois':'A obra do cliente vira dimensão do orçamento.',
 'defeitos':[]},

{'id':'fornecedor','fase':'Cadastro','nome':'Fornecedor',
 'resumo':'Quem fabrica ou distribui — e quem determina a política de preço, já que o índice é por fornecedor.',
 'onde':'<code>fornecedor</code>.',
 'tabelas':['fornecedor','Custo','Indice_preco','ProdutosFornecedores'],
 'exige':[('Razão social, CNPJ, IE, prazos de entrega e pagamento','exe'),
          ('<b>Empresa compradora</b> — decide por qual CNPJ do grupo a compra sai','exe'),
          ('Abas de contatos, dados bancários, faturamento, comissão/premiação e participação','exe')],
 'regras':[('Multi-empresa','é operado em COMPRA, não em vendas: 99,91% dos documentos de venda estão na empresa 1','banco')],
 'permesp':[],
 'produz':'O fornecedor que sustenta produto, custo e índice.',
 'depois':'Sem perfil de custo e índice, o produto dele não tem preço de venda.',
 'defeitos':[]},

{'id':'profissional','fase':'Cadastro','nome':'Profissional externo',
 'resumo':'Arquiteto, designer ou especificador. É a entidade central do negócio: traz o cliente e recebe por isso.',
 'onde':'<code>Indicacoes</code>.',
 'tabelas':['Indicacoes','VendaIndicacao','VendaIndicacaoGrupProd'],
 'exige':[('PF ou PJ, com registro CREA/CAU/CFT','exe'),
          ('<b>Dados bancários</b> — recebe comissão e participação','exe')],
 'regras':[('Percentual por grupo de produto dentro da indicação','232 mil linhas','banco <code>VendaIndicacaoGrupProd</code>'),
           ('Reserva Técnica','conceito de primeira classe, com percentual por grupo de produto','banco')],
 'permesp':[],
 'produz':'O vínculo que gera comissão sobre a venda.',
 'depois':'Alimenta o controle de crédito do profissional, no financeiro.',
 'defeitos':['O parâmetro <code>Par_RTautomatico</code> está ligado, mas a coluna correspondente na venda está vazia em toda a tabela. Contradição não resolvida — decidir antes de modelar Reserva Técnica.']},
]

FASES = ['Cadastro', 'Produto e preço', 'Venda', 'Compra', 'Estoque']

# quem se liga a quem no FLUXO — vira link entre fichas
VER = {
 'orcamento':      [('pedido', 'o passo seguinte, quando aprovado'), ('preco', 'de onde vem o valor unitário'),
                    ('cliente', 'quem compra'), ('profissional', 'quem indica e recebe comissão'),
                    ('produto', 'o que é orçado')],
 'pedido':         [('orcamento', 'de onde ele nasce, em 99,8% dos casos'), ('pedido-compra', 'o que ele dispara'),
                    ('estoque-mov', 'a baixa que ele gera')],
 'produto':        [('preco', 'sem índice e custo, não tem preço de venda'), ('fornecedor', 'quem fornece'),
                    ('estoque-saldo', 'onde o saldo da variante é contado')],
 'preco':          [('fornecedor', 'o índice é POR fornecedor'), ('produto', 'a variante que recebe o preço'),
                    ('orcamento', 'onde o preço é usado')],
 'estoque-saldo':  [('estoque-mov', 'o histórico que explica o saldo'), ('nota-entrada', 'principal entrada'),
                    ('pedido', 'principal saída')],
 'estoque-mov':    [('estoque-saldo', 'o saldo que ela altera'), ('nota-entrada', 'origem NOTA DE ENTRADA')],
 'pedido-compra':  [('pedido', 'a origem da necessidade'), ('ordem-compra', 'o agrupamento por fornecedor')],
 'ordem-compra':   [('pedido-compra', 'o que ela agrupa'), ('nota-entrada', 'a chegada da mercadoria'),
                    ('fornecedor', 'para quem vai')],
 'nota-entrada':   [('ordem-compra', 'o que foi pedido'), ('estoque-mov', 'a entrada que ela gera')],
 'cliente':        [('orcamento', 'o documento que ele origina'), ('profissional', 'quem costuma indicá-lo')],
 'fornecedor':     [('preco', 'define o índice'), ('produto', 'fornece o item'), ('ordem-compra', 'recebe a ordem')],
 'profissional':   [('orcamento', 'onde a indicação é registrada'), ('cliente', 'quem ele traz')],
}

CSS = """
:root{--creme:#FAF6EE;--papel:#FFFDF8;--tinta:#1C1A17;--tinta2:#5A544B;--tinta3:#8B8377;
--linha:#E2DACB;--ok:#2E7D32;--alerta:#C2410C;--sel:#0091FF}
*{box-sizing:border-box}
body{margin:0;background:var(--creme);color:var(--tinta);
font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{padding:20px 28px 14px;background:var(--papel);border-bottom:1px solid var(--linha)}
h1{margin:0 0 3px;font-size:20px;letter-spacing:-.01em}
.sub{color:var(--tinta2);font-size:13px;max-width:88ch}
main{display:flex;align-items:flex-start;height:calc(100vh - 96px)}
.painel{flex:1;display:flex;align-items:flex-start;overflow:auto;height:100%}
.diag{flex:none;width:640px;position:sticky;top:0;padding:18px 20px 0 0}
.diag svg{width:100%;height:auto;background:var(--papel);border:1px solid var(--linha);border-radius:8px}
.diag .cap{color:var(--tinta3);font-size:12px;margin:8px 2px 0}
@media(max-width:1400px){.diag{width:480px}}
@media(max-width:1150px){.painel{flex-direction:column}.diag{position:static;width:100%;padding:0 24px}}
a.tb{text-decoration:none;font-size:12px;padding:3px 9px;border-radius:5px;background:var(--creme);
border:1px solid var(--linha);color:var(--tinta2);cursor:pointer}
a.tb:hover{border-color:var(--sel);color:var(--sel)}
a.tb b{color:var(--tinta);font-weight:600}
a.op{color:var(--sel);cursor:pointer;text-decoration:none;border-bottom:1px solid transparent}
a.op:hover{border-bottom-color:var(--sel)}
.dica{text-transform:none;letter-spacing:0;font-weight:400;color:var(--tinta3)}
nav{width:250px;flex:none;border-right:1px solid var(--linha);background:var(--papel);
overflow:auto;height:100%;padding:10px 0}
nav .fase{padding:12px 16px 4px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;
color:var(--tinta3);font-weight:600}
nav a{display:block;padding:6px 16px;cursor:pointer;font-size:14px;color:var(--tinta);
text-decoration:none;border-left:3px solid transparent}
nav a:hover{background:var(--creme)}
nav a.on{background:var(--creme);border-left-color:var(--sel);font-weight:600}
section{flex:none;width:620px;padding:22px 26px 70px}
h2{margin:0 0 4px;font-size:24px;letter-spacing:-.015em}
.resumo{color:var(--tinta2);font-size:16px;margin-bottom:18px}
.bloco{background:var(--papel);border:1px solid var(--linha);border-radius:8px;
padding:14px 18px;margin-bottom:16px}
.bloco h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.07em;
color:var(--tinta3);font-weight:600}
code{background:var(--creme);padding:1px 5px;border-radius:4px;font-size:12.5px;
font-family:ui-monospace,monospace}
ul{margin:0;padding-left:18px}li{margin-bottom:6px}
.fonte{color:var(--tinta3);font-size:12px}
table{width:100%;border-collapse:collapse;font-size:14px}
td{padding:6px 10px 6px 0;border-bottom:1px solid var(--creme);vertical-align:top}
td:first-child{font-weight:600;width:34%}
td:last-child{color:var(--tinta3);font-size:12px;width:26%}
.tabs{display:flex;flex-wrap:wrap;gap:6px}
.tabs span{font-size:12px;padding:3px 9px;border-radius:5px;background:var(--creme);
border:1px solid var(--linha);color:var(--tinta2)}
.tabs b{color:var(--tinta);font-weight:600}
.def{border-left:3px solid var(--alerta)}
.def h3{color:var(--alerta)}
footer{padding:12px 28px;border-top:1px solid var(--linha);color:var(--tinta3);font-size:12px;
background:var(--papel)}
"""

def esc(s):
    return s

def ficha(o):
    h = ['<h2>%s</h2><div class="resumo">%s</div>' % (o['nome'], o['resumo'])]
    h.append('<div class="bloco"><h3>Onde vive o dado</h3><p style="margin:0">%s</p></div>' % o['onde'])
    if o['tabelas']:
        tags = ''.join('<a class="tb" href="softlux-er.html#%s" target="_blank"><b>%s</b> %s</a>'
                       % (t, t, vol(t)) for t in o['tabelas'])
        h.append('<div class="bloco"><h3>Tabelas envolvidas <span class="dica">— clique abre no '
                 'explorador do schema</span></h3><div class="tabs">%s</div></div>' % tags)
    if o['exige']:
        li = ''.join('<li>%s<br><span class="fonte">%s</span></li>' % (a, b) for a, b in o['exige'])
        h.append('<div class="bloco"><h3>O que a operação exige</h3><ul>%s</ul></div>' % li)
    if o['regras']:
        tr = ''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in o['regras'])
        h.append('<div class="bloco"><h3>Regras e limites</h3><table>%s</table></div>' % tr)
    if o['permesp']:
        li = ''.join('<li>%s</li>' % x for x in o['permesp'])
        h.append('<div class="bloco"><h3>Exige permissão especial</h3><ul>%s</ul>'
                 '<p class="fonte" style="margin:8px 0 0">Do cadastro de permissões especiais do legado — '
                 'são as exceções que o ADR-014 previu como approval flow.</p></div>' % li)
    h.append('<div class="bloco"><h3>O que produz</h3><p style="margin:0">%s</p></div>' % o['produz'])
    h.append('<div class="bloco"><h3>O que vem depois</h3><p style="margin:0">%s</p></div>' % o['depois'])
    if o['defeitos']:
        li = ''.join('<li>%s</li>' % x for x in o['defeitos'])
        h.append('<div class="bloco def"><h3>Não repetir no Cabinet</h3><ul>%s</ul></div>' % li)
    nomes = {x['id']: x['nome'] for x in OPS}
    if VER.get(o['id']):
        li = ''.join('<li><a class="op" onclick="abre(\'%s\')">%s</a> <span class="fonte">— %s</span></li>'
                     % (i, nomes.get(i, i), por) for i, por in VER[o['id']] if i in nomes)
        h.append('<div class="bloco"><h3>Ligado a</h3><ul>%s</ul></div>' % li)
    h.append('<div class="bloco"><h3>Ir mais fundo</h3><ul>'
             '<li><a class="op" href="softlux-er.html#%s" target="_blank">Abrir <b>%s</b> no explorador do schema</a>'
             ' — colunas, chaves e quem se liga a ela</li>'
             '<li><a class="op" href="dbml/softlux-nucleo.dbml" target="_blank">DBML do núcleo</a>'
             ' — para importar num editor de diagrama</li>'
             '<li><a class="op" href="exe/sql-do-codigo.sql" target="_blank">SQL do código Delphi</a>'
             ' — as consultas e gravações reais do legado</li>'
             '</ul></div>' % (o['tabelas'][0] if o['tabelas'] else '', o['tabelas'][0] if o['tabelas'] else ''))
    return '\n'.join(h)

nav = []
for f in FASES:
    nav.append('<div class="fase">%s</div>' % f)
    for o in OPS:
        if o['fase'] == f:
            nav.append('<a id="n-%s" onclick="abre(\'%s\')">%s</a>' % (o['id'], o['id'], o['nome']))

fichas = {o['id']: ficha(o) for o in OPS}
diagramas = {o['id']: diagrama(o) for o in OPS}

HTML = """<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Softlux — fichas de operação</title>
<style>%s</style></head><body>
<header>
<h1>Softlux — fichas de operação</h1>
<div class="sub">O que cada operação do sistema atual <b>exige</b>, que regras a governam, o que produz
e o que dispara depois. Não é documentação da tela do Delphi e não é modelo a copiar: é levantamento
de requisito para o Cabinet. Cada afirmação traz a procedência — banco, parâmetro, permissão,
binário ou impresso real. Onde não há fonte, o campo não aparece.</div>
</header>
<main>
<nav>%s</nav>
<div class="painel">
<section id="ficha"></section>
<div class="diag"><div id="svg"></div>
<div class="cap">Caixa clicável abre a tabela no explorador do schema. Linha tracejada = ligação
inferida por nós, não declarada pelo banco. Passe o mouse para ver a coluna que liga.</div></div>
</div>
</main>
<footer>%d operações · fases: %s</footer>
<script>
const F=%s, D=%s;
function abre(id){
  if(!F[id]) return;
  document.getElementById('ficha').innerHTML=F[id];
  document.getElementById('svg').innerHTML=D[id]||'';
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.id==='n-'+id));
  document.querySelector('.painel').scrollTop=0;
  location.hash=id;
}
const ini=decodeURIComponent(location.hash.slice(1));
abre(F[ini]?ini:'%s');
</script></body></html>""" % (CSS, '\n'.join(nav), len(OPS), ' · '.join(FASES),
                              json.dumps(fichas, ensure_ascii=False),
                              json.dumps(diagramas, ensure_ascii=False), OPS[0]['id'])

p = os.path.join(BASE, 'operacoes.html')
open(p, 'w', encoding='utf-8').write(HTML)
print('operacoes.html | %d fichas · %d KB' % (len(OPS), os.path.getsize(p) / 1024))
