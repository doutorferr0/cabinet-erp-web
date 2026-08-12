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
BW = 232                   # largura da caixa
HDR = 30                   # altura do cabeçalho
LIN = 21                   # altura de cada linha de coluna
GAPY = 26                  # espaço vertical entre caixas
COLX = 340                 # distância horizontal entre colunas

def colunas_relevantes(t, ligacoes, limite=5):
    """PK primeiro, depois as colunas que participam de alguma ligação do desenho."""
    chave = pk.get(t, [])
    usadas = [(c, 'pk') for c in chave]
    for col in ligacoes.get(t, []):
        if not any(c.lower() == col.lower() for c, _ in usadas):
            usadas.append((col, 'fk'))
    total = len(tcols.get(t, []))
    return usadas[:limite], max(0, total - min(len(usadas), limite))

# uma cor por ligação: a linha, o rótulo dela e a coluna dentro das duas caixas
# ficam da MESMA cor, para o olho seguir sem contar linhas
PALETA = ['#0060B0', '#C2410C', '#2E7D32', '#7A5CB8', '#B7791F',
          '#B0306B', '#0E7C86', '#8A6D3B', '#3D6B9E', '#A0522D']

def caixa(t, papel, cols, restam, x0, y0, larg, alt, cor_col=None):
    """Uma tabela: cabeçalho colorido + uma linha por coluna, com divisória."""
    CORES = {'centro': ('#1C1A17', '#F0EDE6'), 'item': ('#0060B0', '#EAF4FF'),
             'ref': ('#2E7D32', '#EDF6ED'), 'solta': ('#8B8377', '#F5F1E8')}
    ROT = {'centro': 'documento da operação', 'item': 'depende do documento',
           'ref': 'consultada pela operação', 'solta': 'sem ligação direta no recorte'}
    borda, fundo = CORES[papel]
    g = ['<a href="softlux-er.html#%s" target="_blank"><g style="cursor:pointer">'
         '<title>%s — %s linhas · %s\nclique abre no explorador do schema</title>' % (t, t, vol(t), ROT[papel])]
    g.append('<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="#FFFDF8" stroke="%s" stroke-width="%s"/>'
             % (x0, y0, larg, alt, borda, 2.6 if papel == 'centro' else 1.6))
    g.append('<path d="M%d %d h%d v%d h-%d z" fill="%s"/>' % (x0, y0 + HDR, larg, -(HDR - 6), larg, fundo))
    g.append('<rect x="%d" y="%d" width="%d" height="%d" fill="%s"/>' % (x0, y0, larg, 8, fundo))
    g.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.4"/>'
             % (x0, y0 + HDR, x0 + larg, y0 + HDR, borda))
    g.append('<text x="%d" y="%d" font-size="14" font-weight="700" fill="%s">%s</text>'
             % (x0 + 11, y0 + 20, borda, t[:26]))
    g.append('<text x="%d" y="%d" font-size="10.5" fill="#8B8377" text-anchor="end">%s</text>'
             % (x0 + larg - 10, y0 + 20, vol(t)))
    cor_col = cor_col or {}
    for i, (c, kind) in enumerate(cols):
        yy = y0 + HDR + LIN * i
        if i:
            g.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#EDE6D8" stroke-width="1"/>'
                     % (x0 + 1, yy, x0 + larg - 1, yy))
        cor = cor_col.get(c.lower())
        if cor:   # coluna que participa de uma ligação: fundo tênue e texto na cor da linha
            g.append('<rect x="%d" y="%d" width="%d" height="%d" fill="%s" opacity="0.10"/>'
                     % (x0 + 1, yy + 1, larg - 2, LIN - 2, cor))
            g.append('<rect x="%d" y="%d" width="4" height="%d" fill="%s"/>' % (x0 + 1, yy + 1, LIN - 2, cor))
        g.append('<text x="%d" y="%d" font-size="11.5" fill="%s" font-family="ui-monospace,monospace" '
                 'font-weight="%s">%s</text>'
                 % (x0 + 26, yy + 15, cor or ('#1C1A17' if kind == 'pk' else '#5A544B'),
                    '700' if (cor or kind == 'pk') else '400', c[:24]))
        g.append('<text x="%d" y="%d" font-size="10" fill="%s">%s</text>'
                 % (x0 + 10, yy + 15, cor or ('#C2410C' if kind == 'pk' else '#8B8377'),
                    '◆' if kind == 'pk' else '•'))
    if restam:
        yy = y0 + HDR + LIN * len(cols)
        g.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#EDE6D8" stroke-width="1"/>'
                 % (x0 + 1, yy, x0 + larg - 1, yy))
        g.append('<text x="%d" y="%d" font-size="10.5" fill="#8B8377" font-style="italic">mais %d colunas</text>'
                 % (x0 + 24, yy + 14, restam))
    g.append('</g></a>')
    return '\n'.join(g)

