#!/usr/bin/env python3
"""Schema NOVO do Cabinet — escopo inicial (venda + estoque) + esqueleto de compra.

Gera:
  cabinet-schema.dbml        para importar no ChartDB
  cabinet-mapeamento.html    canvas interativo (mesmo motor do softlux-canvas)

Fontes do desenho:
  - project-core @arquitetura: 2 níveis de tenancy (org = schema Postgres; empresa =
    tenant_id com PK/FK COMPOSTA + RLS FORCE). Catálogo é da ORG; preço/estoque/fiscal
    são do TENANT. Documento comercial congela snapshot na emissão.
  - contracts/openapi-v1.json: Partner unificado + link por tenant · variante =
    finish × size · kardex com balance_after · quote com environments e itens snapshot.
  - Fichas do legado ("não repetir"): numeração MAX+1 → document_sequences transacional ·
    saldo por valor absoluto → kardex imutável + saldo por trigger (ADR-009) ·
    Preco_Produto_Log sem PK → vigência em linhas · multi-DEPÓSITO como dimensão ·
    CatVen_Financeiro → sale_categories.generates_finance · permissão especial → ADR-014.

Convenções (não repetir em cada nota): dinheiro = centavos bigint · quantidade =
numeric(14,3) · CNPJ varchar(14) sem máscara · TODA tabela leva created_at/by,
updated_at/by (omitidas no desenho) · tabela tenant-scoped tem PK (tenant_id, id) e
FK composta (tenant_id, fk_id); org-scoped vive no schema da organização sem tenant_id.
Reserva Técnica: campo reservado em commission_rules, MODELAGEM ADIADA (blocker
Par_RTautomatico × Ven_RtAutomatico não resolvido).
"""
import os, json

HERE = os.path.dirname(os.path.abspath(__file__))
def _acha(*cands):
    for c in cands:
        if os.path.exists(c):
            return c
    raise SystemExit('não encontrado: %r' % (cands,))

U = 'uuid'; S = 'varchar'; TXT = 'text'; B = 'boolean'; I = 'int'; BIG = 'bigint'
QTY = 'numeric(14,3)'; PCT = 'numeric(7,4)'; TS = 'timestamptz'; D = 'date'

