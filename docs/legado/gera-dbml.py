#!/usr/bin/env python3
"""Gera DBML do banco do Softlux para importar no ChartDB / dbdiagram.

Sai em docs/legado/dbml/:
  softlux-completo.dbml  todas as tabelas COM dado
  softlux-nucleo.dbml    caminho principal do negócio, legível num diagrama

O legado declara só 208 FKs para 359 tabelas — desenhar apenas as declaradas
produziria um grafo vazio e mentiroso. Este script INFERE relações por
convenção de nome e marca cada uma como inferida no comentário.
"""
import os, csv, re, collections, sys

BASE = os.path.expanduser('~/projetos/cabinet-erp-web/docs/legado')
SCH = os.path.join(BASE, 'schema')
OUT = os.path.join(BASE, 'dbml')
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
    # O legado tem FK de uma coluna para ELA MESMA
    # (Contas_BancariasCobranca.CbaCob_codigo → Contas_BancariasCobranca.CbaCob_codigo).
    # É lixo do banco, e o DBML recusa com "Two endpoints are the same".
    if (o.lower(), r['coluna_origem'].lower()) == (d.lower(), r['coluna_destino'].lower()):
        continue
    rel_reais.append((o, r['coluna_origem'], d, r['coluna_destino']))

# ---------- inferência por convenção de nome ----------
# alvo: coluna que é PK SIMPLES de alguma tabela; toda outra tabela que tenha
# coluna de mesmo nome e mesmo tipo base é candidata a apontar para ela.
tipo_base = {}
for t, cs in tcols.items():
    for c in cs:
        tipo_base[(t, c['coluna'].lower())] = c['tipo']

# coluna(lower) -> (tabela, nome REAL da coluna no destino).
# Guardar o nome real importa: DBML é case-sensitive, e o legado escreve a mesma
# coluna como For_codigo numa tabela e for_codigo em outra.
dono = {}
for t, k in pk.items():
    if len(k) == 1:
        dono.setdefault(k[0].lower(), []).append((t, k[0]))
dono = {c: ts[0] for c, ts in dono.items() if len(ts) == 1}   # ambíguo fica de fora

ocorre = collections.Counter()
for t, cs in tcols.items():
    for c in cs:
        ocorre[c['coluna'].lower()] += 1

# colunas que aparecem em quase toda tabela não são relação útil: são escopo.
# Emp_codigo é o tenant do legado (212 tabelas) — vira ruído visual, não informação.
# 'id' e 'codigo' sao genericos demais: casam SisBackup.ID com SisUsuarios.ID e
# produzem relacao que nao existe. Escopo (Emp_codigo, usuario de auditoria) tambem
# nao e relacao util no diagrama - aparece em toda tabela e vira teia.
RUIDO = {'emp_codigo', 'usr_codigo', 'usr_cod_alteracao', 'usr_cod_inclusao',
         'id', 'codigo', 'cod', 'nome', 'descricao', 'situacao'}
LIMITE_RUIDO = 60

