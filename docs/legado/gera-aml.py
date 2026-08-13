#!/usr/bin/env python3
"""Gera AML (Azimutt Markup Language) do banco do Softlux.

Sai em ./aml/:
  softlux.aml         todas as tabelas COM dado, seccionadas por domínio, com tags
  softlux-nucleo.aml  caminho principal do negócio, legível num diagrama

Organização pensada para o Azimutt:
  - cada tabela leva {tags: [<domínio>]} — no Azimutt dá para buscar/filtrar por tag
    e montar um layout por domínio dentro de UM projeto, em vez de N arquivos;
  - doc da tabela = volume de linhas (+ aviso de SEM chave primária);
  - relações standalone no fim de cada seção: declaradas primeiro, depois as
    INFERIDAS com `# inferida (nome|sinonimo)` — hipótese, conferir antes de usar.

Mesma lógica de inferência do gera-dbml.py/gera-er.py, incluindo os sinônimos de
prefixo (Pro_codnosso = Epr_Codnosso = Pre_Codnosso) e os satélites da Venda por
TpDoc+NDocPre. AML default é NOT NULL, então `nullable` sai explícito.
"""
import os, csv, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
def _acha(*cands):
    for c in cands:
        if os.path.exists(c):
            return c
    raise SystemExit('pasta não encontrada: %r' % (cands,))
SCH = _acha(os.path.join(HERE, 'schema'), os.path.join(HERE, '..', 'softlux-schema'))
OUT = os.path.join(HERE, 'aml')
os.makedirs(OUT, exist_ok=True)

def rd(n, d=','):
    with open(os.path.join(SCH, n), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f, delimiter=d))

cols = rd('bdprincipal-colunas.csv')
fks = rd('bdprincipal-fks.csv')
lin = rd('bdprincipal-linhas.csv')
idx = rd('bdprincipal-indices.csv')

SISTEMA = {'dtproperties'}
linhas = {r['tabela']: int(r['linhas']) for r in lin}

tcols = collections.OrderedDict()
for r in cols:
    if r['tabela'] in SISTEMA:
        continue
    tcols.setdefault(r['tabela'], []).append(r)
for t in tcols:
    tcols[t].sort(key=lambda r: int(r['ordem']))

pk = collections.defaultdict(list)
uni = collections.defaultdict(set)
for r in idx:
    if r['is_included_column'] == 'True' or r['tabela'] in SISTEMA:
        continue
    if r['is_primary_key'] == 'True':
        pk[r['tabela']].append((int(r['key_ordinal']), r['coluna']))
    elif r['is_unique'] == 'True':
        uni[r['tabela']].add(r['coluna'])
pk = {t: [c for _, c in sorted(v)] for t, v in pk.items()}

# ---------- relações declaradas ----------
declaradas = set()
rel_reais = []
for r in fks:
    o, d = r['tabela_origem'], r['tabela_destino']
    if o in SISTEMA or d in SISTEMA:
        continue
    declaradas.add((o, r['coluna_origem'], d, r['coluna_destino']))
    # FK de coluna para ela mesma (Contas_BancariasCobranca) é lixo do banco
    if (o.lower(), r['coluna_origem'].lower()) == (d.lower(), r['coluna_destino'].lower()):
        continue
    rel_reais.append((o, r['coluna_origem'], d, r['coluna_destino']))

# ---------- inferência por convenção de nome ----------
tipo_base = {}
for t, cs in tcols.items():
    for c in cs:
        tipo_base[(t, c['coluna'].lower())] = c['tipo']

dono = {}
for t, k in pk.items():
    if len(k) == 1:
        dono.setdefault(k[0].lower(), []).append((t, k[0]))
dono = {c: ts[0] for c, ts in dono.items() if len(ts) == 1}

ocorre = collections.Counter()
for t, cs in tcols.items():
    for c in cs:
        ocorre[c['coluna'].lower()] += 1

RUIDO = {'emp_codigo', 'usr_codigo', 'usr_cod_alteracao', 'usr_cod_inclusao',
         'id', 'codigo', 'cod', 'nome', 'descricao', 'situacao'}
LIMITE_RUIDO = 60