# (nome, modulo, escopo 'org'|'tenant', doc, [colunas], nota_extra)
# coluna = (nome, tipo, flags) — flags: k=pk, n=nullable
TABELAS = [
# ---------- núcleo ----------
('tenants', 'nucleo', 'org', 'empresa (CNPJ) dentro da organização — o tenant do nível 2',
 [('id', U, 'k'), ('name', S, ''), ('cnpj', 'varchar(14)', ''), ('active', B, '')], ''),
('employees', 'nucleo', 'org', 'identidade única na organização; papel é POR empresa',
 [('id', U, 'k'), ('name', S, ''), ('email', S, ''), ('password_hash', S, ''),
  ('must_change_password', B, ''), ('active', B, '')], ''),
('employee_tenants', 'nucleo', 'tenant', 'vínculo N:N com papel por empresa (RBAC do core)',
 [('tenant_id', U, 'k'), ('employee_id', U, 'k'), ('role', S, ''), ('active', B, '')], ''),
('catalog_lookups', 'nucleo', 'org', 'listas simples (unidade, tipo de peça, motivo de movimento…)',
 [('id', U, 'k'), ('kind', S, ''), ('name', S, ''), ('active', B, '')], ''),
('document_sequences', 'nucleo', 'tenant',
 'numeração transacional por documento e série — mata o MAX+1 do legado',
 [('tenant_id', U, 'k'), ('kind', S, 'k'), ('series', 'varchar(3)', 'k'),
  ('next_number', BIG, '')], 'uso: UPDATE … SET next_number = next_number + 1 RETURNING'),
# ---------- parceiros ----------
('partners', 'parceiros', 'org',
 'cliente, fornecedor e profissional no MESMO cadastro (contrato: is_customer/supplier/professional)',
 [('id', U, 'k'), ('legal_name', S, ''), ('trade_name', S, 'n'), ('document', 'varchar(14)', 'n'),
  ('email', S, 'n'), ('is_customer', B, ''), ('is_supplier', B, ''), ('is_professional', B, ''),
  ('registration', S, 'n'), ('payout_bank_info', 'jsonb', 'n'), ('active', B, '')],
 'registration = CREA/CAU/CFT do profissional; payout = dados bancários de comissão'),
('partner_tenant_links', 'parceiros', 'tenant',
 'vínculo do parceiro com CADA empresa: código, condição de pagamento, ativo (contrato: PartnerLink)',
 [('tenant_id', U, 'k'), ('partner_id', U, 'k'), ('code', S, 'n'),
  ('payment_terms', S, 'n'), ('credit_limit_cents', BIG, 'n'), ('active', B, '')], ''),
('construction_sites', 'parceiros', 'org', 'obra do cliente — dimensão do orçamento (legado: Obras)',
 [('id', U, 'k'), ('customer_id', U, ''), ('name', S, ''), ('address', S, 'n'),
  ('city', S, 'n'), ('uf', 'varchar(2)', 'n'), ('active', B, '')], ''),
# ---------- catálogo (ORG — 3 níveis do core; nível global entra com a vertical) ----------
('product_groups', 'catalogo', 'org', 'grupo de produto — base da comissão por grupo',
 [('id', U, 'k'), ('name', S, ''), ('active', B, '')], ''),
('finishes', 'catalogo', 'org', 'acabamento (legado: Acabamento, 248 vivos)',
 [('id', U, 'k'), ('code', S, ''), ('name', S, ''), ('active', B, '')], ''),
('products', 'catalogo', 'org', 'mestre do produto — specs da vertical ficam em specs jsonb',
 [('id', U, 'k'), ('code', S, ''), ('special_code', S, 'n'), ('short_code', S, 'n'),
  ('description', TXT, ''), ('group_id', U, 'n'), ('unit_in', S, 'n'), ('unit_out', S, 'n'),
  ('unit_factor', QTY, 'n'), ('specs', 'jsonb', 'n'), ('active', B, '')],
 '3 códigos do legado preservados; unidade entrada≠saída com fator'),
('product_variants', 'catalogo', 'org',
 'variante = acabamento × tamanho — a unidade de preço, estoque e item de venda',
 [('id', U, 'k'), ('product_id', U, ''), ('finish_id', U, 'n'), ('size', S, 'n'),
  ('active', B, '')], ''),
('product_suppliers', 'catalogo', 'org', 'multi-fornecedor por produto, com o código do produto NO fornecedor',
 [('product_id', U, 'k'), ('supplier_id', U, 'k'), ('supplier_code', S, 'n'),
  ('supplier_description', S, 'n'), ('active', B, '')], ''),
# ---------- preço ----------
('supplier_cost_profiles', 'preco', 'org',
 'perfil de encargos do fornecedor (legado: Custo, 40 colunas → estrutura tipada)',
 [('id', U, 'k'), ('supplier_id', U, ''), ('name', S, ''), ('cascade_discounts', 'jsonb', ''),
  ('ipi_percent', PCT, 'n'), ('freight_percent', PCT, 'n'), ('icms_percent', PCT, 'n'),
  ('st_percent', PCT, 'n'), ('active', B, '')], 'cascade_discounts = até 4 descontos em cascata'),
('supplier_price_indexes', 'preco', 'org',
 'índice multiplicador POR FORNECEDOR com vigência (mediana 2,56 no legado)',
 [('id', U, 'k'), ('supplier_id', U, ''), ('cost_profile_id', U, 'n'),
  ('index_value', 'numeric(8,4)', ''), ('valid_from', D, ''), ('valid_to', D, 'n')],
 'preço de venda = líquido de compra × índice, ANTES de imposto de saída'),
('variant_supplier_prices', 'preco', 'org',
 'preço de tabela do fornecedor por variante, com vigência — histórico em linhas, não em log sem PK',
 [('id', U, 'k'), ('variant_id', U, ''), ('supplier_id', U, ''),
  ('list_price_cents', BIG, ''), ('valid_from', D, ''), ('valid_to', D, 'n')], ''),
('variant_tenant_settings', 'preco', 'tenant',
 'o que é DA EMPRESA na variante: preço de venda vigente e estoque mínimo (core: preço/estoque = tenant)',
 [('tenant_id', U, 'k'), ('variant_id', U, 'k'), ('sale_price_cents', BIG, 'n'),
  ('min_stock', QTY, 'n'), ('active', B, '')], ''),
# ---------- venda ----------
('sale_categories', 'venda', 'tenant',
 'categoria da venda — decide se gera financeiro (legado: MOSTRAS/DOAÇÃO não geram)',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('name', S, ''), ('generates_finance', B, ''),
  ('affects_stock', B, ''), ('active', B, '')], ''),