# O legado troca o prefixo da MESMA coisa conforme a tabela: o código do produto é
# Pro_codnosso em produtos, Epr_Codnosso em Estoque_produto e Pre_Codnosso em
# Preco_Produto. Inferência por nome puro perde justamente as relações centrais de
# estoque e preço, então estes sinônimos são declarados à mão.
SINONIMOS = {
    'epr_codnosso':   ('produtos', 'Pro_codnosso'),
    'pre_codnosso':   ('produtos', 'Pro_codnosso'),
    'epr_acabamento': ('Acabamento', 'CodAcabamento'),
    'pre_acabamento': ('Acabamento', 'CodAcabamento'),
    'pre_fornecedor': ('fornecedor', 'For_codigo'),
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
            continue                      # tipo divergente: suspeito, não desenha
        if len(pk.get(t, [])) == 1 and pk[t][0].lower() == cl:
            continue                      # é a própria PK da tabela
        add(t, c['coluna'], alvo, alvo_col, 'nome')

# ---------- núcleo do negócio ----------
NUCLEO = [
    # cadastro
    'Clientes', 'fornecedor', 'Indicacoes', 'Funcionario',
    # produto e preco
    'produtos', 'ProdutosFornecedores', 'Preco_Produto', 'Custo', 'Indice_preco',
    'Acabamento', 'GrupoProduto',
    # venda (orcamento e pedido sao a MESMA Venda, discriminada por Ven_Tipo)
    'Venda', 'VendaProduto', 'VendaAmbiente', 'VendaServico', 'VendaIndicacao',
    'VendaAtendente', 'VendaDesconto', 'Ambiente', 'Obras', 'CategoriaVenda',
    # compra sob encomenda
    'pedido_compra', 'Pedido_compra_det', 'ordem_compra', 'ordem_compra_det',
    'Nota_entrada', 'nota_entrada_det',
    # estoque
    'Estoque_produto', 'estoque_log', 'EstoqueTipo',
]

ID_SIMPLES = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')

def q(nome):
    """DBML quebra em nome com acento fora de aspas — a tabela `Profissão` derruba
    o import inteiro com 'Unexpected token'. Cita só o que precisa."""
    return nome if ID_SIMPLES.match(nome) else '"%s"' % nome

def tipo_dbml(c):
    t, n = c['tipo'], c['max_length']
    if t in ('nvarchar', 'varchar', 'char', 'nchar'):
        if n in ('-1', '', None):
            return t + '(max)'
        tam = int(n) // 2 if t.startswith('n') else int(n)
        return '%s(%s)' % (t, tam)
    if t in ('decimal', 'numeric'):
        return '%s(%s,%s)' % (t, c['precision'], c['scale'])
    return t

def escreve(nome, tabelas, titulo, nota):
    tabelas = [t for t in tabelas if t in tcols]
    ativos = set(tabelas)
    L = ['// %s' % titulo,
         '// Gerado por docs/legado/gera-dbml.py a partir de docs/legado/schema/*.csv.',
         '// %s' % nota,
         '// Importar em ChartDB: Import > DBML. Não editar à mão: regerar.',
         '']
    for t in tabelas:
        n = linhas.get(t, 0)
        L.append('Table %s {' % q(t))
        chave = pk.get(t, [])
        for c in tcols[t]:
            attrs = []
            if len(chave) == 1 and c['coluna'] == chave[0]:
                attrs.append('pk')
            if c['is_identity'] == 'True':
                attrs.append('increment')
            if c['is_nullable'] == 'False':
                attrs.append('not null')
            if c['coluna'] in uni.get(t, ()):
                attrs.append('unique')
            linha = '  %s %s' % (q(c['coluna']), tipo_dbml(c))
            if attrs:
                linha += ' [%s]' % ', '.join(attrs)
            L.append(linha)
        if len(chave) > 1:
            L.append('  indexes {')
            L.append('    (%s) [pk]' % ', '.join(q(x) for x in chave))
            L.append('  }')
        obs = '%s linhas' % format(n, ',d').replace(',', '.') if n else 'VAZIA'
        if not chave:
            obs += ' - SEM chave primaria'
        L.append("  Note: '%s'" % obs)
        L.append('}')
        L.append('')

    L.append('// ---------- relacoes DECLARADAS no banco ----------')
    vistos = set()
    for o, co, d, cd in rel_reais:
        k = (o.lower(), co.lower(), d.lower(), cd.lower())
        if o in ativos and d in ativos and k not in vistos:
            vistos.add(k)
            L.append('Ref: %s.%s > %s.%s' % (q(o), q(co), q(d), q(cd)))
    L.append('')
    L.append('// ---------- relacoes INFERIDAS, nao declaradas pelo legado ----------')
    L.append('// nome: mesma coluna, mesmo tipo, e a coluna e PK simples do destino.')
    L.append('// sinonimo: prefixo diferente para a MESMA coisa (Pro_codnosso = Epr_Codnosso).')
    L.append('// CONFERIR antes de tratar como verdade.')
    for o, co, d, cd, marca in rel_inferidas:
        k = (o.lower(), co.lower(), d.lower(), cd.lower())
        if o in ativos and d in ativos and k not in vistos:
            vistos.add(k)
            L.append('Ref: %s.%s > %s.%s // inferida (%s)' % (q(o), q(co), q(d), q(cd), marca))
    p = os.path.join(OUT, nome)
    open(p, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    reais = len({(o.lower(), co.lower(), d.lower(), cd.lower())
                 for o, co, d, cd in rel_reais if o in ativos and d in ativos})
    infer = sum(1 for o, co, d, cd, m in rel_inferidas if o in ativos and d in ativos)
    print('%-26s %3d tabelas · %3d relacoes declaradas · %3d inferidas · %d KB'
          % (nome, len(tabelas), reais, infer, os.path.getsize(p) / 1024))

com_dado = [t for t in tcols if linhas.get(t, 0) > 0]
escreve('softlux-completo.dbml', com_dado,
        'Softlux - todas as tabelas com dado',
        'Apenas tabelas com pelo menos uma linha. As vazias (147) ficaram de fora.')
escreve('softlux-nucleo.dbml', NUCLEO,
        'Softlux - nucleo do negocio',
        'Recorte do caminho principal: cadastro, produto, preco, venda, compra, estoque.')

# ---------- por modulo ----------
# O arquivo completo (212 tabelas, 5.279 linhas) NAO passa no parser DBML do
# ChartDB: a validacao trava sem erro e o botao Import nunca habilita. Por modulo
# valida e, ainda melhor, gera diagrama que alguem consegue ler.
MODULOS = [
    ('vendas',      r'^(Venda|Orcamento|Pasta|Ambiente|Obras|CategoriaVenda|Promocao|Meta|Reserva_tecnica|Indicacao|Indicacoes)'),
    ('compras',     r'^(pedido_compra|Pedido_compra|ordem_compra|Ordem_compra|Nota_entrada|nota_entrada|CompraEstoque|Cotacao)'),
    ('estoque',     r'(?i)^(estoque|balanco|giroestoque|transferencia|requisicao|inventario)'),
    ('produto',     r'(?i)^(produto|preco_produto|custo|indice_preco|acabamento|tamanho|grupoproduto|tributacao|ncm)'),
    ('financeiro',  r'(?i)^(contas_|cheque|banco|plano_contas|credito|fechamentocontas|duplicata|boleto|caixa|factoring|rateio)'),
    ('fiscal',      r'(?i)^(notafiscal|nfse|mdfe|tabelaimposto|cfop|issqn|ecf|tipo(csosn|cofins|ipi|pis|origem|tributada))'),
    ('sistema',     r'^Sis'),
]

def satelites(base):
    """Puxa o vizinho direto de cada relacao: sem ele o diagrama do modulo fica
    com pontas soltas (VendaProduto sem produtos nao explica nada)."""
    dentro = set(base)
    extra = set()
    for o, co, d, cd in rel_reais:
        if o in dentro and d not in dentro:
            extra.add(d)
    for o, co, d, cd, m in rel_inferidas:
        if o in dentro and d not in dentro:
            extra.add(d)
    return [t for t in extra if linhas.get(t, 0) > 0]

# Um arquivo só com as quatro frentes do escopo inicial do Cabinet. Existe para
# testar até onde o parser do ChartDB aguenta: se este passar, dá para ter UM
# diagrama e separar os módulos por Área colorida, em vez de quatro arquivos.
NEGOCIO = r'(?i)^(venda|orcamento|pasta|ambiente|obras|categoriavenda|promocao|meta|reserva_tecnica|indicac|produto|preco_produto|custo|indice_preco|acabamento|tamanho|grupoproduto|tributacao|ncm|estoque|balanco|giroestoque|transferencia|requisicao|inventario|pedido_compra|ordem_compra|nota_entrada|compraestoque|cotacao|clientes|fornecedor|funcionario)'

print()
rx = re.compile(NEGOCIO)
base = [t for t in com_dado if rx.match(t)]
escreve('softlux-negocio.dbml', base + sorted(set(satelites(base)) - set(base)),
        'Softlux - as quatro frentes do escopo inicial',
        'Cadastro, produto e preco, venda, compra e estoque num arquivo so.')

print()
for nome, pat in MODULOS:
    rx = re.compile(pat)
    base = [t for t in com_dado if rx.match(t)]
    if not base:
        print('modulo %s: nenhuma tabela casou' % nome)
        continue
    tabelas = base + sorted(set(satelites(base)) - set(base))
    escreve('softlux-%s.dbml' % nome, tabelas,
            'Softlux - modulo %s' % nome,
            '%d tabelas do modulo + %d vizinhas puxadas por relacao.'
            % (len(base), len(tabelas) - len(base)))

print('\ntotal inferidas no banco inteiro: %d (contra %d declaradas)'
      % (len(rel_inferidas), len(rel_reais)))
faltando = [t for t in NUCLEO if t not in tcols]
if faltando:
    print('AVISO - nomes do nucleo que nao existem no catalogo: %s' % ', '.join(faltando))