SINONIMOS = {
    'epr_codnosso':   ('produtos', 'Pro_codnosso'),
    'pre_codnosso':   ('produtos', 'Pro_codnosso'),
    'epr_acabamento': ('Acabamento', 'CodAcabamento'),
    'pre_acabamento': ('Acabamento', 'CodAcabamento'),
    'pre_fornecedor': ('fornecedor', 'For_codigo'),
    # satélites da Venda penduram por TpDoc+NDocPre; NDocPre = Ven_CodigoPre
    'venamb_ndocpre':  ('Venda', 'Ven_CodigoPre'),
    'venind_ndocpre':  ('Venda', 'Ven_CodigoPre'),
    'venaten_ndocpre': ('Venda', 'Ven_CodigoPre'),
}

decl_ci = {(a.lower(), b.lower(), c.lower(), d.lower()) for a, b, c, d in declaradas}
rel_inferidas = []
vistas = set(decl_ci)

def add(t, col, alvo, alvo_col, marca):
    k = (t.lower(), col.lower(), alvo.lower(), alvo_col.lower())
    if k in vistas or t == alvo:
        return
    vistas.add(k)
    rel_inferidas.append((t, col, alvo, alvo_col, marca))

for t, cs in tcols.items():
    for c in cs:
        cl = c['coluna'].lower()
        if cl in SINONIMOS:
            alvo, alvo_col = SINONIMOS[cl]
            if alvo in tcols:
                add(t, c['coluna'], alvo, alvo_col, 'sinonimo')
            continue
        achado = dono.get(cl)
        if not achado:
            continue
        alvo, alvo_col = achado
        if alvo == t:
            continue
        if cl in RUIDO or ocorre[cl] > LIMITE_RUIDO:
            continue
        if tipo_base.get((t, cl)) != tipo_base.get((alvo, cl)):
            continue
        if len(pk.get(t, [])) == 1 and pk[t][0].lower() == cl:
            continue
        add(t, c['coluna'], alvo, alvo_col, 'nome')

# ---------- domínios (primeiro regex que casa ganha) ----------
DOMINIOS = [
    ('cadastro',   r'(?i)^(clientes|fornecedor$|funcionario|indicacoes$|profiss|transportadora|vendedor|cidade|atendente$)'),
    ('produto',    r'(?i)^(produto|preco_produto|custo|indice_preco|acabamento|tamanho|grupoproduto|tributacao|ncm)'),
    ('venda',      r'^(Venda|Orcamento|Pasta|Ambiente|Obras|CategoriaVenda|Promocao|Meta|Reserva_tecnica|Indicacao)'),
    ('compra',     r'(?i)^(pedido_compra|ordem_compra|nota_entrada|compraestoque|cotacao)'),
    ('estoque',    r'(?i)^(estoque|balanco|giroestoque|transferencia|requisicao|inventario)'),
    ('financeiro', r'(?i)^(contas_|cheque|banco|plano_contas|credito|fechamentocontas|duplicata|boleto|caixa|factoring|rateio)'),
    ('fiscal',     r'(?i)^(notafiscal|nfse|mdfe|tabelaimposto|cfop|issqn|ecf|tipo(csosn|cofins|ipi|pis|origem|tributada))'),
    ('sistema',    r'^Sis'),
]
DOM_RX = [(n, re.compile(p)) for n, p in DOMINIOS]
ORDEM_DOM = [n for n, _ in DOMINIOS] + ['outros']

def dominio(t):
    for n, rx in DOM_RX:
        if rx.match(t):
            return n
    return 'outros'

NUCLEO = [
    'Clientes', 'fornecedor', 'Indicacoes', 'Funcionario',
    'produtos', 'ProdutosFornecedores', 'Preco_Produto', 'Custo', 'Indice_preco',
    'Acabamento', 'GrupoProduto',
    'Venda', 'VendaProduto', 'VendaAmbiente', 'VendaServico', 'VendaIndicacao',
    'VendaAtendente', 'VendaDesconto', 'Ambiente', 'Obras', 'CategoriaVenda',
    'pedido_compra', 'Pedido_compra_det', 'ordem_compra', 'ordem_compra_det',
    'Nota_entrada', 'nota_entrada_det',
    'Estoque_produto', 'estoque_log', 'EstoqueTipo',
]

ID_SIMPLES = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')

