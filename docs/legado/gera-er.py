#!/usr/bin/env python3
"""Gera docs/legado/softlux-er.html — explorador ER navegavel do banco do Softlux.
Self-contained, sem CDN, mesma paleta dos outros HTML do diretorio."""
import os, csv, json, html, re

BASE = os.path.expanduser('~/projetos/cabinet-erp-web/docs/legado')
SCH = os.path.join(BASE, 'schema')

def rd(p, delim=','):
    with open(p, encoding='utf-8-sig') as f:
        return list(csv.DictReader(f, delimiter=delim))

cols = rd(os.path.join(SCH, 'bdprincipal-colunas.csv'))
fks = rd(os.path.join(SCH, 'bdprincipal-fks.csv'))
lin = rd(os.path.join(SCH, 'bdprincipal-linhas.csv'))
idx = rd(os.path.join(SCH, 'bdprincipal-indices.csv'))
menu = rd(os.path.join(BASE, 'config/menu-form-tabela.csv'), ';')

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

# grafo de FK
out_fk, in_fk = {}, {}
for r in fks:
    o, d = r['tabela_origem'], r['tabela_destino']
    out_fk.setdefault(o, []).append({'t': d, 'c': r['coluna_origem'], 'dc': r['coluna_destino']})
    in_fk.setdefault(d, []).append({'t': o, 'c': r['coluna_origem'], 'dc': r['coluna_destino']})

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

function abre(t){
  atual=t; const d=D[t]; if(!d) return;
  const pk=new Set(d.pk);
  let h='<h2>'+t+'</h2><div class="meta">';
  h+=d.n?'<span class="tag vv">'+fmt(d.n)+' linhas</span>':'<span class="tag">vazia</span>';
  h+='<span class="tag">'+d.c.length+' colunas</span>';
  h+=d.pk.length?'<span class="tag">PK: '+d.pk.join(' + ')+'</span>':'<span class="tag al">SEM chave primária</span>';
  h+='</div>';

  h+='<div class="grade"><div class="bloco"><h3>Aponta para ('+d.o.length+')</h3>';
  h+=d.o.length?'<table>'+d.o.map(f=>'<tr><td class="fk">'+f.c+'</td><td>→ '+link(f.t)+'<span class="fk"> ('+f.dc+')</span></td></tr>').join('')+'</table>':'<p class="nada">nenhuma FK de saída</p>';
  h+='</div><div class="bloco"><h3>Apontam para cá ('+d.i.length+')</h3>';
  h+=d.i.length?'<table>'+d.i.map(f=>'<tr><td>'+link(f.t)+'</td><td class="fk">'+f.c+'</td></tr>').join('')+'</table>':'<p class="nada">ninguém referencia</p>';
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
const inicial=decodeURIComponent(location.hash.slice(1));
abre(D[inicial]?inicial:'Venda');
"""

HTML = """<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Softlux — explorador do schema</title>
<style>%s</style></head><body>
<header>
<h1>Softlux — explorador do schema</h1>
<div class="sub">Navegue pelas %d tabelas de <code>bdprincipal</code> seguindo as chaves estrangeiras.
Clique num nome de tabela para saltar. Referência de <b>leitura</b>: o schema do Cabinet não sai
daqui — o que sai é o entendimento do negócio. O que <b>não</b> replicar está na seção 7 do README.</div>
<div class="stats">
<span><b>%d</b> tabelas</span><span><b>%d</b> com dado</span><span><b>%d</b> vazias</span>
<span><b>%d</b> FKs</span><span><b>%d</b> sem chave primária</span>
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

saida = HTML % (CSS, len(dados), len(dados), vivas, len(dados) - vivas, len(fks), sem_pk,
                J, JS)
p = os.path.join(BASE, 'softlux-er.html')
open(p, 'w', encoding='utf-8').write(saida)
print('softlux-er.html | %d tabelas · %d com dado · %d FKs · %d sem PK · %.0f KB'
      % (len(dados), vivas, len(fks), sem_pk, os.path.getsize(p) / 1024))
