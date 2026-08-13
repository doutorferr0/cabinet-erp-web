#!/usr/bin/env python3
"""Gera docs/legado/softlux-er.html — explorador ER navegavel do banco do Softlux.
Self-contained, sem CDN, mesma paleta dos outros HTML do diretorio."""
import os, csv, json, html, re

# roda tanto no repo (docs/legado/) quanto na cópia da máquina (softlux-coleta/)
HERE = os.path.dirname(os.path.abspath(__file__))
def _acha(*cands):
    for c in cands:
        if os.path.exists(c):
            return c
    raise SystemExit('não encontrado: %r' % (cands,))
BASE = HERE
SCH = _acha(os.path.join(HERE, 'schema'), os.path.join(HERE, '..', 'softlux-schema'))
MENU = _acha(os.path.join(HERE, 'config', 'menu-form-tabela.csv'),
             os.path.join(HERE, 'banco', 'menu-form-tabela.csv'))

def rd(p, delim=','):
    with open(p, encoding='utf-8-sig') as f:
        return list(csv.DictReader(f, delimiter=delim))

cols = rd(os.path.join(SCH, 'bdprincipal-colunas.csv'))
fks = rd(os.path.join(SCH, 'bdprincipal-fks.csv'))
lin = rd(os.path.join(SCH, 'bdprincipal-linhas.csv'))
idx = rd(os.path.join(SCH, 'bdprincipal-indices.csv'))
menu = rd(MENU, ';')

linhas = {r['tabela']: int(r['linhas']) for r in lin}

# PK por tabela
pk = {}
for r in idx:
    if r['is_primary_key'] == 'True' and r['is_included_column'] != 'True':
        pk.setdefault(r['tabela'], []).append((int(r['key_ordinal']), r['coluna']))
pk = {t: [c for _, c in sorted(v)] for t, v in pk.items()}

# colunas por tabela
tcols = {}
for r in cols:
    tcols.setdefault(r['tabela'], []).append(r)
for t in tcols:
    tcols[t].sort(key=lambda r: int(r['ordem']))

# telas que tocam cada tabela (do cruzamento menu -> form -> tabelas)
telas = {}
for r in menu:
    if not (r.get('Tabelas') or '').strip():
        continue
    rot = re.sub(r'^[-\s>]+', '', r.get('Caption') or '').strip()
    for tb in r['Tabelas'].split(','):
        tb = tb.strip()
        if tb:
            telas.setdefault(tb.lower(), set()).add(rot or r.get('Form', ''))

# indice case-insensitive de nome real
real = {t.lower(): t for t in tcols}

def resolve(n):
    return real.get((n or '').lower())

# grafo de FK — declaradas + inferidas (mesma lógica do gera-dbml/gera-operacoes:
# o legado declara só 208 FKs e as tabelas centrais não declaram nenhuma; sem as
# inferidas o explorador ENGANA — Venda aparece com 8 ligações quando tem dezenas)
tipo_de = {(r['tabela'], r['coluna'].lower()): r['tipo'] for r in cols}
dono = {}
for t, k in pk.items():
    if len(k) == 1:
        dono.setdefault(k[0].lower(), []).append((t, k[0]))
dono = {c: v[0] for c, v in dono.items() if len(v) == 1}
ocorre = {}
for r in cols:
    c = r['coluna'].lower()
    ocorre[c] = ocorre.get(c, 0) + 1
SINONIMOS = {'epr_codnosso': ('produtos', 'Pro_codnosso'), 'pre_codnosso': ('produtos', 'Pro_codnosso'),
             'epr_acabamento': ('Acabamento', 'CodAcabamento'), 'pre_acabamento': ('Acabamento', 'CodAcabamento'),
             'pre_fornecedor': ('fornecedor', 'For_codigo'),
             'venamb_ndocpre': ('Venda', 'Ven_CodigoPre'), 'venind_ndocpre': ('Venda', 'Ven_CodigoPre'),
             'venaten_ndocpre': ('Venda', 'Ven_CodigoPre')}
RUIDO = {'emp_codigo', 'usr_codigo', 'usr_cod_alteracao', 'usr_cod_inclusao',
         'id', 'codigo', 'cod', 'nome', 'descricao', 'situacao'}