def diagrama(op):
    tabs = [t for t in op['tabelas'] if t in tcols]
    if len(tabs) < 2:
        return ''
    central = tabs[0]
    dentro = set(tabs)
    arestas = [(o, co, d, cd, dec) for o, co, d, cd, dec in RELS if o in dentro and d in dentro]
    ligacoes = {}
    for o, co, d, cd, dec in arestas:
        ligacoes.setdefault(o, []).append(co)
        ligacoes.setdefault(d, []).append(cd)

    papel = {central: 'centro'}
    for t in tabs[1:]:
        p = 'solta'
        for o, co, d, cd, dec in arestas:
            if o == t and d == central: p = 'item'; break
            if o == central and d == t: p = 'ref'
        papel[t] = p

    # três colunas: quem depende do documento | documento | o que ele consulta
    esq = [t for t in tabs[1:] if papel[t] == 'item']
    dir_ = [t for t in tabs[1:] if papel[t] == 'ref']
    baixo = [t for t in tabs[1:] if papel[t] == 'solta']
    dir_ += baixo

    dims = {}
    for t in tabs:
        cols, restam = colunas_relevantes(t, ligacoes)
        alt = HDR + LIN * len(cols) + (19 if restam else 0) + 6
        dims[t] = (cols, restam, alt)

    def altura(col):
        return sum(dims[t][2] for t in col) + GAPY * max(0, len(col) - 1)

    H = max(altura(esq), altura(dir_), dims[central][2]) + 80
    W = COLX * 2 + BW + 90
    pos = {}
    def empilha(col, x):
        y = (H - altura(col)) / 2
        for t in col:
            pos[t] = (x, y)
            y += dims[t][2] + GAPY
    empilha(esq, 40)
    empilha(dir_, 40 + COLX * 2)
    pos[central] = (40 + COLX, (H - dims[central][2]) / 2)

    out, marcadores, cor_col = [], [], {}
    for i, (o, co, d, cd, dec) in enumerate(arestas):
        if o not in pos or d not in pos: continue
        cor = PALETA[i % len(PALETA)]
        cor_col.setdefault((o, co.lower()), cor)
        cor_col.setdefault((d, cd.lower()), cor)
        xo, yo = pos[o]; xd, yd = pos[d]
        x1 = xo + BW if xo < xd else xo
        x2 = xd if xo < xd else xd + BW
        y1 = yo + dims[o][2] / 2
        y2 = yd + dims[d][2] / 2
        mx = (x1 + x2) / 2
        tracejado = '' if dec else ' stroke-dasharray="7 5"'
        marcadores.append('<marker id="s%d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
                          'markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="%s"/></marker>'
                          % (i, cor))
        rot = co[:22]
        largura_rot = 7 * len(rot) + 14
        out.append('<g><title>%s.%s → %s.%s%s</title>'
                   '<path d="M%.0f %.0f C %.0f %.0f, %.0f %.0f, %.0f %.0f" fill="none" stroke="%s" '
                   'stroke-width="2.2"%s marker-end="url(#s%d)" opacity="0.95"/>'
                   '<rect x="%.0f" y="%.0f" width="%d" height="17" rx="8" fill="#FFFDF8" stroke="%s" stroke-width="1"/>'
                   '<text x="%.0f" y="%.0f" font-size="10.5" font-weight="600" fill="%s" text-anchor="middle" '
                   'font-family="ui-monospace,monospace">%s</text>'
                   '<text x="%.0f" y="%.0f" font-size="12" font-weight="700" fill="%s">N</text>'
                   '<text x="%.0f" y="%.0f" font-size="12" font-weight="700" fill="%s">1</text></g>'
                   % (o, co, d, cd, '  (inferida)' if not dec else '',
                      x1, y1, mx, y1, mx, y2, x2, y2, cor, tracejado, i,
                      mx - largura_rot / 2, (y1 + y2) / 2 - 8.5 - 4, largura_rot, cor,
                      mx, (y1 + y2) / 2 + 3.5 - 4, cor, rot,
                      x1 + (7 if x1 < x2 else -16), y1 - 7, cor,
                      x2 + (-18 if x1 < x2 else 9), y2 - 7, cor))
    for t in tabs:
        x, y = pos[t]
        cols, restam, alt = dims[t]
        larg = BW if t != central else BW + 20
        if t == central:
            x -= 10
        mapa = {c: v for (tt, c), v in cor_col.items() if tt == t}
        out.append(caixa(t, papel[t], cols, restam, int(x), int(y), larg, alt, mapa))

    defs = '<defs>%s</defs>' % ''.join(marcadores)
    legenda = ('<g font-size="11" fill="#5A544B">'
               '<rect x="16" y="10" width="12" height="12" rx="3" fill="#F0EDE6" stroke="#1C1A17" stroke-width="2"/>'
               '<text x="35" y="20">documento</text>'
               '<rect x="130" y="10" width="12" height="12" rx="3" fill="#EAF4FF" stroke="#0060B0"/>'
               '<text x="149" y="20">depende dele</text>'
               '<rect x="262" y="10" width="12" height="12" rx="3" fill="#EDF6ED" stroke="#2E7D32"/>'
               '<text x="281" y="20">consultada</text>'
               '<line x1="378" y1="16" x2="404" y2="16" stroke="#5A544B" stroke-width="2.2"/>'
               '<text x="411" y="20">declarada no banco</text>'
               '<line x1="548" y1="16" x2="574" y2="16" stroke="#5A544B" stroke-width="2.2" stroke-dasharray="7 5"/>'
               '<text x="581" y="20">inferida por nós</text>'
               '<text x="16" y="40" font-size="10.5" fill="#8B8377">Cada ligação tem sua cor; a coluna que '
               'participa dela aparece na mesma cor dentro das duas tabelas. N = muitos · 1 = um.</text></g>')
    return ('<svg viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg">%s%s%s</svg>'
            % (W, H, defs, legenda, '\n'.join(out)))