('quotes', 'venda', 'tenant', 'orçamento — o documento central do negócio (contrato: Quote)',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('number', BIG, ''), ('series', 'varchar(3)', 'n'),
  ('status', S, ''), ('issued_at', D, 'n'), ('expires_at', D, 'n'), ('customer_id', U, ''),
  ('site_id', U, 'n'), ('project_name', S, 'n'), ('folder_number', S, 'n'),
  ('category_id', U, 'n'), ('discount_mode', S, ''), ('discount_percent', PCT, ''),
  ('total_cents', BIG, ''), ('closed_at', D, 'n')],
 'number vem de document_sequences; status: draft|issued|accepted|expired|cancelled'),
('quote_environments', 'venda', 'tenant', 'ambiente da obra — agrupa e numera os itens no impresso',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('quote_id', U, ''), ('code', U, ''),
  ('name', S, ''), ('sort', I, '')], ''),
('quote_items', 'venda', 'tenant',
 'item com SNAPSHOT congelado na emissão (core: documento nunca referencia preço vivo)',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('quote_id', U, ''), ('line_number', I, ''),
  ('environment_id', U, 'n'), ('variant_id', U, 'n'), ('description', TXT, ''),
  ('finish', S, 'n'), ('size', S, 'n'), ('unit', S, 'n'), ('quantity', QTY, ''),
  ('unit_price_cents', BIG, ''), ('discount_percent', PCT, ''), ('supplier_id', U, 'n'),
  ('supplier_name', S, 'n'), ('supplier_code', S, 'n'), ('product_group', S, 'n'),
  ('piece_type', S, 'n'), ('total_cents', BIG, '')],
 'variant_id nullable = produto fictício/pré-produto permitido, como no legado'),
('quote_salespeople', 'venda', 'tenant', 'consultores — aceita vários, com percentual (legado: VendaAtendente)',
 [('tenant_id', U, 'k'), ('quote_id', U, 'k'), ('employee_id', U, 'k'),
  ('percent', PCT, ''), ('is_primary', B, '')], ''),
('quote_professionals', 'venda', 'tenant', 'profissional que indicou — base da comissão (legado: VendaIndicacao)',
 [('tenant_id', U, 'k'), ('quote_id', U, 'k'), ('partner_id', U, 'k'), ('percent', PCT, 'n')], ''),
('commission_rules', 'venda', 'tenant',
 'percentual do profissional POR GRUPO de produto (legado: VendaIndicacaoGrupProd, 232 mil linhas)',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('professional_id', U, ''), ('product_group_id', U, ''),
  ('percent', PCT, ''), ('reserve_percent', PCT, 'n'), ('active', B, '')],
 'reserve_percent = Reserva Técnica: RESERVADO, modelagem adiada (blocker em aberto)'),