def q(nome):
    """Identificador com acento (Profissão) precisa de aspas no AML."""
    return nome if ID_SIMPLES.match(nome) else '"%s"' % nome

def tipo_aml(c):
    t, n = c['tipo'], c['max_length']
    if t in ('nvarchar', 'varchar', 'char', 'nchar'):
        if n in ('-1', '', None):
            return t + '(max)'
        tam = int(n) // 2 if t.startswith('n') else int(n)
        return '%s(%s)' % (t, tam)
    if t in ('decimal', 'numeric'):
        return '"%s(%s,%s)"' % (t, c['precision'], c['scale'])   # vírgula pede aspas
    return t

def fmt_n(n):
    return format(n, ',d').replace(',', '.')

def entidade(t):
    n = linhas.get(t, 0)
    chave = pk.get(t, [])
    doc = '%s linhas' % fmt_n(n) if n else 'VAZIA'
    if not chave:
        doc += ' · SEM chave primária'
    L = ['%s {tags: [%s]} | %s' % (q(t), dominio(t), doc)]
    for c in tcols[t]:
        partes = ['  %s %s' % (q(c['coluna']), tipo_aml(c))]
        if c['coluna'] in chave:
            partes.append('pk')
        if c['coluna'] in uni.get(t, ()):
            partes.append('unique')
        if c['is_nullable'] == 'True':
            partes.append('nullable')
        if c['is_identity'] == 'True':
            partes.append('{autoIncrement}')
        L.append(' '.join(partes))
    return L

def escreve(nome, tabelas, titulo, nota):
    tabelas = [t for t in tabelas if t in tcols]
    ativos = set(tabelas)
    por_dom = collections.OrderedDict((d, []) for d in ORDEM_DOM)
    for t in tabelas:
        por_dom[dominio(t)].append(t)

    L = ['# %s' % titulo,
         '# Gerado por gera-aml.py a partir dos CSVs do catálogo. Não editar à mão: regerar.',
         '# %s' % nota,
         '# Relações `# inferida (...)` NÃO são declaradas no banco: hipótese por convenção',
         '# de nome (mesma coluna+tipo, PK simples no destino) ou sinônimo de prefixo do',
         '# legado. Conferir contra exe/sql-do-codigo.sql antes de tratar como verdade.',
         '']
    n_decl = n_inf = 0
    vistos = set()
    for dom in ORDEM_DOM:
        ts = por_dom[dom]
        if not ts:
            continue
        L += ['#', '# ---------- %s (%d tabelas) ----------' % (dom.upper(), len(ts)), '#', '']
        for t in ts:
            L += entidade(t)
            L.append('')
        rels = []
        for o, co, d, cd in rel_reais:
            k = (o.lower(), co.lower(), d.lower(), cd.lower())
            if o in ativos and d in ativos and dominio(o) == dom and k not in vistos:
                vistos.add(k)
                rels.append('rel %s(%s) -> %s(%s)' % (q(o), q(co), q(d), q(cd)))
                n_decl += 1
        for o, co, d, cd, marca in rel_inferidas:
            k = (o.lower(), co.lower(), d.lower(), cd.lower())
            if o in ativos and d in ativos and dominio(o) == dom and k not in vistos:
                vistos.add(k)
                rels.append('rel %s(%s) -> %s(%s) # inferida (%s)' % (q(o), q(co), q(d), q(cd), marca))
                n_inf += 1
        if rels:
            L += ['# relações de %s' % dom] + rels + ['']
    p = os.path.join(OUT, nome)
    open(p, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('%-22s %3d tabelas · %3d rel declaradas · %3d inferidas · %d KB'
          % (nome, len(tabelas), n_decl, n_inf, os.path.getsize(p) / 1024))

com_dado = [t for t in tcols if linhas.get(t, 0) > 0]
escreve('softlux.aml', com_dado,
        'Softlux — todas as tabelas com dado, por domínio',
        'Apenas tabelas com pelo menos 1 linha (as 147 vazias ficaram de fora). '
        'Tags = domínio: no Azimutt, busque por tag e monte um layout por domínio.')
escreve('softlux-nucleo.aml', NUCLEO,
        'Softlux — núcleo do negócio (30 tabelas)',
        'Recorte do caminho principal: cadastro → produto/preço → venda → compra → estoque.')