out_fk, in_fk, _vistas = {}, {}, set()
def _add(o, co, d, cd, inf):
    k = (o.lower(), co.lower(), d.lower(), cd.lower())
    if k in _vistas or (o.lower(), co.lower()) == (d.lower(), cd.lower()):
        return
    _vistas.add(k)
    e = {'t': d, 'c': co, 'dc': cd}
    e2 = {'t': o, 'c': co, 'dc': cd}
    if inf:
        e['f'] = 1; e2['f'] = 1
    out_fk.setdefault(o, []).append(e)
    in_fk.setdefault(d, []).append(e2)

for r in fks:
    _add(r['tabela_origem'], r['coluna_origem'], r['tabela_destino'], r['coluna_destino'], False)
n_decl = len(_vistas)
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
        _add(t, c['coluna'], alvo, ac, True)
n_inf = len(_vistas) - n_decl

TIPO_CURTO = {'nvarchar': 'nvarchar', 'varchar': 'varchar', 'int': 'int', 'smallint': 'smallint',
              'tinyint': 'tinyint', 'bit': 'bit', 'datetime': 'datetime', 'decimal': 'decimal',
              'numeric': 'numeric', 'float': 'float', 'money': 'money', 'char': 'char',
              'nchar': 'nchar', 'text': 'text', 'ntext': 'ntext', 'image': 'image'}

SISTEMA = {'dtproperties'}  # resquício de diagrama do SQL Server, não é tabela de negócio

dados = {}
for t, cs in tcols.items():
    if t in SISTEMA:
        continue
    n = linhas.get(t, 0)
    dados[t] = {
        'n': n,
        'pk': pk.get(t, []),
        'c': [[c['coluna'], TIPO_CURTO.get(c['tipo'], c['tipo']), c['is_nullable'] == 'True',
               c['is_identity'] == 'True'] for c in cs],
        'o': out_fk.get(t, []),
        'i': in_fk.get(t, []),
        's': sorted(telas.get(t.lower(), []))[:12],
    }

vivas = sum(1 for d in dados.values() if d['n'] > 0)
sem_pk = sum(1 for t, d in dados.items() if not d['pk'])
J = json.dumps(dados, ensure_ascii=False, separators=(',', ':'))

CSS = """
:root{--creme:#FAF6EE;--papel:#FFFDF8;--tinta:#1C1A17;--tinta2:#5A544B;--tinta3:#8B8377;
--linha:#E2DACB;--viva:#2E7D32;--morta:#B0A99C;--alerta:#C2410C;--sel:#0091FF}
*{box-sizing:border-box}
body{margin:0;background:var(--creme);color:var(--tinta);
font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{padding:20px 28px 14px;background:var(--papel);border-bottom:1px solid var(--linha)}
h1{margin:0 0 3px;font-size:20px;letter-spacing:-.01em}
.sub{color:var(--tinta2);font-size:13px;max-width:80ch}
.stats{display:flex;gap:20px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:var(--tinta2)}
.stats b{color:var(--tinta);font-size:14px}
main{display:flex;align-items:flex-start;height:calc(100vh - 128px)}
nav{width:310px;flex:none;border-right:1px solid var(--linha);background:var(--papel);
display:flex;flex-direction:column;height:100%}
.busca{padding:12px;border-bottom:1px solid var(--linha)}
input[type=search]{width:100%;padding:8px 10px;border:1px solid var(--linha);border-radius:6px;
background:var(--creme);font:inherit;font-size:14px;color:var(--tinta)}
.filtros{display:flex;gap:6px;margin-top:8px}
.filtros button{flex:1;padding:5px 4px;border:1px solid var(--linha);background:var(--creme);
border-radius:5px;font:inherit;font-size:12px;cursor:pointer;color:var(--tinta2)}
.filtros button.on{background:var(--tinta);color:var(--papel);border-color:var(--tinta)}
ul{list-style:none;margin:0;padding:6px 0;overflow:auto;flex:1}
li{padding:6px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:8px;
align-items:baseline;border-left:3px solid transparent;font-size:13px}
li:hover{background:var(--creme)}
li.on{background:var(--creme);border-left-color:var(--sel);font-weight:600}
li .qtd{color:var(--tinta3);font-size:11px;font-variant-numeric:tabular-nums;flex:none}
li.morta .nome{color:var(--morta)}
section{flex:1;padding:20px 26px 60px;overflow:auto;height:100%}
.vazio{color:var(--tinta3);margin-top:60px;text-align:center}
h2{margin:0 0 2px;font-size:22px;letter-spacing:-.01em}
.meta{color:var(--tinta2);font-size:13px;margin-bottom:16px}
.tag{display:inline-block;padding:1px 7px;border-radius:20px;font-size:11px;margin-right:6px;
border:1px solid var(--linha);background:var(--papel);color:var(--tinta2)}
.tag.al{border-color:var(--alerta);color:var(--alerta)}
.tag.vv{border-color:var(--viva);color:var(--viva)}
.grade{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:20px}
@media(max-width:1000px){.grade{grid-template-columns:1fr}}
.bloco{background:var(--papel);border:1px solid var(--linha);border-radius:8px;padding:14px 16px}
.bloco h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;
color:var(--tinta3);font-weight:600}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;font-weight:600;color:var(--tinta3);font-size:11px;text-transform:uppercase;
letter-spacing:.04em;padding:0 8px 6px 0;border-bottom:1px solid var(--linha)}
td{padding:4px 8px 4px 0;border-bottom:1px solid var(--creme);vertical-align:top}
td.tipo{color:var(--tinta2);font-family:ui-monospace,monospace;font-size:12px}
td.nul{color:var(--tinta3);font-size:11px}
.k{font-weight:700;color:var(--sel)}
a.tb{color:var(--tinta);text-decoration:none;border-bottom:1px solid var(--linha);cursor:pointer}
a.tb:hover{border-bottom-color:var(--sel);color:var(--sel)}
.fk{font-family:ui-monospace,monospace;font-size:12px;color:var(--tinta2)}
.nada{color:var(--tinta3);font-size:13px;font-style:italic}
.telas{display:flex;flex-wrap:wrap;gap:5px}
.telas span{font-size:11px;padding:2px 8px;border-radius:4px;background:var(--creme);
border:1px solid var(--linha);color:var(--tinta2)}
footer{padding:14px 28px;border-top:1px solid var(--linha);color:var(--tinta3);font-size:12px}
.mini svg{width:100%;height:auto;display:block}
.mini{padding-bottom:8px}
"""