# ---------------------------------------------------------------- fluxograma
# notação clássica: estádio = início/fim · retângulo = ação · losango = decisão
# · paralelogramo = documento que sai do sistema
FW, FH = 250, 46           # largura/altura padrão do nó
FGAP = 40                  # espaço vertical entre nós

def no(tipo, texto, cx, cy, w=FW, h=FH):
    linhas = []
    palavras = texto.split()
    linha = ''
    for p in palavras:
        if len(linha) + len(p) > 30:
            linhas.append(linha); linha = p
        else:
            linha = (linha + ' ' + p).strip()
    linhas.append(linha)
    if len(linhas) > 1:
        h = max(h, 22 + 15 * len(linhas))
    x0, y0 = cx - w / 2, cy - h / 2
    C = {'inicio': ('#2E7D32', '#EDF6ED'), 'fim': ('#C2410C', '#FDF1EA'),
         'acao': ('#1C1A17', '#FFFDF8'), 'decisao': ('#0060B0', '#EAF4FF'),
         'doc': ('#7A5CB8', '#F4F0FC')}
    borda, fundo = C[tipo]
    g = []
    if tipo in ('inicio', 'fim'):
        g.append('<rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" rx="%.0f" fill="%s" stroke="%s" stroke-width="2"/>'
                 % (x0, y0, w, h, h / 2, fundo, borda))
    elif tipo == 'decisao':
        g.append('<path d="M%.0f %.0f L%.0f %.0f L%.0f %.0f L%.0f %.0f z" fill="%s" stroke="%s" stroke-width="2"/>'
                 % (cx, y0 - 12, cx + w / 2 + 16, cy, cx, cy + h / 2 + 12, cx - w / 2 - 16, cy, fundo, borda))
    elif tipo == 'doc':
        g.append('<path d="M%.0f %.0f h%.0f l-16 %.0f h-%.0f z" fill="%s" stroke="%s" stroke-width="2"/>'
                 % (x0 + 16, y0, w, h, w, fundo, borda))
    else:
        g.append('<rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" rx="5" fill="%s" stroke="%s" stroke-width="1.8"/>'
                 % (x0, y0, w, h, fundo, borda))
    peso = '700' if tipo in ('inicio', 'fim', 'decisao') else '400'
    for i, l in enumerate(linhas):
        yy = cy - (len(linhas) - 1) * 7.5 + 15 * i + 4
        g.append('<text x="%.0f" y="%.0f" font-size="12.5" font-weight="%s" fill="#1C1A17" text-anchor="middle">%s</text>'
                 % (cx, yy, peso, l))
    return '\n'.join(g), h

