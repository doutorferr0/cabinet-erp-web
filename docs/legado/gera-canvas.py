#!/usr/bin/env python3
"""Gera softlux-canvas.html — diagrama ER interativo, estilo Azimutt, auto-contido.

Canvas com pan/zoom · cards arrastáveis · linha liga COLUNA a COLUNA · declarada
sólida, inferida tracejada · presets por domínio · busca adiciona tabela ·
clique numa coluna com ligação traz a tabela vizinha · posições salvas no
navegador (localStorage). Mesmos dados e mesma inferência dos outros geradores.
"""
import os, csv, re, json, collections

HERE = os.path.dirname(os.path.abspath(__file__))
def _acha(*cands):
    for c in cands:
        if os.path.exists(c):
            return c
    raise SystemExit('pasta não encontrada: %r' % (cands,))
SCH = _acha(os.path.join(HERE, 'schema'), os.path.join(HERE, '..', 'softlux-schema'))

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
for r in idx:
    if r['is_included_column'] == 'True' or r['tabela'] in SISTEMA:
        continue
    if r['is_primary_key'] == 'True':
        pk[r['tabela']].append((int(r['key_ordinal']), r['coluna']))
pk = {t: [c for _, c in sorted(v)] for t, v in pk.items()}

# ---------- relações: declaradas + inferidas (mesma lógica dos irmãos) ----------
tipo_base = {(t, c['coluna'].lower()): c['tipo'] for t, cs in tcols.items() for c in cs}
dono = {}
for t, k in pk.items():
    if len(k) == 1:
        dono.setdefault(k[0].lower(), []).append((t, k[0]))
dono = {c: ts[0] for c, ts in dono.items() if len(ts) == 1}
ocorre = collections.Counter(c['coluna'].lower() for cs in tcols.values() for c in cs)
RUIDO = {'emp_codigo', 'usr_codigo', 'usr_cod_alteracao', 'usr_cod_inclusao',
         'id', 'codigo', 'cod', 'nome', 'descricao', 'situacao'}
SINONIMOS = {
    'epr_codnosso': ('produtos', 'Pro_codnosso'), 'pre_codnosso': ('produtos', 'Pro_codnosso'),
    'epr_acabamento': ('Acabamento', 'CodAcabamento'), 'pre_acabamento': ('Acabamento', 'CodAcabamento'),
    'pre_fornecedor': ('fornecedor', 'For_codigo'),
    'venamb_ndocpre': ('Venda', 'Ven_CodigoPre'), 'venind_ndocpre': ('Venda', 'Ven_CodigoPre'),
    'venaten_ndocpre': ('Venda', 'Ven_CodigoPre'),
}

RELS, _vistas = [], set()
def add(o, co, d, cd, inf):
    k = (o.lower(), co.lower(), d.lower(), cd.lower())
    if k in _vistas or (o.lower(), co.lower()) == (d.lower(), cd.lower()) or o == d:
        return
    _vistas.add(k)
    RELS.append([o, co, d, cd, 1 if inf else 0])

for r in fks:
    if r['tabela_origem'] in SISTEMA or r['tabela_destino'] in SISTEMA:
        continue
    add(r['tabela_origem'], r['coluna_origem'], r['tabela_destino'], r['coluna_destino'], False)
for t, cs in tcols.items():
    for c in cs:
        cl = c['coluna'].lower()
        if cl in SINONIMOS:
            alvo, ac = SINONIMOS[cl]
            if alvo in tcols:
                add(t, c['coluna'], alvo, ac, True)
            continue
        achado = dono.get(cl)
        if not achado:
            continue
        alvo, ac = achado
        if alvo == t or cl in RUIDO or ocorre[cl] > 60:
            continue
        if tipo_base.get((t, cl)) != tipo_base.get((alvo, cl)):
            continue
        if len(pk.get(t, [])) == 1 and pk[t][0].lower() == cl:
            continue
        add(t, c['coluna'], alvo, ac, True)

# ---------- domínios e presets ----------
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
def dominio(t):
    for n, rx in DOM_RX:
        if rx.match(t):
            return n
    return 'outros'