JS = """
const D=DADOS;
const nomes=Object.keys(D).sort((a,b)=>a.localeCompare(b));
let filtro='vivas', termo='', atual=null;
const $=s=>document.querySelector(s);
const fmt=n=>n.toLocaleString('pt-BR');

function lista(){
  const ul=$('#lista'); ul.innerHTML='';
  nomes.filter(t=>{
    const d=D[t];
    if(filtro==='vivas'&&d.n===0) return false;
    if(filtro==='mortas'&&d.n>0) return false;
    if(termo&&!t.toLowerCase().includes(termo)) return false;
    return true;
  }).forEach(t=>{
    const d=D[t], li=document.createElement('li');
    li.className=(d.n===0?'morta ':'')+(t===atual?'on':'');
    li.innerHTML='<span class="nome">'+t+'</span><span class="qtd">'+(d.n?fmt(d.n):'—')+'</span>';
    li.onclick=()=>abre(t);
    ul.appendChild(li);
  });
  $('#conta').textContent=ul.children.length+' tabelas';
}

function link(t){
  const existe=D[t]!==undefined;
  return existe?'<a class="tb" onclick="abre(\\''+t+'\\')">'+t+'</a>':t;
}

function mini(t,d){
  // agrupa vizinho por tabela: uma caixa por tabela, colunas viram o "via"
  const grp=lst=>{const m=new Map();lst.forEach(f=>{
    if(!m.has(f.t))m.set(f.t,{t:f.t,cs:[],inf:true});
    const g=m.get(f.t);g.cs.push(f.c);if(!f.f)g.inf=false;});return [...m.values()];};
  const inn=grp(d.i), out=grp(d.o);
  if(!inn.length&&!out.length) return '';
  const MAX=9, iv=inn.slice(0,MAX), ov=out.slice(0,MAX);
  const BH=34,G=8,BW=260,W=1000;
  const n=Math.max(iv.length,ov.length,1);
  const corpo=n*BH+(n-1)*G, TOPO=40, H=TOPO+Math.max(corpo,48)+30;
  const cy=TOPO+Math.max(corpo,48)/2;
  let s='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">'+
    '<defs><marker id="mm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" '+
    'orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#8B8377"/></marker></defs>';
  if(iv.length)s+='<text x="10" y="20" font-size="11" font-weight="700" letter-spacing=".08em" fill="#0060B0">APONTAM PARA CÁ — dependem dela</text>';
  if(ov.length)s+='<text x="'+(W-BW-10)+'" y="20" font-size="11" font-weight="700" letter-spacing=".08em" fill="#2E7D32">APONTA PARA — de onde referencia</text>';
  const cxx=(W-BW)/2;
  const viz=(g,x,y,cor)=>{
    const via=g.cs.slice(0,2).join(', ')+(g.cs.length>2?' +'+(g.cs.length-2):'');
    const morta=!D[g.t]||!D[g.t].n;
    return '<g style="cursor:pointer" onclick="abre(\\''+g.t+'\\')">'+
      '<title>'+g.t+' — via '+g.cs.join(', ')+(g.inf?' (inferida)':'')+'</title>'+
      '<rect x="'+x+'" y="'+y+'" width="'+BW+'" height="'+BH+'" rx="7" fill="#FFFDF8" stroke="'+cor+'" '+
      'stroke-width="1.5"'+(g.inf?' stroke-dasharray="6 4"':'')+'/>'+
      '<text x="'+(x+10)+'" y="'+(y+15)+'" font-size="12" font-weight="700" fill="'+(morta?'#B0A99C':'#1C1A17')+'">'+
      (g.t.length>26?g.t.slice(0,25)+'…':g.t)+'</text>'+
      '<text x="'+(x+10)+'" y="'+(y+28)+'" font-size="9.5" fill="#8B8377" font-family="ui-monospace,monospace">via '+
      (via.length>34?via.slice(0,33)+'…':via)+'</text></g>';
  };
  const linha=(x1,y1,x2,y2,inf)=>'<path d="M'+x1+' '+y1+' C '+((x1+x2)/2)+' '+y1+', '+((x1+x2)/2)+' '+y2+', '+x2+' '+y2+
    '" fill="none" stroke="#B9AE97" stroke-width="1.6"'+(inf?' stroke-dasharray="6 4"':'')+' marker-end="url(#mm)"/>';
  iv.forEach((g,j)=>{const y=TOPO+(Math.max(corpo,48)-(iv.length*BH+(iv.length-1)*G))/2+j*(BH+G);
    s+=linha(10+BW,y+BH/2,cxx-6,cy,g.inf)+viz(g,10,y,'#0060B0');});
  ov.forEach((g,j)=>{const y=TOPO+(Math.max(corpo,48)-(ov.length*BH+(ov.length-1)*G))/2+j*(BH+G);
    s+=linha(cxx+BW+6,cy,W-BW-16,y+BH/2,g.inf)+viz(g,W-BW-10,y,'#2E7D32');});
  s+='<g><rect x="'+cxx+'" y="'+(cy-24)+'" width="'+BW+'" height="48" rx="8" fill="#F0EDE6" stroke="#1C1A17" stroke-width="2"/>'+
     '<text x="'+(cxx+12)+'" y="'+(cy-4)+'" font-size="13.5" font-weight="700" fill="#1C1A17">'+
     (t.length>24?t.slice(0,23)+'…':t)+'</text>'+
     '<text x="'+(cxx+12)+'" y="'+(cy+14)+'" font-size="10" fill="#5A544B">'+(d.n?fmt(d.n)+' linhas':'vazia')+
     ' · '+d.c.length+' colunas</text></g>';
  if(inn.length>MAX)s+='<text x="10" y="'+(H-8)+'" font-size="10.5" fill="#8B8377">+ '+(inn.length-MAX)+' tabelas apontam para cá — lista completa abaixo</text>';
  if(out.length>MAX)s+='<text x="'+(W-BW-10)+'" y="'+(H-8)+'" font-size="10.5" fill="#8B8377">+ '+(out.length-MAX)+' — lista abaixo</text>';
  return '<div class="bloco mini" style="margin-bottom:20px"><h3>Vizinhança — clique salta '+
    '<span style="text-transform:none;letter-spacing:0;font-weight:400">· tracejada = inferida por nós</span></h3>'+s+'</svg></div>';
}

function abre(t){
  atual=t; const d=D[t]; if(!d) return;
  const pk=new Set(d.pk);
  const tagf=f=>f.f?' <span class="tag" style="font-size:10px;padding:0 5px">inferida</span>':'';
  let h='<h2>'+t+'</h2><div class="meta">';
  h+=d.n?'<span class="tag vv">'+fmt(d.n)+' linhas</span>':'<span class="tag">vazia</span>';
  h+='<span class="tag">'+d.c.length+' colunas</span>';
  h+=d.pk.length?'<span class="tag">PK: '+d.pk.join(' + ')+'</span>':'<span class="tag al">SEM chave primária</span>';
  h+='</div>';

  h+=mini(t,d);

  h+='<div class="grade"><div class="bloco"><h3>Aponta para ('+d.o.length+')</h3>';
  h+=d.o.length?'<table>'+d.o.map(f=>'<tr><td class="fk">'+f.c+'</td><td>→ '+link(f.t)+'<span class="fk"> ('+f.dc+')</span>'+tagf(f)+'</td></tr>').join('')+'</table>':'<p class="nada">nenhuma FK de saída</p>';
  h+='</div><div class="bloco"><h3>Apontam para cá ('+d.i.length+')</h3>';
  h+=d.i.length?'<table>'+d.i.map(f=>'<tr><td>'+link(f.t)+'</td><td class="fk">'+f.c+tagf(f)+'</td></tr>').join('')+'</table>':'<p class="nada">ninguém referencia</p>';
  h+='</div></div>';

  if(d.s.length){
    h+='<div class="bloco" style="margin-bottom:20px"><h3>Telas que usam</h3><div class="telas">'+
       d.s.map(s=>'<span>'+s+'</span>').join('')+'</div></div>';
  }

  h+='<div class="bloco"><h3>Colunas</h3><table><tr><th>#</th><th>Coluna</th><th>Tipo</th><th>Nulo</th></tr>';
  d.c.forEach((c,i)=>{
    h+='<tr><td class="nul">'+(i+1)+'</td><td'+(pk.has(c[0])?' class="k"':'')+'>'+c[0]+
       (c[3]?' <span class="nul">identity</span>':'')+'</td><td class="tipo">'+c[1]+
       '</td><td class="nul">'+(c[2]?'sim':'não')+'</td></tr>';
  });
  h+='</table></div>';
  $('#det').innerHTML=h;
  $('#det').scrollTop=0;
  lista();
  location.hash=t;
}

$('#busca').oninput=e=>{termo=e.target.value.toLowerCase().trim();lista();};
document.querySelectorAll('.filtros button').forEach(b=>{
  b.onclick=()=>{filtro=b.dataset.f;
    document.querySelectorAll('.filtros button').forEach(x=>x.classList.toggle('on',x===b));
    lista();};
});
lista();
window.addEventListener('hashchange',()=>{
  const t=decodeURIComponent(location.hash.slice(1));
  if(D[t]&&t!==atual)abre(t);});
const inicial=decodeURIComponent(location.hash.slice(1));
abre(D[inicial]?inicial:'Venda');
"""