def fluxograma(passos, tabelas_por_passo=None):
    """passos: lista de (tipo, texto, nota_do_ramo).
    À direita de cada passo entram as tabelas que ele toca, ligadas por linha pontilhada.
    O ramo 'não' da decisão sai pela ESQUERDA, para não brigar com a coluna de tabelas."""
    if not passos:
        return ''
    tabelas_por_passo = tabelas_por_passo or {}
    W = 900
    cx = 300
    TABX = 570          # início da coluna de tabelas
    TABW = 210
    out, y = [], 40
    caixas = []
    for i, (tipo, texto, ramo) in enumerate(passos):
        _, alt = no(tipo, texto, cx, 0)      # mede
        # o passo precisa de espaço vertical para as tabelas que pendura
        ntab = len(tabelas_por_passo.get(i, []))
        alt_tab = max(0, ntab * 34 - 10)
        cy = y + max(alt, alt_tab) / 2
        svg, alt = no(tipo, texto, cx, cy)   # desenha na posição certa
        caixas.append((tipo, texto, ramo, cy, alt, i))
        out.append(svg)
        y += max(alt, alt_tab) + FGAP
    H = y + 10

    # coluna de tabelas, à direita, ligada ao passo por linha pontilhada
    for tipo, texto, ramo, cy, alt, i in caixas:
        tabs = [t for t in tabelas_por_passo.get(i, []) if t in tcols]
        if not tabs:
            continue
        topo = cy - (len(tabs) * 34 - 10) / 2
        out.append('<line x1="%.0f" y1="%.0f" x2="%d" y2="%.0f" stroke="#C9BFA9" stroke-width="1.4" '
                   'stroke-dasharray="4 4"/>' % (cx + FW / 2 + (16 if tipo == 'decisao' else 0), cy, TABX - 14, cy))
        for j, t in enumerate(tabs):
            ty = topo + j * 34
            if len(tabs) > 1:
                out.append('<path d="M%d %.0f H%d V%.0f" fill="none" stroke="#C9BFA9" stroke-width="1.4" '
                           'stroke-dasharray="4 4"/>' % (TABX - 14, cy, TABX - 8, ty + 12))
            out.append('<a href="softlux-er.html#%s" target="_blank"><g style="cursor:pointer">'
                       '<title>%s — %s linhas\nclique abre no explorador</title>'
                       '<rect x="%d" y="%.0f" width="%d" height="24" rx="6" fill="#FFFDF8" stroke="#B9AE97"/>'
                       '<text x="%d" y="%.0f" font-size="11.5" font-weight="600" fill="#1C1A17" '
                       'font-family="ui-monospace,monospace">%s</text>'
                       '<text x="%d" y="%.0f" font-size="10" fill="#8B8377" text-anchor="end">%s</text>'
                       '</g></a>'
                       % (t, t, vol(t), TABX, ty, TABW, TABX + 9, ty + 16, t[:22],
                          TABX + TABW - 8, ty + 16, vol(t)))
    setas = []
    for i in range(len(caixas) - 1):
        cy, alt = caixas[i][3], caixas[i][4]
        y1 = cy + alt / 2
        y2 = caixas[i + 1][3] - caixas[i + 1][4] / 2
        setas.append('<line x1="%d" y1="%.0f" x2="%d" y2="%.0f" stroke="#8B8377" stroke-width="1.8" '
                     'marker-end="url(#setaF)"/>' % (cx, y1, cx, y2 - 2))
    for tipo, texto, ramo, cy, alt, _i in caixas:
        if tipo == 'decisao' and ramo:
            # o ramo "não" sai pela ESQUERDA: a direita é da coluna de tabelas
            x1 = cx - FW / 2 - 16
            setas.append('<line x1="%.0f" y1="%.0f" x2="%d" y2="%.0f" stroke="#8B8377" stroke-width="1.8" '
                         'marker-end="url(#setaF)"/>' % (x1, cy, 108, cy))
            svg, _ = no('fim', ramo, 100, cy, 170, 40)
            setas.append(svg)
            setas.append('<text x="%.0f" y="%.0f" font-size="11" fill="#8B8377" text-anchor="end">não</text>'
                         % (x1 - 12, cy - 8))
            setas.append('<text x="%d" y="%.0f" font-size="11" fill="#8B8377">sim</text>' % (cx + 8, cy + alt / 2 + 24))
    defs = ('<defs><marker id="setaF" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
            'orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#8B8377"/></marker></defs>')
    # sem teto de largura o fluxo estica a página inteira: o desenho é alto e estreito
    return ('<svg viewBox="0 0 %d %d" style="max-width:%dpx" xmlns="http://www.w3.org/2000/svg">%s%s%s</svg>'
            % (W, H, W, defs, '\n'.join(out), '\n'.join(setas)))