('sales_orders', 'venda', 'tenant',
 'pedido = orçamento aceito, 1:1 — conversão é transição, NÃO cópia (insight do legado preservado com ciclo próprio)',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('quote_id', U, ''), ('order_number', BIG, ''),
  ('series', 'varchar(3)', 'n'), ('status', S, ''), ('accepted_at', D, ''),
  ('delivery_forecast', D, 'n')],
 'status: open|partially_delivered|delivered|cancelled; order_number de document_sequences'),
# ---------- estoque ----------
('stock_locations', 'estoque', 'tenant', 'depósito/local — o legado tem 4; local é DIMENSÃO, não gambiarra',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('name', S, ''), ('kind', S, 'n'), ('active', B, '')], ''),
('stock_movements', 'estoque', 'tenant',
 'kardex IMUTÁVEL — ADR-009: o saldo nasce do banco, nunca de valor absoluto vindo da aplicação',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('variant_id', U, ''), ('location_id', U, ''),
  ('delta', QTY, ''), ('reason', S, ''), ('source_kind', S, 'n'), ('source_id', U, 'n'),
  ('balance_after', QTY, ''), ('occurred_at', TS, ''), ('employee_id', U, 'n')],
 'balance_after preenchido pelo banco na MESMA transação; duas baixas simultâneas não se perdem'),
('stock_balances', 'estoque', 'tenant', 'saldo corrente por variante × local — mantido por trigger do kardex',
 [('tenant_id', U, 'k'), ('variant_id', U, 'k'), ('location_id', U, 'k'), ('qty', QTY, '')], ''),
('stock_reservations', 'estoque', 'tenant', 'reserva de material para pedido aceito',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('order_id', U, ''), ('variant_id', U, ''),
  ('location_id', U, 'n'), ('qty', QTY, ''), ('status', S, '')], ''),
# ---------- compra (esqueleto do fluxo puxado) ----------
('purchase_needs', 'compra', 'tenant',
 'necessidade de compra nascida do pedido de venda sem saldo (legado: pedido_compra)',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('sales_order_id', U, 'n'), ('variant_id', U, ''),
  ('qty', QTY, ''), ('status', S, '')], 'status: open|grouped|cancelled'),
('purchase_orders', 'compra', 'tenant',
 'ordem ao fornecedor, agrupando necessidades — a empresa compradora É o tenant (Vertz ou Via HF)',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('number', BIG, ''), ('supplier_id', U, ''),
  ('status', S, ''), ('ordered_at', D, 'n'), ('expected_at', D, 'n'),
  ('min_invoice_cents', BIG, 'n'), ('carrier', S, 'n')], ''),
('purchase_order_items', 'compra', 'tenant', 'item da ordem, rastreando a necessidade de origem',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('purchase_order_id', U, ''), ('need_id', U, 'n'),
  ('variant_id', U, ''), ('qty', QTY, ''), ('cost_cents', BIG, 'n')], ''),
('goods_receipts', 'compra', 'tenant',
 'nota do fornecedor: dá entrada no estoque e (por categoria) dispara o financeiro futuro',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('purchase_order_id', U, 'n'), ('supplier_id', U, ''),
  ('invoice_number', S, ''), ('received_at', D, ''), ('generates_finance', B, '')], ''),
('goods_receipt_items', 'compra', 'tenant', 'item recebido — cada linha vira um stock_movement de entrada',
 [('tenant_id', U, 'k'), ('id', U, 'k'), ('receipt_id', U, ''), ('variant_id', U, ''),
  ('qty', QTY, ''), ('unit_cost_cents', BIG, 'n')], ''),
]