NUCLEO = ['Clientes', 'fornecedor', 'Indicacoes', 'produtos', 'ProdutosFornecedores',
          'Preco_Produto', 'Custo', 'Indice_preco', 'Acabamento', 'GrupoProduto',
          'Venda', 'VendaProduto', 'VendaAmbiente', 'VendaServico', 'VendaIndicacao',
          'VendaAtendente', 'VendaDesconto', 'Ambiente', 'Obras', 'CategoriaVenda',
          'pedido_compra', 'Pedido_compra_det', 'ordem_compra', 'ordem_compra_det',
          'Nota_entrada', 'nota_entrada_det', 'Estoque_produto', 'estoque_log', 'EstoqueTipo']

com_dado = [t for t in tcols if linhas.get(t, 0) > 0]
PRESETS = collections.OrderedDict()
PRESETS['núcleo do negócio'] = [t for t in NUCLEO if t in tcols]
for dom, _ in DOMINIOS:
    ts = [t for t in com_dado if dominio(t) == dom]
    if ts:
        PRESETS[dom] = ts

def tipo_curto(c):
    t, n = c['tipo'], c['max_length']
    if t in ('nvarchar', 'varchar', 'char', 'nchar'):
        if n in ('-1', '', None):
            return t + '(max)'
        return '%s(%s)' % (t, int(n) // 2 if t.startswith('n') else n)
    if t in ('decimal', 'numeric'):
        return '%s(%s,%s)' % (t, c['precision'], c['scale'])
    return t

T = {}
for t, cs in tcols.items():
    T[t] = {
        'n': linhas.get(t, 0),
        'dom': dominio(t),
        'pk': pk.get(t, []),
        'c': [[c['coluna'], tipo_curto(c)] for c in cs],
    }

ORDEM_DOM = ['cadastro', 'produto', 'venda', 'compra', 'estoque',
             'financeiro', 'fiscal', 'sistema', 'outros']
DADOS = json.dumps({'T': T, 'R': RELS, 'P': {k: v for k, v in PRESETS.items()},
                    'D': ORDEM_DOM},
                   ensure_ascii=False, separators=(',', ':'))

HTML = r"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Softlux — diagrama ER</title>
<style>
:root{--creme:#FAF6EE;--papel:#FFFDF8;--tinta:#1C1A17;--tinta2:#5A544B;--tinta3:#8B8377;
--linha:#E2DACB;--sel:#0091FF}
*{box-sizing:border-box}
body{margin:0;background:var(--creme);color:var(--tinta);overflow:hidden;
font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{position:fixed;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;gap:14px;
padding:10px 16px;background:var(--papel);border-bottom:1px solid var(--linha)}
header h1{margin:0;font-size:15px;white-space:nowrap}
header .legenda{margin-left:auto;display:flex;gap:16px;align-items:center;font-size:11.5px;
color:var(--tinta2);white-space:nowrap}
header .legenda svg{vertical-align:middle}
select,button{font:inherit;font-size:13px;padding:6px 10px;border:1px solid var(--linha);
border-radius:6px;background:var(--papel);color:var(--tinta);cursor:pointer;white-space:nowrap}
button:hover{border-color:var(--sel)}
#buscawrap{position:relative}
#busca{width:260px;padding:6px 10px;border:1px solid var(--linha);border-radius:6px;
background:var(--creme);font:inherit;font-size:13px}
#hits{position:absolute;top:34px;left:0;width:330px;max-height:330px;overflow:auto;z-index:40;
background:var(--papel);border:1px solid var(--linha);border-radius:8px;
box-shadow:0 8px 22px rgba(28,26,23,.14);display:none}
#hits a{display:flex;justify-content:space-between;gap:10px;padding:6px 12px;cursor:pointer;
font-size:12.5px;color:var(--tinta);text-decoration:none}
#hits a:hover{background:var(--creme)}
#hits .q{color:var(--tinta3);font-size:11px;flex:none}
#viewport{position:absolute;inset:0;top:49px;overflow:hidden;cursor:grab}
#viewport.pan{cursor:grabbing}
#mundo{position:absolute;left:0;top:0;transform-origin:0 0}
#fios{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
#fios path.fio{pointer-events:stroke}
.card{position:absolute;width:236px;background:var(--papel);border:1.6px solid var(--tinta3);
border-radius:9px;box-shadow:0 2px 8px rgba(28,26,23,.10);user-select:none}
.card.mexe{box-shadow:0 10px 26px rgba(28,26,23,.22);z-index:10}
.card .hd{display:flex;align-items:center;gap:6px;padding:6px 8px 6px 10px;cursor:move;
border-bottom:1px solid var(--linha);border-radius:8px 8px 0 0;background:var(--creme)}
.card .hd b{font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.card .hd .n{font-size:10px;color:var(--tinta3);white-space:nowrap}
.card .hd .bt{cursor:pointer;color:var(--tinta3);font-size:13px;line-height:1;padding:1px 3px;
border-radius:4px}
.card .hd .bt:hover{background:var(--linha);color:var(--tinta)}
.row{display:flex;align-items:center;gap:5px;height:21px;padding:0 8px;font-size:11px;
font-family:ui-monospace,Consolas,monospace;border-top:1px solid #F3EDE0;white-space:nowrap}
.row .ic{width:10px;flex:none;font-size:8.5px;color:#C9BFA9}
.row .ic.k{color:#C2410C}
.row .nm{overflow:hidden;text-overflow:ellipsis}
.row .tp{margin-left:auto;color:var(--tinta3);font-size:9.5px;flex:none}
.row.fk{cursor:pointer}
.row.fk:hover{background:var(--creme)}
.row.fk .nm{color:#0060B0;font-weight:600}
.row.acesa{background:#FFF3D6}
.mais{font-size:10.5px;color:var(--sel);padding:4px 8px;cursor:pointer;border-top:1px solid #F3EDE0}
.mais:hover{text-decoration:underline}
#painel{position:fixed;left:16px;bottom:16px;z-index:30;background:var(--papel);
border:1px solid var(--linha);border-radius:10px;padding:10px 12px;font-size:12px;
color:var(--tinta2);box-shadow:0 4px 14px rgba(28,26,23,.10);max-width:290px}
#painel b{color:var(--tinta)}
#zoombar{position:fixed;right:16px;bottom:16px;z-index:30;display:flex;gap:6px}
#zoombar button{width:34px}
.dica{position:fixed;z-index:50;background:var(--tinta);color:var(--papel);font-size:11.5px;
padding:4px 9px;border-radius:6px;pointer-events:none;display:none;max-width:340px}
</style></head><body>
<header>
<h1>Softlux — diagrama ER</h1>
<label style="font-size:12px;color:var(--tinta2)">preset</label>
<select id="preset"></select>
<div id="buscawrap"><input id="busca" type="search" placeholder="adicionar tabela… ( / )"
 autocomplete="off"><div id="hits"></div></div>
<button onclick="autoLayout();encaixa()">↺ layout</button>
<button onclick="encaixa()">⊡ caber na tela</button>
<button onclick="carregaPreset(presetAtual,true)" title="volta o preset ao estado original">⟲ restaurar preset</button>
<div class="legenda">
<span><svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" stroke="#5A544B" stroke-width="2"/></svg> declarada</span>
<span><svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" stroke="#5A544B" stroke-width="2" stroke-dasharray="5 4"/></svg> inferida</span>
<span>◆ chave · azul = liga (clique traz a vizinha)</span>
</div>
</header>
<div id="viewport"><div id="mundo"><svg id="fios" width="26000" height="18000"></svg><div id="cartas"></div></div></div>
<div id="painel"></div>
<div id="zoombar"><button onclick="zoomBt(1.25)">+</button><button onclick="zoomBt(0.8)">−</button></div>
<div class="dica" id="dica"></div>
<script>
const DADOS = __DADOS__;
const T = DADOS.T, R = DADOS.R, PRESETS = DADOS.P, ORD_DOM = DADOS.D||[];
const COR = {cadastro:'#7A5CB8',produto:'#B7791F',venda:'#C2410C',compra:'#0060B0',
             estoque:'#2E7D32',financeiro:'#B0306B',fiscal:'#8A6D3B',sistema:'#8B8377',outros:'#5A544B'};
const $=s=>document.querySelector(s);
const fmt=n=>n?n.toLocaleString('pt-BR'):'vazia';
const HD=34, ROW=21, CW=236;

// relações indexadas por tabela
const relDe = {};
R.forEach((r,i)=>{ relDe[r[0]]=relDe[r[0]]||[]; relDe[r[0]].push(i);
                   relDe[r[2]]=relDe[r[2]]||[]; relDe[r[2]].push(i); });

let aberto = {};        // t -> {x,y,exp}
let view = {x:40,y:40,k:1};
let presetAtual = 'núcleo do negócio';

function chaveStore(){ return 'softlux-canvas.v2:'+presetAtual; }
function salva(){ try{ localStorage.setItem(chaveStore(),
  JSON.stringify({aberto:aberto,view:view})); }catch(e){} }
function carrega(){ try{ const s=localStorage.getItem(chaveStore());
  if(s){ const j=JSON.parse(s);
    if(!j.aberto||!Object.keys(j.aberto).length) return false;  // vazio salvo não vale
    aberto=j.aberto; view=j.view||view; return true; } }catch(e){}
  return false; }

// ---- colunas visíveis de um card: PK + colunas que ligam; exp = todas
function ligadas(t){
  const s=new Set();
  (relDe[t]||[]).forEach(i=>{ const r=R[i];
    if(r[0]===t)s.add(r[1].toLowerCase()); if(r[2]===t)s.add(r[3].toLowerCase()); });
  return s;
}
function linhasCard(t){
  const d=T[t], lig=ligadas(t), chave=new Set(d.pk.map(c=>c.toLowerCase()));
  if(aberto[t]&&aberto[t].exp) return d.c.map(c=>c[0]);
  const vis=[];
  d.c.forEach(c=>{ const cl=c[0].toLowerCase();
    if(chave.has(cl)||lig.has(cl)) vis.push(c[0]); });
  return vis.length?vis:d.c.slice(0,3).map(c=>c[0]);
}

// ---- render dos cards
function render(){
  const wrap=$('#cartas'); wrap.innerHTML='';
  for(const t in aberto){
    const d=T[t], p=aberto[t], cor=COR[d.dom];
    const vis=linhasCard(t), chave=new Set(d.pk.map(c=>c.toLowerCase())), lig=ligadas(t);
    const el=document.createElement('div');
    el.className='card'; el.dataset.t=t;
    el.style.left=p.x+'px'; el.style.top=p.y+'px';
    el.style.borderColor=cor;
    const tipos={}; d.c.forEach(c=>tipos[c[0]]=c[1]);
    let h='<div class="hd" style="background:'+cor+'14"><b title="'+t+'" style="color:'+cor+'">'+t+
      '</b><span class="n">'+fmt(d.n)+'</span>'+
      '<span class="bt" title="remove do canvas" onclick="fecha(\''+t+'\');event.stopPropagation()">×</span></div>';
    vis.forEach(c=>{
      const cl=c.toLowerCase(), ehPk=chave.has(cl), ehFk=lig.has(cl);
      h+='<div class="row'+(ehFk?' fk':'')+'" data-c="'+cl+'"'+
         (ehFk?' onclick="clicaCol(\''+t+'\',\''+cl.replace(/'/g,"\\'")+'\')"':'')+'>'+
         '<span class="ic'+(ehPk?' k':'')+'">'+(ehPk?'◆':'•')+'</span>'+
         '<span class="nm">'+c+'</span><span class="tp">'+(tipos[c]||'')+'</span></div>';
    });
    const resto=d.c.length-vis.length;
    if(!(p.exp)&&resto>0)
      h+='<div class="mais" onclick="expande(\''+t+'\',1)">+ '+resto+' colunas</div>';
    if(p.exp)
      h+='<div class="mais" onclick="expande(\''+t+'\',0)">− só chave e ligações</div>';
    el.innerHTML=h;
    el.querySelector('.hd').addEventListener('mousedown',e=>arrasta(e,t,el));
    el.addEventListener('mouseenter',()=>acende(t));
    el.addEventListener('mouseleave',apaga);
    wrap.appendChild(el);
  }
  desenha(); painel(); aplicaView(); salva();
}

function portaY(t, col){
  const p=aberto[t]; if(!p) return 0;
  const vis=linhasCard(t);
  const i=vis.findIndex(c=>c.toLowerCase()===col.toLowerCase());
  if(i<0) return p.y+HD/2;
  return p.y+HD+i*ROW+ROW/2;
}

function alturaCard(t){
  const n=linhasCard(t).length, d=T[t], p=aberto[t];
  const mais=(p&&p.exp)||n<d.c.length?24:6;
  return HD+n*ROW+mais;
}

// ---- áreas por domínio (estilo ChartDB): bbox dos cards do domínio + rótulo
function areas(){
  const por={};
  for(const t in aberto){ const dm=T[t].dom; (por[dm]=por[dm]||[]).push(t); }
  let h='';
  const ordem=ORD_DOM.filter(d=>por[d]).concat(Object.keys(por).filter(d=>!ORD_DOM.includes(d)));
  ordem.forEach(dm=>{
    const ts=por[dm]; if(!ts||!ts.length) return;
    let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;
    ts.forEach(t=>{ const p=aberto[t];
      x1=Math.min(x1,p.x); y1=Math.min(y1,p.y);
      x2=Math.max(x2,p.x+CW); y2=Math.max(y2,p.y+alturaCard(t)); });
    const cor=COR[dm]||'#8B8377', PAD=26;
    h+='<g pointer-events="none">'+
       '<rect x="'+(x1-PAD)+'" y="'+(y1-PAD-14)+'" width="'+(x2-x1+2*PAD)+'" height="'+(y2-y1+2*PAD+14)+
       '" rx="14" fill="'+cor+'" fill-opacity="0.045" stroke="'+cor+'" stroke-opacity="0.4" stroke-width="1.6"/>'+
       '<text x="'+(x1-PAD+14)+'" y="'+(y1-PAD+8)+'" font-size="13" font-weight="700" '+
       'letter-spacing=".06em" fill="'+cor+'">'+dm.toUpperCase()+'</text></g>';
  });
  return h;
}

// ---- fios
function desenha(){
  const svg=$('#fios'); let h=areas();
  R.forEach((r,i)=>{
    const [o,co,d,cd,inf]=r;
    if(!aberto[o]||!aberto[d]) return;
    const po=aberto[o], pd=aberto[d];
    const oDir = po.x+CW/2 < pd.x+CW/2;
    const x1 = oDir? po.x+CW : po.x, x2 = oDir? pd.x : pd.x+CW;
    const y1 = portaY(o,co), y2 = portaY(d,cd);
    const mx=(x1+x2)/2;
    h+='<g class="fio-g" data-i="'+i+'">'+
       '<path class="fio" d="M'+x1+' '+y1+' C '+mx+' '+y1+', '+mx+' '+y2+', '+x2+' '+y2+
       '" fill="none" stroke="transparent" stroke-width="11"/>'+
       '<path class="vis" d="M'+x1+' '+y1+' C '+mx+' '+y1+', '+mx+' '+y2+', '+x2+' '+y2+
       '" fill="none" stroke="#8B8377" stroke-width="1.7" opacity="0.85"'+
       (inf?' stroke-dasharray="6 5"':'')+'/>'+
       '<circle cx="'+x1+'" cy="'+y1+'" r="3" fill="#8B8377"/>'+
       '<circle cx="'+x2+'" cy="'+y2+'" r="3" fill="#8B8377"/>'+
       '<text x="'+(x1+(oDir?6:-13))+'" y="'+(y1-5)+'" font-size="10" font-weight="700" fill="#8B8377">N</text>'+
       '<text x="'+(x2+(oDir?-12:6))+'" y="'+(y2-5)+'" font-size="10" font-weight="700" fill="#8B8377">1</text></g>';
  });
  svg.innerHTML=h;
  svg.querySelectorAll('.fio-g').forEach(g=>{
    g.querySelector('.fio').addEventListener('mousemove',e=>dicaFio(e,+g.dataset.i));
    g.querySelector('.fio').addEventListener('mouseleave',()=>{$('#dica').style.display='none';apaga();});
    g.querySelector('.fio').addEventListener('mouseenter',()=>acendeFio(+g.dataset.i));
  });
}

// ---- destaque
function acendeFio(i){
  document.querySelectorAll('#fios .fio-g').forEach(g=>{
    const on=+g.dataset.i===i;
    g.querySelector('.vis').setAttribute('stroke', on?'#0060B0':'#8B8377');
    g.querySelector('.vis').setAttribute('stroke-width', on?'3':'1.7');
    g.querySelector('.vis').setAttribute('opacity', on?'1':'0.18');
  });
  const r=R[i];
  marca(r[0],r[1],true); marca(r[2],r[3],true);
}
function acende(t){
  document.querySelectorAll('#fios .fio-g').forEach(g=>{
    const r=R[+g.dataset.i], on=(r[0]===t||r[2]===t);
    g.querySelector('.vis').setAttribute('stroke', on?'#0060B0':'#8B8377');
    g.querySelector('.vis').setAttribute('opacity', on?'1':'0.15');
    g.querySelector('.vis').setAttribute('stroke-width', on?'2.6':'1.7');
  });
}
function apaga(){
  document.querySelectorAll('#fios .fio-g .vis').forEach(v=>{
    v.setAttribute('stroke','#8B8377'); v.setAttribute('opacity','0.85');
    v.setAttribute('stroke-width','1.7');});
  document.querySelectorAll('.row.acesa').forEach(r=>r.classList.remove('acesa'));
}
function marca(t,col,on){
  const el=document.querySelector('.card[data-t="'+t+'"] .row[data-c="'+col.toLowerCase()+'"]');
  if(el) el.classList.toggle('acesa',on);
}
function dicaFio(e,i){
  const r=R[i], d=$('#dica');
  d.textContent=r[0]+'.'+r[1]+' → '+r[2]+'.'+r[3]+(r[4]?'  (inferida — conferir)':'  (declarada)');
  d.style.display='block'; d.style.left=(e.clientX+14)+'px'; d.style.top=(e.clientY+10)+'px';
}

// ---- ações
function addTabela(t,x,y){
  if(!T[t]||aberto[t]) return;
  aberto[t]={x:Math.round(x||(-view.x+innerWidth/2)/view.k-CW/2),
             y:Math.round(y||(-view.y+innerHeight/2)/view.k-60), exp:0};
  render();
}
function fecha(t){ delete aberto[t]; render(); }
function expande(t,v){ aberto[t].exp=v; render(); }
function clicaCol(t,col){
  const p=aberto[t]; let k=0, achou=false;
  (relDe[t]||[]).forEach(i=>{ const r=R[i];
    const meu=(r[0]===t&&r[1].toLowerCase()===col)||(r[2]===t&&r[3].toLowerCase()===col);
    if(!meu) return;
    const outro=r[0]===t?r[2]:r[0];
    if(!aberto[outro]&&T[outro]){
      aberto[outro]={x:p.x+(r[0]===t?CW+130:-CW-130), y:p.y+k*150, exp:0}; k++; achou=true; }
  });
  if(achou) render();
}

// ---- layout automático (família Sugiyama, adaptado a blocos):
// 1. um BLOCO espacial por domínio, na ordem do fluxo do negócio;
// 2. blocos empacotados em PRANCHETA 2D (~16:9), não numa tira horizontal;
// 3. dentro do bloco, ordenação por BARYCENTER — cada tabela sobe/desce para perto
//    da média da posição dos vizinhos, iterado 3x para reduzir cruzamento de linha.
function autoLayout(){
  const ts=Object.keys(aberto); if(!ts.length) return;
  const dentro=new Set(ts);
  const grau={}, viz={};
  ts.forEach(t=>{grau[t]=0; viz[t]=[];});
  R.forEach(r=>{ if(dentro.has(r[0])&&dentro.has(r[2])){
    grau[r[0]]++; grau[r[2]]++; viz[r[0]].push(r[2]); viz[r[2]].push(r[0]); }});
  const por={};
  ts.forEach(t=>{ const dm=T[t].dom; (por[dm]=por[dm]||[]).push(t); });
  const ordem=ORD_DOM.filter(d=>por[d]).concat(Object.keys(por).filter(d=>!ORD_DOM.includes(d)));
  const ALVO=820, GY=40, GCOL=44, GAREA=170, GLINHA=200;

  function montaBloco(grupo){
    const cols=[[]]; let alt=0, maxAlt=0;
    grupo.forEach(t=>{ const h=alturaCard(t)+GY;
      if(alt+h>ALVO&&cols[cols.length-1].length){ maxAlt=Math.max(maxAlt,alt); cols.push([]); alt=0; }
      cols[cols.length-1].push(t); alt+=h; });
    maxAlt=Math.max(maxAlt,alt);
    return {cols, w: cols.length*(CW+GCOL)-GCOL, h: maxAlt-GY};
  }
  function posiciona(){
    const blocos=ordem.map(dm=>({dm, ...montaBloco(por[dm])}));
    const area=blocos.reduce((s,b)=>s+(b.w+GAREA)*(b.h+GLINHA),0);
    const LARG=Math.max(1500, Math.sqrt(area*1.9));   // prancheta tende a 16:9
    let x=90, y=130, linhaH=0;
    blocos.forEach(b=>{
      if(x>90 && x+b.w>LARG){ x=90; y+=linhaH+GLINHA; linhaH=0; }
      b.cols.forEach((c,j)=>{ let yy=y;
        c.forEach(t=>{ aberto[t].x=x+j*(CW+GCOL); aberto[t].y=yy; yy+=alturaCard(t)+GY; }); });
      linhaH=Math.max(linhaH,b.h); x+=b.w+GAREA;
    });
  }

  for(const dm in por) por[dm].sort((a,b)=>grau[b]-grau[a]);   // 1ª passada: grau
  posiciona();
  for(let it=0; it<3; it++){                                   // refinamento barycenter
    for(const dm in por){
      por[dm].sort((a,b)=>{
        const ba=viz[a].length? viz[a].reduce((s,v)=>s+aberto[v].y,0)/viz[a].length : aberto[a].y;
        const bb=viz[b].length? viz[b].reduce((s,v)=>s+aberto[v].y,0)/viz[b].length : aberto[b].y;
        return ba-bb; });
    }
    posiciona();
  }
  render();
}

// ---- presets
function carregaPreset(nome, forcaLayout){
  presetAtual=nome;
  if(!forcaLayout && carrega()){ render(); return; }
  aberto={};
  (PRESETS[nome]||[]).forEach(t=>{ aberto[t]={x:0,y:0,exp:0}; });
  autoLayout(); encaixa();
}

// ---- pan / zoom / drag
const vp=$('#viewport'), mundo=$('#mundo');
function aplicaView(){ mundo.style.transform='translate('+view.x+'px,'+view.y+'px) scale('+view.k+')'; }
vp.addEventListener('mousedown',e=>{
  if(e.target.closest('.card')) return;
  vp.classList.add('pan');
  const sx=e.clientX-view.x, sy=e.clientY-view.y;
  const mv=e2=>{ view.x=e2.clientX-sx; view.y=e2.clientY-sy; aplicaView(); };
  const up=()=>{ vp.classList.remove('pan'); salva();
    removeEventListener('mousemove',mv); removeEventListener('mouseup',up); };
  addEventListener('mousemove',mv); addEventListener('mouseup',up);
});
vp.addEventListener('wheel',e=>{
  e.preventDefault();
  const f=Math.exp(-e.deltaY*0.0012), k2=Math.min(2.5,Math.max(0.08,view.k*f));
  const rx=e.clientX, ry=e.clientY-49;
  view.x=rx-(rx-view.x)*(k2/view.k); view.y=ry-(ry-view.y)*(k2/view.k); view.k=k2;
  aplicaView(); salva();
},{passive:false});
function zoomBt(f){
  const k2=Math.min(2.5,Math.max(0.08,view.k*f));
  const rx=innerWidth/2, ry=(innerHeight-49)/2;
  view.x=rx-(rx-view.x)*(k2/view.k); view.y=ry-(ry-view.y)*(k2/view.k); view.k=k2;
  aplicaView(); salva();
}
function arrasta(e,t,el){
  e.preventDefault();
  el.classList.add('mexe');
  const p=aberto[t], sx=e.clientX, sy=e.clientY, ox=p.x, oy=p.y;
  const mv=e2=>{ p.x=ox+(e2.clientX-sx)/view.k; p.y=oy+(e2.clientY-sy)/view.k;
    el.style.left=p.x+'px'; el.style.top=p.y+'px'; desenha(); };
  const up=()=>{ el.classList.remove('mexe'); salva();
    removeEventListener('mousemove',mv); removeEventListener('mouseup',up); };
  addEventListener('mousemove',mv); addEventListener('mouseup',up);
}
function encaixa(){
  const ts=Object.keys(aberto); if(!ts.length) return;
  let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;
  ts.forEach(t=>{ const p=aberto[t];
    x1=Math.min(x1,p.x); y1=Math.min(y1,p.y);
    x2=Math.max(x2,p.x+CW); y2=Math.max(y2,p.y+alturaCard(t)); });
  const W=innerWidth, H=innerHeight-49;
  const k=Math.min(2, Math.min(W/(x2-x1+170), H/(y2-y1+170)));
  view.k=k; view.x=(W-(x2-x1)*k)/2-x1*k; view.y=(H-(y2-y1)*k)/2-y1*k;
  aplicaView(); salva();
}

// ---- busca e painel
const NOMES=Object.keys(T).sort((a,b)=>a.localeCompare(b));
$('#busca').addEventListener('input',e=>{
  const v=e.target.value.toLowerCase().trim(), hits=$('#hits');
  if(!v){hits.style.display='none';return;}
  const ts=NOMES.filter(t=>t.toLowerCase().includes(v)).slice(0,14);
  hits.innerHTML=ts.map(t=>'<a onclick="addTabela(\''+t+'\');this.parentNode.style.display=\'none\'">'+
    (aberto[t]?'✓ ':'')+t+'<span class="q">'+fmt(T[t].n)+'</span></a>').join('')||''
  ;hits.style.display=ts.length?'block':'none';
});
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&document.activeElement!==$('#busca')){e.preventDefault();$('#busca').focus();}
  if(e.key==='Escape'){$('#hits').style.display='none';$('#busca').blur();}
});
document.addEventListener('click',e=>{
  if(!e.target.closest('#buscawrap'))$('#hits').style.display='none';
});
function painel(){
  const ts=Object.keys(aberto);
  let nd=0,ni=0;
  R.forEach(r=>{ if(aberto[r[0]]&&aberto[r[2]]) r[4]?ni++:nd++; });
  $('#painel').innerHTML='<b>'+ts.length+'</b> tabelas no canvas · <b>'+nd+
    '</b> ligações declaradas · <b>'+ni+'</b> inferidas<br>'+
    'arraste o fundo = mover · roda do mouse = zoom · arraste o cabeçalho = mover tabela<br>'+
    'coluna azul traz a vizinha · posições ficam salvas neste navegador';
}

// ---- init
const sel=$('#preset');
Object.keys(PRESETS).forEach(p=>{
  const o=document.createElement('option'); o.value=p;
  o.textContent=p+' ('+PRESETS[p].length+')'; sel.appendChild(o);
});
sel.addEventListener('change',()=>carregaPreset(sel.value,false));
carregaPreset(presetAtual,false);
sel.value=presetAtual;
</script></body></html>
"""

saida = HTML.replace('__DADOS__', DADOS)
p = os.path.join(HERE, 'softlux-canvas.html')
open(p, 'w', encoding='utf-8').write(saida)
print('softlux-canvas.html | %d tabelas · %d relações (%d declaradas, %d inferidas) · %d presets · %d KB'
      % (len(T), len(RELS), sum(1 for r in RELS if not r[4]), sum(1 for r in RELS if r[4]),
         len(PRESETS), os.path.getsize(p) / 1024))