def h_meia(tipo, texto):
    return FH / 2

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

# que tabela cada passo do fluxo toca — o índice é a posição na lista de FLUXOS
TAB_PASSO = {
 'orcamento': {1: ['Clientes', 'Obras', 'Indicacoes'], 2: ['Ambiente', 'VendaAmbiente'],
               3: ['VendaProduto', 'produtos'], 4: ['Indice_preco', 'VendaDesconto'],
               5: ['VendaServico'], 6: ['Venda'], 7: ['Venda', 'VendaAtendente']},
 'pedido': {1: ['Venda'], 2: ['Estoque_produto'], 3: ['VendaProduto'], 4: ['estoque_log']},
 'produto': {1: ['produtos'], 2: ['ProdutosFornecedores', 'fornecedor'], 3: ['produtos'],
             4: ['Preco_Produto', 'Acabamento'], 5: ['Custo', 'Indice_preco'], 6: ['produtos']},
 'preco': {1: ['Preco_Produto'], 2: ['Custo'], 3: ['Indice_preco'], 4: ['Preco_Produto_Log'],
           5: ['Preco_Produto']},
 'estoque-saldo': {1: ['Estoque_produto', 'EstoqueTipo'], 2: ['Preco_Produto'],
                   3: ['CompraEstoque'], 4: ['ordem_compra']},
 'estoque-mov': {1: ['estoque_log'], 2: ['Nota_entrada'], 3: ['estoque_log'],
                 4: ['Estoque_produto', 'estoque_produto_dia']},
 'pedido-compra': {1: ['pedido_compra', 'Venda'], 2: ['Pedido_compra_det', 'fornecedor'],
                   3: ['ordem_compra']},
 'ordem-compra': {1: ['pedido_compra'], 2: ['ordem_compra', 'ordem_compra_det'],
                  3: ['fornecedor'], 4: ['Nota_entrada']},
 'nota-entrada': {1: ['Nota_entrada', 'nota_entrada_det'], 2: ['estoque_log', 'Estoque_produto'],
                  3: ['CategoriaVenda'], 4: ['Contas_apagar_pag']},
 'cliente': {1: ['Clientes'], 2: ['Obras'], 3: ['Indicacoes'], 4: ['Venda']},
 'fornecedor': {1: ['fornecedor'], 2: ['Custo'], 3: ['Indice_preco'], 4: ['Preco_Produto']},
 'profissional': {1: ['Indicacoes'], 2: ['VendaIndicacaoGrupProd'], 3: ['VendaIndicacao'],
                  4: ['CreditoIndicacao']},
}