# relações (origem.coluna → destino.coluna). FK de tabela tenant para tabela tenant é
# COMPOSTA (tenant_id junto) — aqui desenhamos a coluna principal; o DBML anota isso.
RELS = [
 ('employee_tenants', 'tenant_id', 'tenants', 'id'),
 ('employee_tenants', 'employee_id', 'employees', 'id'),
 ('partner_tenant_links', 'tenant_id', 'tenants', 'id'),
 ('partner_tenant_links', 'partner_id', 'partners', 'id'),
 ('construction_sites', 'customer_id', 'partners', 'id'),
 ('products', 'group_id', 'product_groups', 'id'),
 ('product_variants', 'product_id', 'products', 'id'),
 ('product_variants', 'finish_id', 'finishes', 'id'),
 ('product_suppliers', 'product_id', 'products', 'id'),
 ('product_suppliers', 'supplier_id', 'partners', 'id'),
 ('supplier_cost_profiles', 'supplier_id', 'partners', 'id'),
 ('supplier_price_indexes', 'supplier_id', 'partners', 'id'),
 ('supplier_price_indexes', 'cost_profile_id', 'supplier_cost_profiles', 'id'),
 ('variant_supplier_prices', 'variant_id', 'product_variants', 'id'),
 ('variant_supplier_prices', 'supplier_id', 'partners', 'id'),
 ('variant_tenant_settings', 'variant_id', 'product_variants', 'id'),
 ('variant_tenant_settings', 'tenant_id', 'tenants', 'id'),
 ('quotes', 'customer_id', 'partners', 'id'),
 ('quotes', 'site_id', 'construction_sites', 'id'),
 ('quotes', 'category_id', 'sale_categories', 'id'),
 ('quote_environments', 'quote_id', 'quotes', 'id'),
 ('quote_items', 'quote_id', 'quotes', 'id'),
 ('quote_items', 'environment_id', 'quote_environments', 'id'),
 ('quote_items', 'variant_id', 'product_variants', 'id'),
 ('quote_items', 'supplier_id', 'partners', 'id'),
 ('quote_salespeople', 'quote_id', 'quotes', 'id'),
 ('quote_salespeople', 'employee_id', 'employees', 'id'),
 ('quote_professionals', 'quote_id', 'quotes', 'id'),
 ('quote_professionals', 'partner_id', 'partners', 'id'),
 ('commission_rules', 'professional_id', 'partners', 'id'),
 ('commission_rules', 'product_group_id', 'product_groups', 'id'),
 ('sales_orders', 'quote_id', 'quotes', 'id'),
 ('stock_movements', 'variant_id', 'product_variants', 'id'),
 ('stock_movements', 'location_id', 'stock_locations', 'id'),
 ('stock_movements', 'employee_id', 'employees', 'id'),
 ('stock_balances', 'variant_id', 'product_variants', 'id'),
 ('stock_balances', 'location_id', 'stock_locations', 'id'),
 ('stock_reservations', 'order_id', 'sales_orders', 'id'),
 ('stock_reservations', 'variant_id', 'product_variants', 'id'),
 ('purchase_needs', 'sales_order_id', 'sales_orders', 'id'),
 ('purchase_needs', 'variant_id', 'product_variants', 'id'),
 ('purchase_orders', 'supplier_id', 'partners', 'id'),
 ('purchase_order_items', 'purchase_order_id', 'purchase_orders', 'id'),
 ('purchase_order_items', 'need_id', 'purchase_needs', 'id'),
 ('purchase_order_items', 'variant_id', 'product_variants', 'id'),
 ('goods_receipts', 'purchase_order_id', 'purchase_orders', 'id'),
 ('goods_receipts', 'supplier_id', 'partners', 'id'),
 ('goods_receipt_items', 'receipt_id', 'goods_receipts', 'id'),
 ('goods_receipt_items', 'variant_id', 'product_variants', 'id'),
]

nomes = {t[0] for t in TABELAS}
for o, co, d, cd in RELS:
    assert o in nomes and d in nomes, (o, d)

# ---------------------------------------------------------------- DBML
L = ['// Cabinet — schema novo (escopo inicial + esqueleto de compra)',
     '// Gerado por gera-cabinet-schema.py. Não editar à mão: regerar.',
     '// Convenções: dinheiro = centavos bigint · quantidade = numeric(14,3) ·',
     '//   toda tabela tem created_at/by, updated_at/by (omitidas aqui) ·',
     '//   tabela tenant-scoped: PK (tenant_id, id), FK COMPOSTA (tenant_id, fk) + RLS FORCE ·',
     '//   org-scoped: vive no schema Postgres da organização, sem tenant_id.',
     '']
