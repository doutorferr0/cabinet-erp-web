# Softlux — mapa de telas (extraído do SOFTLUX.exe)

> 713 formulários DFM recuperados do binário · 1981 blocos SQL · 15921 campos ligados a coluna.
> Fonte: recursos DFM + literais SQL do executável Delphi. Precisão de campo/rótulo maior que screenshot.

| Form | Título | Comp. | SQL | Campos | Tabelas tocadas |
|---|---|--:|--:|--:|---|
| `FrmNota_entrada` | Nota do Fornecedor | 1117 | 31 | 333 | cfop, contas_apagar_pag, dbo, designer, empresa, estado, fornecedor, modo … |
| `FrmParamentro` | Cadastro de Parâmetros | 697 | 29 | 283 | categoriavenda, centro_de_custo, clientes, dbo, forma_pagamento_fin, grupoproduto, indicacoes, modo … |
| `FrmDemostracao` | Demostração | 730 | 18 | 229 | cod_tabelas, dbo, empresa, funcionario, grupoproduto, indicacoes, tamanho, venda … |
| `FrmImportNfeOrdens` | FrmImportNfeOrdens | 360 | 9 | 224 | acabamento, designer, estoque_produto, fornecedor, nota_entrada_det, preco_produto, produtos, transportadora … |
| `FrmProduto` | Cadastro de produtos - Banco Principal | 817 | 42 | 170 | acabamento, caracteristicas, classificacaoproduto, dbo, designer, empresa, estoque_produto, estoquetipo … |
| `FrmPedido` | Projeto | 606 | 25 | 158 | categoriavenda, cod_tabelas, contas_receber, contas_receber_pag, controle_entrega_data, estoque_produto, forma_pagamento, forma_pagamento_parcela … |
| `FrmPreVenda` | Pré-Venda | 394 | 6 | 148 | cod_tabelas, dbo, preco_produto, venda, vendaambiente, vendaatendente |
| `FrmNfconfig` | Configuração da Nota Fiscal | 389 | 7 | 143 | dbo, nfconfig, nfconfigdet, nfconfigdet_label |
| `FrmOrcamento` | Orçamento | 480 | 20 | 137 | categoriavenda, cod_tabelas, forma_pagamento, forma_pagamento_parcela, funcionario, grupoproduto, indicacoes, observacoes … |
| `FrmNotaFiscal` | Nota Fiscal | 428 | 8 | 132 | dbo, funcionario, notafiscalimportadoc, vendaatendente |
| `FrmCliente` | Cadastro de Clientes | 728 | 14 | 127 | categoriacliente, clientes, contatos, indicacoes, municipio, obras, orcamento, profiss |
| `FrmAvulso` | Venda Avulsa | 456 | 26 | 125 | avulso_luminaria_det, avulso_materiais_det, categoriavenda, cod_tabelas, contas_receber, contas_receber_pag, dbo, estoque_produto … |
| `FrmControleCredRH` | Controle de Crédito dos Recursos Humanos | 199 | 7 | 124 | dbo, funcionario, plano_contas, tipo_documento |
| `FrmDevolucao` | Devolução | 385 | 13 | 121 | dbo, devolucao, devolucaodesagio, devolucaoservico, grupoproduto, motivo_devolucao, sisusuarios, vendaambiente |
| `FrmAutorizo_Inclusao` | Autorização de Inclusão | 407 | 14 | 112 | autorizainclusao, autorizainclusao_servicos, autorizoinclusao_luminaria, autorizoinclusao_materiais, categoriavenda, funcionario, grupoproduto, indicacoes … |
| `FrmImportacaoXML` | Importação de Produtos Via Arquivo XML | 539 | 5 | 112 | fornecedor, indice_preco, preco_produto, produto_relacionados, produtos |
| `FrmFactura` | Factura | 352 | 8 | 111 | dbo, funcionario, vendaatendente |
| `FrmEnt_Devolucao` | Entrada por Devolução | 294 | 14 | 98 | cod_tabelas, controle_entrega_data, controle_entrega_prod, ent_devolucao, ent_devolucaodesagio, grupoproduto, pedido_luminaria_det, pedido_materiais_det … |
| `RltFichaCliente` |  | 259 | 3 | 96 | contatos, dbo, municipio, obras |
| `FrmGridContaReceber` | Conta a receber | 186 | 9 | 95 | clientes, contas_receber, contas_receber_pag, dbo, fornecedor, modo, tipo_documento |
| `RltFichafuncionarioPort` |  | 202 | 2 | 93 | cargo, contatos, dbo, grauinstrucao, municipio, nacionalidade, racacor, setor |
| `FrmCon_EscolheProduto` | Escolha o Produto | 262 | 10 | 92 | acabamento, dbo, fornecedor, ged, produtos, tamanho |
| `FrmFact_ImpressaoMod2` | FrmFact_ImpressaoMod2 | 235 | 5 | 92 | dbo |
| `FrmOrdem_compra` | Ordem de Compra | 281 | 17 | 91 | dbo, empresa, fornecedor, fornecfatminimo, grupoproduto, modo, ordem_compra, ordem_compra_pag … |
| `RltFichafuncionario` |  | 271 | 2 | 91 | cargo, contatos, dbo, grauinstrucao, municipio, nacionalidade, racacor, setor |
| `FrmContasapagar` | Contas a Pagar | 178 | 9 | 90 | clientes, contas_apagar, contas_apagar_pag, dbo, fornecedor, modo, tipo_documento |
| `FrmFuncionario` | Cadastro de Colaboradores | 424 | 13 | 90 | cargo, categoriaremuneracao, centro_de_custo, contatos, empresa, estado, funcionario, grauinstrucao … |
| `FrmExporta_vl_tabela` | Exportar produtos para Excel | 123 | 3 | 88 | dbo, fornecedor, produtos, produtosfornecedores, tipopeca |
| `FrmSaida_comp` | Saída por Complementação | 304 | 12 | 88 | cod_tabelas, controle_entrega_data, controle_entrega_prod, estoque_produto, pedido_luminaria_det, pedido_materiais_det, produtos, saida_comp_luminaria_det … |
| `Frmfact_impressao` | Frmfact_impressao | 255 | 5 | 86 | dbo |
| `FrmGridContas_receber` | Contas a receber | 186 | 11 | 84 | clientes, contas_receber_det, contas_receber_pag, dbo, empresa, fornecedor, modo, motivo_devolucao … |
| `DM` |  | 191 | 48 | 82 | centro_de_custo, clientes, contas_apagar, contas_apagar_det, controle_entrega_data, controle_entrega_prod, credito, creditoindicacao … |
| `FrmGridContas_apagar` | Conta a pagar | 179 | 9 | 82 | contas_apagar, contas_apagar_det, contas_apagar_pag, dbo, empresa, fornecedor, modo, motivo_devolucao … |
| `FrmBoletoRemessa` | Emissão de Boleto e Arquivo de Remessa | 202 | 5 | 79 | clientes, dbo, fornecedor, funcionario, indicacoes |
| `Frmempresa` | Cadastro da Empresa | 284 | 3 | 78 | dbo, empresa, ged |
| `FrmExpNFPaul` | Exportação da Nota Fiscal Paulista | 106 | 2 | 78 | dbo |
| `FrmRel_Contas_apagar` | FrmRel_Contas_apagar | 165 | 5 | 78 | contas_apagar_det, dbo, motivo_devolucao |
| `FrmOrcamentoPortugal` | FrmOrcamentoPortugal | 198 | 8 | 77 | dbo, forma_pagamento, orcamento, orcamento_luminaria_det, orcamento_materiais_det, produtos |
| `frmSelRelEntDevolucao` | Relatório de entrada por devolução | 142 | 6 | 77 | clientes, dbo, devolucao, devolucaoservico, fornecedor, motivo_devolucao, servicos, venda |
| `FrmGrid_pedido` | Projeto | 112 | 5 | 76 | clientes, estoque_produto, pedido |
| `RltOrcPedFicha` | RltOrcPedFicha | 202 | 4 | 76 | dbo, ged |
| `FrmNotaEntradaXML` | Importar XML | 156 | 6 | 75 | balancoestoqueprodutos, dbo, fornecedor |
| `RltOrcPedFichaResumo` | RltOrcPedFichaResumo | 137 | 5 | 75 | contas_receber_pag, dbo, ged, modo |
| `frmControleEntrega` | Controle de Entrega | 365 | 14 | 74 | controle_entrega_assinaturas, dbo, preco_produto, venda, vendaambiente, vendaproduto |
| `RltOrcPedFicha2` | RltOrcPedFicha2 | 193 | 5 | 74 | dbo, ged |
| `RltRecibo` |  | 175 | 4 | 73 | avulso, clientes, dbo, empresa, ged, municipio, pedido |
| `FrmPastaProj` | Pasta | 253 | 11 | 72 | dbo, funcionario, grupoproduto, indicacoes, pasta, vendaatendente, vendaindicacao, vendaindicacaogrupprod |
| `RltFichaProdutos` |  | 186 | 5 | 72 | dbo, ged |
| `FrmFornecedores` | Cadastro de Fornecedores | 286 | 12 | 70 | contatos, dbo, empresa, fornecedor, fornecedorgrupprod, fornecedorrtgrupprod, fornecfatminimo, grupoproduto … |
| `FrmConta_receber` | Conta a receber | 167 | 14 | 69 | centro_de_custo, clientes, contas_apagar, contas_apagar_det, contas_receber, contas_receber_pag, controlechequedet, empresa … |
| `RltReciboTotal` |  | 170 | 4 | 69 | avulso, clientes, dbo, empresa, ged, municipio, pedido |
| `FrmCompararProdNFeFor` | Relacionar produto da NFe (xml) com os produtos do | 164 | 3 | 67 | dbo, fornecedor, ged |
| `FrmRT` | Participação | 174 | 11 | 66 | contas_apagar, contas_apagar_det, creditoindicacao, dbo, modo, reserva_tecnica, reserva_tecnica_grupoprod |
| `RltDuplicataMod2` |  | 147 | 3 | 66 | avulso, clientes, dbo, empresa, municipio, pedido |
| `RltOrcPedCabecalho` | RltOrcPedCabecalho | 182 | 5 | 66 | dbo, ged |
| `RltOrcPedCabecalho2logo` | RltOrcPedCabecalho2logo | 192 | 6 | 66 | dbo, ged |
| `FrmConta_apagar` | Conta a pagar | 163 | 15 | 65 | centro_de_custo, contas_apagar, contas_apagar_det, contas_apagar_pag, contas_receber, controlechequedet, empresa, forma_pagamento_fin … |
| `FrmGrid_avulso` | Venda Avulsa | 99 | 6 | 65 | avulso, clientes, dbo, estoque_produto, fornecedor |
| `FrmIndicacoes` | Cadastro de Profissional Externo | 175 | 7 | 65 | categoriaprofissionaisexterno, contatos, dbo, grupoproduto, indicacaogrupprod, indicacoes_detalhe, orgaoregistro |
| `Frmindice` | Cadastro de Índice de Valor de Venda. | 200 | 7 | 65 | custo, indice_precogrupousuario, preco_produto, produtos, sisgrupo_usuario |
| `RltDuplicatas` |  | 227 | 3 | 65 | avulso, clientes, dbo, empresa, municipio, pedido |
| `RltOrcPedCabecalho3` | RltOrcPedCabecalho3 | 178 | 6 | 65 | dbo, ged |
| `FrmGrid_orcamento` | Orçamento | 98 | 4 | 64 | clientes, dbo, orcamento |
| `FrmOrdemServico` | Ordem Serviço | 206 | 8 | 64 | dbo, funcionario, ged, indicacoes, ordemservico, ordemservicoproduto |
| `RltQuantitativoAmbienteObs` | RltQuantitativoAmbienteObs | 143 | 4 | 64 | dbo, ged |
| `FrmSel_produtoGeral` | Escolha o Produto | 106 | 4 | 63 | acabamento, estoque_produto, fornecedor, grupoproduto, preco_produto, produtos |
| `RltEntregaMercadoria` | RltEntregaMercadoria | 144 | 4 | 63 | dbo, ged, mensagem_relatorio, produtos, produtosfornecedores, vendaambiente, vendadataentrega, vendaproduto |
| `RltReciboPortugal` |  | 160 | 3 | 63 | avulso, clientes, dbo, empresa, municipio, pedido |
| `RltReciboRT` |  | 163 | 4 | 63 | dbo, empresa, ged |
| `RltRetiradaMercadoria` | RltRetiradaMercadoria | 139 | 4 | 63 | dbo, ged, mensagem_relatorio, produtos, produtosfornecedores, vendaambiente, vendadataretorno, vendaproduto |
| `FrmCons_Orcamento` | Selecionar Orçamento ou  Pedido de Demonstração | 81 | 6 | 62 | clientes, dbo |
| `FrmEntradaPorDevolucaoRetrato` | FrmEntradaPorDevolucaoRetrato | 129 | 3 | 62 | dbo, ged |
| `RltEntradaPorDevolucao` |  | 132 | 3 | 62 | dbo, ged |
| `FrmBaixa_contas` | Conta a receber - Quitação | 131 | 13 | 61 | contas_receber_pag, controlecheque, controlechequedet, dbo, fornecedor, modo, motivo_devolucao, sisusuarios |
| `FrmBaixa_contas_pag` | Conta a pagar - Quitação | 131 | 13 | 60 | contas_apagar_pag, contas_receber_pag, controlecheque, controlechequedet, dbo, fornecedor, modo, motivo_devolucao … |
| `FrmImpOrcPortugal` | FrmImpOrcPortugal | 150 | 5 | 59 | dbo, orcamento, orcamento_luminaria_det, orcamento_materiais_det, produtos |
| `FrmImpOrcPortugalPadrao` | FrmImpOrcPortugalPadrao | 126 | 6 | 59 | dbo, orcamento, orcamento_luminaria_det, orcamento_materiais_det, produtos |
| `RltOrcPedCabecalhoFoto2` | RltOrcPedCabecalhoFoto2 | 189 | 5 | 59 | dbo, ged |
| `RltOrdem_Servico` | RltOrdem_Servico | 183 | 5 | 59 | dbo, ged, mensagem_relatorio |
| `RltReciboContaApagar` | RltReciboContaApagar | 127 | 4 | 58 | dbo, empresa, ged |
| `RltOrcPedPersonalisado1` | RltOrcPedPersonalisado1 | 169 | 4 | 57 | dbo, ged |
| `FrmDistribuicaoDFe` | Manifestação do Destinatário | 198 | 6 | 56 | controlensu, dbo, dferesumonfe, ged |
| `FrmSelDevProd` | Selecionar Produtos | 120 | 2 | 56 | motivo_devolucao, vendaambiente |
| `RltFichaFor` |  | 154 | 3 | 56 | contatos, dbo, fornecfatminimo |
| `RltOrcPedFichaAmbiente` | RltOrcPedFichaAmbiente | 152 | 4 | 56 | dbo, ged |
| `RltOrcPedSemAmbienteFoto` | RltOrcPedSemAmbienteFoto | 184 | 5 | 56 | dbo, ged |
| `FrmRelImpMateriaisAmbiente` | FrmRelImpMateriaisAmbiente | 200 | 7 | 55 | dbo, empresa, ged, grupoproduto, produtos, vendaambiente, vendaproduto |
| `RltOrcPedCabFornecedorObs` | RltOrcPedCabFornecedorObs | 173 | 5 | 55 | dbo, ged, vendaproduto |
| `RltOrcPedCabSemAmbFor` | RltOrcPedCabSemAmbFor | 171 | 5 | 55 | dbo, ged, vendaproduto |
| `DMAcertoComEletrecistas` |  | 138 | 8 | 54 | acerto_eletrecistas, acerto_eletrecistas_det, acerto_eletrecistas_servicos, dbo, funcionario, servicos, venda, vendaservico |
| `FrmConsultaOrdemExterna` | Consultar Ordens Externas | 164 | 6 | 54 | acabamento, filiais, fornecedor, ordemcompradetext, ordemcompraext, produtos |
| `RltQuadroCargas` |  | 147 | 2 | 54 | dbo, produtos, vendaproduto |
| `FrmComissao` | Cadastro de Ganhos Sobre Vendas | 265 | 15 | 53 | categoriaremuneracao, comissaopremiacaovlgrupro, comissaopremiacaovlvcatrem, comissaopremiacaovlvenda, dbo, grupoproduto |
| `FrmRel_Contas_receber` | FrmRel_Contas_receber | 121 | 5 | 53 | contas_receber_det, dbo, motivo_devolucao |
| `FrmRel_VendaAvulsaPeriodo` | FrmRel_VendaAvulsaPeriodo | 128 | 3 | 53 | avulso, contas_receber, contas_receber_det, dbo, sisusuarios |
| `RltOrcPedCabSemAmb` | RltOrcPedCabSemAmb | 158 | 4 | 53 | dbo, ged |
| `RltSimboloAplicacaoPasta` | RltSimboloAplicacaoPasta | 142 | 4 | 53 | clientes, dbo, municipio, obras, pasta |
| `RltSimboloAplicacaoPastaSemValor` | RltSimboloAplicacaoPastaSemValor | 126 | 4 | 53 | clientes, dbo, municipio, obras, pasta |
| `FrmRel_QuantitativoAmbiente` | FrmRel_QuantitativoAmbiente | 138 | 4 | 52 | dbo, produtoslocestoque |
| `RltProdutoPasta2F` | RltProdutoPasta2F | 126 | 4 | 52 | clientes, dbo, municipio, obras, pasta |
| `RtlReciboPortugal2` |  | 106 | 3 | 52 | clientes, dbo, municipio, paises |
| `FrmRel_Quantitativo` | FrmRel_Quantitativo | 139 | 4 | 51 | dbo, produtoslocestoque |
| `FrmTabImpostos` | Tabela de Impostos | 180 | 18 | 51 | dbo, estado, issqnservicos, rtclasstrib, rtcst, tipocsosn |
| `RltProdutoPasta` |  | 135 | 4 | 51 | clientes, dbo, municipio, obras, pasta |
| `RltQuantitativoObs` | RltQuantitativoObs | 128 | 3 | 49 | dbo |
| `RltReciboRHGanhos` |  | 112 | 3 | 49 | dbo, empresa |
| `RltSaidaPorComplementacao` |  | 82 | 1 | 49 | dbo |
| `RltOrdemCompra` |  | 154 | 7 | 48 | dbo, ged, ordem_compra_pag |
| `RltFichaIndicacoes` |  | 140 | 1 | 47 | bancos, indicacoes, indicacoes_detalhe, municipio |
| `RltResTecAnalitica` |  | 145 | 5 | 47 | creditoindicacao, dbo |
| `frmSelRelSaidaComplementacao` | Relatório de saída por complementação | 101 | 7 | 46 | ambiente, fornecedor, funcionario, indicacoes, pedido, produtos, saida_comp_luminaria_det, saida_comp_servico_det … |
| `FrmContas` | Tabela de Contas Bancárias | 145 | 3 | 45 | bancos, bancos_caixas, contas_bancarias, contas_bancariascobranca, municipio |
| `FrmRltSituacaoPatrimonial` | FrmRltSituacaoPatrimonial | 246 | 0 | 45 |  |
| `FrmConsulta_estoque` | Consulta do Estoque | 127 | 6 | 44 | dbo, empresa, estoquetipo, ged |
| `FrmImpressaoPeca` | FrmImpressaoPeca | 179 | 7 | 44 | dbo, empresa, ged |
| `RltOrcPedFicha2Resumo` | RltOrcPedFicha2Resumo | 63 | 3 | 44 | contas_receber_pag, dbo, modo |
| `RltOrcPedFoto` | RltOrcPedFoto | 125 | 2 | 44 | dbo, ged |
| `RltProdutoPastaSemAmbObs` | RltProdutoPastaSemAmbObs | 128 | 5 | 44 | clientes, dbo, municipio, obras, pasta, vendaproduto |
| `FrmAlteraItem` | Alteração de Produtos | 142 | 8 | 43 | acabamento, dbo, estoque_produto, fornecedor, ged, grupoproduto, preco_produto, produtos … |
| `FrmSelRelDataEntrega` | Impressão da Data de Entrega | 73 | 2 | 43 | clientes, dbo |
| `RltServicoComCabecalho` | RltServicoComCabecalho | 116 | 3 | 43 | dbo, ged |
| `RltServicoComCabecalho2Logo` | RltServicoComCabecalho2Logo | 141 | 5 | 43 | dbo, ged |
| `FrmGrid_custo` | Cadastro de Custos  | 58 | 3 | 42 | custo, fornecedor |
| `RltComissaoPremiacao` | RltComissaoPremiacao | 156 | 7 | 42 | categoriaremuneracao, comissaopremiacaovlvcatrem, comissaopremiacaovlvenda, dbo |
| `RltOrcDataEntrega` | RltOrcDataEntrega | 110 | 2 | 42 | dbo |
| `FrmConsultaPedidoVenda` | Consulta Pedido Venda | 157 | 5 | 41 | dbo |
| `FrmEtiqueta` | Configuração de Etiquetas | 114 | 4 | 41 | dbo, etiquetas, texto_substituicao |
| `FrmGrid_Indicacoes` | Cadastro de Profissional Externo | 57 | 1 | 41 | indicacoes |
| `FrmNotaEntradaCodBarra` | Nota do Fornecedor por Código de Barras | 110 | 4 | 41 | balancoestoqueprodutos, dbo |
| `RltOrcPedCabResumo` | RltOrcPedCabResumo | 127 | 5 | 41 | clientes, contas_receber_pag, dbo, ged, modo, municipio, obras, orcamento |
| `RltOrcPedCabResumo2logo` | RltOrcPedCabResumo2logo | 137 | 6 | 41 | clientes, contas_receber_pag, dbo, ged, modo, municipio, obras, orcamento |
| `RltOrcPedPersonalisado1Resumo` | RltOrcPedPersonalisado1Resumo | 125 | 5 | 41 | clientes, contas_receber_pag, dbo, ged, modo, municipio, obras, orcamento |
| `FrmCon_Prod_Filho` | Consulta de Produto Relacionado | 69 | 7 | 40 | acabamento, dbo, preco_produto, produto_relacionados |
| `FrmRel_Orcamento_Fechado` | FrmRel_Orcamento_Fechado | 174 | 6 | 40 | dbo, preco_produto, venda, vendaproduto |
| `FrmReserva_tecnica` | Reserva Técnica | 92 | 5 | 39 | contas_apagar, contas_apagar_det, dbo, modo, reserva_tecnica |
| `RltTermoDeEentrega` | RltTermoDeEentrega | 126 | 5 | 39 | dbo, fornecedor, ged |
| `Frmcusto` | Cadastro de Custo | 83 | 5 | 38 | indice_preco, preco_produto, produtos |
| `FrmFormas_pagamentos` | Tabela de Condições de  Pagamento (Produto/Finance | 98 | 3 | 38 | forma_pagamento_parcela, forma_pagamentogrupprod, grupoproduto |
| `RltindiceValorvenda` |  | 135 | 1 | 38 | custo, fornecedor, indice_preco |
| `Frmcons_ped_ordem` | Consulta de Produtos  | 124 | 4 | 37 | dbo, pedido_compra |
| `FrmRel_OrcamentoP1` | FrmRel_OrcamentoP1 | 151 | 6 | 37 | dbo, empresa, ged |
| `FrmUsuario` | Cadastro de Usuário | 80 | 4 | 37 | dbo, sisgrupo_usuario, sisusuarioscontasbancarias |
| `RltControleEntrega` | RltControleEntrega | 137 | 3 | 37 | dbo |
| `RltControleEntregaQuebraAmbiente` | RltControleEntregaQuebraAmbiente | 135 | 3 | 37 | dbo, venda, vendaambiente |
| `FrmPromocao` | Promoção | 162 | 4 | 36 | dbo, promocao |
| `FrmEmpFact` | Cadastro de Empresas de Factoring | 80 | 2 | 35 | dbo, empresafactoringaliqdesc |
| `RltOrcPedCab` |  | 105 | 2 | 35 | clientes, dbo, municipio, obras, orcamento |
| `FrmRequisicaoEstoq` | Requisição de Produtos | 122 | 4 | 34 | dbo, requisicaoestoq, requisicaoestoqprod |
| `FrmImportarValoresTabela` | Importar Arquivo com Valores de Tabela | 82 | 2 | 33 | dbo, ged |
| `RltEntradaPorDevolucaoMat` |  | 64 | 1 | 33 | dbo |
| `RltEntradaPorDevolucaoSemAmb` |  | 84 | 3 | 33 | dbo, ged |
| `RltOrdemCompraGeral` |  | 104 | 1 | 33 | avulso, clientes, dbo, pedido |
| `RltQuantitOrdemPedido` | RltQuantitOrdemPedido | 107 | 3 | 33 | dbo |
| `FrmLiberarProdutos` | Liberar separação e entrega de produtos | 76 | 7 | 32 | dbo, observacoes |
| `RltEmpresaFactoring` |  | 85 | 2 | 32 | dbo |
| `RltOrcPedFotoResumo` | RltOrcPedFotoResumo | 64 | 2 | 32 | dbo, ged |
| `FrmBusca_financeiro` | Busca pelo pagamento | 55 | 4 | 31 | contas_apagar_pag, dbo, modo |
| `Frmbusca_financeiro_cr` | Busca pelo recebimento | 59 | 4 | 31 | contas_receber_pag, dbo, modo |
| `FrmControleCheque` | Controle de Cheque | 100 | 8 | 31 | bancos_caixas, clientes, contas_bancarias, controlecheque, controlechequedet, controlechequedev, dbo, empresafactoring … |
| `RltPrevisaoChegadaProdutos` | RltPrevisaoChegadaProdutos | 70 | 1 | 31 | ged |
| `FrmAssistenciaTecnica` | Assistência Técnica (Garantia) | 175 | 8 | 30 | assistencia_tecnica, assistencia_tecnicamovimentacao, assistencia_tecnicanota, clientes, dbo, empresa, fornecedor, venda |
| `FrmCon_produto` | Escolha o Produto | 99 | 6 | 30 | acabamento, dbo, fornecedor, produtos |
| `FrmGrid_Mov_Bancario` | Movimento Bancario | 76 | 4 | 30 | bancos_caixas, contas_bancarias, movimento_bancario |
| `RltFichaTrans` |  | 86 | 3 | 30 | coletas, contatos, municipio, transportadora |
| `FrmGrid_Saida_comp` | Saída por Complementação | 69 | 7 | 29 | clientes, controle_entrega_data, controle_entrega_prod, estoque_produto, saida_complementacao |
| `FrmMetaVenda` | Cadastro de Metas de Vendas | 109 | 7 | 29 | categoriaremuneracao, dbo, metavenda, metavendadet |
| `RltBancoAgencia` |  | 73 | 2 | 29 | bancos, bancos_caixas, contatos, municipio |
| `RltCadControleCheque` |  | 83 | 2 | 29 | clientes, controlechequedev, dbo, filiais, fornecedor, funcionario, indicacoes |
| `RltExtradoContas` |  | 133 | 3 | 29 | clientes, dbo, empresa, fornecedor, funcionario, indicacoes, movimento_bancario |
| `RltPromocao` | RltPromocao | 79 | 3 | 29 | dbo, promocao |
| `RltServicoPersonalisado1` | RltServicoPersonalisado1 | 101 | 2 | 29 | dbo |
| `FrmForaBalanco` | Produtos Fora do Balanço do Estoque | 118 | 6 | 28 | dbo, foradobalanco, foradobalancoproduto, fornecedor |
| `FrmGrid_filial` | Cadastro de Filiais | 42 | 1 | 28 | filiais |
| `FrmGrid_nota_entrada` | Nota do Fornecedor | 64 | 7 | 28 | dbo, estoque_produto, fornecedor, nota_entrada_dif, transportadora |
| `FrmGrid_Trasnf_finaceira` | Transferência | 63 | 3 | 28 | dbo, movimentos, transferencia |
| `FrmMov_Bancario` | Movimento Bancario | 76 | 5 | 28 | centro_de_custo, dbo, movimento_bancario, plano_contas |
| `FrmTransf_filiais` | Transferência para Filiais | 71 | 5 | 28 | estoque_produto, filiais, produtos, transferencia_filiais, transferencia_filiais_produtos |
| `FrmTransportadora` | Cadastro de Transportadoras | 112 | 3 | 28 | coletas, contatos, transportadora |
| `RltControleRH` | RltControleRH | 86 | 3 | 28 | contas_apagar_pag, dbo, modo |
| `FrmConsultaEstCompras` | Consulta Produtos à Solicitar | 92 | 3 | 27 | dbo, fornecedor |
| `Frmcons_ordem_nota` | Consulta de Produtos  | 44 | 2 | 27 | dbo, ordem_compra_det, produtos |
| `FrmRelDataEntregaPrevista` | FrmRelDataEntregaPrevista | 76 | 2 | 27 | dbo |
| `RltPedidoDemonstracao` | RltPedidoDemonstracao | 88 | 1 | 27 | dbo |
| `FrmAtualizacaoVersao` |  | 120 | 7 | 26 | ged, produtosrelacionados, produtosrelacionadoscadprodutos, produtosrelacionadosdet, sisopcoes, sysobjects |
| `FrmConciliacaoBancaria` | Conciliacao Bancária | 79 | 3 | 26 | contas_apagar, contas_apagar_det, dbo, tipo_documento |
| `FrmIncluirAcabamento` | Cadastro de Acabamentos | 96 | 10 | 26 | acabamento, dbo, empresa, estoque_produto, indice_preco, preco_produto, tamanho |
| `FrmTransfInd` | Transferência de venda entre indicações  | 78 | 8 | 26 | dbo, pedido, transfindicacao, transfindicacaodet, vendaindicacao, vendaindicacaogrupprod |
| `RltNfeNFCeGerencialCancelada` | RltNfeNFCeGerencialCancelada | 87 | 2 | 26 | dbo |
| `RltOrdem_Servico2` | RltOrdem_Servico2 | 41 | 1 | 26 | dbo |
| `Rlt_filiais` |  | 75 | 1 | 26 | dbo, municipio |
| `FrmCad_caixa` | Tabela de caixa | 46 | 3 | 25 | bancos_caixas, contas_bancarias |
| `Frmcons_ped_servico` | Selecionar Serviços | 33 | 1 | 25 | dbo |
| `FrmDuplicataRecibo` | Controle de Duplicata e Recibo | 228 | 5 | 25 | clientes, contas_apagar, contas_apagar_det, contas_apagar_pag, contas_receber, contas_receber_det, contas_receber_pag, dbo … |
| `FrmFechamentoMeta` | Acompanhamento e Fechamento de Meta | 68 | 3 | 25 | fechamentometa, fechamentometaemp, fechamentometafunc |
| `FrmGerencimentoEntregaCadastro` | Gerencimento de Entrega Cadastro | 90 | 5 | 25 | dbo, entrega, entregadetalhe, transportadora |
| `FrmGrid_caixa` | Lançamento no  Caixa | 65 | 4 | 25 | bancos_caixas, contas_bancarias, dbo, movimentos |
| `FrmRemessaTeste` | Remessa para Teste | 97 | 0 | 25 |  |
| `RltEntradaPorDevolucaoSer` |  | 59 | 1 | 25 | dbo |
| `RltEntradaPorDevolucaoSerRetrato` | RltEntradaPorDevolucaoSerRetrato | 60 | 1 | 25 | dbo |
| `RltSaidaPorComplementacaoMat` |  | 50 | 1 | 25 | dbo |
| `RltServicoPasta` |  | 106 | 4 | 25 | clientes, dbo, municipio, obras, pasta |
| `RltServicoPasta2F` | RltServicoPasta2F | 70 | 4 | 25 | clientes, dbo, municipio, obras, pasta |
| `RltServicoPastaF2` | RltServicoPastaF2 | 69 | 4 | 25 | clientes, dbo, municipio, obras, pasta |
| `Rlt_Romaneiro_separacao` | Rlt_Romaneiro_separacao | 89 | 2 | 25 | dbo |
| `FrmFechamentoEntrega` | Fechamento de Entrega | 66 | 2 | 24 | clientes, entrega |
| `FrmGrid_Usuario` | Cadastro de Usuário | 35 | 1 | 24 | sisusuarios |
| `FrmPedido_compra` | Pedido de Compra | 51 | 4 | 24 | dbo, fornecedor, ordem_compra_det, pedido_compra_det |
| `FrmPontodeEquilibrio` | Ponto de Equilíbrio | 88 | 0 | 24 |  |
| `FrmQuitacaoAgrupada` | Agrupar conta  | 60 | 3 | 24 | dbo, modo |
| `RltAssistenciaTecnica` | RltAssistenciaTecnica | 78 | 3 | 24 | assistencia_tecnicamovimentacao, assistencia_tecnicanota, dbo |
| `RltControleEntregarValor` |  | 91 | 2 | 24 | controle_entrega_assinaturas, dbo |
| `Rltcusto` |  | 78 | 1 | 24 | custo, fornecedor |
| `RltEtiqProjCodBarra` |  | 35 | 2 | 24 | dbo, ged, venda, vendaproduto |
| `RltNfeNFCeGerencial` | RltNfeNFCeGerencial | 115 | 2 | 24 | dbo |
| `Frmcons_ped_materiais` | Materiais | 33 | 2 | 23 | dbo, motivo_devolucao |
| `FrmCon_endereco` | Escolha o Endereço  | 70 | 4 | 23 | clientes, dbo |
| `FrmQuitacaoLote` | Quitação em Lote | 100 | 8 | 23 | controlecheque, controlechequedet, dbo, empresa, fornecedor, modo |
| `FrmSelEtiqFornecedor` | Etiquetas de Produtos Cadastrados | 99 | 1 | 23 | dbo |
| `RltPedidoCompra` |  | 63 | 1 | 23 | avulso, clientes, dbo, ordem_compra_det, pedido |
| `RltResumoPasta2F` | RltResumoPasta2F | 44 | 1 | 23 | clientes, municipio, obras, pasta |
| `FrmBalancoEstoque` | Balanço do Estoque | 80 | 3 | 22 | balancoestoqueprodutos, dbo |
| `FrmBusca_financeiro_parcela` | Busca pela parcela | 43 | 4 | 22 | contas_apagar_det, dbo, modo |
| `FrmBusca_financeiro_parcela_cr` | Busca pela parcela | 46 | 3 | 22 | contas_receber_det, modo |
| `FrmProdRelAcab` | Produto Relacionado | 75 | 3 | 22 | produtos, produtosfornecedores, produtosrelacionados, produtosrelacionadoscadprodutosacab, produtosrelacionadosdet |
| `frmRelAcertoEletrecista` | frmRelAcertoEletrecista | 77 | 1 | 22 | acerto_eletrecistas, acerto_eletrecistas_det, acerto_eletrecistas_servicos |
| `RltEstoqSepEntCliente` | RltEstoqSepEntCliente | 69 | 3 | 22 | clientes, controle_entrega, controle_entrega_prod, dbo, preco_produto |
| `Frmbalanco` | Lançamentos de  Estoque | 56 | 4 | 21 | dbo, empresa, estoque_produto, lancamento_estoque_det |
| `FrmBancoCaixa` | Tabela de Agências | 55 | 2 | 21 | bancos_caixas, contatos |
| `FrmConsulta_chegada_produto` | Consultar previsão chegada de produtos | 81 | 3 | 21 | dbo |
| `FrmEscolhaSubProd` | Escolha o produto relacionado | 62 | 2 | 21 | dbo |
| `FrmGrid_Forma_pagamento` | Tabela de Condições de Venda de Produtos | 35 | 1 | 21 | forma_pagamento |
| `FrmGrid_ordem_compra` | Ordem de Compra | 61 | 3 | 21 | dbo, fornecedor |
| `FrmSelRelDRE` | DRE | 51 | 1 | 21 | empresa |
| `Rlt_ImportacaoProdutosXML` |  | 59 | 0 | 21 |  |
| `FrmConsProdEstVenda` | Consultar Compras  | 74 | 1 | 20 | dbo |
| `FrmConsultaComissao` | Consultar Ganhos Sobre Vendas | 68 | 2 | 20 | avulso, comissaopremiacao, contas_apagar_det, controlerh, ent_devolucao, factura, fechamentocomissao, funcionario … |
| `FrmGridContabilista` | Cadastro dos Contadores | 37 | 1 | 20 | dbo |
| `FrmGrid_transportadora_ANT` | Cadastro de Transportadora | 33 | 1 | 20 | transportadora |
| `frmPreview_orcamento` | Visualização  | 174 | 26 | 20 | ambiente, clientes, dbo, forma_pagamento, forma_pagamento_parcela, observacoes, orcamento_luminaria_det, orcamento_materiais_det … |
| `frmRelEntDevolucao` | frmRelEntDevolucao | 91 | 1 | 20 | dbo |
| `FrmRelVendaFor` |  | 88 | 1 | 20 | dbo, preco_produto, preco_produto_log |
| `FrmRel_pedido_compra` | FrmRel_pedido_compra | 62 | 2 | 20 | dbo, observacoes |
| `FrmRel_valor_estoque` | FrmRel_valor_estoque | 84 | 1 | 20 | dbo |
| `FrmRltAlteracoesPasta` | FrmRltAlteracoesPasta | 73 | 3 | 20 | dbo, grupoproduto |
| `Rel_ConsultaComissao` |  | 114 | 1 | 20 | avulso, comissaopremiacao, contas_apagar_det, controlerh, ent_devolucao, factura, fechamentocomissao, funcionario … |
| `RltCredito` |  | 57 | 2 | 20 | dbo |
| `RltMetaVenda` | RltMetaVenda | 75 | 4 | 20 | categoriaremuneracao, dbo, metavenda, metavendadet |
| `RltSaidasporMes` | RltSaidasporMes | 26 | 0 | 20 |  |
| `Frmcons_ped_luminaria` | Luminária | 31 | 3 | 19 | dbo, motivo_devolucao, vendaambiente |
| `FrmContabilista` | Cadastro dos Contadores | 81 | 1 | 19 | dbo |
| `Frmgrid_Contas` | Tabela de Contas Bancárias | 33 | 1 | 19 | contas_bancarias |
| `FrmGrid_Indice` | Cadastro de Índice de Valor de Venda | 35 | 3 | 19 | fornecedor, indice_preco |
| `FrmProdRel` | Produto Relacionado | 87 | 3 | 19 | produtos, produtosfornecedores, produtosrelacionados, produtosrelacionadosdet, tamanho |
| `FrmProdRequisicao` | Produtos | 63 | 5 | 19 | dbo, pedido_compra, pedido_compra_det |
| `FrmRel_estoque_atual` | FrmRel_estoque_atual | 63 | 3 | 19 | dbo |
| `FrmRel_listagem_conf_de_preco` | FrmRel_listagem_conf_de_preco | 68 | 2 | 19 | dbo |
| `RltFinanceiroPasta2F` | RltFinanceiroPasta2F | 61 | 2 | 19 | dbo |
| `RltFinanceiroPedVenda` | RltFinanceiroPedVenda | 72 | 3 | 19 | dbo |
| `RltResumoPedidoVenda` | RltResumoPedidoVenda | 43 | 2 | 19 | dbo |
| `FrmCaixa` | Lançamento no Caixa | 52 | 6 | 18 | centro_de_custo, contas_bancarias, dbo, movimentos, plano_contas |
| `FrmCFOP` | Tabela CFOP | 65 | 2 | 18 | dbo, nfeobservacao |
| `FrmFilial` | Cadastro de Filiais | 44 | 0 | 18 |  |
| `FrmGrid_Ent_devolucao` | Entrada por Devolução | 59 | 7 | 18 | clientes, controle_entrega_data, controle_entrega_prod, ent_devolucao, estoque_produto |
| `Frmgrid_PlanoContas` | Cadastro de Plano de Contas | 39 | 1 | 18 | plano_contas |
| `FrmPlanilhaImportProduto` | Importação Via Planilha para Banco de Produtos | 99 | 20 | 18 | acabamento, bdprodutos, custo, dbo, empresa, estoque_produto, fabrica, fornecedor … |
| `FrmRel_ent_dev_sem_conf` | FrmRel_ent_dev_sem_conf | 69 | 1 | 18 | dbo, venda |
| `FrmRel_Lancamento_estoque` | FrmRel_Lancamento_estoque | 57 | 2 | 18 | dbo |
| `FrmRel_Orc_vendedor` | FrmRel_Orc_vendedor | 96 | 2 | 18 | dbo, observacoes |
| `RltEstoqSepEnt` |  | 60 | 3 | 18 | clientes, controle_entrega, controle_entrega_prod, dbo, preco_produto |
| `RltExtradoContasLancFuturos` |  | 95 | 3 | 18 | clientes, dbo, empresa, fornecedor, funcionario, indicacoes, movimento_bancario |
| `RltSimplesRemesaFatura` | RltSimplesRemesaFatura | 61 | 2 | 18 | clientes, dbo, notafiscal |
| `RltTransEst` |  | 50 | 4 | 18 | dbo, estoquetipo, fornecedor, transferenciaestoque |
| `frmAcertoEletrecistas` | Controle de acerto com eletricista | 53 | 0 | 17 |  |
| `FrmConsProdOrcProj` | Os produtos abaixo estão desativados ou com saldo  | 30 | 3 | 17 | dbo |
| `FrmConsultaCreditoCliente` | Consultar Crédito do Cliente | 50 | 3 | 17 | clientes, dbo, devolucao, venda |
| `FrmExportarFinanceiro` | Exportar Financeiro | 35 | 3 | 17 | dbo, fornecedor, indicacoes |
| `FrmGrid_doc_pag` | Tabela de Modos de Pgtos/Recebtos | 31 | 1 | 17 | modo |
| `FrmGrid_Servicos` | Cadastro de Serviços | 31 | 1 | 17 | servicos |
| `FrmPorcTributos` | Valor Aproximado dos Tributos | 68 | 2 | 17 | dbo, porcentagem_tributos |
| `frmRelEntDevolucaoSEstoque` | frmRelEntDevolucaoSEstoque | 51 | 1 | 17 | acabamento, clientes, devolucao, devolucaoproduto, fornecedor, produtos, venda |
| `FrmRelForInd` |  | 96 | 1 | 17 | dbo |
| `FrmRel_Custo_Venda` | FrmRel_Custo_Venda | 66 | 1 | 17 | dbo |
| `FrmRel_Projetos_Fechados` | FrmRel_Projetos_Fechados | 58 | 1 | 17 | dbo |
| `FrmVincularContaPagar` | FrmVincularContaPagar | 83 | 2 | 17 | contas_apagar, contas_apagar_det, dbo, forma_pagamento_fin, modo, plano_contas, tipo_documento |
| `RltControleCheque` |  | 66 | 1 | 17 | clientes, dbo, filiais, fornecedor, funcionario, indicacoes |
| `RltFormaPagPro` |  | 59 | 2 | 17 | forma_pagamento, forma_pagamento_parcela |
| `FrmCobranca` | Escolher Sistema de Cobrança | 35 | 1 | 16 | dbo |
| `FrmEntregaConferencia` | FrmEntregaConferencia | 67 | 6 | 16 | controle_entrega_data, controle_entrega_prod, dbo, ged, preco_produto |
| `FrmFechamentoGanhosVendas` | Fechamento de Ganhos sobre Vendas | 24 | 1 | 16 | fechamentocomissao |
| `FrmImpressaoEstiloCupom` | FrmImpressaoEstiloCupom | 48 | 1 | 16 | dbo |
| `FrmOpc_ramking` | Ranking Profissional | 55 | 6 | 16 | categoriaprofissionaisexterno, dbo, empresa, pedido, venda |
| `frmRelSaidaComplementacao` | frmRelSaidaComplementacao | 64 | 0 | 16 |  |
| `FrmRel_Alteracoes_projetos` | FrmRel_Alteracoes_projetos | 115 | 4 | 16 | dbo, grupoproduto |
| `FrmRel_data_transf` | FrmRel_data_transf | 51 | 1 | 16 | dbo |
| `RelExtBancario` |  | 61 | 2 | 16 | dbo |
| `RltContabilista` | RltContabilista | 58 | 1 | 16 | contabilista |
| `RltContasBancarias` |  | 46 | 1 | 16 | dbo |
| `RltDuplicatasRecibos` |  | 49 | 0 | 16 |  |
| `RltFechamentoMeta` | RltFechamentoMeta | 68 | 3 | 16 | dbo |
| `RltMovProdutosNFeNFCe` | RltMovProdutosNFeNFCe | 66 | 1 | 16 | dbo |
| `FrmAlteraPreco` | Atualizar valor de tabela | 87 | 4 | 15 | altvalortabela, custo, dbo, indice_preco, preco_produto, produtos |
| `FrmEstoqueMinimo` | Estoque Mínimo | 65 | 2 | 15 | dbo, fornecedor |
| `Frmgrid_controle_entrega` | Controle de Entrega | 55 | 4 | 15 | clientes, controle_entrega, controle_entrega_prod |
| `FrmGrid_pedido_compra` | Pedido de Compra | 45 | 5 | 15 | clientes, dbo, pedido_compra |
| `FrmRateio` | Cadastro de Rateios | 49 | 3 | 15 | categoriaremuneracao, dbo, rateio |
| `FrmRelDRE` | FrmRelDRE | 37 | 0 | 15 |  |
| `FrmRelPlanodecontasDetalhe` | FrmRelPlanodecontasDetalhe | 58 | 2 | 15 | dbo |
| `FrmSelEtiqProjAmb` | Produtos do Pedido de Venda por Ambiente  | 48 | 1 | 15 | dbo, venda, vendaproduto |
| `FrmSelRltNotaFornecedor` | Notas dos Fornecedores | 37 | 1 | 15 | dbo |
| `QR_AlteraPreco` |  | 55 | 1 | 15 | dbo |
| `RltNotaFornecedor` | RltNotaFornecedor | 71 | 1 | 15 | dbo |
| `FrmConfEtiquetaPronta` | Configuração  | 40 | 1 | 14 | etiquetapronta |
| `FrmEstoqueCorrecao` | Correção do estoque de venda | 31 | 3 | 14 | dbo, estoque_log, estoque_produto, sisusuarios |
| `FrmGrid_estado` | Tabela de Unidades da Federação | 28 | 1 | 14 | estado |
| `FrmPreVendaCliente` | Escolha o Cliente | 31 | 0 | 14 |  |
| `Frmprincipal` | Sistema Softlux | 349 | 1 | 14 | ged |
| `FrmRelProdutoVendidoQuant` | FrmRelProdutoVendidoQuant | 42 | 0 | 14 |  |
| `FrmRel_orcamento_resumo` | FrmRel_orcamento_resumo | 48 | 2 | 14 | dbo, ged |
| `Frmrel_orcamento_servico` | Frmrel_orcamento_servico | 87 | 3 | 14 | empresa, observacoes, servicos, vendaservico |
| `FrmRltNfeEmitidas` | Relatório | 63 | 2 | 14 | clientes, notafiscal |
| `FrmSelEtiqProdSep` | Etiqueta de Produtos Separados | 33 | 2 | 14 | dbo |
| `FrmSelEtiqProj` | Etiqueta dos Produtos do Pedido de Venda | 41 | 1 | 14 | dbo, venda, vendaproduto |
| `FrmSel_Acabamento` | Acabamento | 24 | 2 | 14 | acabamento, estoque_produto, fornecedor, preco_produto, produtos |
| `Rel_OrdemServicoTerceiros` |  | 59 | 1 | 14 | mensagem_relatorio |
| `RltForaBalanco` |  | 39 | 1 | 14 | dbo |
| `FrmCadEstoque` | Cadastro de Estoque | 43 | 1 | 13 | estoqueexterno |
| `FrmFechamentoContas` | Fechamento de Contas (Caixas\Bancárias) | 46 | 2 | 13 | dbo, fechamentocontas, sisusuarioscontasbancarias |
| `Frmgrid_acabamentos` | Tabela de Acabamentos | 28 | 2 | 13 | acabamento, dbo |
| `FrmRel_nota_entrada_produtos` | FrmRel_nota_entrada_produtos | 42 | 3 | 13 | dbo, ordem_compra_det |
| `FrmRel_Orc_QtdxEst` | FrmRel_Orc_QtdxEst | 52 | 1 | 13 | clientes, obras, venda |
| `FrmRel_ordem_servico` | Ordem de Serviço | 79 | 0 | 13 |  |
| `FrmRel_ProdRel` | FrmRel_ProdRel | 53 | 2 | 13 | produtos, produtosfornecedores, produtosrelacionados, produtosrelacionadosdet |
| `FrmSelEstoqueUltimaVenda` | Relatório quantidade de venda, quantidade de dias  | 33 | 2 | 13 | dbo, estoque_produto, fornecedor, nota_entrada_det, produtos, produtosfornecedores, venda, vendaproduto |
| `RltBalancoEstoque` |  | 38 | 1 | 13 | dbo |
| `RltEstoqueUltimaVenda` | RltEstoqueUltimaVenda | 58 | 1 | 13 | dbo, estoque_produto, fornecedor, nota_entrada_det, produtos, produtosfornecedores, venda, vendaproduto |
| `RltGanhosSobVendas` |  | 53 | 1 | 13 | avulso, clientes, dbo, ent_devolucao, pedido, saida_complementacao |
| `RltSaidaPorComplementacaoSer` |  | 35 | 1 | 13 | dbo |
| `Rlt_ConsultaOrdemExterna` |  | 40 | 0 | 13 |  |
| `FrmConsultaCreditoFornecedor` | Consulta de Crédito junto ao Fornecedor | 39 | 2 | 12 | dbo, nota_entrada |
| `FrmEFDReg150` | EFD Registro 150 Participante | 38 | 0 | 12 |  |
| `Frmgrid_municipios` | Tabela de Municípios | 26 | 1 | 12 | municipio |
| `FrmImpDocVenda` | Importação de Documento de Venda | 44 | 3 | 12 | clientes, dbo, factura |
| `FrmPlanoContas` | Cadastro de Planos de Contas | 39 | 2 | 12 | bancos_caixas, plano_contas_tipo |
| `FrmRel_ramking` | FrmRel_ramking | 44 | 0 | 12 |  |
| `FrmRel_transferemcia_filial` | FrmRel_transferemcia_filial | 48 | 1 | 12 | dbo |
| `FrmRltAlteracoesPastaTotais` | FrmRltAlteracoesPastaTotais | 44 | 0 | 12 |  |
| `FrmSelRelCurvaABC` | Curva ABC | 61 | 3 | 12 | dbo, fornecedor |
| `RltEtiqProdSep` | RltEtiqProdSep | 25 | 2 | 12 | dbo |
| `RltFichaFiscalProdutos` | RltFichaFiscalProdutos | 43 | 1 | 12 | dbo |
| `FrmBusca_ReservaEstoque` | Consultar compras para estoque(reserva de produto) | 31 | 1 | 11 | dbo |
| `FrmCatVenda` | Categoria de Venda | 29 | 1 | 11 | dbo |
| `FrmCon_servico` | Selecionar Serviço | 23 | 2 | 11 | orcamento_servico_det, servicos |
| `FrmFecha_projeto` | Conclusão do Pedido de Venda | 21 | 2 | 11 | clientes, dbo |
| `FrmGrid_forma_pag_fin` | Tabela de Condições de Pgtos/Recebtos para Módulo  | 25 | 1 | 11 | forma_pagamento_fin |
| `FrmOpcComp_projeto` | Relatório de comparativo de projeto | 45 | 4 | 11 | dbo, pedido |
| `FrmRelProdutoVendidoValor` | FrmRelProdutoVendidoValor | 51 | 1 | 11 | dbo |
| `FrmRel_AutorizacaoInclusao` | Autorização de Inclusão | 58 | 2 | 11 | dbo, mensagem_relatorio |
| `FrmRel_comp_projeto` | FrmRel_comp_projeto | 48 | 0 | 11 |  |
| `FrmRel_comp_projeto_cliente` | FrmRel_comp_projeto_cliente | 58 | 0 | 11 |  |
| `FrmRel_fluxo_previsto_realizado` | FrmRel_fluxo_previsto_realizado | 73 | 3 | 11 | dbo, fornecedor |
| `FrmRltEstFisVendDia` | FrmRltEstFisVendDia | 51 | 1 | 11 | dbo |
| `RltNfeAgrupadaCFOP` | RltNfeAgrupadaCFOP | 77 | 2 | 11 | dbo |
| `RltNFEntDif` |  | 48 | 1 | 11 | dbo |
| `RltRateio` | RltRateio | 43 | 2 | 11 | dbo, rateio, rateiodet |
| `Rlt_Estados` |  | 33 | 1 | 11 | estado |
| `FrmConsProdEst` | Consultar Compras para o Estoque | 27 | 1 | 10 | dbo |
| `Frmcons_projeto_avulsa` | Escolher pedido  de venda | 19 | 1 | 10 | clientes, controle_entrega, venda, vendaproduto |
| `FrmForma_pag_fin` | Tabela de Condições de Pgtos/Recebtos para Módulo  | 29 | 2 | 10 | forma_pagamento_fin, forma_pagamento_par_fin |
| `FrmGridObsNFe` | Informações Complementares para NFe | 23 | 1 | 10 | nfeobservacao |
| `FrmOpc_mov_produto` | Movimentação do produto no estoque | 37 | 2 | 10 | dbo, empresa |
| `FrmPaises` | Tabela de Países | 29 | 1 | 10 | dbo |
| `FrmPreVendaBuscaProd` | Busca Produto | 22 | 1 | 10 | dbo |
| `FrmRelPlanodecontas` | FrmRelPlanodecontas | 47 | 2 | 10 | dbo |
| `FrmRel_plano_ctp_data` | FrmRel_plano_ctp_data | 46 | 1 | 10 | dbo |
| `FrmRltEstoqueDia` | FrmRltEstoqueDia | 38 | 1 | 10 | dbo |
| `FrmRltEtiqPecaAmbiente` | RltEtiqPecaAmbiente | 33 | 1 | 10 | dbo |
| `FrmRltFormaPagFin` |  | 36 | 2 | 10 | forma_pag_parc_fin, forma_pagamento_fin |
| `FrmSelEscEndTodCli` | Escolha o endereço | 49 | 1 | 10 | clientes |
| `frmSelRelPlanoContas` | Impressão do plano de contas | 30 | 0 | 10 |  |
| `RltCFOP` |  | 31 | 1 | 10 | dbo |
| `FControleAcesso` | Permissões de Acesso | 52 | 4 | 9 | sisopcoesespecial, sispermissaoespecial, sisusuarios |
| `FrmCreditoCliente` | Controle de Crédito do Cliente | 32 | 3 | 9 | clientes, credito, tipo_documento |
| `FrmCreditoIndicacao` | Controle de Crédito da Indicação | 34 | 3 | 9 | creditoindicacao, indicacoes, tipo_documento |
| `FrmGridCadEstoque` | Tabela de Estoque | 24 | 1 | 9 | estoquetipo |
| `FrmGridProdRel` | Produtos Relacionados | 47 | 1 | 9 | dbo |
| `FrmMunicipio` | Tabela de Municípios | 36 | 4 | 9 | estado, municipio, paises, regiao |
| `FrmOpc_Mov_Est` | Lançamentos por produtos | 25 | 0 | 9 |  |
| `FrmOpc_rel_estoque_atual` | Estoque atual | 60 | 3 | 9 | dbo, fornecedor |
| `FrmOpc_reserva_tecnica` | Participações  | 28 | 4 | 9 | contas_apagar_det, dbo, indicacoes |
| `FrmPed_comp_mostra` | Pedido de Compra Gerado | 19 | 3 | 9 | acabamento, pedido_compra, pedido_compra_det, produtos |
| `FrmPreVendaEscolher` | Pré-Venda | 18 | 1 | 9 | dbo, notafiscal, notafiscalimportadoc |
| `FrmProd_Relacionamento` | Produtos para relacionamento | 26 | 3 | 9 | fornecedor, produto_relacionados, produtos |
| `FrmRel_mov_produto` | FrmRel_mov_produto | 47 | 0 | 9 |  |
| `FrmRel_PosVenda` | FrmRel_PosVenda | 28 | 2 | 9 | dbo, pos_venda_det |
| `FrmRel_tabela_preco_for` | FrmRel_tabela_preco_for | 45 | 0 | 9 |  |
| `FrmRltEtiqFornecedorMod3` | FrmRltEtiqFornecedorMod3 | 25 | 1 | 9 | dbo |
| `FrmRlt_Transf_Ind` |  | 38 | 2 | 9 | dbo |
| `FrmSelAssiistProduto` | Selecione o produto | 28 | 1 | 9 | dbo |
| `frmSelRelEntDevolucaoSEstoque` | Relatório de entrada por devolução sem análise do  | 40 | 3 | 9 | dbo, fornecedor |
| `RelRequisicaoProd` |  | 32 | 2 | 9 | dbo |
| `RltCobrancaProjeto` |  | 41 | 1 | 9 | cob_projetos |
| `RltCodServico` | RltCodServico | 28 | 1 | 9 | dbo |
| `RltDuplicatasRecibosPag` |  | 34 | 0 | 9 |  |
| `RltEtiqProj` |  | 20 | 1 | 9 | dbo |
| `RltPaises` | RltPaises | 30 | 1 | 9 | paises |
| `RltQuadroCargasNaoRel` |  | 40 | 1 | 9 | dbo |
| `FrmCatProfExt` | Categoria Profissionais Externo | 22 | 1 | 8 | categoriaprofissionaisexterno |
| `FrmCatRem` | Categorias | 23 | 1 | 8 | dbo |
| `Frmcob_projeto` | Tabela de Cobrança de Projetos | 34 | 1 | 8 | cob_projetos |
| `FrmCodServico` | Código do Serviço | 24 | 1 | 8 | tributacaoservico |
| `FrmDadosGrupoEtiqueta` | Imprimir Etiqueta | 33 | 3 | 8 | dbo, etiqueta_grupo, etiquetagrupodet |
| `Frmestado` | Tabela de Unidades da Federação | 21 | 0 | 8 |  |
| `FrmGrid_Ambientes` | Tabela de Ambientes | 22 | 1 | 8 | ambiente |
| `FrmGrid_CadCaixa` | Tabela de caixa | 23 | 2 | 8 | dbo |
| `Frmgrid_profissoes` | Tabela de Profissões | 22 | 1 | 8 | profiss |
| `FrmGrupoProdutos` | Tabela de Grupos de Produtos | 23 | 1 | 8 | grupoproduto |
| `FrmImportacao_excel` | Importação via Excel | 43 | 7 | 8 | acabamento, fornecedor, preco_produto, produtos, todos |
| `FrmPos_venda` | Pós-Venda | 59 | 5 | 8 | clientes, dbo, pos_venda, pos_venda_det |
| `FrmRelCompVlVenda` | FrmRelCompVlVenda | 34 | 0 | 8 |  |
| `FrmRel_Indicacoes` | FrmRel_Indicacoes | 36 | 1 | 8 | dbo |
| `FrmRel_mov_banc` | FrmRel_mov_banc | 38 | 1 | 8 | dbo |
| `FrmRltAlteracoesPastaGrupo` | FrmRltAlteracoesPastaGrupo | 10 | 0 | 8 |  |
| `FrmRltEtiqFornecedorMod2` | FrmRltEtiqFornecedorMod2 | 26 | 1 | 8 | dbo |
| `FrmRltEtiqFornecedorMod4` | FrmRltEtiqFornecedorMod4 | 21 | 1 | 8 | dbo |
| `FrmSelEtiqAmbiente` | Etiqueta dos Ambientes de Pedido de Venda  | 40 | 1 | 8 | dbo, venda |
| `frmSelRelAniversariantes` | Relatório de aniversariantes do mês | 19 | 0 | 8 |  |
| `FrmServicos` | Cadastro de Serviços | 18 | 0 | 8 |  |
| `FrmTipoPeca` | Tabela de Tipos de Peças | 25 | 2 | 8 | grupoproduto, tipopeca |
| `RltCurvaABC` | RltCurvaABC | 45 | 0 | 8 |  |
| `RltEtiqReferencia2` | RltEtiqReferencia2 | 27 | 1 | 8 | dbo |
| `RltFichaIndicacoesContatos` |  | 28 | 1 | 8 | contatos |
| `RltResumoTextoPedVenda` | RltResumoTextoPedVenda | 30 | 2 | 8 | dbo |
| `RltServicos` |  | 30 | 1 | 8 | servicos |
| `FrmCategoriaCliente` | Categoria de Cliente | 21 | 1 | 7 | dbo |
| `FrmCreditoFornecedor` | Controle de Crédito Junto ao Fornecedor | 29 | 3 | 7 | credito, fornecedor, tipo_documento |
| `FrmExcluirRelacionado` | Exclusão de produtos relacionados (desativados e c | 18 | 1 | 7 | dbo |
| `FrmImportacao_vl_tabela` | Importação do Valor de Tabela dos produtos (via ex | 22 | 2 | 7 | preco_produto |
| `FrmRegioes` | Tabela de Regiões | 21 | 1 | 7 | regiao |
| `frmRelAniversariantes` | Relatório de aniversariantes | 25 | 0 | 7 |  |
| `frmRelPlanoContas` | frmRelPlanoContas | 23 | 0 | 7 |  |
| `FrmRel_pedido_servico` | FrmRel_pedido_servico | 50 | 1 | 7 | servicos, vendaservico |
| `FrmRel_reserva_tecnica` | FrmRel_reserva_tecnica | 27 | 0 | 7 |  |
| `FrmRltEtiqFornecedor` | Etiquetas por Fornecedor | 28 | 1 | 7 | dbo |
| `RltConsultaCreditoCliente` |  | 34 | 0 | 7 |  |
| `RltEtiqModelo4` | RltEtiqModelo4 | 28 | 1 | 7 | dbo |
| `RltEtiqPedVendMod2` | RltEtiqPedVendMod2 | 14 | 2 | 7 | dbo |
| `RltModosPag` |  | 27 | 1 | 7 | dbo |
| `RltRegiao` | RltRegiao | 24 | 1 | 7 | regiao |
| `Rlt_municipios` |  | 29 | 1 | 7 | dbo |
| `FrmCaracteristicas` | Características | 17 | 0 | 6 |  |
| `FrmConsultaSeparacaoPedidoVenda` | Consulta Situação do Pedido Venda | 37 | 1 | 6 | clientes, funcionario, venda, vendaatendente, vendaproduto |
| `Frmdoc_pag` | Tabela de Modos de Pgtos/Recebtos | 23 | 3 | 6 | cartoesbandeiras, efd_registro_150, spedformapagamento |
| `FrmEtiqVendAmbMod4` | FrmEtiqVendAmbMod4 | 16 | 1 | 6 | dbo |
| `Frmgrid_CentroCustos` | Cadastro de Centros de Custos | 20 | 1 | 6 | centro_de_custo |
| `FrmRelOrcamentoServicoTerceiro` | FrmRelOrcamentoServicoTerceiro | 41 | 1 | 6 | servicos, vendaservico |
| `FrmRel_TipoPeca` | FrmRel_TipoPeca | 25 | 1 | 6 | grupoproduto, tipopeca |
| `FrmSelCFOP` | Selecionar CFOP | 21 | 1 | 6 | dbo |
| `FrmSelRelCompVlVenda` | Relatório de comparativo de valor de vendas | 83 | 4 | 6 | fornecedor, preco_produto, produtos, produtosfornecedores, tipopeca |
| `FrmSelRelProdutoVendidoQuant` | Relatório de produto vendido por quantidade | 65 | 4 | 6 | dbo, fornecedor, preco_produto, produtos, tipopeca |
| `FrmSelRelProdutoVendidoValor` | Relatório de produto vendido por valor | 70 | 5 | 6 | dbo, fornecedor, preco_produto, produtos, produtosfornecedores, tipopeca |
| `FrmTamanho` | Tamanho | 17 | 0 | 6 |  |
| `FrmVendasNfeNfce` | Consulta de valores Nfe, NFCe de pré-venda | 22 | 2 | 6 | dbo |
| `RltCentroCusto` |  | 26 | 1 | 6 | centro_de_custo |
| `RltConsultaCreditoFornecedor` |  | 32 | 0 | 6 |  |
| `RltMenssage` |  | 25 | 1 | 6 | mensagem_relatorio |
| `RltMotivoDevolucao` |  | 24 | 1 | 6 | motivo_devolucao |
| `RltResultadoFinanceiroAna` |  | 28 | 1 | 6 | dbo |
| `FrmAlterarDataEntrega` | Alterar Data de Entrega | 34 | 2 | 5 | dbo |
| `FrmBanco` | Tabela de Bancos | 15 | 0 | 5 |  |
| `FrmCadGrupoEtiqueta` | Grupo etiqueta | 20 | 2 | 5 | etiqueta_grupo, etiquetagrupodet |
| `FrmCentroCustos` | Cadastro de Centros de Custos | 16 | 1 | 5 | bancos_caixas |
| `FrmFluxo_caixa` | Fluxo de Caixa | 28 | 0 | 5 |  |
| `FrmFluxo_caixa_ortodoxo` | Fluxo de Caixa  | 38 | 1 | 5 | sisusuarioscontasbancarias |
| `FrmFluxo_caixa_otimista` | Fluxo de caixa otimista | 28 | 0 | 5 |  |
| `FrmGrid_grupo_usuario` | Cadastro grupo de usuário | 19 | 2 | 5 | sisgrupo_usuario, sisusuarios |
| `frmGrid_MotivoDevolucao` | Tabela de Motivos  | 19 | 1 | 5 | motivo_devolucao |
| `FrmGrid_Unidade` | Tabela de Unidades | 19 | 1 | 5 | unidades |
| `FrmImp_custo_indice` | Importação de produtos | 36 | 4 | 5 | fornecedor |
| `FrmRelProjetoResumo_Terceiro` | FrmRelProjetoResumo_Terceiro | 36 | 2 | 5 | dbo |
| `FrmRel_Fluxo_caixa` | FrmRel_Fluxo_caixa | 42 | 0 | 5 |  |
| `FrmRel_Fluxo_caixa_ortodoxo` | FrmRel_Fluxo_caixa_ortodoxo | 42 | 0 | 5 |  |
| `FrmRel_Fluxo_caixa_otimista` | FrmRel_Fluxo_caixa_otimista | 42 | 0 | 5 |  |
| `FRMREL_Mov_Est` | FRMREL_Mov_Est | 26 | 0 | 5 |  |
| `FrmRel_pedido_resumo` | FrmRel_pedido_resumo | 36 | 2 | 5 | contas_receber_pag, dbo, modo |
| `FrmTipoLinha` | Tipo de Linha | 18 | 0 | 5 |  |
| `RltBancos` |  | 19 | 0 | 5 |  |
| `RltCaixa` |  | 23 | 1 | 5 | contas_bancarias |
| `RltGerencimentoEntrega` | RltGerencimentoEntrega | 17 | 1 | 5 | dbo |
| `RltOrdemCheg` |  | 21 | 1 | 5 | dbo |
| `RltResultadoFinanceiroAna2` |  | 24 | 1 | 5 | dbo |
| `RltResultadoFinanceiroSin` |  | 28 | 2 | 5 | dbo |
| `FrmAcabamentos` | Tabela de Acabamentos | 16 | 0 | 4 |  |
| `FrmGerencimentoEntrega` | Gerencimento de Entrega | 38 | 1 | 4 | dbo |
| `Frmgrid_TipoDocumento` | Tabela de Tipos de Documentos | 18 | 1 | 4 | tipo_documento |
| `Frmgrupo_usuario` | Grupo de Usuário | 12 | 0 | 4 |  |
| `FrmHistoricoVersoesUsuario` | Histórico Versões | 15 | 1 | 4 | dbo |
| `FrmMarca` | Marca | 14 | 0 | 4 |  |
| `FrmMotivo` | Tabela de Motivos | 13 | 0 | 4 |  |
| `FrmObsNFe` | Informações Complementares para NFe | 15 | 0 | 4 |  |
| `FrmPreVendaAtendente` | Escolha o atendente | 11 | 1 | 4 | dbo |
| `FrmUnidade` | Tabela de Unidades | 14 | 1 | 4 | unidades |
| `FSuporte` | Refaz tabela de opções do menu do sistema | 32 | 3 | 4 | sisopcoes, syscolumns, sysobjects, systypes |
| `QuickReport2` |  | 13 | 1 | 4 | grupoproduto, indicacaogrupprod |
| `RltCategoriaRenumeracao` | FrmCategoriaRemuneracao | 19 | 1 | 4 | dbo |
| `RltCategoriaVenda` | RltCategoriaVenda | 19 | 1 | 4 | dbo |
| `RltDeUnidades` |  | 20 | 1 | 4 | unidades |
| `RltEntregasPendentes` | RltEntregasPendentes | 24 | 1 | 4 | dbo |
| `RltResumoGrupoProd` | RltResumoGrupoProd | 19 | 0 | 4 |  |
| `RltTipoDoc` |  | 20 | 1 | 4 | tipo_documento |
| `Rlt_ambiente` |  | 20 | 1 | 4 | ambiente |
| `Rlt_profissoes` |  | 20 | 1 | 4 | profiss |
| `Frmambientes` | Tabela de Ambientes | 11 | 0 | 3 |  |
| `FrmConMunicipio` | Selecionar Municípios | 14 | 1 | 3 | municipio |
| `FrmContatos_escolhidos` | Contatos | 23 | 2 | 3 | contato_grupo_email, grupo_contato_email |
| `FrmCon_ambiente` | Selecionar Ambiente | 25 | 1 | 3 | ambiente |
| `FrmDesigner` | Designer | 11 | 0 | 3 |  |
| `FrmExportacaoProdXML` | Exportação Produtos  | 28 | 0 | 3 |  |
| `FrmFabrica` | FrmFabrica | 11 | 0 | 3 |  |
| `Frmgrupo_email` | Grupo | 18 | 2 | 3 | contato_grupo_email, grupo_contato_email |
| `Frmmessagem_rel` | Tabela Mensagens  | 40 | 0 | 3 |  |
| `FrmMostrarEstoque` | Mostrar Estoque | 22 | 1 | 3 | dbo |
| `FrmNacionalidade` | Tabela de Nacionalidades | 11 | 0 | 3 |  |
| `Frmprofissoes` | Tabela de Profissões | 11 | 0 | 3 |  |
| `FrmQuadroCargas` | Quadro de Cargas | 20 | 0 | 3 |  |
| `FrmRel_acabamento` | FrmRel_acabamento | 17 | 0 | 3 |  |
| `frmSelRelcusto` | Relatório de Custos Cadastrados | 18 | 2 | 3 | custo, fornecedor |
| `frmSelRelIndiceVenda` | Relatório de Índices de Venda Cadastrados | 18 | 2 | 3 | fornecedor, indice_preco |
| `FrmSetor` | Tabela de Setores | 10 | 0 | 3 |  |
| `FrmTipoDocumento` | Tabela de Tipos de Documentos | 12 | 1 | 3 | bancos_caixas |
| `RltCargo` |  | 15 | 0 | 3 |  |
| `RltCategoriaCliente` | RltCategoriaCliente | 17 | 1 | 3 | categoriacliente |
| `RltCatProfExt` |  | 17 | 1 | 3 | categoriaprofissionaisexterno |
| `RltContasSintetica` | RltContasSintetica | 34 | 1 | 3 | contas_apagar, contas_apagar_det, contas_apagar_pag, plano_contas |
| `RltExtratoVenda` |  | 26 | 1 | 3 | dbo |
| `RltNacionalidade` |  | 15 | 0 | 3 |  |
| `RltSetor` |  | 15 | 0 | 3 |  |
| `ACBRBoletoFCFortesFr` | ACBRBoletoFCFortesFr | 1190 | 0 | 2 |  |
| `FrmConBanco` | Selecionar Banco | 13 | 1 | 2 | bancos |
| `FrmImportacao` | Importando NF-e | 12 | 4 | 2 | acabamento, estoque_produto, fornecedor, preco_produto, produtos, transportadora |
| `FrmReplicarConta` | Replicar Conta | 29 | 0 | 2 |  |
| `FrmRltEtiqAmbiente` | FrmRltEtiqAmbiente | 9 | 0 | 2 |  |
| `FrmSelRelEstoqueData` | Estoque dia  | 20 | 1 | 2 | fornecedor |
| `FrmSelRelNfeEmitidas` | Relatório de Notas Fiscais Emitidas | 27 | 2 | 2 | cfop, empresa, notafiscal |
| `FrmSelSimplesRemesaFatura` | Notas Fiscais Simples Remesa sem Faturar | 19 | 1 | 2 | empresa |
| `FrmSel_nf` | Modelos de Notas Fiscais | 9 | 1 | 2 | dbo |
| `RltResultadoFinanceiroAna3` |  | 25 | 1 | 2 | dbo |
| `RltResultadoFinanceiroSin2` |  | 18 | 1 | 2 | dbo |
| `Rlt_Erro_ImportacaoXML` |  | 14 | 0 | 2 |  |
| `FrmGridCategoriaCliente` | Categoria de Cliente | 8 | 0 | 1 |  |
| `FrmGridPromocao` | Promoção | 8 | 0 | 1 |  |
| `FrmGridTemplate` | FrmGridTemplate | 22 | 1 | 1 | tabelaimposto |
| `Frmgrid_BancoCaixa` | Tabela de Agências | 9 | 0 | 1 |  |
| `FrmRelDemonsVendaAtendMensal` | FrmRelDemonsVendaAtendMensal | 90 | 2 | 1 | funcionario |
| `FrmRelDemonsVendaAtendSemestral` | FrmRelDemonsVendaAtendSemestral | 40 | 2 | 1 | funcionario |
| `FrmRelDemonsVendaAtendTrimestral` | FrmRelDemonsVendaAtendTrimestral | 50 | 2 | 1 | funcionario |
| `FrmRel_Carta_agradecimento` | FrmRel_Carta_agradecimento | 11 | 2 | 1 | empresa, mensagem_relatorio |
| `FrmRel_cont_obra` | FrmRel_cont_obra | 55 | 2 | 1 | dbo, observacoes |
| `FrmRel_ordem_compra` | FrmRel_ordem_compra | 34 | 0 | 1 |  |
| `FrmRel_recebimento_merc` | FrmRel_recebimento_merc | 22 | 0 | 1 |  |
| `FrmRel_valores_fec_proj` | FrmRel_valores_fec_proj | 15 | 0 | 1 |  |
| `FrmSelChequeTerceiro` | Selecionar Cheque de Terceiro | 9 | 1 | 1 | clientes, dbo, filiais, fornecedor, funcionario, indicacoes |
| `cxFilterDialog` | Custom Filter | 13 | 0 | 0 |  |
| `cxImageResourceForm` |  | 4 | 0 | 0 |  |
| `cxShellBrowserDlg` | Browse for Folder | 6 | 0 | 0 |  |
| `cxSSStyleDesigner` |  | 55 | 0 | 0 |  |
| `FAlterarSenha` | Alterar Senha | 8 | 0 | 0 |  |
| `fCopiaSeguranca` | Cópia de Segurança / Restaurar cópia de segurança | 31 | 2 | 0 | sisbackup |
| `FLogin` | Controle de Acesso  | 12 | 0 | 0 |  |
| `fmFilterControlDialog` | fmFilterControlDialog | 10 | 0 | 0 |  |
| `FraControleBusca` |  | 3 | 0 | 0 |  |
| `Frame_botoes` |  | 4 | 0 | 0 |  |
| `frmAcertoSelecionaProjeto` | Selecionar Projeto | 8 | 0 | 0 |  |
| `FrmAlteracao_servidor` | Conexão com o servidor | 8 | 0 | 0 |  |
| `FrmAlterarDesconto` | Alterar Limites | 18 | 1 | 0 | forma_pagamento |
| `Frmbotoes` | Cliente | 4 | 0 | 0 |  |
| `FrmBuscaAcabamentoXML` | Escolha o acabamento | 13 | 0 | 0 |  |
| `FrmBuscarAssistencia` | FrmBuscarAssistencia | 14 | 6 | 0 | dbo, venda, vendaatendente, vendaindicacao |
| `Frmbusca_contatos_email` | Busca Contatos | 17 | 1 | 0 | contatos |
| `FrmConInclusaoCliente` | Consulta de cliente para Inclusão | 19 | 2 | 0 | clientes, obras |
| `FrmConsulta_reserva` | Participação | 16 | 1 | 0 | dbo |
| `FrmCons_transp` | Selecionar Transportadora | 13 | 2 | 0 | coletas, transportadora |
| `FrmControledeBusca` | FrmControledeBusca | 8 | 0 | 0 |  |
| `FrmCon_Orcamento` | Escolha o Projeto | 11 | 3 | 0 | clientes, dbo, pasta, venda |
| `FrmCon_Pedido` | Escolha o projeto | 11 | 3 | 0 | clientes, dbo, pasta, venda |
| `Frmcon_seq_luminaria` | Mostra o número seqüencial das luminárias | 5 | 1 | 0 | dbo |
| `Frmcon_seq_materiais` | Mostra o número seqüencial das lâmpadas e materiai | 5 | 1 | 0 | pedido_materiais_det, produtos |
| `FrmCorrecaoDevolucao` | FrmCorrecaoDevolucao | 1 | 0 | 0 |  |
| `FrmCor_com_prod` | Comissão Produto x Comissão Índice | 6 | 2 | 0 | fornecedor, indice_preco, preco_produto, produtos |
| `FrmCriarEstoqueEmpresa` | FrmCriarEstoqueEmpresa | 13 | 4 | 0 | empresa, estoque_produto, fornecedor |
| `FrmCria_Exp_prod` | Exportação de produtos | 18 | 0 | 0 |  |
| `FrmDeParaFinaceiro` | de para financeiro | 4 | 0 | 0 |  |
| `FrmDicionarioDados` | FrmDicionarioDados | 17 | 1 | 0 | sistabela |
| `Frmenvia_email` | Enviar E-mail | 49 | 4 | 0 | clientes, mensagem_relatorio, paramentros, vendaemail |
| `FrmErro_estoque_orcamento` | Extornar estoque pelo orçamento | 7 | 3 | 0 | estoque_produto, orcamento, pedido |
| `FrmEscolhaEmpresa` | Escolha a Empresa | 6 | 1 | 0 | empresa |
| `FrmEscolherCatProfExt` | Escolher Categoria Profissionais Externo | 5 | 1 | 0 | categoriaprofissionaisexterno |
| `FrmExportacao_bdPrincipal` | Exportação para o banco principal | 30 | 8 | 0 | estoque_produto, fornecedor, produto_relacionados, produtos |
| `FrmExportarSAFTPT` | Exportação do SAFT PT | 18 | 0 | 0 |  |
| `FrmExportarVenda` | Exportar Pedido de Venda | 11 | 1 | 0 | clientes, dbo |
| `FrmExpRIMODELOP7` | LIVRO REGISTRO DE INVENTÁRIO - RI - MODELO P7 | 20 | 2 | 0 | fornecedor |
| `FrmExp_Custo_Indice` | Exportação do custo e índice  | 12 | 3 | 0 | custo, fornecedor, indice_preco |
| `FrmFichaFiscalProdutos` | Ficha Fiscal dos Produtos | 8 | 1 | 0 | fornecedor |
| `FrmGerarCodigoBarra` | Gerar Código Barra | 5 | 0 | 0 |  |
| `FrmGravaProdutosEstoque` | Verificar cadastramento do produto na tabela do es | 10 | 2 | 0 | dbo, estoque_produto |
| `FrmGravar_Chave` | Gravar chave de liberação de uso do sistema | 9 | 1 | 0 | sis_controle |
| `frmGridAcertoEletrecistas` | Controle de acerto com eletricista | 20 | 0 | 0 |  |
| `FrmGridCatProfExt` | Categoria Profissionais Externo | 6 | 0 | 0 |  |
| `FrmGridEmpresa` | Empresa | 15 | 1 | 0 | empresa |
| `FrmGridRemessaTeste` | Remessa para Teste | 11 | 0 | 0 |  |
| `FrmGrid_AutorizoInclusao` | Autorização de Inclusão | 30 | 3 | 0 | clientes, dbo |
| `FrmGrid_LancEst` | Lançamentos de  Estoque | 26 | 4 | 0 | estoque_produto, fornecedor, lancamento_estoque, lancamento_estoque_det |
| `FrmGrid_messagem_rel` | Tabela de Mensagens  | 12 | 1 | 0 | mensagem_relatorio |
| `FrmGrid_pos_venda` | Pós-Venda | 25 | 3 | 0 | clientes, dbo, fornecedor |
| `FrmGrid_Reserva_tecnica` | Participação | 38 | 4 | 0 | dbo |
| `FrmGrid_Transf_filiais` | Transferência para Filiais | 30 | 4 | 0 | dbo, estoque_produto, filiais, transferencia_filiais_produtos |
| `FrmHistoricoVersoes` | Histórico Versões | 11 | 0 | 0 |  |
| `FrmHist_ord_comp` | Historico  | 3 | 0 | 0 |  |
| `FrmImportarValoresProdutos` | Importar Valores dos Produtos | 5 | 1 | 0 | preco_produto |
| `FrmIncluirItemVenda` | Incluir Item na Venda | 27 | 0 | 0 |  |
| `FrmLoginPermissao` | Permissão | 7 | 0 | 0 |  |
| `Frmmarca_quitado` | Marcar como quitado | 6 | 2 | 0 | contas_receber_det, contas_receber_pag |
| `frmMensagens` | Atenção | 7 | 0 | 0 |  |
| `FrmMovProdutosNFeNFCe` | Movimentação de produtos saídas em NFe e NFCe | 14 | 0 | 0 |  |
| `FrmOpcContasSintetica` | Contas a pagar sintético | 21 | 2 | 0 | fornecedor, plano_contas |
| `FrmOpcContas_apagar` | Relatório de Contas a pagar | 75 | 5 | 0 | dbo, empresa, fornecedor, modo, tipo_documento |
| `FrmOpcContas_receber` | Relatório de contas a receber | 57 | 6 | 0 | clientes, dbo, empresa, modo, tipo_documento |
| `FrmOpcPedidoDemonstracao` | Pedido de Demonstração | 16 | 0 | 0 |  |
| `FrmOpcRel_MovBanc` | Relatório de Movimento Bancario | 14 | 1 | 0 | bancos_caixas, contas_bancarias |
| `FrmOpc_Alteracoes_projetos` | Alterações em projetos | 14 | 2 | 0 | clientes, dbo, pedido |
| `FrmOpc_Carta_agradecimento` | Carta de agradecimento ao cliente | 7 | 1 | 0 | clientes |
| `FrmOpc_ContAcertoEletDiario` | Relatório de controle de acerto do eletricista diá | 6 | 0 | 0 |  |
| `FrmOpc_data_transf` | Transferência | 17 | 1 | 0 | dbo |
| `FrmOpc_ent_dev_sem_conf` | Entrada por devolução sem confirmação do estoque | 17 | 3 | 0 | clientes, dbo |
| `FrmOpc_fluxo_previsto_realizado` | Movimentos Realizados e Previstos | 12 | 0 | 0 |  |
| `FrmOpc_listagem_conf_de_preco` | Conferência de valores | 17 | 1 | 0 | fornecedor |
| `FrmOpc_nota_entrada_produtos` | Impressão dos produtos da nota de entrada | 11 | 2 | 0 | fornecedor, nota_entrada |
| `FrmOpc_Orcamento` | Relatório de pedido de venda fechado por período | 44 | 3 | 0 | dbo, empresa, indicacoes |
| `FrmOpc_Orc_QtdxEst` | Relatório de Orçamento x Estoque | 18 | 5 | 0 | clientes, dbo, venda |
| `FrmOpc_plano_ctp_data` | Contas a pagar com quebra de data | 24 | 3 | 0 | empresa, fornecedor, plano_contas |
| `FrmOpc_Rel_Custo` | Relatório de Custo  | 31 | 3 | 0 | clientes, dbo, orcamento, pedido |
| `FrmOpc_rel_orc_aten` | Orçamentos por atendente | 23 | 0 | 0 |  |
| `FrmOpc_rel_pedido` | Relatório  | 33 | 6 | 0 | clientes, dbo, observacoes, venda |
| `FrmOpc_rel_tabela_preco` | Tabela de Preço | 21 | 3 | 0 | fornecedor, grupoproduto |
| `FrmOpc_rel_ter_ent` | Termo de Recebimento | 7 | 1 | 0 | clientes |
| `FrmOpc_valores_fec_proj` | Relatório de valores de fechamento em projetos | 16 | 4 | 0 | clientes, contas_receber_det, dbo |
| `FrmOpc_valor_estoque` | Valor do estoque | 23 | 1 | 0 | fornecedor |
| `FrmOpc_VendaAvulsa` | Relatório de venda avulsa | 14 | 0 | 0 |  |
| `FrmProdutoFicticio` | Produto Fictício | 25 | 1 | 0 | acabamento |
| `Frmproduto_relacionado_baseado` | Alteração de produto relacionado | 60 | 5 | 0 | dbo, produto_relacionados |
| `FrmRecalcGanhosVenda` | Recalcular Ganhos Sobre Vendas | 13 | 0 | 0 |  |
| `FrmRelOrcamentroResumoTerceiro` | FrmRelOrcamentroResumoTerceiro | 21 | 0 | 0 |  |
| `FrmRelPontodeequilibrio` | Ponto de Equilíbrio | 26 | 1 | 0 | empresa |
| `FrmRelSituacaoPatrimonial` | Situação Patrimonial | 9 | 0 | 0 |  |
| `FrmRel_Orcamento` | Relatório de orçamento fechado por periodo | 8 | 0 | 0 |  |
| `FrmRel_tabela_preco` | FrmRel_tabela_preco | 13 | 0 | 0 |  |
| `FrmSelAlteracoesPasta` | Alterações em Pasta | 15 | 2 | 0 | dbo |
| `FrmSelAlteraPreco` | Histórico de atualização do valor de tabela | 12 | 1 | 0 | fornecedor |
| `FrmSelAtendente` | Selecionar Atendente | 7 | 0 | 0 |  |
| `FrmSelDadosGrupoEtiqueta` |  | 40 | 0 | 0 |  |
| `frmSelectColumn` | Select columns | 5 | 0 | 0 |  |
| `FrmSelEtiqControleEntrega` | Etiquetas | 7 | 0 | 0 |  |
| `FrmSelEtiqCorreios` | Etiquetas Correios | 7 | 0 | 0 |  |
| `FrmSelIndicacao` | Selecionar Profissional Externo | 12 | 0 | 0 |  |
| `FrmSelPasta` | Escolha a Pasta | 11 | 2 | 0 | clientes, pasta |
| `FrmSelRelControleCheque` | Relatório de Controle de Cheque | 22 | 0 | 0 |  |
| `FrmSelRelControleEntrega` | FrmSelRelControleEntrega | 28 | 0 | 0 |  |
| `FrmSelRelControleEntregarValor` | Controle Entregar Valores | 21 | 1 | 0 | clientes, venda |
| `FrmSelRelCredito` | Demonstrativo de Crédito | 11 | 0 | 0 |  |
| `FrmSelRelDataEntregaPrevista` | Data Entrega Prevista | 20 | 1 | 0 | fornecedor |
| `FrmSelRelDemonsVendaAtend` | Relatório de demonstrativo de venda por atendente | 26 | 1 | 0 | funcionario |
| `FrmSelRelEntregasPedentes` | Entregas Pedentes | 8 | 0 | 0 |  |
| `FrmSelRelEstoqSepEnt` | Relatório de estoque atual, produtos não separados | 38 | 2 | 0 | fornecedor |
| `FrmSelRelEstoqSepEntCliente` | Estoque atual, produtos não separados e separados  | 29 | 1 | 0 | clientes |
| `FrmSelRelExtBancario` | Extrato de Contas de Caixas e Bancárias | 27 | 2 | 0 | dbo, sisusuarioscontasbancarias |
| `FrmSelRelExtratoVenda` | Extrato de valor total de vendas | 18 | 1 | 0 | dbo |
| `FrmSelRelForInd` | Relatório de Movimentação por Fornecedor e Indicaç | 34 | 0 | 0 |  |
| `FrmSelRelOrdemCheg` | Rel. Dt. Prev. de Cheg.\ Reag. de Ordem de Compra | 8 | 0 | 0 |  |
| `FrmSelRelOrdemCompra` | Relatório de Ordem Compra | 27 | 0 | 0 |  |
| `FrmSelRelPedCompra` | Pedido de compra em aberto | 20 | 0 | 0 |  |
| `FrmSelRelPeriodoResFinanceiro` | Relatório de Resultado Financeiro | 9 | 0 | 0 |  |
| `FrmSelRelPlanodecontas` | Relatório de plano de contas | 70 | 2 | 0 | sisusuarioscontasbancarias, tipocontafinanceira |
| `FrmSelRelResTecAnalitica` | Relatório Analítico de Participações  | 30 | 1 | 0 | indicacoes |
| `FrmSelRelSaidaMes` | FrmSelRelSaidaMes | 17 | 1 | 0 | dbo |
| `FrmSelRelTermoRecebimento` | Termo de Recebimento | 22 | 3 | 0 | dbo |
| `FrmSelRelVendaFor` | Relatório de Movimentação por Fornecedor | 30 | 0 | 0 |  |
| `frmSelRel_ConsultaComissao` | Relatório de Consulta Comissão | 11 | 0 | 0 |  |
| `FrmSelRltNFEntDif` | Diferenças de valores na nota do fornecedor | 12 | 0 | 0 |  |
| `FrmSenhaPerm` | Permissão | 6 | 0 | 0 |  |
| `Frmsobre` | Sobre | 19 | 0 | 0 |  |
| `FrmSplash` | FrmSplash | 6 | 0 | 0 |  |
| `FrmTemplate` | FrmTemplate | 7 | 0 | 0 |  |
| `FrmTrasnf_finaceira` | Transferência | 55 | 4 | 0 | caixa, transferencia |
| `FrmZerar_estoque` | Zerar Estoque | 11 | 1 | 0 | estoque_produto |
| `Frmzerar_minimo` | Zerar estoque minimo  | 12 | 0 | 0 |  |
| `LoginDialog` | Database Login | 12 | 0 | 0 |  |
| `MainWizardForm` | New Report Wizard | 8 | 0 | 0 |  |
| `PasswordDialog` | Enter password | 8 | 0 | 0 |  |
| `QRAboutBox` | About QuickReport | 12 | 0 | 0 |  |
| `QRCompEd` | Report Settings | 67 | 0 | 0 |  |
| `QRDataSetup` | Report data setup | 20 | 0 | 0 |  |
| `QREnvironmentEditor` | User Defined Functions Edtor | 17 | 0 | 0 |  |
| `QReportEditor` | QReportEditor | 63 | 0 | 0 |  |
| `QRExprEditorForm` | Expression settings | 17 | 0 | 0 |  |
| `QRExpressionBuilder` |  | 66 | 0 | 0 |  |
| `QRLabelEditorForm` | Text Settings | 14 | 0 | 0 |  |
| `QRProgressForm` | Printing progress | 4 | 0 | 0 |  |
| `QRStandardPreview` | Print Preview | 35 | 0 | 0 |  |
| `QRSubdetailSetup` | Master/Detail setup | 18 | 0 | 0 |  |
| `QRXSearchDlg` | QRX Text Search | 6 | 0 | 0 |  |
| `QRXStandardViewer` | QRX Viewer | 39 | 0 | 0 |  |
| `SearchDlg` | QuickReport Preview : Text Search | 6 | 0 | 0 |  |
| `SpeedbarSetupWindow` |  | 9 | 0 | 0 |  |
| `TableSelector` | Select Table and Fields | 19 | 0 | 0 |  |