HTML = """<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Softlux — explorador do schema</title>
<style>%s</style></head><body>
<header>
<h1>Softlux — explorador do schema</h1>
<div class="sub">Navegue pelas %d tabelas de <code>bdprincipal</code> seguindo as ligações.
Clique num nome de tabela para saltar. As ligações <b>inferidas</b> (por nome+tipo de coluna, mais os
sinônimos de prefixo do legado) estão marcadas — são hipótese conferida por amostragem, não verdade.
Referência de <b>leitura</b>: o schema do Cabinet não sai daqui — o que sai é o entendimento do
negócio. O que <b>não</b> replicar está na seção 7 do README.</div>
<div class="stats">
<span><b>%d</b> tabelas</span><span><b>%d</b> com dado</span><span><b>%d</b> vazias</span>
<span><b>%d</b> FKs declaradas</span><span><b>%d</b> ligações inferidas</span>
<span><b>%d</b> sem chave primária</span>
</div>
</header>
<main>
<nav>
<div class="busca">
<input type="search" id="busca" placeholder="buscar tabela…" autocomplete="off">
<div class="filtros">
<button data-f="vivas" class="on">Com dado</button>
<button data-f="mortas">Vazias</button>
<button data-f="todas">Todas</button>
</div>
</div>
<ul id="lista"></ul>
</nav>
<section id="det"><p class="vazio">selecione uma tabela</p></section>
</main>
<footer id="conta"></footer>
<script>const DADOS=%s;
%s
</script></body></html>"""

saida = HTML % (CSS, len(dados), len(dados), vivas, len(dados) - vivas, n_decl, n_inf, sem_pk,
                J, JS)
p = os.path.join(BASE, 'softlux-er.html')
open(p, 'w', encoding='utf-8').write(saida)
print('softlux-er.html | %d tabelas · %d com dado · %d FKs declaradas · %d inferidas · %d sem PK · %.0f KB'
      % (len(dados), vivas, n_decl, n_inf, sem_pk, os.path.getsize(p) / 1024))