for nome, mod, escopo, doc, colunas, nota in TABELAS:
    L.append('Table %s {' % nome)
    chaves = [c for c, _t, f in colunas if 'k' in f]
    for c, t, f in colunas:
        attrs = []
        if len(chaves) == 1 and 'k' in f:
            attrs.append('pk')
        if 'n' not in f and 'k' not in f:
            attrs.append('not null')
        L.append('  %s %s%s' % (c, t, (' [%s]' % ', '.join(attrs)) if attrs else ''))
    if len(chaves) > 1:
        L.append('  indexes {')
        L.append('    (%s) [pk]' % ', '.join(chaves))
        L.append('  }')
    obs = '%s · %s · %s' % (escopo.upper(), mod, doc)
    if nota:
        obs += ' — ' + nota
    L.append("  Note: '%s'" % obs.replace("'", "\\'"))
    L.append('}')
    L.append('')
L.append('// relações — FK entre tabelas tenant-scoped é COMPOSTA (tenant_id, coluna)')
for o, co, d, cd in RELS:
    L.append('Ref: %s.%s > %s.%s' % (o, co, d, cd))
p = os.path.join(HERE, 'cabinet-schema.dbml')
open(p, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('cabinet-schema.dbml     %d tabelas · %d relações · %d KB'
      % (len(TABELAS), len(RELS), os.path.getsize(p) / 1024))

# ---------------------------------------------------------------- canvas (mesmo motor)
MODS = ['nucleo', 'parceiros', 'catalogo', 'preco', 'venda', 'estoque', 'compra']
T = {}
for nome, mod, escopo, doc, colunas, nota in TABELAS:
    T[nome] = {'n': 0, 'dom': mod, 'esc': escopo, 'doc': doc + ((' — ' + nota) if nota else ''),
               'pk': [c for c, _t, f in colunas if 'k' in f],
               'c': [[c, t] for c, t, _f in colunas]}
R = [[o, co, d, cd, 0] for o, co, d, cd in RELS]
P = collections_ordered = {}
P['tudo'] = [t[0] for t in TABELAS]
P['caminho do orçamento'] = ['partners', 'construction_sites', 'products', 'product_variants',
                             'sale_categories', 'quotes', 'quote_environments', 'quote_items',
                             'quote_salespeople', 'quote_professionals', 'sales_orders',
                             'document_sequences']
for m in MODS:
    P[m] = [t[0] for t in TABELAS if t[1] == m]

DADOS = json.dumps({'T': T, 'R': R, 'P': P}, ensure_ascii=False, separators=(',', ':'))

# o motor do canvas vive no gera-canvas.py — na cópia local está na mesma pasta;
# no repo este script fica em docs/cabinet/ e o motor em docs/legado/
_tpl = _acha(os.path.join(HERE, 'gera-canvas.py'),
             os.path.join(HERE, '..', 'legado', 'gera-canvas.py'))
canvas_src = open(_tpl, encoding='utf-8').read()
ini = canvas_src.index('HTML = r"""') + len('HTML = r"""')
fim = canvas_src.index('"""', ini)
TPL = canvas_src[ini:fim]

TPL = TPL.replace('Softlux — diagrama ER', 'Cabinet — mapeamento de tabelas')
TPL = TPL.replace("const COR = {cadastro:'#7A5CB8',produto:'#B7791F',venda:'#C2410C',compra:'#0060B0',\n             estoque:'#2E7D32',financeiro:'#B0306B',fiscal:'#8A6D3B',sistema:'#8B8377',outros:'#5A544B'};",
                  "const COR = {nucleo:'#5A544B',parceiros:'#7A5CB8',catalogo:'#B7791F',preco:'#0E7C86',\n             venda:'#C2410C',estoque:'#2E7D32',compra:'#0060B0',outros:'#8B8377'};")
TPL = TPL.replace("'softlux-canvas:'", "'cabinet-canvas:'")
TPL = TPL.replace("presetAtual = 'núcleo do negócio'", "presetAtual = 'caminho do orçamento'")
TPL = TPL.replace('<span><svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" stroke="#5A544B" stroke-width="2"/></svg> declarada</span>\n<span><svg width="26" height="8"><line x1="1" y1="4" x2="25" y2="4" stroke="#5A544B" stroke-width="2" stroke-dasharray="5 4"/></svg> inferida</span>\n<span>◆ chave · azul = liga (clique traz a vizinha)</span>',
                  '<span>◆ chave · azul traz a vizinha · FK de empresa é composta (tenant_id)</span>')
TPL = TPL.replace("(r[4]?'  (inferida — conferir)':'  (declarada)')", "''")
# rodapé do card: escopo org/tenant no cabeçalho (tooltip) e doc da tabela
TPL = TPL.replace("'<title>'+t+' — clique abre a ficha</title>'", "'<title>'+t+'</title>'")
TPL = TPL.replace("const d=T[t], p=aberto[t], cor=COR[d.dom];",
                  "const d=T[t], p=aberto[t], cor=COR[d.dom]||'#8B8377';")
TPL = TPL.replace("'</b><span class=\"n\">'+fmt(d.n)+'</span>'",
                  "'</b><span class=\"n\">'+(d.esc==='tenant'?'tenant':'org')+'</span>'")
# tooltip do card: doc em vez de linhas
TPL = TPL.replace("'<title>'+t+' — '+fmt(d.n)+' linhas · o passo '", "'<title>'+t+' · '")
TPL = TPL.replace("const r=R[i], d=$('#dica');\n  d.textContent=r[0]+'.'+r[1]+' → '+r[2]+'.'+r[3]+'';",
                  "const r=R[i], d=$('#dica');\n  d.textContent=r[0]+'.'+r[1]+' → '+r[2]+'.'+r[3];")
# painel: sem contagem de linhas/inferidas
TPL = TPL.replace("""  let nd=0,ni=0;
  R.forEach(r=>{ if(aberto[r[0]]&&aberto[r[2]]) r[4]?ni++:nd++; });
  $('#painel').innerHTML='<b>'+ts.length+'</b> tabelas no canvas · <b>'+nd+
    '</b> ligações declaradas · <b>'+ni+'</b> inferidas<br>'+""",
                  """  let nd=0;
  R.forEach(r=>{ if(aberto[r[0]]&&aberto[r[2]]) nd++; });
  $('#painel').innerHTML='<b>'+ts.length+'</b> tabelas no canvas · <b>'+nd+
    '</b> ligações · toda tabela tem created/updated_at/by (omitidas)<br>'+""")
# busca: sem contagem de linhas
TPL = TPL.replace("(aberto[t]?'✓ ':'')+t+'<span class=\"q\">'+fmt(T[t].n)+'</span></a>'",
                  "(aberto[t]?'✓ ':'')+t+'<span class=\"q\">'+T[t].dom+'</span></a>'")

saida = TPL.replace('__DADOS__', DADOS)
p = os.path.join(HERE, 'cabinet-mapeamento.html')
open(p, 'w', encoding='utf-8').write(saida)
print('cabinet-mapeamento.html %d tabelas · %d relações · %d presets · %d KB'
      % (len(T), len(R), len(P), os.path.getsize(p) / 1024))

# no repo, publica também em public/ — vira cabinetonline.cc/mapeamento-tabelas.html
pub = os.path.join(HERE, '..', '..', 'public')
if os.path.isdir(pub):
    p2 = os.path.join(pub, 'mapeamento-tabelas.html')
    open(p2, 'w', encoding='utf-8').write(saida)
    print('public/mapeamento-tabelas.html atualizado')