# fluxo da operação — notação clássica.
# tipo: inicio · acao · decisao · doc · fim   |   3º item = destino do ramo "não" da decisão
FLUXOS = {
 'orcamento': [
   ('inicio', 'Cliente procura a Vertz com um projeto', None),
   ('acao', 'Consultor abre orçamento e escolhe cliente, obra e profissional', None),
   ('acao', 'Cria os ambientes da obra (sala, cozinha…)', None),
   ('acao', 'Lança itens em cada ambiente: produto, acabamento, tamanho, quantidade', None),
   ('acao', 'Preço vem do índice do fornecedor; desconto por produto ou geral', None),
   ('doc', 'Imprime o PDF da proposta', None),
   ('decisao', 'Cliente aprova em 5 dias?', 'Expira'),
   ('fim', 'Vira pedido de venda — troca Ven_Tipo de O para P', None)],
 'pedido': [
   ('inicio', 'Orçamento aprovado pelo cliente', None),
   ('acao', 'Troca o tipo do registro de orçamento para pedido', None),
   ('decisao', 'Tem saldo em estoque?', 'Gera pedido de compra'),
   ('acao', 'Reserva o material e agenda a entrega', None),
   ('fim', 'Baixa no estoque e entrega ao cliente', None)],
 'produto': [
   ('inicio', 'Fornecedor lança item novo na linha', None),
   ('acao', 'Cadastra o produto e seus três códigos', None),
   ('acao', 'Vincula fornecedores e o código do produto em cada um', None),
   ('acao', 'Preenche atributos técnicos de iluminação', None),
   ('acao', 'Cria as variantes: acabamento × tamanho', None),
   ('decisao', 'Tem custo e índice do fornecedor?', 'Fica sem preço de venda'),
   ('fim', 'Produto disponível para orçamento e compra', None)],
 'preco': [
   ('inicio', 'Fornecedor envia tabela de preço', None),
   ('acao', 'Atualiza o preço de tabela por variante', None),
   ('acao', 'Aplica os 4 descontos em cascata e os créditos de imposto', None),
   ('acao', 'Multiplica o líquido pelo índice do fornecedor', None),
   ('doc', 'Grava o histórico em Preco_Produto_Log', None),
   ('fim', 'Valor unitário disponível para a venda', None)],
 'estoque-saldo': [
   ('inicio', 'Alguém precisa saber o que tem em casa', None),
   ('acao', 'Consulta saldo por variante, depósito e empresa', None),
   ('decisao', 'Saldo abaixo do mínimo?', 'Nada a fazer'),
   ('acao', 'Entra na sugestão de compra', None),
   ('fim', 'Ordem de compra ao fornecedor', None)],
 'estoque-mov': [
   ('inicio', 'Um evento mexe no estoque', None),
   ('decisao', 'É entrada?', 'Saída por pedido de venda'),
   ('acao', 'Nota do fornecedor, devolução ou balanço', None),
   ('acao', 'Grava a linha no razão de movimentação', None),
   ('fim', 'Saldo da variante é reescrito', None)],
 'pedido-compra': [
   ('inicio', 'Pedido de venda sem saldo em estoque', None),
   ('acao', 'Gera o pedido de compra referenciando o pedido de venda', None),
   ('acao', 'Separa os itens por fornecedor', None),
   ('fim', 'Aguarda ser agrupado numa ordem de compra', None)],
 'ordem-compra': [
   ('inicio', 'Há pedidos de compra abertos para um fornecedor', None),
   ('acao', 'Agrupa os pedidos numa ordem e define a empresa compradora', None),
   ('decisao', 'Atingiu o faturamento mínimo do fornecedor?', 'Espera juntar mais'),
   ('doc', 'Envia a ordem ao fornecedor', None),
   ('fim', 'Aguarda a chegada da mercadoria', None)],
 'nota-entrada': [
   ('inicio', 'Mercadoria chega com a nota do fornecedor', None),
   ('acao', 'Lança a nota e confere os itens contra a ordem', None),
   ('acao', 'Dá entrada no estoque', None),
   ('decisao', 'Gera financeiro?', 'Entra só no estoque'),
   ('fim', 'Cria a conta a pagar', None)],
 'cliente': [
   ('inicio', 'Cliente novo chega, quase sempre por um profissional', None),
   ('acao', 'Cadastra dados, endereço e a obra', None),
   ('acao', 'Vincula o profissional que indicou', None),
   ('decisao', 'Dentro do limite de crédito?', 'Exige permissão especial'),
   ('fim', 'Pode receber orçamento', None)],
 'fornecedor': [
   ('inicio', 'Nova marca entra no portfólio', None),
   ('acao', 'Cadastra dados, prazos e empresa compradora', None),
   ('acao', 'Monta o perfil de custo com descontos e impostos', None),
   ('acao', 'Define o índice de venda', None),
   ('fim', 'Produtos dele passam a ter preço', None)],
 'profissional': [
   ('inicio', 'Arquiteto ou designer passa a indicar a Vertz', None),
   ('acao', 'Cadastra registro profissional e dados bancários', None),
   ('acao', 'Define o percentual por grupo de produto', None),
   ('acao', 'Cada venda indicada registra a comissão', None),
   ('fim', 'Crédito do profissional vai para o financeiro', None)],
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
/* dois scrolls independentes: a ficha rola de um lado, o desenho do outro */
.painel{flex:1;display:flex;align-items:stretch;overflow:hidden;height:100%}
.diag{flex:1;min-width:560px;padding:18px 24px 30px 0;overflow:auto;height:100%}
.diag svg{width:100%;min-width:820px;height:auto;background:var(--papel);
border:1px solid var(--linha);border-radius:8px}
.diag .cap{color:var(--tinta3);font-size:12px;margin:8px 2px 0;max-width:70ch}
.abas{display:flex;gap:6px;margin-bottom:10px}
.abas button{padding:6px 14px;border:1px solid var(--linha);background:var(--papel);
border-radius:6px;font:inherit;font-size:13px;cursor:pointer;color:var(--tinta2)}
.abas button.on{background:var(--tinta);color:var(--papel);border-color:var(--tinta);font-weight:600}
@media(max-width:1250px){.painel{flex-direction:column}
  .diag{position:static;width:100%;min-width:0;padding:0 24px 30px}}
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
section{flex:none;width:620px;padding:22px 26px 70px;overflow-y:auto;height:100%;
border-right:1px solid var(--linha)}
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
fluxos = {o['id']: fluxograma(FLUXOS.get(o['id'], []), TAB_PASSO.get(o['id'], {})) for o in OPS}

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
<div class="diag">
<div class="abas"><button id="ab-t" class="on" onclick="aba('t')">Tabelas</button>
<button id="ab-f" onclick="aba('f')">Fluxo da operação</button></div>
<div id="svg"></div>
<div class="cap" id="cap"></div></div>
</div>
</main>
<footer>%d operações · fases: %s</footer>
<script>
const F=%s, D=%s, X=%s;
let atual='%s', vista='t';
const CAP={
 t:'Caixa clicável abre a tabela no explorador do schema. Cada ligação tem cor própria, e a coluna '+
   'que participa dela aparece na mesma cor dentro das duas tabelas. Passe o mouse na linha para ver '+
   'os dois lados.',
 f:'Como a operação acontece no dia a dia. Estádio verde = começo · retângulo = ação · losango = '+
   'decisão · paralelogramo roxo = documento que sai para fora · estádio laranja = fim.'};
function pinta(){
  document.getElementById('svg').innerHTML=(vista==='t'?D[atual]:X[atual])||
    '<p style="color:#8B8377;padding:20px">sem desenho para esta operação</p>';
  document.getElementById('cap').textContent=CAP[vista];
  document.getElementById('ab-t').classList.toggle('on',vista==='t');
  document.getElementById('ab-f').classList.toggle('on',vista==='f');
}
function aba(v){vista=v;pinta();}
function abre(id){
  if(!F[id]) return;
  atual=id;
  document.getElementById('ficha').innerHTML=F[id];
  pinta();
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.id==='n-'+id));
  document.querySelector('section').scrollTop=0;
  document.querySelector('.diag').scrollTop=0;
  location.hash=id;
}
const ini=decodeURIComponent(location.hash.slice(1));
abre(F[ini]?ini:'%s');
</script></body></html>""" % (CSS, '\n'.join(nav), len(OPS), ' · '.join(FASES),
                              json.dumps(fichas, ensure_ascii=False),
                              json.dumps(diagramas, ensure_ascii=False),
                              json.dumps(fluxos, ensure_ascii=False), OPS[0]['id'], OPS[0]['id'])

p = os.path.join(BASE, 'operacoes.html')
open(p, 'w', encoding='utf-8').write(HTML)
print('operacoes.html | %d fichas · %d KB' % (len(OPS), os.path.getsize(p) / 1024))
