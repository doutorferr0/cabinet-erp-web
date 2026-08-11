-- Literais SQL montados no código Delphi (fora dos DFMs).
-- Deduplicados. É aqui que mora a REGRA: numeração, transição de status, baixa de estoque.


/* ================= UPDATE (857) ================= */
update the (select %s FROM %s %s
update Credito set  Credito_Situacao = 'C'  where Tpd_Codigo=1013 and Credito_TpdcodigoOrigem=1013 and Credito_CodigoDoc =:pCredito_Docvenda
update devolucao set Dev_situacao = 0 where DEV_codigopre=:pDEV_codigopre
update contas_apagar set Ctp_valor_total_original =:pvalor  where ctp_codigo =:pcodigo
update contas_apagar_det set Ctp_valor_vencimento =:pvalor  where ctp_codigo =:pcodigo
update Credito set Credito_Valor=:pCredito_Valor where Credito_Codigo=:pCredito_Codigo
update pedido_compra_det set pcd_quantidade_solicit=:QTDE where pcp_codigo=:PCPCODIGO and pro_codnosso=:PROCODNOSSO and pcd_acabamento=:ACABAMENTO and Pcd_item=:pPcd_item
update ordem_compra_det set ocd_quantidade_solicit=:QTDE, ocd_vl_item =:QTDE * Ocd_vl_compra  where ocp_codigo=:OCPCODIGO and pro_codnosso=:PROCODNOSSO and ocd_acabamento=:ACABAMENTO and ocd_item_ped=:OCDITEM  and ocd_cod_pedido=:OCDCOD
update ordem_compra_det set  ocd_vl_item = ocd_quantidade_solicit * Ocd_vl_compra  where ocp_codigo=:OCPCODIGO and pro_codnosso=:PROCODNOSSO and ocd_acabamento=:ACABAMENTO and ocd_item_ped=:OCDITEM  and ocd_cod_pedido=:OCDCOD
update produtos set produtos.Pro_EmpresaCompradora =:pPro_EmpresaCompradora
update produtos set Pro_PrazoEntrega = fornecedor.For_prazo_entrega
update orcamento set orc_cliente = '
update PEDIDO set ped_cliente = '
update controle_entrega set cen_cliente = '
update avulso set avu_cliente ='
update Factura set Fact_Situacao ='C',Fact_VlPortes=0, Fact_PorcDesconto=0, Fact_VlDesconto=0,Fact_VlTotDesconto=0,
update FacturaIVA set FactIVA_Base=0, FactIVA_ValorIVA=0
update SisSeqTabela set SeqTab_Numero =(select case when max(Fact_Codigo)> 0 then max(Fact_Codigo)+1 else 1 end   from Factura
update credito set Credito_Situacao='C' where Credito_TpdcodigoOrigem=1009 and Credito_CodigoDoc =
update credito set Credito_Situacao='C' where Credito_TpdcodigoOrigem=1012 and Credito_CodigoDoc =
update venda set ven_situacao ='C',  cen_codigo =  null, usr_dt_hr_alteracao = getdate() ,usr_cod_alteracao =
update credito set Credito_Situacao='C' where Credito_TpdcodigoOrigem = 1003 and Credito_CodigoDoc =
update credito set Credito_Situacao='C' where Credito_TpdcodigoOrigem=1003 and Credito_CodigoDoc =
update pedido_materiais_det SET pma_produto =:descricao where pro_codnosso =:codigo
update pedido_luminaria_det SET  pld_produto =:descricao where pro_codnosso =:codigo
update  pasta  set pasta_situacao ='C'   where pasta_codigo=:ppasta_codigo
update OrdemServico set OrdServ_situacao =0 where OrdServ_Codigo =:pOrdServ_Codigo
update Saida_complementacao set scp_status='C' where scp_codigo_pre=:codigo
UPDATE pedido_luminaria_det SET pld_quantidade = 0, pld_vl_item = 0 WHERE pld_quantidade < 0
UPDATE pedido_materiais_det SET pma_quantidade = 0, pma_vl_item = 0 WHERE pma_quantidade < 0
update VendaProduto set VenPro_DataEntrega =:pVenPro_DataEntrega where CodAcabamento=:pCodAcabamento and  Pro_codnosso =:pPro_codnosso and Ven_CodigoPre =:pVen_CodigoPre
update contas_receber set Ctr_valor_total_original =:pvalor  where ctr_codigo =:pcodigo
update credito set Credito_Situacao='C' where Credito_TpdcodigoOrigem=1001 and Credito_CodigoDoc =
update contas_receber set Tcf_codigo =1000 where Ctr_codigo =:pCtr_codigo
update venda SET Ven_DataFechaVenda =:PVen_DataFechaVenda   WHERE Ven_codigo =:pVen_codigo and ParSV_serie ='4 ' and Ven_Tipo='D'
update venda SET Ven_DataFechaVenda =:PVen_DataFechaVenda   WHERE Ven_codigo =:pVen_codigo and ParSV_serie =:pParSV_serie and Ven_Tipo='O'
update SisSeqTabela set SeqTab_Numero = (select case when max(Obr_Codigo) > 0 then max(Obr_Codigo)+1 else 1
update venda set ven_LimiteDesconto =:pven_LimiteDesconto, Par_QuantMaxParcela=:pPar_QuantMaxParcela, par_ParcelarVlAcima =:ppar_ParcelarVlAcima,
update venda set ven_situacao ='C', Mod_codigo=:pMod_codigo, cen_codigo =  null, usr_dt_hr_alteracao = getdate() ,usr_cod_alteracao =
update TransferenciaEstoque set  TransfEst_situacao ='C' where TransfEst_situacao ='A' and Ven_CodigoPre =
update venda set ven_situacao ='C', Mod_codigo=:pMod_codigo where ven_codigopre =:pven_codigopre
update venda set Ven_LiberaSeparacao =1 where Ven_CodigoPre =:pven_CodigoPre
update venda set Ven_LiberaSeparacao =0 where Ven_CodigoPre =:pven_CodigoPre
update venda set Ven_LiberaEntrega =1 where Ven_CodigoPre =:pven_CodigoPre
update venda set Ven_LiberaEntrega =0 where Ven_CodigoPre =:pven_CodigoPre
update Assistencia_Tecnica set ASTEC_Situacao = 0 where ASTEC_Codigo =:pASTEC_Codigo
update contas_receber set Pco_codigo =
update contas_apagar set Pco_codigo =
update RequisicaoEstoq set ReqEst_Situacao='C'  WHERE (ReqEst_Codigo = :pReqEst_Codigo)
update venda set cen_codigo = null where  venda.Ven_codigo=:pVen_codigo and Venda.ParSV_serie=:pParSV_serie
update estoque_produto set Epr_estoque =0 where EstTp_Codigo =1 and Epr_Codnosso =
Update SisUsuarios set senha =:vSenha
update sisOpcoes set ID=:vID,IDPAI=:vIDPAI,Caption=:vCaption,NomeMenu=:vNomeMenu,idApresentacao=:vsequencial Where ID=:codigo
update Contas_apagar_det set Ctp_situacao ='N' where ctp_codigo_det =:pctp_codigo_det
update contas_apagar set Ctp_status = 'A'
update Contas_apagar_det set Ctp_situacao ='S' where ctp_codigo_det =:pctp_codigo_det
update contas_apagar set Ctp_status = 'Q'
update Contas_RECEBER_det set CtR_situacao ='S' where ctR_codigo_det =:pctR_codigo_det
update contas_RECEBER set CtR_status = 'Q'
update preco_produto set pre_est_min = 0
UPDATE preco_produto SET pre_est_min = 0 FROM produtos INNER JOIN preco_produto
update ProdutosRelacionadosDet set Pro_codnosso =
update ProdutosRelacionadosCadProdutos set ProdRel_codigo =:pProdRel_codigo  where ProdRel_codigo =
update Cod_tabelas set orcamento = case when (select max(orc_codigo) from orcamento) > 0 THEN (select max(orc_codigo) from orcamento) +1 ELSE 1 END
update SisOpcoes set id = 183,idpai= 74 WHERE id = 186
update SisOpcoes set idapresentacao = 2326,idpai= 112 WHERE id = 185
update SisSeqTabela set SeqTab_Numero = (select case when max(cli_codigo) > 0 then max(cli_codigo)+1 else 1 end  from clientes) where SeqTab_Tabela = 'Clientes' and SeqTab_Campo = 'Cli_Codigo'
UPDATE orcamento SET CatVen_Codigo=1
UPDATE avulso SET CatVen_Codigo=1
UPDATE pedido SET CatVen_Codigo=1
UPDATE AutorizaInclusao SET CatVen_Codigo=1
UPDATE Paramentros SET SysPaises_codigo=1
UPDATE Paramentros SET moeda_codigo=1
UPDATE SisOpcoes SET SisOpcoes_paises='1,2'
UPDATE Tributacao SET SysPaises_codigo=1
update Municipio set Paises_codigo =1
update sisopcoes set idpai=189, idapresentacao=50, Caption='----------> Unidades da Federa
update sisopcoes set idpai=189, idapresentacao=51, Caption='----------> Munic
update sisopcoes set idapresentacao=1907 where id =183
update sisopcoes set idapresentacao=1908 where id =184
update sisopcoes set  Caption='----------> Exportar produtos para Excel' where id =123
update Paramentros  set Par_DiasFiltroFactura = 30
update Paramentros  set Par_DiasFiltroFacturaPF = 30
update Paramentros  set Par_DiasFiltroNotaCredito = 30
update Paramentros  set Par_DiasFiltroNotaDebito = 30
update Paramentros  set Par_DiasFiltroVendaDi = 30
update Paramentros  set Par_DiasFiltroGuiaR = 30
update Paramentros  set Par_DiasFiltroGuiaT = 30
update Paramentros  set Par_DiasFiltroDevolucao = 30
update Paramentros set Par_ComissaoVincParc='N'
update Paramentros set Par_ComisMostVlConsolid='N'
update VendaAtendente set VenAten_DtVigencia = avulso.avu_dt_emissao FROM VendaAtendente INNER JOIN avulso ON (VendaAtendente.VenAten_NDocPre = avulso.avu_codigo_pre) where VendaAtendente.VenAten_TpDoc ='AVU'
update VendaAtendente set VenAten_DtVigencia = orcamento.orc_dt_emissao FROM VendaAtendente INNER JOIN orcamento ON (VendaAtendente.VenAten_NDocPre = orcamento.orc_codigo_pre) where VendaAtendente.VenAten_TpDoc ='ORC'
update VendaAtendente set VenAten_DtVigencia = pedido.ped_dt_fechamento FROM VendaAtendente INNER JOIN pedido ON (VendaAtendente.VenAten_NDocPre = pedido.ped_codigo_pre) where VendaAtendente.VenAten_TpDoc ='PRO'
update VendaAtendente set VenAten_DtVigencia = AutorizaInclusao.Ain_dt_emissao FROM VendaAtendente INNER JOIN AutorizaInclusao ON (VendaAtendente.VenAten_NDocPre = AutorizaInclusao.Ain_codigo) where VendaAtendente.VenAten_TpDoc ='AUT'
update VendaAtendente set VenAten_DtVigencia = Factura.Fact_DtEmissao FROM VendaAtendente INNER JOIN Factura ON (VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo) where VendaAtendente.VenAten_TpDoc ='FCT'
update VendaAtendente set VenAten_DtVigencia = Factura.Fact_DtEmissao FROM VendaAtendente INNER JOIN Factura ON (VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo) where VendaAtendente.VenAten_TpDoc ='FPF'
update VendaAtendente set VenAten_DtVigencia = Factura.Fact_DtEmissao FROM VendaAtendente INNER JOIN Factura ON (VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo) where VendaAtendente.VenAten_TpDoc ='NCR'
update VendaAtendente set VenAten_DtVigencia = Factura.Fact_DtEmissao FROM VendaAtendente INNER JOIN Factura ON (VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo) where VendaAtendente.VenAten_TpDoc ='NDE'
update VendaAtendente set VenAten_DtVigencia = Factura.Fact_DtEmissao FROM VendaAtendente INNER JOIN Factura ON (VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo) where VendaAtendente.VenAten_TpDoc ='GRE'
update VendaAtendente set VenAten_DtVigencia = Factura.Fact_DtEmissao FROM VendaAtendente INNER JOIN Factura ON (VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo) where VendaAtendente.VenAten_TpDoc ='GTR'
update VendaAtendente set VenAten_DtVigencia = Factura.Fact_DtEmissao FROM VendaAtendente INNER JOIN Factura ON (VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo) where VendaAtendente.VenAten_TpDoc ='VDI'
update VendaAtendente set VenAten_DtVigencia = Factura.Fact_DtEmissao FROM VendaAtendente INNER JOIN Factura ON (VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo) where VendaAtendente.VenAten_TpDoc ='DEV'
update SisSeqTabela set SeqTab_Numero = (select case when max(Ctp_codigo) > 0 then max(Ctp_codigo)+1 else 1 end  from contas_apagar) where SeqTab_Tabela = 'contas_apagar' and SeqTab_Campo = 'Ctp_codigo'
update SisSeqTabela set SeqTab_Numero = (select case when max(ctp_codigo_det) > 0 then max(ctp_codigo_det)+1 else 1 end  from contas_apagar_det) where SeqTab_Tabela = 'contas_apagar_det' and SeqTab_Campo = 'ctp_codigo_det'
update SisSeqTabela set SeqTab_Numero = (select case when max(Cpp_cod_pag) > 0 then max(Cpp_cod_pag)+1 else 1 end  from Contas_apagar_pag) where SeqTab_Tabela = 'Contas_apagar_pag' and SeqTab_Campo = 'Cpp_cod_pag'
update SisSeqTabela set SeqTab_Numero = (select case when max(Ctr_codigo) > 0 then max(Ctr_codigo)+1 else 1 end  from contas_receber) where SeqTab_Tabela = 'contas_receber' and SeqTab_Campo = 'Ctr_codigo'
update SisSeqTabela set SeqTab_Numero = (select case when max(ctr_codigo_det) > 0 then max(ctr_codigo_det)+1 else 1 end  from contas_Receber_det) where SeqTab_Tabela = 'contas_Receber_det' and SeqTab_Campo = 'ctr_codigo_det'
update SisSeqTabela set SeqTab_Numero = (select case when max(Crp_cod_pag) > 0 then max(Crp_cod_pag)+1 else 1 end  from Contas_receber_pag) where SeqTab_Tabela = 'Contas_receber_pag' and SeqTab_Campo = 'Crp_cod_pag'
update sisopcoes set idapresentacao=662, id=207, idpai=36 where NomeMenu ='mFrmGridQuadroCargas'
Update Pedido set Par_ComissaoVincParc ='N'
Update avulso set Par_ComissaoVincParc ='N'
Update Factura set Par_ComissaoVincParc ='N'
Update avulso set Avu_DescComMat= avu_desc_por_materiais
Update avulso set Avu_DescComLum= avu_desc_por_luminaria
Update pedido set Ped_DescComMat= ped_desc_por_materiais
Update pedido set Ped_DescComLum= ped_desc_por_luminaria
update avulso set avu_forma_pag = 1000 where avu_forma_pag is null or  avu_forma_pag = 0
update pedido set ped_forma_pag = 1000 where ped_forma_pag is null or  ped_forma_pag = 0
update factura set Fact_FormaPagamento = 1000 where Fact_FormaPagamento is null or  Fact_FormaPagamento = 0
update contas_apagar set Ctp_forma_pag = 1000 where Ctp_forma_pag is null or  Ctp_forma_pag = 0
update contas_receber set Ctr_forma_pag = 1000 where Ctr_forma_pag is null or  Ctr_forma_pag = 0
update Texto_Substituicao set Tsu_alinhamento ='E'
update cfop set CFOP_Descricao =  UPPER(CFOP_Descricao), CFOP_DescricaoCurta= UPPER(CFOP_DescricaoCurta),usr_dt_hr_criacao=getdate() ,CFOP_Aplicacao =UPPER(isnull(CAST(CFOP_Aplicacao as varchar(7500)),''))
update FechamentoMetaEmp set FechamentoMetaEmp.FechMetaEmp_VlMeta = MetaVenda.MetaVenda_valor from FechamentoMetaEmp inner join MetaVenda on FechamentoMetaEmp.MetaVenda_Codigo= MetaVenda.MetaVenda_Codigo
update FechamentoMetaFunc set FechamentoMetaFunc.FechMetafun_VlMeta = MetaVendaDet.MetaVendaDet_valor from FechamentoMetaFunc inner join MetaVendaDet on MetaVendaDet.MetaVenda_Codigo= FechamentoMetaFunc.MetaVenda_Codigo and MetaVendaDet.CatRem_Codigo = FechamentoMetaFunc.CatRem_Codigo
update MetaVenda  set MetaVenda_dataVigenciaFim =  DateAdd(Month,6,MetaVenda_dataVigencia)
update MetaVendaDET  set MetaVendaDet_dataVFim = DateAdd(Month,6,MetaVendaDet_dataV)
update produtos set Pro_CodEspecial = Pro_CodNosso
update Reserva_tecnica set Ret_TpFinanceiro = 'C'
update SisSeqTabela  set SeqTab_Numero = (select case when max(Ret_codigo) is null then 0 else max(Ret_codigo) end from Reserva_tecnica) + 1 where SeqTab_Tabela = 'Reserva_tecnica' and  SeqTab_Campo = 'Ret_codigo'
update SisOpcoes set idApresentacao=1115  where id =139
update ControleCheque set ControlCheque_CodPagamento = 0   where ControlCheque_CodPagamento > 1000000
update Paramentros set Par_OrdemImpDetValor = 0
update Paramentros set Par_OrdemImpValor = 0
update Texto_Substituicao set Tsu_campo = 'NTFPro_VlUnitario' where Tsu_codigo = 104
update SisOpcoes set Caption='----------> Exportar Produtos', NomeMenu='mFrmExportacaoProdXML' where  id = 121
update SisOpcoes set Caption='----------> Importar Produtos', NomeMenu='mFrmImportacaoXML' where  id = 116
update SisSeqTabela set SeqTab_Numero = (select case when max(edv_codigo) > 0 then max(edv_codigo)+1 else 1 end  from Ent_devolucao) where SeqTab_Tabela = 'Ent_devolucao' and SeqTab_Campo = 'edv_codigo'
update SisSeqTabela set SeqTab_Numero = (select case when max(edv_codigo_pre) > 0 then max(edv_codigo_pre)+1 else 1 end  from Ent_devolucao) where SeqTab_Tabela = 'Ent_devolucao' and SeqTab_Campo = 'edv_codigo_pre'
update SisSeqTabela set SeqTab_Numero = (select case when max(Scp_codigo) > 0 then max(Scp_codigo)+1 else 1 end  from Saida_complementacao) where SeqTab_Tabela = 'Saida_complementacao' and SeqTab_Campo = 'Scp_codigo'
update SisSeqTabela set SeqTab_Numero = (select case when max(Scp_codigo_pre) > 0 then max(Scp_codigo_pre)+1 else 1 end  from Saida_complementacao) where SeqTab_Tabela = 'Saida_complementacao' and SeqTab_Campo = 'Scp_codigo_pre'
update Paramentros set Par_RTFornecedor = 'false'
update Paramentros set Par_CentralCompras = 'false'
update Paramentros set Par_OrcPagReduzido ='FALSE'
update orcamento set orc_PagReduzido ='false'
update NotaFiscal set NTF_ImpCodFor ='false'
UPDATE Paramentros SET Par_PROImgVert = 'FALSE'
UPDATE Paramentros set Par_AVUImgVert ='false'
UPDATE Paramentros set Par_ORCImgVert ='false'
UPDATE Paramentros set Par_FCTImgVert ='false'
UPDATE Paramentros set Par_FCTLinha ='false'
UPDATE Paramentros set Par_FPFImgVert ='false'
UPDATE Paramentros set Par_FPFLinha ='false'
UPDATE Paramentros set Par_NCRImgVert ='false'
UPDATE Paramentros set Par_NCRLinha ='false'
UPDATE Paramentros set Par_NDEImgVert ='false'
UPDATE Paramentros set Par_NDELinha ='false'
UPDATE Paramentros set Par_GREImgVert ='false'
UPDATE Paramentros set Par_GRELinha ='false'
UPDATE Paramentros set Par_GTRImgVert ='false'
UPDATE Paramentros set Par_GTRLinha ='false'
UPDATE Paramentros set Par_VDIImgVert ='false'
UPDATE Paramentros set Par_DEVLinha ='false'
UPDATE Paramentros set Par_DEVImgVert ='false'
UPDATE Paramentros set Par_VDILinha ='false'
UPDATE Paramentros set Par_EstMinVendas = 90
UPDATE Paramentros set Par_EstMinPerioVend = 30
UPDATE Paramentros set Par_EstMinCalcular ='FALSE'
UPDATE Preco_Produto set pre_EstMinCalcular ='FALSE'
UPDATE Paramentros set Par_CodPadProd ='N'
update clientes set Cli_LimitCredVend = 100000,Cli_LimitCredTotal = 100000
update Paramentros set Par_LimitCredVdCli = 100000,Par_LimitCredTtCli = 100000
UPDATE SisSeqTabela  SET SeqTab_Numero = 3 WHERE SeqTab_Tabela = 'SisOpcoesEspecial' and SeqTab_Campo = 'SisOpEsp_Codigo'
update Paramentros set Par_FechContaSenhaConj = 0
update Paramentros set Par_CodProdEspDesc ='N'
update contas_apagar set Tcf_codigo = 1
update contas_receber set Tcf_codigo = 1
update contas_apagar set Tcf_codigo = 3 WHERE Tpd_codigo = 1006
update contas_receber set Tcf_codigo = 3 WHERE Tpd_codigo = 1007
update Paramentros set Par_ProdutoFicticio = 1
update Paramentros set Par_FactModelo = 2
update Paramentros set Par_OrcDescImp = 1
update Paramentros set Par_ProDescImp = 1
update Paramentros set Par_AvuDescImp = 1
update orcamento set orc_tl_produto = orc_tl_geral_produto
update Paramentros set Par_LimitDescCli = 100
update clientes set cli_LimiteDesconto = 100
update Paramentros set Par_ServicoComoProduto = 0
update NFCONFIG set NF_Papel ='Custom'
update Paramentros set Par_CodEspecialUnico = 1
update Etiquetas_Campos set etq_Cam_Campo = 'mun_nome' where etq_Cam_Campo = 'cli_cidade'
update Etiquetas_Campos set etq_Cam_Campo = 'mun_uf' where etq_Cam_Campo = 'cli_uf'
update Texto_Substituicao set Tsu_campo = 'mun_nome' where Tsu_codigo = 6
update Texto_Substituicao set Tsu_campo = 'mun_uf'  where Tsu_codigo = 8
update Etiquetas_Campos set etq_Cam_Campo = 'cli_cidade' where etq_Cam_Campo = 'mun_nome'
update Etiquetas_Campos set etq_Cam_Campo = 'cli_uf' where etq_Cam_Campo = 'mun_uf'
update SisOpcoes set SisOpcoes_paises = '1,2' where id = 221
update Paramentros set Par_CaminhoEdittor = 'C:\softlux'
update Paramentros set Par_GuiaTranspVl = 0
update Paramentros set Par_GuiaRemVl = 0
update Paramentros set Par_ImpTipoPeca = 1
update Paramentros set Par_ImpComLogo = 0
update Paramentros set Par_EntregaComDuplicata = 0
update factura set fact_Importacao=0
update SisSeqTabela set emp_codigo=1
update PEDIDO set ped_requisicao = 0
update avulso set avu_requisicao = 0
update Paramentros set Par_RequisicaoProdutos = 0
update Texto_Substituicao set Tsu_campo = 'Ctr_recibo'  where Tsu_codigo = 189
update Texto_Substituicao set Tsu_campo = 'Ctr_reciboImp'  where Tsu_codigo = 190
update Texto_Substituicao set Tsu_campo = 'Ctr_reciboImpData'  where Tsu_codigo = 191
update Texto_Substituicao set Tsu_tabela = 'contas_pagar'  where Tsu_codigo = 212
update Texto_Substituicao set Tsu_campo = 'Ctp_recibo'  where Tsu_codigo = 209
update Texto_Substituicao set Tsu_campo = 'Ctp_reciboImp'  where Tsu_codigo = 210
update Texto_Substituicao set Tsu_campo = 'Ctp_reciboImpData'  where Tsu_codigo = 211
update Paramentros set Par_NotaFornecFin = 0
update Paramentros set Par_OrdemCompraFin = 0
update Paramentros set Par_TextDescNF = 'Desconto no valor de '
update Paramentros set Par_DescNF = 0
update ordem_compra set Ocp_SubTotal =(select sum(Ocd_vl_item) from ordem_compra_det  where ordem_compra.Ocp_codigo = ordem_compra_det.Ocp_codigo), Ocp_Total =(select sum(Ocd_vl_item) from ordem_compra_det  where ordem_compra.Ocp_codigo = ordem_compra_det.Ocp_codigo)
update Nota_entrada set Nen_SemFinanceiro = 0
update ordem_compra set Ocp_PagImpdesc = 0
update custo set Cus_TpVlNFo ='1'
update Preco_Produto set Pre_VlNFor = Pre_compra
update Preco_Produto_Log set PreLog_VlNFor = PreLog_compra
update Custo set cus_NFoICMS =0, Cus_NFoOutros = 0,Cus_NFoIPI =0 , Cus_NFoSimples = 0, Cus_NFoEmbalagem = 0,Cus_NFoFinanceiro =0, Cus_NFoFrete = 0, Cus_NFoDesconto =0
update Preco_Produto set Preco_Produto.Pre_compra =
update bdprodutos.dbo.Preco_Produto set bdprodutos.dbo.Preco_Produto.Pre_compra =
update Preco_Produto set Pre_VlNFor = Pre_compra  where Pre_VlNFor is null or Pre_VlNFor = 0
update ComissaoPremiacao set ComPre_servicos = 0
update Paramentros set Par_SeqNossoCodigo = 0
update Paramentros set Par_DescReciboGSVend = 'Ganhos Sobre Vendas'
UPDATE Estado SET UF_CodIBGE = 11 where uf='RO'
UPDATE Estado SET UF_CodIBGE = 12 where uf='AC'
UPDATE Estado SET UF_CodIBGE = 13 where uf='AM'
UPDATE Estado SET UF_CodIBGE = 14 where uf='RR'
UPDATE Estado SET UF_CodIBGE = 15 where uf='PA'
UPDATE Estado SET UF_CodIBGE = 16 where uf='AP'
UPDATE Estado SET UF_CodIBGE = 17 where uf='TO'
UPDATE Estado SET UF_CodIBGE = 21 where uf='MA'
UPDATE Estado SET UF_CodIBGE = 22 where uf='PI'
UPDATE Estado SET UF_CodIBGE = 23 where uf='CE'
UPDATE Estado SET UF_CodIBGE = 24 where uf='RN'
UPDATE Estado SET UF_CodIBGE = 25 where uf='PB'
UPDATE Estado SET UF_CodIBGE = 26 where uf='PE'
UPDATE Estado SET UF_CodIBGE = 27 where uf='AL'
UPDATE Estado SET UF_CodIBGE = 28 where uf='SE'
UPDATE Estado SET UF_CodIBGE = 29 where uf='BH'
UPDATE Estado SET UF_CodIBGE = 31 where uf='MG'
UPDATE Estado SET UF_CodIBGE = 32 where uf='ES'
UPDATE Estado SET UF_CodIBGE = 33 where uf='RJ'
UPDATE Estado SET UF_CodIBGE = 35 where uf='SP'
UPDATE Estado SET UF_CodIBGE = 41 where uf='PR'
UPDATE Estado SET UF_CodIBGE = 42 where uf='SC'
UPDATE Estado SET UF_CodIBGE = 43 where uf='RS'
UPDATE Estado SET UF_CodIBGE = 50 where uf='MS'
UPDATE Estado SET UF_CodIBGE = 51 where uf='MT'
UPDATE Estado SET UF_CodIBGE = 52 where uf='GO'
UPDATE Estado SET UF_CodIBGE = 53 where uf='DF'
update clientes set Cli_TipoConsumidor ='F'
UPDATE Paises SET Paises_CodBACEN = 01058 where Paises_Descricao = 'BRASIL'
UPDATE orcamento SET Orc_TipoDesc ='G'
UPDATE pedido SET Ped_TipoDesc ='G'
UPDATE avulso SET avu_TipoDesc ='G'
UPDATE Estoque_produto SET EstTp_Codigo = 1
UPDATE estoque_produto_dia SET EstTp_Codigo = 1
UPDATE unidades  SET uni_comprimento = 0
update Paramentros set Par_CodPedVendOrc = 1
update Paramentros set Par_NfeMostraVlUnitDesc = 0
update NotaFiscal set NTF_CriarConta =1
update NotaFiscal set NTF_VincECF = 0
update Paramentros set Par_VendaParcMaior = 0
UPDATE SisUsuarios SET SisUsu_monitor ='N'
update clientes set Cli_dataNasc = SUBSTRING(Cli_dataNasc,1,2) +'/'+ SUBSTRING(Cli_dataNasc,3,2) where Cli_dataNasc is not null
update clientes set Cli_dataNasc = SUBSTRING(Cli_dtnasc_conjuge,1,2) +'/'+ SUBSTRING(Cli_dtnasc_conjuge,3,2) where Cli_dtnasc_conjuge is not null
update Paramentros set Par_ClienteDtNascAno = 0
update NotaFiscal set NTF_CadTipo ='C',NTF_CadCodigo=CLI_CODIGO
update ParamentrosNFe set ParNFe_MostraSite = 0
update ParamentrosNFe set ParNFe_MostraEmail = 0
UPDATE sisopcoes SET SisOpcoes_paises = '1,2', ID=229 WHERE  NomeMenu = 'mFrmSelRltNFEntDif'
UPDATE sisopcoes SET ID=230 WHERE NomeMenu = 'mFrmGridQuadroCargas'
UPDATE sisopcoes SET ID=231 WHERE NomeMenu = 'mFrmSelRelPlanodecontas'
update produtos set Pro_AliqICMS = 21, Trib_Codigo = 11
update produtos set Pro_AliqICMS = 23, Trib_Codigo = 13
update ParamentrosNFe set ParNFe_ReciboNFe ='R',ParNFe_MostraFax = 0,ParNFe_ExpandirLogo = 0,  ParNFe_MargemDireita = 0.7, ParNFe_MargemEsquerda = 0.7,ParNFe_MargemSuperior = 0.7, ParNFe_MargemInferior = 0.7  ,ParNFe_FormularioContinuo = 0, ParNFe_FonteDANFE = 'fdTimesNewRoman', ParNFe_NumeroCopias = 1, ParNFe_LarguraCodProd = 1
update NotaFiscal set NTF_ConsumidorFinal = 0
update TabelaImposto set TbImp_NaoAltEstoque = 0
update TabelaImposto set TbImp_ipisomaicms = 0
update ParamentrosDesagio set  GrupoProduto_Codigo =1
update Paramentros set par_ParcelarVlAcima = 0
update pedido set par_ParcelarVlAcima = 0
update orcamento set par_ParcelarVlAcima = 0
update Avulso set par_ParcelarVlAcima = 0
update Paramentros set Par_VlMinParcela = 0
update pedido set Par_VlMinParcela = 0
update orcamento set Par_VlMinParcela = 0
update avulso set Par_VlMinParcela = 0
update Paramentros set Par_QuantMaxParcela = 100
update pedido set Par_QuantMaxParcela = 100
update orcamento set Par_QuantMaxParcela = 100
update avulso set Par_QuantMaxParcela = 100
update Credito set Credito_Docvenda = 0
update Paramentros set Par_ProjMostraDtEntrega = 1
update Paramentros set Par_OrcMostraDtEntrega = 1
update Paramentros set Par_ProjMostraEletricista = 1
update Paramentros set Par_OrcMostraEletricista = 1
update Paramentros set Par_VAMostraEletricista = 1
update Texto_Substituicao set Tsu_descricao= 'Nome da Empresa (comercial)' where Tsu_codigo = 246
update Texto_Substituicao set Tsu_descricao= 'CPF/CNPJ do cliente' where Tsu_codigo = 9
update Texto_Substituicao set Tsu_descricao= 'RG/Inscr. Estadual do cliente' where Tsu_codigo = 10
update ComissaoPremiacao set ComPre_NaoRatiaAlcanMeta  = 0
update SisOpcoes set  id = 232 where nomemenu = 'mFrmGridTabImpostos'
update SisOpcoes set  id = 233 where nomemenu = 'mFrmGridObsNFe'
update Nota_entrada set Nen_desconto  = 0
UPDATE Nota_entrada SET Nen_NaoCalcIPI = 1
update ParamentrosNFe set ParNFe_CaminhoXMLNFE  = 'C:\SpeedyNFe\XML\nfe'
update ParamentrosNFe set ParNFe_CaminhoXMLCAN  = 'C:\SpeedyNFe\XML\can'
update ParamentrosNFe set ParNFe_CaminhoXMLdpec  = 'C:\SpeedyNFe\XML\dpec'
update ParamentrosNFe set ParNFe_CaminhoXMLinu  = 'C:\SpeedyNFe\XML\inu'
update ParamentrosNFe set ParNFe_CaminhoPDF  = 'C:\SpeedyNFe\PDF\'
UPDATE Ent_devolucao SET edv_TipoDesc = (SELECT Ped_TipoDesc from pedido where Ent_devolucao.ped_codigo = pedido.ped_codigo AND pedido.ped_status='A')
UPDATE Ent_devolucao SET edv_TlLuminaria = edv_tl_geral_luminaria, edv_TlMateriais = edv_tl_geral_materiais, edv_TlServico = edv_tl_geral_servico,edv_TlEntrada = edv_tl_geral_entrada
UPDATE  FacturaProduto  set  FactProd_descricao = (select Pro_descricao_for from produtos where produtos.Pro_codnosso = FacturaProduto.Pro_codnosso)    WHERE  (Fact_Codigo <= 100)
UPDATE  FacturaProduto  set  FactProd_descricao = (select Pro_descricao from produtos where produtos.Pro_codnosso = FacturaProduto.Pro_codnosso)    WHERE  (Fact_Codigo > 100)
update Paramentros set Par_ModoPagFact =1010
update CategoriaVenda set CatVen_Financeiro = 1
update CategoriaVenda set CatVen_Compras = 1
update CategoriaVenda set CatVen_Estoque = 1
update pedido set ped_compra = 1,ped_estoque=1, ped_financeiro=1
update avulso set avu_compra = 1,avu_estoque=1, avu_financeiro=1
update ControleChequeDet set ControlChequeDet_Fact2dias = 0
update produtos set Pro_TipoProduto ='00'
update produtos set Pro_GeneroProdServ ='85'
update estoque_log set EstTp_Codigo = 1
update Paramentros set Par_ECFExpAut =0
update Paramentros set Par_ECFCExpCaminho = 'C:\PAF\MONITORA\REMESSA'
update Ent_devolucao set edv_tl_geral_entrada = edv_TlEntrada - (edv_DesagioValor + edv_DescEntrada )  where edv_DesagioValor > 0 and edv_DescEntrada > 0
update Ent_devolucao set edv_tl_geral_entrada = edv_TlEntrada - (edv_DesagioValor )  where edv_DesagioValor > 0 and (edv_DescEntrada is null or edv_DescEntrada=0)
update NotaFiscal set NTF_Manual = 0
update TabelaImposto set TbImp_consumidorFinal = 0
update ParamentrosNFe set ParNFe_BuscaAutCodImp = 0
update TabelaImposto set TbImp_situacao = 1
update ParamentrosNFe set ParNFe_EmailEnvioAut = 0
UPDATE Custo SET Cus_ICMSDifAlqIPI = 1
UPDATE Nota_Entrada_Dif set NenDf_codigo1 = NenDf_codigo
update GrupoProduto set GrupoProduto_ordem = GrupoProduto_Codigo
update Reserva_tecnica set ParSV_serie='1' where Ret_tipo ='PROJETO'
update Reserva_tecnica set ParSV_serie='2' where Ret_tipo <>'PROJETO'
update Controle_entrega set ParSV_serie = '1' where cen_tipo = 'P'
update Controle_entrega set ParSV_serie = '2' where cen_tipo <> 'P'
update contas_receber set ParSV_serie = '1' where Tpd_codigo = 1001
update SisOpcoes set Caption ='-----> Pasta', NomeMenu='mFrmGridPastaProj' where id= 37
update SisOpcoes set Caption ='-----> Or
update SisOpcoes set Caption ='-----> Pedido de Venda', NomeMenu='mVEN1_FrmGridVenda' where id= 39
update SisOpcoes set Caption ='-----> Devolu
update SisOpcoes set Caption ='-----> Autoriza
update SisOpcoes set Caption ='-----> Venda' where id= 74
update SisOpcoes set Caption ='----------> Pedidos de Vendas Fechados' where id= 74
update SisOpcoes set idpai =74 where id= 81
update QuadroCargasProjeto set ParSV_serie ='1'
update QuadroCargasProjeto set ven_codigopre = (select  ven_codigopre from venda where  venda.ParSV_serie = QuadroCargasProjeto.ParSV_serie and QuadroCargasProjeto.ped_codigo = venda.ven_codigo and venda.ven_tipo = 'P' and venda.ven_situacao = 'A')
update controle_entrega_prod set cep_quantidade_entregue = 0 where cep_quantidade_entregue is null
update controle_entrega_prod set cep_quantidade_separada = 0 where cep_quantidade_separada is null
update pedido_compra set ParSV_serie='1' where Pcp_modo ='P'
update pedido_compra set ParSV_serie='2' where Pcp_modo ='A' AND ParSV_serie IS NULL
UPDATE pedido_compra set Pcp_pedido_venda = (select Ven_CodigoPre from venda where venda.ParSV_serie = pedido_compra.ParSV_serie and venda.ven_codigo = pedido_compra.Pcp_ped_av_fan and ven_tipo='P' AND ven_situacao='A')
update ordem_compra_det set Ocd_cod_venda = (select  Pcp_pedido_venda from pedido_compra  where ordem_compra_det.Ocd_cod_pedido =Pcp_codigo ) where Ocd_ped_modo ='P' OR Ocd_ped_modo='A'
update venda set Par_ComissaoVincParc ='N' WHERE Par_ComissaoVincParc IS NULL AND VENDA.VEN_TIPO ='P'
update ControleRH set ParSV_serie = '1' where ParSV_serie is null and CtrlRH_TpDocOri =1001
update ControleRH set ParSV_serie = '2' where  CtrlRH_TpDocOri =1002
update ControleRH set ParSV_serie = '3' where  CtrlRH_TpDocOri =1018
update Paramentros set Par_VendaParcMenor = 0
update Forma_PagamentoGrupProd set Forma_PagamentoGrupProd.Fpgprod_desconto = case when Forma_Pagamento.Fpg_desconto_lu >0 then Forma_Pagamento.Fpg_desconto_lu else 0 end, Forma_PagamentoGrupProd.Fpgprod_acrescimo = case when Forma_Pagamento.Fpg_acrescimo_lu > 0 then Forma_Pagamento.Fpg_acrescimo_lu else 0 end from Forma_PagamentoGrupProd INNER JOIN Forma_Pagamento on Forma_PagamentoGrupProd.Fpg_codigo = Forma_Pagamento.Fpg_codigo where Forma_PagamentoGrupProd.GrupoProduto_Codigo = 1
update Forma_PagamentoGrupProd set Forma_PagamentoGrupProd.Fpgprod_desconto = case when Forma_Pagamento.Fpg_desconto_ma >0 then Forma_Pagamento.Fpg_desconto_ma else 0 end, Forma_PagamentoGrupProd.Fpgprod_acrescimo = case when Forma_Pagamento.Fpg_acrescimo_ma > 0 then Forma_Pagamento.Fpg_acrescimo_ma else 0 end from Forma_PagamentoGrupProd INNER JOIN Forma_Pagamento on Forma_PagamentoGrupProd.Fpg_codigo = Forma_Pagamento.Fpg_codigo where Forma_PagamentoGrupProd.GrupoProduto_Codigo > 1 and Forma_PagamentoGrupProd.GrupoProduto_Codigo < 1000
update Forma_PagamentoGrupProd set Forma_PagamentoGrupProd.Fpgprod_desconto = case when Forma_Pagamento.Fpg_desconto_se >0 then Forma_Pagamento.Fpg_desconto_se else 0 end, Forma_PagamentoGrupProd.Fpgprod_acrescimo = case when Forma_Pagamento.Fpg_acrescimo_se > 0 then Forma_Pagamento.Fpg_acrescimo_se else 0 end from Forma_PagamentoGrupProd INNER JOIN Forma_Pagamento on Forma_PagamentoGrupProd.Fpg_codigo = Forma_Pagamento.Fpg_codigo where  Forma_PagamentoGrupProd.GrupoProduto_Codigo = 1000
update VendaDesconto set VenDesc_DescPorcUsuario =0
update Ent_devolucao set edv_status = (select TOP 1 case when Dev_situacao = 1 then 'A' ELSE 'C' END from devolucao where Dev_codigo = edv_codigo)
update Reserva_Estoque set Res_Projeto = Res_VendaAvulsa where Res_Projeto is null
update Reserva_Estoque set ParSV_serie = '1' where Res_Projeto is not null
update Reserva_Estoque set ParSV_serie = '2' where Res_VendaAvulsa is not null and  (SELECT     dbo.Avulso.avu_codigo FROM dbo.Avulso where dbo.Avulso.avu_codigo = dbo.Reserva_Estoque.Res_VendaAvulsa) is not null
update estoque_log set elg_codigo =:pelg_codigo where elg_codigo =:pelg_codigo2 and elg_doc =:pelg_doc
update credito set ParSV_serie ='1'  where Credito_TpdcodigoOrigem =1001 and ParSV_serie is null
update Paramentros set Par_DevolFinTipo ='C'
update NotaFiscalImportaDoc set ParSV_serie = '1' where  NTFImp_DocTipo ='PRO'
update NotaFiscalImportaDoc set ParSV_serie = '2' where  NTFImp_DocTipo ='AVU'
update NotaFiscalImportaDoc set ParSV_serie = '3' where  NTFImp_DocTipo ='SPC'
UPDATE VENDA SET Venda.Ven_DataConclusao = pedido.ped_dt_fechamento_projeto  FROM Venda INNER JOIN pedido ON Venda.Ven_codigo = pedido.ped_codigo WHERE (Venda.Ven_Tipo = 'P') AND (dbo.Venda.ParSV_serie = '1') AND (dbo.pedido.ped_status = 'A') AND (Venda.Ven_Situacao = 'A')
UPDATE VENDA SET Venda.Ven_DataFechaVenda = pedido.ped_dt_fechamento  FROM Venda INNER JOIN pedido ON Venda.Ven_codigo = pedido.ped_codigo WHERE (Venda.Ven_Tipo = 'P') AND (dbo.Venda.ParSV_serie = '1') AND (dbo.pedido.ped_status = 'A') AND (Venda.Ven_Situacao = 'A')
UPDATE SisOpcoesEspecial SET SisOpEsp_Titulo ='ALTERAR DES
update Paramentros set Par_DTControleEntrega = (getdate()-90)
update Texto_Substituicao set Tsu_campo ='ven_codigo' where Tsu_codigo = 145
update Texto_Substituicao set Tsu_campo ='Ven_DataEmissao' where Tsu_codigo = 160
update Texto_Substituicao set Tsu_campo ='Ven_DataFechaVenda' where Tsu_codigo = 161
update Etiquetas_Campos set etq_Cam_Campo ='ven_codigo' where etq_Cam_Campo ='orc_codigo'
update Etiquetas_Campos set etq_Cam_Campo ='orc_dt_emissao' where etq_Cam_Campo ='Ven_DataEmissao'
update Etiquetas_Campos set etq_Cam_Campo ='orc_dt_fechamento' where etq_Cam_Campo ='Ven_DataFechaVenda'
update Etiquetas set etq_SQL =
update Paramentros set Par_Vlminparhist = 0
update acerto_eletrecistas set ParSV_serie = '1'
update Paramentros set Par_Caminhobackup ='C:\SOFTLUX\BACKUP'
update Paramentros set Par_AltQuatAutProdRel = 0
update venda set par_VlMinParcela = (select par_VlMinParcela from Paramentros)
update VendaProduto set VenPro_PreProduto = Orcamento_luminaria_det.old_produto FROM  dbo.VendaProduto INNER JOIN dbo.Orcamento_luminaria_det ON dbo.VendaProduto.Ven_CodigoPre = dbo.Orcamento_luminaria_det.orc_codigo_pre AND dbo.VendaProduto.Pro_codnosso = dbo.Orcamento_luminaria_det.Pro_codnosso AND dbo.VendaProduto.CodAcabamento = dbo.Orcamento_luminaria_det.old_acabamento AND dbo.VendaProduto.VenPro_Seq = dbo.Orcamento_luminaria_det.old_seq AND dbo.VendaProduto.VenPro_SeqItem = dbo.Orcamento_luminaria_det.old_seq_item INNER JOIN dbo.Venda ON dbo.VendaProduto.Ven_CodigoPre = dbo.Venda.Ven_CodigoPre WHERE (dbo.Venda.Ven_Tipo = 'O') AND (SUBSTRING(dbo.Orcamento_luminaria_det.Pro_codnosso, 1, 18) = '999999999999999999')
update VendaProduto set VenPro_PreProduto = orcamento_materiais_det.oma_produto FROM dbo.VendaProduto INNER JOIN dbo.orcamento_materiais_det ON dbo.VendaProduto.Ven_CodigoPre = dbo.orcamento_materiais_det.orc_codigo_pre AND dbo.VendaProduto.Pro_codnosso = dbo.orcamento_materiais_det.Pro_codnosso AND dbo.VendaProduto.CodAcabamento = dbo.orcamento_materiais_det.oma_acabamento AND dbo.VendaProduto.VenPro_Seq = dbo.orcamento_materiais_det.oma_seq AND dbo.VendaProduto.VenPro_SeqItem = dbo.orcamento_materiais_det.oma_seq_item INNER JOIN dbo.Venda ON dbo.VendaProduto.Ven_CodigoPre = dbo.Venda.Ven_CodigoPre WHERE     (dbo.Venda.Ven_Tipo = 'O') AND (SUBSTRING(dbo.orcamento_materiais_det.Pro_codnosso, 1, 18) = '999999999999999999')
update  QuadroCargasProjeto set Ven_Tipo ='P'
update venda set Ven_DescGanhoVenda = Ven_DescontoPorc where year(Ven_DataEmissao) =2012
update Paramentros set Par_DevRetQuantpedOrd = 0
update Paramentros set Par_RTautomatico =0
update RequisicaoEstoq set ParSV_serie ='1'
update Paramentros set Par_Layoutcontas ='3'
update sisopcoes set  caption ='----------> Produtos do Pedido de Venda' where id =235
update SisOpcoes set Caption = '-----> Venda' where id =74
update SisOpcoes set Caption = '----------> Pedidos de Vendas Fechados', idPai =74 where id =82
update SisOpcoes set idPai =74 where id =83
update SisOpcoes set idPai =74 where id =147
update Paramentros set  par_vendacircuito =0
update sisopcoes set  caption ='----------> Produtos do Pedido de Venda por Ambiente' where id =283
UPDATE Nota_entrada_det SET nota_entrada_det.CFOP_codigo = substring (replace (nen_cfop,
UPDATE Nota_entrada_det SET nota_entrada_det.Ned_NCM = produtos.pro_NCM FROM dbo.nota_entrada_det INNER JOIN produtos ON nota_entrada_det.Pro_codnosso = produtos.Pro_codnosso
update sisopcoes set  caption ='-----> Colaboradores' where id =21
update ParamentrosNFe set ParNFe_ImprimirCredICMS = 0
update Paramentros set Par_CreditaICMS =0
update ParamentrosNFe set ParNFe_CaminhoXMLCCe ='C:\SpeedyNFe\XML\CCe'
update sisopcoes set caption = '-----> Fornecedores' where id = 21
update sisopcoes set caption = '-----> Colaboradores' where id = 23
update Paramentros set par_VendaDataEntrega = 0
update Paramentros set Par_ObrigatorioPasta = 0
update empresa set Emp_ISSQN = 0
UPDATE Plano_Contas_Tipo SET Pct_situacao ='C' where Pct_codigo  =2
update Paramentros set Par_EstFisicoOutrosEst = 0
update notafiscal set NTF_finalidade ='NORMAL'
update Paramentros set Par_ECFVersao =
UPDATE nota_entrada_det SET @counter = Ned_codigo = @counter + 1
update Paramentros set Par_RTCreditoClienteNaoGerar = 0
update Mensagem_Relatorio set Men_linha =5000,men_caracteres=130 where Men_codigo in (3,4, 12,13)
update dbo.Venda set Ven_DescGanhoVenda =0  WHERE  (Ven_DescontoPorc = 0) AND (Ven_DescGanhoVenda > 0)
update Paramentros set Par_ECFDiretorioExportacao ='C:\OPaf\monitora\remessa'
update Paramentros set Par_ECFTempoExportacao =20000
update Paramentros set Par_LancBancEfetivarAutomatico = 1
update NotaFiscal set NTF_TpFrete ='Destinat
update NotaFiscal set NTF_TpFrete ='Emitente' where NTF_TpFrete='CIF'
update empresa set Emp_SimplesSubLimiteMunicipal = 0
update empresa set Emp_SimplesSubLimiteEstadual = 0
update Paramentros set Par_NaoImprimirCampoQuitado =0
update Paramentros set Par_OrdemCompImprimirDescAcab =0
update Paramentros set Par_PedNaoImprimirSomaAmbiente =0
update Paramentros set Par_OrcNaoImprimirSomaAmbiente =0
update SisSeqTabela set SeqTab_Tabela = 'BalancoEstoqueProdutos', SeqTab_Campo ='BalEstProd_Codigo' where SeqTab_Tabela = ' BalancoEstoqueProdutos '
update Paramentros set Par_OrcPedNaoArredondarItem =0
update dbo.produtos set produtos.Pro_PrazoEntrega = fornecedor.For_prazo_entrega from fornecedor INNER JOIN  dbo.produtos ON dbo.fornecedor.For_codigo = dbo.produtos.For_codigo
update dbo.produtos set produtos.Pro_PrazoEntrega = bdprincipal.dbo.fornecedor.For_prazo_entrega from bdprincipal.dbo.fornecedor   INNER JOIN  dbo.produtos ON bdprincipal.dbo.fornecedor.For_codigo = dbo.produtos.For_codigo
Update ParamentrosNFe set ParNFe_SalvarSOAP =0
Update ParamentrosNFe set ParNFe_ModeloImpressao ='I'
Update ParamentrosNFe set ParNFe_ESCPOSItensUmaLinha = 0
Update ParamentrosNFe set ParNFe_ESCPOSDescAcrePorItem = 0
update NotaFiscal set NTF_TipoNota='NFe'
Update venda set Ven_FixaDescontoComissao = 0
Update venda set Ven_ComAmbiente = 1
Update Paramentros set Par_VendaAmbiente = 'S'
Update produtos set Pro_QuantEntrada = 1
Update produtos set Pro_QuantSaida = 1
Update produtos set Pro_UnidadeEntrada =  Pro_Unidade
update ParamentrosNFe set ParNFe_NFSECaminhoSchemas ='C:\SpeedyNFe\Schemas'
update Paramentros set Par_OrcPedDiminuirImagem =0
update controle_entrega_data set Ced_ordem = 1
update Paramentros set Par_VendaImpCabUnico = 0
update NotaFiscal set  NTF_PagImpressao ='A PRAZO'
update ParamentrosNFe set ParNFe_NFeNumManual = 0
update ParamentrosNFe set ParNFe_NFCeNumManual = 0
update produtos set ClasProd_codigo =5
update Paramentros set Par_ContEntregaTipo = 'N'
update Contas_apagar_pag set Cpp_TipoLancamento = 'VALOR PRINCIPAL'
update Contas_receber_pag set Crp_TipoLancamento = 'VALOR PRINCIPAL'
update SisOpcoes set Caption =
update Tipo_documento set Tpd_descricao =
update porcentagem_Tributos  set Ptrib_versao = 1
update Paramentros set Par_DirArquivoRemessa ='c:\softlux'
update Paramentros set Par_DirArquivoRetorno ='c:\softlux'
update Paramentros set Par_DirBoletoLogo ='C:\Softlux\Imagens\Logos\Colorido'
update Paramentros set Par_MostrarAtendenteIndicacao =0
update fornecedor set For_JuntarCodigoAcabOrdem = 0
update ProdutosFornecedores   set @counter = ProdFor_Codigo =   @counter + 1
update SisSeqTabela set SeqTab_Numero = (select max(ProdFor_Codigo) + 1 from  ProdutosFornecedores) where SeqTab_Tabela='ProdutosFornecedores'
update Paramentros set Par_impostofixoRT =0
update venda set Par_impostofixoRT = 0
update Paramentros set Par_impostofixoComissao = 0
update venda set Par_impostofixoComissao = 0
update Clientes set cli_isento = 1 where Cli_tp_pessoa = 'F
update Paramentros set Par_VendaImposto = 0
update Paramentros set Par_BuscaImposto = 0
update SisSeqTabela set SeqTab_Numero = (select MAX(CodAmbiente) +1 from Ambiente) where SeqTab_Tabela= 'Ambiente'
update SisSeqTabela set SeqTab_Numero = (select MAX(Bcx_codigo) + 1  from Bancos_Caixas) where SeqTab_Tabela= 'Bancos_Caixas'
update SisSeqTabela set SeqTab_Numero = (select MAX(Cargo_codigo) + 1 from Cargo) where SeqTab_Tabela= 'Cargo'
update SisSeqTabela set SeqTab_Numero = (select MAX(CartBan_Codigo) +1 from CartoesBandeiras) where SeqTab_Tabela= 'CartoesBandeiras'
update SisSeqTabela set SeqTab_Numero = (select MAX(Cart_Codigo) +1 from Cartoes) where SeqTab_Tabela= 'Cartoes'
update SisSeqTabela set SeqTab_Numero = (select MAX(CatVen_Codigo) +1  from CategoriaVenda) where SeqTab_Tabela= 'CategoriaVenda'
update SisSeqTabela set SeqTab_Numero = (select MAX(Cdc_codigo) +1 from Centro_de_Custo)  where SeqTab_Tabela= 'Centro_de_Custo'
update SisSeqTabela set SeqTab_Numero = (select MAX(CPR_codigo) +1 from Cob_projetos) where SeqTab_Tabela= 'Cob_projetos'
update SisSeqTabela set SeqTab_Numero = (select MAX(col_codigo) +1 from Coletas)  where SeqTab_Tabela= 'Coletas'
update SisSeqTabela set SeqTab_Numero = (select MAX(Cba_codigo) +1 from Contas_Bancarias) where SeqTab_Tabela= 'Contas_Bancarias'
update SisSeqTabela set SeqTab_Numero = (select MAX(TpCont_codigo) +1 from TiposContatos)  where SeqTab_Tabela= 'TiposContatos'
update SisSeqTabela set SeqTab_Numero = (select MAX(ContPrinc_codigo) +1 from ContatosPrincipais)  where SeqTab_Tabela= 'ContatosPrincipais'
update SisSeqTabela set SeqTab_Numero = (select MAX(Credito_Codigo) +1 from Credito)  where SeqTab_Tabela= 'Credito'
update SisSeqTabela set SeqTab_Numero = (select MAX(Cus_codigo) +1 from Custo) where SeqTab_Tabela= 'Custo'
update SisSeqTabela set SeqTab_Numero = (select MAX(Csl_codigo) +1 from Custo_log) where SeqTab_Tabela= 'Custo_log'
update SisSeqTabela set SeqTab_Numero = (select MAX(DadBan_codigo) +1 from DadosBancarios) where SeqTab_Tabela= 'DadosBancarios'
update SisSeqTabela set SeqTab_Numero = (select MAX(Desig_Codigo) +1 from Designer) where SeqTab_Tabela= 'Designer'
update SisSeqTabela set SeqTab_Numero = (select MAX(CodLanc)+1 from Empresa) where SeqTab_Tabela= 'Empresa'
update SisSeqTabela set SeqTab_Numero = (select MAX(EmpFact_Codigo) +1 from EmpresaFactoring)  where SeqTab_Tabela= 'EmpresaFactoring'
update SisSeqTabela set SeqTab_Numero = (select MAX(EmpFactAD_Codigo) +1 from EmpresaFactoringAliqDesc)  where SeqTab_Tabela= 'EmpresaFactoringAliqDesc'
update SisSeqTabela set SeqTab_Numero = (select MAX(EndComuns_codigo) +1 from Enderecos_comuns) where SeqTab_Tabela= 'Enderecos_comuns'
update SisSeqTabela set SeqTab_Numero = (select MAX(Elg_codigo) +1 from estoque_log)  where SeqTab_Tabela= 'estoque_log'
update SisSeqTabela set SeqTab_Numero = (select MAX(Fab_Codigo) +1 from Fabrica)  where SeqTab_Tabela= 'Fabrica'
update SisSeqTabela set SeqTab_Numero = (select MAX(Feriado_codigo) +1  from Feriados) where SeqTab_Tabela= 'Feriados'
update SisSeqTabela set SeqTab_Numero = (select MAX(Fil_codigo) +1 from Filiais) where SeqTab_Tabela= 'Filiais'
update SisSeqTabela set SeqTab_Numero = (select MAX(For_codigo) +1 from Fornecedor) where SeqTab_Tabela= 'Fornecedor'
update SisSeqTabela set SeqTab_Numero = (select MAX(Hora_codigo) +1 from Horarios)  where SeqTab_Tabela= 'Horarios'
update SisSeqTabela set SeqTab_Numero = (select MAX(HoraData_codigo) +1 from HorariosDatas)  where SeqTab_Tabela= 'HorariosDatas'
update SisSeqTabela set SeqTab_Numero = (select MAX(HoraDataDet_Codigo) +1 from HorariosDatasDetalhe)  where SeqTab_Tabela= 'HorariosDatasDetalhe'
update SisSeqTabela set SeqTab_Numero = (select MAX(Ind_codigo) +1 from Indicacoes)  where SeqTab_Tabela= 'Indicacoes'
update SisSeqTabela set SeqTab_Numero = (select MAX(IndDet_codigo) +1  from Indicacoes_Detalhe)  where SeqTab_Tabela= 'Indicacoes_Detalhe'
update SisSeqTabela set SeqTab_Numero = (select MAX(IndFun_codigo) +1 from Indicacoes_Funcionario)  where SeqTab_Tabela= 'Indicacoes_Funcionario'
update SisSeqTabela set SeqTab_Numero = (select MAX(Ipr_CodigoSigla) +1 from Indice_preco)  where SeqTab_Tabela= 'Indice_preco'
update SisSeqTabela set SeqTab_Numero = (select MAX(Irl_codigo)+1 from Indice_preco_log)  where SeqTab_Tabela= 'Indice_preco_log'
update SisSeqTabela set SeqTab_Numero = (select MAX(Ctrlogin_codigo) +1 from Login)  where SeqTab_Tabela= 'Login'
update SisSeqTabela set SeqTab_Numero = (select MAX(MotDevTp_codigo) +1 from Motivo_devolucao_tipo) where SeqTab_Tabela= 'Motivo_devolucao_tipo'
update SisSeqTabela set SeqTab_Numero = (select MAX(mun_codigo) +1 from Municipio)  where SeqTab_Tabela= 'Municipio'
update SisSeqTabela set SeqTab_Numero = (select MAX(Nac_codigo) +1 from Nacionalidade)  where SeqTab_Tabela= 'Nacionalidade'
update SisSeqTabela set SeqTab_Numero = (select MAX(Obr_Codigo) + 1 from Obras) where SeqTab_Tabela= 'Obras'
update SisSeqTabela set SeqTab_Numero = (select MAX(OrgReg_Codigo) +1  from OrgaoRegistro) where SeqTab_Tabela= 'OrgaoRegistro'
update SisSeqTabela set SeqTab_Numero = (select MAX(Pcp_codigo) + 1  from pedido_compra) where SeqTab_Tabela= 'pedido_compra'
update SisSeqTabela set SeqTab_Numero = (select MAX(Pco_codigo) + 1  from Plano_Contas)  where SeqTab_Tabela= 'Plano_Contas'
update SisSeqTabela set SeqTab_Numero = (select MAX(Pre_codigo) + 1 from Preco_Produto) where SeqTab_Tabela= 'Preco_Produto'
UPDATE SisSeqTabela set SeqTab_Campo= 'Pro_CodReduzido' where SeqTab_Tabela= 'produtos'
update SisSeqTabela set SeqTab_Numero = (select MAX(ProdLocEst_Codigo) + 1 from ProdutosLocEstoque) where SeqTab_Tabela= 'ProdutosLocEstoque'
update SisSeqTabela set SeqTab_Numero = (select MAX(ProdProPrio_codigo) + 1 from ProdutosPromPrioritario) where SeqTab_Tabela= 'ProdutosPromPrioritario'
update SisSeqTabela set SeqTab_Numero = (select MAX(ProdProPrioDet_codigo) + 1  from ProdutosPromPrioritarioDet) where SeqTab_Tabela= 'ProdutosPromPrioritarioDet'
update SisSeqTabela set SeqTab_Numero = (select MAX(ProdServ_codigo) + 1 from ProdutosServi
update SisSeqTabela set SeqTab_Numero = (select MAX(COD_ATIVID) +1  from Profiss
update SisSeqTabela set SeqTab_Numero = (select MAX(QCargas_Codigo) + 1  from QuadroCargas)  where SeqTab_Tabela= 'QuadroCargas'
update SisSeqTabela set SeqTab_Numero = (select MAX(sev_cod) + 1 from Servicos) where SeqTab_Tabela= 'Servicos'
update SisSeqTabela set SeqTab_Numero = (select MAX(Setor_codigo) + 1  from Setor)  where SeqTab_Tabela= 'Setor'
update SisSeqTabela set SeqTab_Numero = (select MAX(TpRel_codigo) + 1  from Tipo_Relatorio)  where SeqTab_Tabela= 'Tipo_Relatorio'
update SisSeqTabela set SeqTab_Numero = (select MAX(TpMot_codigo) + 1 from TipoMotivo)  where SeqTab_Tabela= 'TipoMotivo'
update SisSeqTabela set SeqTab_Numero = (select MAX(TransfInd_codigo) +1  from TransfIndicacao) where SeqTab_Tabela= 'TransfIndicacao'
update SisSeqTabela set SeqTab_Numero = (select MAX(TransfIndDet_codigo) +1 from TransfIndicacaoDet)  where SeqTab_Tabela= 'TransfIndicacaoDet'
update SisSeqTabela set SeqTab_Numero = (select MAX(Tra_codigo) +1 from Transportadora) where SeqTab_Tabela= 'Transportadora'
update SisSeqTabela set SeqTab_Numero = (select MAX(Ven_codigo) + 1  from Venda) where SeqTab_Tabela= 'Venda' and SeqTab_Campo= 'Ven_Codigo'
update SisSeqTabela set SeqTab_Numero = (select MAX(Ven_CodigoPre) +1 from Venda)  where SeqTab_Tabela= 'Venda' and SeqTab_Campo= 'Ven_CodigoPre'
update SisSeqTabela set SeqTab_Numero =(select max(SisPerEsp_Codigo) +1 from SisPermissaoEspecial) where SeqTab_Tabela='SisPermissaoEspecial'  and SeqTab_Campo ='SisPerEsp_Codigo'
Update SisUsuarios set SisUsu_EmailTLS = 0
Update SisUsuarios set SisUsu_EmailSSL = 0
update sisseqtabela set SeqTab_Numero = (select max(for_codigo) +1  from fornecedor where for_codigo < 99999) where SeqTab_Tabela='Fornecedor' and SeqTab_Campo='For_codigo'
update SisUsuarios set Emp_codigo = 1
update Paramentros set Emp_codigo = 1
update Servicos set Emp_codigo = 1
update produtos set Emp_codigo = 1
update Obras set Emp_codigo = 1
update venda set Emp_codigo = 1
update Funcionario set Emp_codigo = 1
update Forma_Pagamento set Emp_codigo = 1
update modo set Emp_codigo = 1
update Clientes set Emp_codigo = 1
update Indicacoes set Emp_codigo = 1
update GrupoProduto set Emp_codigo = 1
update Ambiente set Emp_codigo = 1
update VendaDesconto set Emp_codigo = 1
update observacoes set Emp_codigo = 1
update Motivo_devolucao set Emp_codigo = 1
update Credito set Emp_codigo = 1
UPDATE observacoes SET @counter = obs_seq = @counter + 1
update Forma_Pagamento_Parcela set Emp_codigo = 1
update VendaProduto set Emp_codigo = 1
update MetaVenda set Emp_Codigo =1
update SisSeqTabela set SeqTab_Numero = ( select max(ged.dbo.GED.GED_Codigo) + 1 from ged.dbo.GED)  where  SeqTab_Tabela='GED' AND SeqTab_Campo='GED_Codigo'
update Paramentros set Par_ImpFornecOrc = 0
update Paramentros set Par_ImpFornecPed = 0
update FornecFatMinimo set Emp_codigo = 1
update Fornecedor set Emp_codigo = 1
update SisSeqTabela set  SeqTab_Numero = 1 where Emp_codigo = 1 and SeqTab_Tabela='ProdutosRelacionados' and SeqTab_Campo='ProdRel_Codigo'
update SisSeqTabela set  SeqTab_Numero = 1 where Emp_codigo = 1 and SeqTab_Tabela='ProdutosRelacionadosDet' and SeqTab_Campo='ProdRelDet_Codigo'
update SisSeqTabela set  SeqTab_Numero = 1 where Emp_codigo = 1 and SeqTab_Tabela='ProdutosRelacionadosCadProdutos' and SeqTab_Campo='ProdRelCadProd_codigo'
update SisSeqTabela set  SeqTab_Numero = 1 where SeqTab_Tabela='GED' and SeqTab_Campo='GED_Codigo and SeqTab_Numero = null'
update Bancos set Emp_codigo = 1
UPDATE Acabamento SET Emp_codigo = 1
UPDATE Paises set Emp_codigo = 1
UPDATE EstoqueTipo set Emp_codigo = 1
update unidades set Emp_codigo = 1
update Mensagem_Relatorio set Emp_codigo = 1
update CategoriaCliente set Emp_codigo =1
UPDATE Cargo SET Emp_codigo = 1
UPDATE CategoriaRemuneracao SET Emp_codigo = 1
UPDATE Nacionalidade SET Emp_codigo = 1
update SisSeqTabela set SeqTab_Numero = case when (select max(Pro_CodReduzido)+1 as maximo from produtos) > 0 then (select max(Pro_CodReduzido)+1 as maximo from produtos) else 1 end where  SeqTab_Tabela = 'Produtos' and SeqTab_Campo = 'Pro_CodReduzido'
update EtiquetaPronta set EtqPront_Porta ='COM1'
update produtos set emp_codigo= 1
update Preco_Produto set emp_codigo= 1
update produtos  set produtos.Pro_CodReduzido = principal.Pro_CodReduzido from produtos  INNER JOIN bdprincipal.dbo.produtos as principal ON dbo.produtos.Pro_codnosso = principal.Pro_codnosso
update Paramentros set Par_CodigoBarraAcabamento = 1
update Paramentros set Par_ImprimirLogoParceirosOrc = 0
update Paramentros set Par_ImprimirLogoParceirosPed = 0
update EtiquetaPronta set EtqPront_MargemEsqZebra=0
update Empresa set Emp_Software='SOFTLUX'
update Paramentros set Par_id = 1
UPDATE Paramentros SET Par_CEPWebService ='wsViaCep'
UPDATE Paramentros SET Par_CEPChaveAcesso ='1STa9eKhhfKvc7Ljh6W6CO5Kr/bFOl.'
update SisSeqTabela set SeqTab_Numero =(select max(Credito_Codigo) + 1 from Credito)  where SeqTab_Tabela= 'Credito'
update EstoqueTipo set EstTp_externo =0
update VendaProduto set @counter = VenPro_codigo = @counter + 1
update Paramentros set Par_IndicacaoDtNascAno =0
update Venda set Pco_codigo =(select Par_PlanoContasProjeto from Paramentros)
update Nota_entrada set Pco_codigo =(select Par_PlanoContasNotaEntrada from Paramentros)
UPDATE contas_apagar SET  Ctp_vinculo='PROFISSIONAL EXTERNO' WHERE Ctp_vinculo ='INDICA
UPDATE contas_receber SET  Ctr_vinculo='PROFISSIONAL EXTERNO' WHERE Ctr_vinculo ='INDICA
update SisSeqTabela set SeqTab_Numero =(select max(Mdo_codigo) + 1 from modo)  where SeqTab_Tabela= 'Modo'
UPDATE estado SET UF_CalcularFCP = 1  from estado INNER JOIN  Paramentros ON estado.UF = Paramentros.Par_UF
update NotaFiscal set SPEDTpFrete_codigo = '3' where NTF_TpFrete =  'Emitente'
update NotaFiscal set SPEDTpFrete_codigo = '4' where NTF_TpFrete =  'Destinat
update NotaFiscal set SPEDTpFrete_codigo = '2' where NTF_TpFrete =  'Terceiros'
update NotaFiscal set SPEDTpFrete_codigo = '9' where NTF_TpFrete =  'Sem frente'
update SisSeqTabela set SeqTab_Numero = (select sum(Mdo_codigo) +1 from modo where Mdo_codigo < 999 )  where SeqTab_Tabela ='Modo'
update Paramentros set Par_ContEntregaNumero = 0
update SisUsuarios set SisUsu_PDVSangria = 0
update SisUsuarios set SisUsu_PDVOperar = 0
update Contas_Bancarias set Cba_PDV = 0
update VendaProduto set VenPro_tipoprod ='P'
update sisopcoes set SisOpcoes_sistema = '1,2,3,4'
update Paramentros set Par_ImprimirTamanho = 0
update SisSeqTabela set SeqTab_Numero = 1 where SeqTab_Tabela= 'OrgaoRegistro'
update SisSeqTabela  set SeqTab_Numero=  (select max(Elg_codigo) +1 as maximo from estoque_log) where SeqTab_Tabela ='estoque_log' and SeqTab_Campo ='Elg_codigo'
update Paramentros  set ParParticiapacaoDevolucao =0
update Plano_Contas set Pco_CustoMercVendida = 0
update ParamentrosNFe set ParNFe_LarguraBobinaNFCe =302
update ParamentrosNFe set ParNFe_MargemDireitaNFCe = 0.51
update ParamentrosNFe set ParNFe_MargemEsquerdaNFCe = 0.60
update ParamentrosNFe set ParNFe_MargemSuperiorNFCe = 0.80
update ParamentrosNFe set ParNFe_MargemInferiorNFCe = 0.80
update ParamentrosNFe set ParNFe_AmbienteMDFe ='H'
UPDATE ParamentrosNFe SET ParNFe_MDFeTipoImpressao ='Sem Gera
update ParamentrosNFe set ParNFe_MDFeSchemas ='C:\SpeedyNFe\MDFe\Schemas'
update ParamentrosNFe set ParNFe_MDFePasta ='C:\SpeedyNFe\MDFe'
update ParamentrosNFe set ParNFe_MDFePastaPDF ='C:\SpeedyNFe\MDFe\PDF'
update Controle_entrega set Cen_TipoEntrega ='E'
update Controle_entrega_prod set Cep_TipoEntrega ='ENTREGA'
UPDATE Estoque_produto SET Tam_codigo = 0 WHERE Tam_codigo IS NULL
UPDATE Preco_Produto SET Tam_codigo = 0 WHERE Tam_codigo IS NULL
update custo set Cus_STEmbalagem =0
update TransferenciaEstoqueProduto set tam_codigo =0
UPDATE CategoriaVenda SET TpCatVenda_codigo = 1
update Paramentros set Par_DiasFiltroDemonstracao = 90
update Paramentros set Par_AdmistracaoMista =0
update empresa set CODLANC =1
update SisSeqTabela set SeqTab_Numero =2 where SeqTab_Tabela='Empresa'
update ParamentrosNFe set ParNFe_Codigo = 1
update produtos set Pro_ForaLinha =0
update Paramentros set Par_CaminhoOrcamento ='C:\SOFTLUX', Par_CaminhoPedidoVenda ='C:\SOFTLUX',Par_CaminhoRelatorio ='C:\SOFTLUX'
update Paramentros set Par_OrdemCompraConta = 0
update Contas_Bancarias set CbaLayoutremessa ='c400'
update Paramentros set Par_ConEstoqueFiltroSimples = 0
update SisGrupo_Usuario set SisGru_GrupoPrivado = 0
update SisSeqTabela set SisSeqTabela.SeqTab_Numero = (select max(obs_seq)+1 from observacoes) where SisSeqTabela.SeqTab_Tabela = 'observacoes' and SisSeqTabela.SeqTab_Campo ='obs_seq'
update SisOpcoes set MenuWeb  = 0
update SisOpcoes set MenuWeb  = 1 where id in (1,19,20,22,23,36,38,44,48,55,73,107,112,135,138)
update SisSeqTabela set SeqTab_Numero = (select MAX(mod_codigo) + 1 from Motivo_devolucao where mod_codigo < 1000) where SeqTab_Tabela= 'Motivo_devolucao'
update Paramentros set Par_CarrinhoComprasFiltroSimples  = 0
update Paramentros set Par_ComprasAtulizarVlTabela  = 0
UPDATE VendaServico SET @counter = VenSer_Codigo = @counter + 1
UPDATE VendaProduto SET @counter = VenPro_codigo = @counter + 1 where VenPro_codigo is null
update   SisSeqTabela  set SeqTab_Numero = (select max(venpro_codigo) + 1 from vendaproduto) where SeqTab_Campo='VenPro_codigo'
update AltValorTabela set AltValTab_indice = 'implantacao'
UPDATE AltValorTabela SET @counter = AltValTab_codigo = @counter + 1
update Custo set Cus_FreteemCompra = 0
update produtos set Pro_ConsultarValor = 0
update Paramentros set Par_ParticipacaoDesconto  = 0
update SisSeqTabela set SeqTab_Numero = 1 where SeqTab_Numero is null
update SisSeqTabela  set SeqTab_Numero = case when  (select max(ProdRel_Codigo) +1 from  ProdutosRelacionados) IS NULL then 1 else (select max(ProdRel_Codigo) +1 from  ProdutosRelacionados) end  where SeqTab_Tabela ='ProdutosRelacionados' and SeqTab_Campo  = 'ProdRel_Codigo'
update SisSeqTabela set SeqTab_Numero = case when (select max(ProdRelDet_Codigo) +1 from  ProdutosRelacionadosDet) is null then 1 else (select max(ProdRelDet_Codigo) +1 from  ProdutosRelacionadosDet) end where SeqTab_Tabela ='ProdutosRelacionadosDet' and SeqTab_Campo = 'ProdRelDet_Codigo'
update NotaFiscal set NTF_Offline  = 0
update NotaFiscal set NTF_OfflineErro  = 0
update SisSeqTabela set SeqTab_Numero = case when (select max(mdo_codigo) +1 from  Modo WHERE Mdo_codigo < 1000) is null then 1 else (select max(mdo_codigo) +1 from  Modo WHERE Mdo_codigo < 1000) end where SeqTab_Tabela ='modo' and SeqTab_Campo = 'mdo_codigo'
update Paramentros set Par_EstTransfCodigo ='E'
update empresa set Emp_ImprimirNome = 1  where CODLANC = 1
update ordem_compra set Emp_codigo = 1
update ordem_compra_det set Emp_codigo = 1
update empresa set Emp_ImprimirNome = 0  where CODLANC > 1
update ParamentrosNFe set ParNFe_MultiEmpresaTodosProd = 0
update Paramentros set Par_MultiEmpresaCompraTodos = 0
update controle_entrega_data set Ced_ordemSeparacao = 1
update Paramentros set Par_OrdemServicoComServ = 0
update Paramentros set Par_MostrarPecaNoLugarDescricao = 0
update Paramentros set Par_NotaFornecedorApenasXML = 0
update Paramentros set Par_NotaFornecedorVerificarNCM = 0
UPDATE IndicacaoGrupProd SET IndGruProd_Porc = 0 WHERE IndGruProd_Porc IS NULL
UPDATE VendaIndicacaoGrupProd SET VenIndGrup_Porc = 0 WHERE VenIndGrup_Porc IS NULL
UPDATE Reserva_tecnica_GrupoProd SET RetGProd_PorcRT = 0 WHERE RetGProd_PorcRT IS NULL
UPDATE ParametrosRTGrupoProdutos SET ParRTGrupProd_porcentagem = 0 WHERE ParRTGrupProd_porcentagem IS NULL
update Paramentros set Par_AtualizarValoresServicos =0
update TabelaImposto set TpTrib_CalcularDifal = 0
update produtos set Pro_SobreMedida = 0
update TabelaImposto set TpTrib_ContribuinteICMS = 0
update Paramentros set Par_MudarTituloOrcCab = 0
update Paramentros set Par_CodigoBarraAutomatico = 0
update produtos set Pro_SobreMedida = 0 where Pro_SobreMedida  is null
update EtiquetaPronta set EtqPront_EspacoEntreEtiquetaHorizontal = 50
update Servicos set Serv_NaoAtualizarValor = 0
update Venda set Ven_HabilitarFrete = 0
update Venda set Ven_HabilitarFrete = 1 where Ven_ValorFrete > 0
update Paramentrosnfe set Parnfe_ImprimirFormaPag = 'N
update Paramentros set Par_MargemEsquerda = 10
update Paramentros set Par_MargemDireita = 10
update Paramentros set Par_MargemSuperior = 10
update Paramentros set Par_MargemInferior = 10
update GED set Codlanc = 1
Update Paramentros set Par_CtApagar_DiasAnterior = 30
update Paramentros set Par_CtApagar_DiasPosterior = 120
update Paramentros set Par_CtReceber_DiasAnterior = 30
update Paramentros set Par_CtReceber_DiasPosterior = 120
UPDATE Texto_Substituicao SET Tsu_descricao ='Endere
UPDATE Texto_Substituicao SET Tsu_descricao ='N
UPDATE Texto_Substituicao SET Tsu_descricao ='Nome do bairro do profissional',Tsu_tabela='Indicacoes_Detalhe' WHERE Tsu_codigo =43
UPDATE Texto_Substituicao SET Tsu_descricao ='Cep do profissional',Tsu_tabela='Indicacoes_Detalhe' WHERE Tsu_codigo =44
UPDATE Texto_Substituicao SET Tsu_descricao ='Cidade do profissional',Tsu_tabela='Indicacoes_Detalhe' WHERE Tsu_codigo =45
UPDATE Texto_Substituicao SET Tsu_descricao ='Uf do profissional',Tsu_tabela='Indicacoes_Detalhe' WHERE Tsu_codigo =46
UPDATE Texto_Substituicao SET Tsu_descricao ='Data de nascimento do profissional',Tsu_tabela='Indicacoes_Detalhe' WHERE Tsu_codigo =47
UPDATE Texto_Substituicao SET Tsu_descricao ='Nome do c
UPDATE Texto_Substituicao SET Tsu_descricao ='Data de nascimento do c
UPDATE Texto_Substituicao SET Tsu_descricao ='Complemento do Endere
update ParamentrosNFe set ParNFe_ForcarGerarTagRejeicao938 = 0
update Paramentros set Par_VendaN
update Paramentros set Par_AssistenciaN
update NotaFiscalCCe set NotaFiscalCCe.emp_codigo = ( SELECT top 1 NotaFiscal.Emp_Codigo  FROM NotaFiscal where NotaFiscal.NTF_ChaveNFE = NotaFiscalCCe.NTF_ChaveNFE)
update Paramentros set Par_CadClienteCaixaAlta = 1
update venda set Ven_LiberaSeparacao = 0
update venda set Ven_LiberaEntrega = 0
update venda set Ven_EnviarEmailEstoque = 0
update SisUsuarios set SisUsu_LiberarSepEnt = 0
update SisUsuarios set SisUsu_EnviarEmailEstoque =0
update Paramentros set Par_ControleSepEntProdutos = 0
update Paramentros set Par_ImpOrdPedObsAntesPag = 0
update Paramentros set Par_IndiceGrupoUsuario = 0
update TransferenciaEstoque set emp_codigo =1
update Lancamento_estoque set emp_codigo =1
update pedido_compra set emp_codigo =1
update Paramentros set Par_EstoquePorEmpresa = 0
update estoque_produto set Emp_codigo = 1
update estoque_log set Emp_codigo = 1
update estoque_produto_dia set Emp_codigo = 1
update Paramentros set Par_AcessoPorEmpresaOrcPed = 0
update Paramentros set Par_ImpProdporAmbOrcPed = 0
update Paramentros set Par_MostrarQuantitValorCusto = 0
update Paramentros set Par_DataConclusaoAutomatica = 0
update t  set @start = Ocd_Sequencia = @start + 1
update t set @start = Ocpp_Sequencia = @start + 1
update Paramentros set Par_TermoRecNoFinal = 0
update Paramentros set Par_VendaCampoSimbolo = 0
update Paramentros set Par_VendaCampoAplicacao = 0
UPDATE ParamentrosNFe SET ParNFe_CaminhoXMLDFE ='C:\SOFTLUX\DFe'
update ParamentrosNFe set ParNFe_DadosAdicioSimplesMod1 =0
update clientes set Cli_Contribuinte =0
update NotaFiscal set NTF_Contribuinte =0
update Cod_tabelas set Codt_codigo =1
update Paramentros set Par_BloqEmpPedVenda = 'false'
update Paramentros set Par_NaoEmpDifOrcPed = 'false'
UPDATE CTE SET cep_codigo = rn
UPDATE CTE SET Ced_CodEntrega = rn
update SisSeqTabela set SeqTab_Numero = (SELECT ISNULL(MAX(Ced_CodEntrega), 0) + 1 AS SeqTab_Numero FROM controle_entrega_data)
update SisSeqTabela set SeqTab_Numero = (SELECT ISNULL(MAX(CenAs_codigo), 0) + 1 AS SeqTab_Numero FROM Controle_entrega_Assinaturas)
update Paramentros set Par_ParticipacaoSemDevolucao = 0
update Paramentros set Par_DescPorFuncVenda =0
UPDATE SisSeqTabela SET SeqTab_Numero = (SELECT ISNULL(MAX(cen_codigo_pre), 0) + 1 FROM Controle_entrega) WHERE SeqTab_Tabela ='Controle_entrega'AND SeqTab_Campo ='cen_codigo_pre'
UPDATE Paramentros SET Par_CEPChaveAcesso ='59a61bd7a880e3a11aa5ba31e06070ee'
update Paramentros set Par_NaoMostraForConsulta = 0
update ParamentrosNFe set ParNFe_DestacarDesconto = 0
update Paramentros set Par_QuantDiasPasta = 60
update Paramentros set Par_TermoRecTextoFinal = 0
update Paramentros set Par_MultiEmpCriarFinanEmpEsc = 0
update Paramentros set Par_TipoEntregaObrigatorio = 0
update sisopcoes set caption= '-----> Concilia
update Devolucao set Dev_DesagioTipo ='P'
update Paramentros set Par_IndiceVendaMaisCasasDec = 0
update Custo set Cus_ICMSValorCompra = 0
update credito set credito_situacao ='C' where Credito_codigo=:PCredito_codigo
update credito set credito_situacao ='C' where Credito_TipoVinculo='F' and  Credito_Codigo=:PCredito_Codigo
update contas_apagar set Ctp_valor_total_original=:pvalor where Ctp_codigo=:pcodigo
update contas_apagar_det set Ctp_valor_vencimento=:pvalor1, Ctp_valor_pagamento=:pvalor2, Ctp_dt_vencimento=:pdata1, Ctp_dt_pagamento=:pdata2 where Ctp_codigo=:pcodigo
update contas_apagar_pag set Cpp_valor_pago=:pvalor, Cpp_data_pagamento=:pdata, cba_codigo=:Pcba_codigo where Ctp_codigo=:pcodigo
update contas_receber_pag set Crp_valor_pago=:pvalor, Crp_data_pagamento=:pdata where Crp_cod_pag=:pcodigo
update Movimento_bancario set Mba_valor=:pvalor, Mba_data_emissao=:pdata1, Mba_data_efetivacao=:pdata2, cba_codigo=:Pcba_codigo, Bcx_codigo=:pBcx_codigo where Crp_cod_pag=:pcodigo
update Movimento set Mvt_valor=:pvalor, Mvt_datao=:pdata,cba_codigo=:Pcba_codigo, Bcx_codigo=:pBcx_codigo  where Crp_cod_pag=:pcodigo
update Contas_receber_pag set Crp_data_pagamento=:pdata, Crp_valor_pago=:pvalor  where crp_cod_pag =
update Contas_receber_pag set mdo_codigo =9 where crp_cod_pag =
update Contas_apagar_pag set mdo_codigo =9 where cpp_cod_pag =
update Contas_receber_pag set mdo_codigo =2 where crp_cod_pag =
update Contas_apagar_pag set mdo_codigo =2 where cpp_cod_pag =
update Contas_receber_pag set mdo_codigo =1001 where crp_cod_pag =
update Contas_apagar_pag set mdo_codigo =1001 where cpp_cod_pag =
update Contas_receber_pag set
update Contas_apagar_pag set
update Contas_receber_det set ctr_situacao='S' where Ctr_codigo_det =
update Contas_apagar_det set  ctp_situacao='S' where Ctp_codigo_det =
update Contas_receber_det set ctr_situacao='N' where Ctr_codigo_det =
update Contas_apagar_det set  ctp_situacao='N' where Ctp_codigo_det =
update Contas_receber_pag set mdo_codigo =
update Contas_apagar_pag set mdo_codigo =
UPDATE pedido SET ped_indicacao =:Cod_Indi
UPDATE TransfIndicacao SET TransfInd_Situacao ='C'
update contas_apagar set Tcf_codigo=3 where Ctp_codigo=:codigo
UPDATE contas_apagar_det SET Ctp_valor_vencimento = (SELECT CASE WHEN
UPDATE contas_apagar SET Ctp_valor_total_original = (SELECT CASE WHEN
update CreditoIndicacao set CredInd_situacao ='C' where CredInd_Codigo=:PCredInd_Codigo
update contas_Receber_det set Ctr_duplicataImp = 1, Ctr_duplicataImpData =:pCtr_duplicataImpData where ctr_codigo_det =:pctr_codigo_det
update contas_Receber_det set Ctr_reciboImp = 1, Ctr_reciboImpData =:pCtr_reciboImpData where ctr_codigo_det =:pctr_codigo_det
update contas_apagar_det set Ctp_reciboImp = 1, Ctp_reciboImpData =:pctp_reciboImpData where ctp_codigo_det =:pctp_codigo_det
update contas_Receber set Ctr_reciboImp = 1, Ctr_reciboImpData =:pCtr_reciboImpData where ctr_codigo =:pctr_codigo
update Estoque_produto set Epr_estoque=:pEpr_estoque where Epr_Codnosso=:pEpr_Codnosso and Epr_Acabamento=:pEpr_Acabamento
update estoque_produto set Epr_estoque =
update ForaDoBalanco set forBal_Processado=:pforBal_Processado , forBal_DataProc=:pforBal_DataProc , forBal_UsuarioProc =:pforBal_UsuarioProc where forBal_Codigo=:pforBal_Codigo
update VendaProduto set VenPro_DataEntrega =:pVenPro_DataEntrega where Pro_codnosso =:pPro_codnosso and CodAcabamento =:pCodAcabamento and Ven_CodigoPre =:pVen_CodigoPre
update Contas_apagar_det set  Ctp_situacao='N'  where contas_apagar_det.ctp_codigo_det =:pcodigo
update Contas_receber_det set  Ctr_situacao='N'  where contas_receber_det.ctr_codigo_det =:pcodigo
update Ent_devolucao_luminaria_det set eld_datahora =:hoje,eld_usuario_estoque = 1 where usr_dt_hr_criacao<:data
update Ent_devolucao_materiais_det set ema_datahora =:hoje, ema_usuario_estoque = 1 where usr_dt_hr_criacao<:data
update HistoricoVersoesUsuario set HistVerUsu_Lido =1 where SisUsu_Codigo =:pSisUsu_Codigo  and HistVer_Codigo =:pHistVer_Codigo
update contas_apagar set Ctp_valor_total_original =:pCtp_valor_total_original where Ctp_codigo =
update contas_apagar_det set Ctp_valor_vencimento =:pCtp_valor_vencimento, Ctp_dt_vencimento =:pCtp_dt_vencimento  where Ctp_codigo =
update contas_apagar_det set Ctp_valor_vencimento =:pCtp_valor_vencimento where Ctp_codigo =
update credito set ParSV_serie='1' where Credito_TpdcodigoOrigem = 1001
update controle_entrega_prod  set CEP_QuantidadeDevolvida  =
update controle_entrega_prod  set CEP_QuantidadeDevolvidaEst  =
UPDATE controle_entrega_prod  SET  cep_quantidade_separada =
update pasta set  pasta_codprevendapai =
update dbo.credito set Credito_situacao='C' where Credito_TpdcodigoOrigem=:PCredito_TpdcodigoOrigem and Credito_CodigoDoc=:PCredito_CodigoDoc AND Credito_Situacao='A' and credito_operacao=:PCredito_Operacao
update contas_apagar_det set Ctp_valor_vencimento=:PCtp_valor_vencimento where Ctp_codigo =:PCtp_codigo
UPDATE contas_apagar set Ctp_valor_total_original=:PCtp_valor_total_original where Ctp_codigo =:PCtp_codigo
update contas_receber_det set Ctr_valor_vencimento=:PCtr_valor_vencimento where Ctr_codigo =:PCtr_codigo
UPDATE contas_receber set Ctr_valor_total_original=:PCtr_valor_total_original where Ctr_codigo =:PCtr_codigo
update ControleChequeDet set ControleChequeDet.ControlChequeDet_Situacao = 'COMPENSADO', ControlChequeDet_Compensado = 1 FROM ControleChequeDet INNER JOIN ControleCheque ON dbo.ControleChequeDet.ControlCheque_Codigo = dbo.ControleCheque.ControlCheque_codigo INNER JOIN Contas_receber_pag ON dbo.ControleCheque.ControlCheque_CodPagamento = dbo.Contas_receber_pag.Crp_cod_pag WHERE (ControleCheque.ControlCheque_tipo = 'R') AND (dbo.ControleChequeDet.ControlChequeDet_Situacao = 'N
update ControleChequeDet set ControleChequeDet.ControlChequeDet_Situacao = 'COMPENSADO', ControlChequeDet_Compensado = 1 FROM ControleChequeDet INNER JOIN ControleCheque ON ControleChequeDet.ControlCheque_Codigo = ControleCheque.ControlCheque_codigo INNER JOIN Contas_apagar_pag ON ControleCheque.ControlCheque_CodPagamento = Contas_apagar_pag.Cpp_cod_pag WHERE (ControleCheque.ControlCheque_tipo = 'P') AND (ControleChequeDet.ControlChequeDet_Situacao = 'N
update ControleChequeDet set ControleChequeDet.ControlChequeDet_Situacao = 'EM COMPENSA
update ControleChequeDet set ControleChequeDet.ControlChequeDet_Situacao = 'N
update ControleRH set CtrlRH_VendaExcluida = 'S'
update controlerh set CtrlRH_Pendente= (SELECT  contas_Receber_det.Ctr_situacao FROM contas_Receber_det WHERE Ctr_codigo=controlerh.CtrlRH_ContaRefVinc AND ctr_codigo_det = controlerh.CtrlRH_ContaRefVincDet)
update contas_apagar_det set Ctp_dt_vencimento=:PCtp_dt_vencimento where Ctp_codigo=:PCtp_codigo
update ControleRH set CtrlRH_DtProcessar=:PCtrlRH_DtProcessar where FechComis_Codigo=:PFechComis_Codigo
update contas_receber set Tpd_codigo =1001, ParSV_serie='2' where Tpd_codigo =1002
update observacoes set obs_codigo=:Pnovo where obs_codigo=:Pvelho and obs_tipo='P'
update VendaAmbiente set VenAmb_NDocPre=:VenAmb_NDocPre_novo where VenAmb_NDocPre=:VenAmb_NDocPre_velho and VenAmb_TpDoc='PRO'
update VendaAtendente set VenAten_NDocPre=:VenAten_NDocPre_novo where VenAten_NDocPre=:VenAten_NDocPre_velho and VenAten_TpDoc='PRO'
UPDATE estoque_log set elg_tipo ='PEDIDO DE VENDA', ELG_doc =:pNELG_doc, ParSV_serie ='1' where elg_tipo ='PROJETO' and  ELG_doc =:pELG_doc
update VendaAmbiente set VenAmb_NDocPre=:VenAmb_NDocPre_novo, VenAmb_TpDoc='PRO' where VenAmb_NDocPre=:VenAmb_NDocPre_velho and VenAmb_TpDoc='AVU'
update VendaAtendente set VenAten_NDocPre=:VenAten_NDocPre_novo, VenAten_TpDoc='PRO' where VenAten_NDocPre=:VenAten_NDocPre_velho and VenAten_TpDoc='AVU'
UPDATE estoque_log set elg_tipo ='PEDIDO DE VENDA', ELG_doc =:pNELG_doc, ParSV_serie ='2' where elg_tipo ='VENDA AVULSA' and  ELG_doc =:pELG_doc
UPDATE estoque_log set elg_tipo ='PEDIDO DE VENDA', ELG_doc =:pNELG_doc, ParSV_serie ='3' where elg_tipo ='ENTRADA POR DEVOLU
update SisSeqTabela set SeqTab_Numero = (select case when max(edv_codigo)> 0 then max(edv_codigo)+1 else 1 end  from Ent_devolucao) where SeqTab_Tabela = 'Devolucao' and SeqTab_Campo = 'Dev_Codigo'
update SisSeqTabela set SeqTab_Numero = (select case when max(edv_codigo_pre)> 0 then max(edv_codigo_pre)+1 else 1 end  from Ent_devolucao) where SeqTab_Tabela = 'Devolucao' and SeqTab_Campo = 'Dev_CodigoPre'
update estoque_log set ParSV_serie='U' where ParSV_serie is null


/* ================= INSERT (666) ================= */
insert into the (select %s FROM %s %s
Insert Into SisPermissao(Id,IdPai,IdUsuario,idgrupo,Inserir,Alterar,Excluir,Consultar,Imprimir) values(
Insert into sisOpcoes values(:vID,:vIDPAI,:vCaption,:vNomeMenu,:vsequencial)
Insert into sisBackup(CodUsuario,NomeArquivo,Datahora,ID,local_arquivo) values
insert into VendaAtendente (VenAten_TpDoc,VenAten_NDocPre,Fun_Codigo,Emp_Codigo,VenAten_Porcentagem,usr_cod_criacao,usr_dt_hr_criacao,VenAten_Principal) select 'AVU', avu_codigo_pre, avu_arquiteta, 1, 100,1, GETDATE(),1  from avulso WHERE avu_arquiteta > 0
insert into VendaAtendente (VenAten_TpDoc,VenAten_NDocPre,Fun_Codigo,Emp_Codigo,VenAten_Porcentagem,usr_cod_criacao,usr_dt_hr_criacao,VenAten_Principal) select 'ORC', orc_codigo_pre, orc_arquiteta, 1, 100,1, GETDATE(),1  from orcamento WHERE orc_arquiteta> 0
insert into VendaAtendente (VenAten_TpDoc,VenAten_NDocPre,Fun_Codigo,Emp_Codigo,VenAten_Porcentagem,usr_cod_criacao,usr_dt_hr_criacao,VenAten_Principal)select 'PRO', ped_codigo_pre, ped_arquiteta, 1, 100,1, GETDATE(),1  from pedido WHERE ped_arquiteta> 0
insert into VendaAtendente (VenAten_TpDoc,VenAten_NDocPre,Fun_Codigo,Emp_Codigo,VenAten_Porcentagem,usr_cod_criacao,usr_dt_hr_criacao,VenAten_Principal)select 'AUT', Ain_codigo, Ain_arquiteta, 1, 100,1, GETDATE(),1  from AutorizaInclusao WHERE Ain_arquiteta> 0
insert into TipoExpedicao (TpExp_Codigo,TpExp_Descricao,TpExp_Situacao,usr_cod_criacao,usr_dt_hr_criacao) VALUES (1,'CTT','A',1,GETDATE())
insert into TipoExpedicao (TpExp_Codigo,TpExp_Descricao,TpExp_Situacao,usr_cod_criacao,usr_dt_hr_criacao) VALUES (2,'TRANSPORTADORA','A',1,GETDATE())
insert into TipoExpedicao (TpExp_Codigo,TpExp_Descricao,TpExp_Situacao,usr_cod_criacao,usr_dt_hr_criacao) VALUES (3,'N/ VIATURA','A',1,GETDATE())
insert into TipoExpedicao (TpExp_Codigo,TpExp_Descricao,TpExp_Situacao,usr_cod_criacao,usr_dt_hr_criacao) VALUES (4,'V/ VIATURA','A',1,GETDATE())
insert into TipoExpedicao (TpExp_Codigo,TpExp_Descricao,TpExp_Situacao,usr_cod_criacao,usr_dt_hr_criacao) VALUES (5,'VIA A
insert into TipoExpedicao (TpExp_Codigo,TpExp_Descricao,TpExp_Situacao,usr_cod_criacao,usr_dt_hr_criacao) VALUES (6,'U.P.S.','A',1,GETDATE())
insert into TipoExpedicao (TpExp_Codigo,TpExp_Descricao,TpExp_Situacao,usr_cod_criacao,usr_dt_hr_criacao) VALUES (7,'COMBOIO','A',1,GETDATE())
insert into TipoExpedicao (TpExp_Codigo,TpExp_Descricao,TpExp_Situacao,usr_cod_criacao,usr_dt_hr_criacao) VALUES (8,'BARCO','A',1,GETDATE())
insert into Moeda (Moeda_codigo,Moeda_NomeCurto,Moeda_NomeLongo,Moeda_simbolo,Moeda_UEM,usr_cod_criacao,usr_dt_hr_criacao) VALUES (1,'REAL','REAL','R$',0,1,GETDATE())
insert into Moeda (Moeda_codigo,Moeda_NomeCurto,Moeda_NomeLongo,Moeda_simbolo,Moeda_UEM,usr_cod_criacao,usr_dt_hr_criacao) VALUES (2,'EURO','EURO','
insert into SysPaises (SysPaises_codigo,SysPaises_descricao,SysPaises_UE,SysPaises_FormatoData,SysPaises_sigla,usr_cod_criacao,usr_dt_hr_criacao) VALUES (1,'BRASIL',0,'DD/MM/AAAA','BR',1,GETDATE())
insert into SysPaises (SysPaises_codigo,SysPaises_descricao,SysPaises_UE,SysPaises_FormatoData,SysPaises_sigla,usr_cod_criacao,usr_dt_hr_criacao) VALUES (2,'PORTUGAL',1,'DD-MM-AAAA','PT',1,GETDATE())
insert into Tributacao (Trib_Codigo,Trib_Tipo,Trib_Descricao,Trib_Porcentagem,SysPaises_codigo) VALUES (5,'IVA','IVA
insert into Tributacao (Trib_Codigo,Trib_Tipo,Trib_Descricao,Trib_Porcentagem,SysPaises_codigo) VALUES (6,'IVA','ISENTO IVA',0,2)
insert into Tributacao (Trib_Codigo,Trib_Tipo,Trib_Descricao,Trib_Porcentagem,SysPaises_codigo) VALUES (7,'IVA','IVA
insert into Tributacao (Trib_Codigo,Trib_Tipo,Trib_Descricao,Trib_Porcentagem,SysPaises_codigo) VALUES (8,'IVA','IVA
insert into Tributacao (Trib_Codigo,Trib_Tipo,Trib_Descricao,Trib_Porcentagem,SysPaises_codigo) VALUES (9,'IVA','IVA
insert into Tributacao (Trib_Codigo,Trib_Tipo,Trib_Descricao,Trib_Porcentagem,SysPaises_codigo) VALUES (10,'IVA','IVA
insert into Tributacao (Trib_Codigo,Trib_Tipo,Trib_Descricao,Trib_Porcentagem,SysPaises_codigo) VALUES (11,'IVA','IVA
insert into Paises (Paises_Codigo,Paises_Descricao,Paises_Situacao,Paises_UE,Paises_SIGLA,usr_cod_criacao,usr_dt_hr_criacao) VALUES (1,'BRASIL','A',0,'BR',1,GETDATE())
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('0','NACIONAL','A',1)
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('1','ESTRANGEIRA - IMPORTA
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('2','ESTRANGEIRA - ADQUIRIDA NO MERCADO INTERNO','A',1)
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('00','TRIBUTADA INTEGRALMENTE','A',1)
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('10','TRIBUTADA E COM COBRAN
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('20','COM REDU
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('30','ISENTA OU N
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('40','ISENTA','A',1)
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('41','N
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('50','SUSPENS
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('51','DIFERIMENTO','A',1)
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('60','ICMS COBRADO ANTERIORMENTE POR SUBSTITUI
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('70','COM REDU
INSERT INTO [TipoTributadaICMS] ([TpTrib_codigo],[TpTrib_Descricao],[TpTrib_Situacao],[Emp_Codigo])VALUES('90','OUTRAS','A',1)
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (52,NULL,'NTF_Codigo','NotaFiscal','C
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (53,NULL,'NTF_Numero','NotaFiscal','N
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (54,NULL,'CFOP_codigo','NotaFiscal','C
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (55,NULL,'NTF_NatOperacao','NotaFiscal','Natureza da opera
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (56,NULL,'NTF_IESubsTrib','NotaFiscal','Insc. Est. substituto tribut
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (57,NULL,'NTF_DtEmissao','NotaFiscal','Data da emiss
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (58,NULL,'NTF_DtSaidaEntrada','NotaFiscal','Data Sa
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (59,NULL,'NTF_HoraSaida','NotaFiscal','Hora de saida','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (60,NULL,'NTF_Nome','NotaFiscal','Nome / Raz
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (61,NULL,'NTF_InscEst','NotaFiscal','Inscri
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (62,NULL,'NTF_CNPJCPF','NotaFiscal','CNPJ   ou  CPF','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (63,NULL,'NTF_Endereco','NotaFiscal','Endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (64,NULL,'NTF_EndNumero','NotaFiscal','N
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (65,NULL,'NTF_Bairro','NotaFiscal','Bairro','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (66,NULL,'NTF_CEP','NotaFiscal','CEP','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (67,NULL,'NTF_Municipio','NotaFiscal','Munic
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (68,NULL,'NTF_UF','NotaFiscal','UF','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (69,NULL,'NTF_FoneFax','NotaFiscal','Fone /  Fax','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (70,NULL,'NTF_BaseICMS','NotaFiscal','Base de C
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (71,NULL,'NTF_VlICMS','NotaFiscal','Valor do  ICMS','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (72,NULL,'NTF_BaseSubstICMS','NotaFiscal','Base C
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (73,NULL,'NTF_VlSubstICMS','NotaFiscal','Valor do ICMS Subst.','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (74,NULL,'NTF_VLProdutos','NotaFiscal','Valor Total dos Produtos','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (75,NULL,'NTF_VlFrete','NotaFiscal','Valor do Frete','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (76,NULL,'NTF_VlSeguro','NotaFiscal','Valor do Seguro','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (77,NULL,'NTF_DespAcessoria','NotaFiscal','Outras Desp. Acess
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (78,NULL,'NTF_VlIPI','NotaFiscal','Valor Total do IPI','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (79,NULL,'NTF_VlNota','NotaFiscal','Valor Total da Nota','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (80,NULL,'NTF_TraNome','NotaFiscal','Transp. Nome / Raz
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (81,NULL,'NTF_TpFrete','NotaFiscal','Tipo de frete','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (82,NULL,'NTF_Placa','NotaFiscal','Transp. Placa','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (83,NULL,'NTF_PlacaUF','NotaFiscal','Transp. Placa UF','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (84,NULL,'NTF_TraCNPJCPF','NotaFiscal','Transp. CNPJ / CPF','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (85,NULL,'NTF_TraEndereco','NotaFiscal','Transp. Endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (86,NULL,'NTF_TraMunicipio','NotaFiscal','Transp. Munic
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (87,NULL,'NTF_TraUF','NotaFiscal','Transp. UF','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (88,NULL,'NTF_TraIE','NotaFiscal','Transp. Inscri
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (89,NULL,'NTF_TraQuant','NotaFiscal','Transp. Quantidade','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (90,NULL,'NTF_TraEspecie','NotaFiscal','Transp. Esp
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (91,NULL,'NTF_TraMarca','NotaFiscal','Transp. Marca','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (92,NULL,'NTF_TraNumero','NotaFiscal','Transp. N
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (93,NULL,'NTF_TraPesoLiq','NotaFiscal','Transp. Peso L
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (94,NULL,'NTF_TraPesoBruto','NotaFiscal','Transp. Peso Bruto','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (95,NULL,'NTF_Dados1','NotaFiscal','Texto Fixo 1 ( Par
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (96,NULL,'NTF_Dados2','NotaFiscal','Texto Fixo 2 (Definido p/ Usu
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (97,NULL,'Pro_codnosso','NotaFiscalProdutos','C
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (98,NULL,'NTFPro_ProdDescr','NotaFiscalProdutos','Descri
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (99,NULL,'CodAcabamento','NotaFiscalProdutos','C
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (100,NULL,'NTFPro_StTrib','NotaFiscalProdutos','Situa
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (101,NULL,'uni_codigo','NotaFiscalProdutos','Unidade','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (102,NULL,'NTFPro_Quant','NotaFiscalProdutos','Produto Quantidade','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (103,NULL,'NTFPro_Desconto','NotaFiscalProdutos','Desconto do produto','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (104,NULL,'NTFPro_VlUnitari','NotaFiscalProdutos','Valor unit
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (105,NULL,'NTFPro_VlTotal','NotaFiscalProdutos','Valor total do
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (106,NULL,'NTFPro_ICMS','NotaFiscalProdutos','ICMS do produto','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (107,NULL,'NTFPro_IPI','NotaFiscalProdutos','IPI do produto','D')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (108,NULL,'CFOP_codigo','NotaFiscalProdutos','CFOP do produto','D')
insert into VendaIndicacao (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,VenInd_DtVigencia,VenInd_Porcentagem, VenInd_Principal) (SELECT 'PRO' AS VenInd_TpDoc, dbo.pedido.ped_codigo_pre, dbo.pedido.ped_indicacao, 1 AS empresa, dbo.pedido.ped_dt_fechamento,100 AS porc, 1 AS principal FROM pedido INNER JOIN dbo.Indicacoes ON dbo.pedido.ped_indicacao = dbo.Indicacoes.Ind_codigo WHERE dbo.pedido.ped_indicacao IS NOT NULL AND dbo.pedido.ped_status = 'A' and pedido.ped_indicacao > 0)
insert into VendaIndicacao (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,VenInd_DtVigencia,VenInd_Porcentagem, VenInd_Principal) (SELECT 'ORC' AS VenInd_TpDoc, orcamento.orc_codigo_pre, orcamento.orc_indicacao, 1 AS empresa, orcamento.orc_dt_emissao,100 AS porc, 1 AS principal FROM orcamento INNER JOIN dbo.Indicacoes ON orcamento.orc_indicacao = dbo.Indicacoes.Ind_codigo WHERE orcamento.orc_indicacao IS NOT NULL and orcamento.orc_indicacao > 0)
insert into VendaIndicacao (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,VenInd_DtVigencia,VenInd_Porcentagem, VenInd_Principal) (SELECT 'AVU' AS VenInd_TpDoc, Avulso.avu_codigo_pre, Avulso.avu_indicacao, 1 AS empresa, avulso.avu_dt_emissao,100 AS porc, 1 AS principal FROM avulso INNER JOIN dbo.Indicacoes ON avulso.avu_indicacao = dbo.Indicacoes.Ind_codigo WHERE avulso.avu_indicacao IS NOT NULL and avulso.avu_indicacao > 0 )
insert into VendaIndicacaoGrupProd (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,GrupoProduto_Codigo,VenIndGrup_Porc) (SELECT VendaIndicacao.VenInd_TpDoc,VendaIndicacao.VenInd_NDocPre,VendaIndicacao.Ind_Codigo,VendaIndicacao.Emp_Codigo,1 as grupo,0 as porc FROM VendaIndicacao )
insert into VendaIndicacaoGrupProd (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,GrupoProduto_Codigo,VenIndGrup_Porc) (SELECT VendaIndicacao.VenInd_TpDoc,VendaIndicacao.VenInd_NDocPre,VendaIndicacao.Ind_Codigo,VendaIndicacao.Emp_Codigo,2 as grupo,0 as porc FROM VendaIndicacao )
insert into VendaIndicacaoGrupProd (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,GrupoProduto_Codigo,VenIndGrup_Porc) (SELECT VendaIndicacao.VenInd_TpDoc,VendaIndicacao.VenInd_NDocPre,VendaIndicacao.Ind_Codigo,VendaIndicacao.Emp_Codigo,3 as grupo,0 as porc FROM VendaIndicacao )
insert into VendaIndicacaoGrupProd (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,GrupoProduto_Codigo,VenIndGrup_Porc) (SELECT VendaIndicacao.VenInd_TpDoc,VendaIndicacao.VenInd_NDocPre,VendaIndicacao.Ind_Codigo,VendaIndicacao.Emp_Codigo,4 as grupo,0 as porc FROM VendaIndicacao )
insert into VendaIndicacaoGrupProd (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,GrupoProduto_Codigo,VenIndGrup_Porc) (SELECT VendaIndicacao.VenInd_TpDoc,VendaIndicacao.VenInd_NDocPre,VendaIndicacao.Ind_Codigo,VendaIndicacao.Emp_Codigo,1000 as grupo,0 as porc FROM VendaIndicacao )
INSERT INTO VendaAmbiente (VenAmb_TpDoc,VenAmb_NDocPre,CodAmbiente,Emp_Codigo,VenAmb_Descricao)
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (130,NULL,'FaturaData1','NotaFiscal','1
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (131,NULL,'FaturaValor1','NotaFiscal','1
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (132,NULL,'FaturaData2','NotaFiscal','2
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (133,NULL,'FaturaValor2','NotaFiscal','2
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (134,NULL,'FaturaData3','NotaFiscal','3
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (135,NULL,'FaturaValor3','NotaFiscal','3
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (136,NULL,'FaturaData4','NotaFiscal','4
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (137,NULL,'FaturaValor4','NotaFiscal','4
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (138,NULL,'FaturaData5','NotaFiscal','5
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (139,NULL,'FaturaValor5','NotaFiscal','5
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (140,NULL,'FaturaData6','NotaFiscal','6
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (141,NULL,'FaturaValor6','NotaFiscal','6
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (142,NULL,'MarcaSaida','NotaFiscal','Marcar um X se for nota de sa
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (143,NULL,'MarcaEntrada','NotaFiscal','Marcar um X se for nota de entrada','E')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (145,NULL,'orc_codigo','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (146,NULL,'Cli_Nome','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (147,NULL,'Cli_Fcomercial','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (148,NULL,'Cli_Fresidencial','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (149,NULL,'Cli_fax','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (150,NULL,'Cli_celular','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (151,NULL,'Obr_Descricao','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (152,NULL,'Obr_Codigo','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (153,NULL,'Obr_Endereco','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (154,NULL,'Obr_Numero','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (155,NULL,'Obr_complemento','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (156,NULL,'Obr_Bairro','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (157,NULL,'mun_nome','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (158,NULL,'mun_uf','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (159,NULL,'Obr_CEP','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (160,NULL,'orc_dt_emissao','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (161,NULL,'orc_dt_fechamento','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (162,NULL,'Fun_Nome','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (163,NULL,'Fun_celular','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (164,NULL,'Ind_Nome','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (165,NULL,'Ind_comercial','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (166,NULL,'Ind_residencial','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (167,NULL,'Ind_fax','Or
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (168,NULL,'Ind_celular','Or
INSERT INTO [ComissaoPremiacaoVlVCatRem] ([ComPre_codigo],[CatRem_Codigo]) select DISTINCT ComissaoPremiacao.ComPre_codigo, ComissaoPremiacao.CatRem_Codigo FROM ComissaoPremiacao INNER JOIN ComissaoPremiacaoVlVenda ON ComissaoPremiacao.ComPre_codigo = ComissaoPremiacaoVlVenda.ComPre_codigo where ComissaoPremiacao.CatRem_Codigo is not null
insert into Tributacao (Trib_Codigo,Trib_Tipo,Trib_Descricao,Trib_Porcentagem,SysPaises_codigo) VALUES (12,'IVA','IVA
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(170,'<@&codigo doc&@>','Ctr_cod_documento','contas_receber','C
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(171,'<@&tipo doc&@>','Tpd_descricao','contas_receber','Tipo do Documento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(172,'<@&tipo vinc&@>','Ctr_vinculo','contas_receber','Tipo do Vinculo')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(173,'<@&historico&@>','Ctr_historico','contas_receber','Hist
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(174,'<@&obs&@>','Ctr_obs','contas_receber','Observa
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(175,'<@&Forma Pag&@>','Fpf_descricao','contas_receber','Forma de Pagamento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(176,'<@&valor total&@>','Ctr_valor_total_original','contas_receber','Valor Total')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(177,'<@&plano conta&@>','Pco_descricao','contas_receber','Plano de Contas')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(178,'<@&parcela&@>','Ctr_parcela','contas_receber','Parcela')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(179,'<@&dt venc&@>','Ctr_dt_vencimento','contas_receber','Data de Vencimento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(180,'<@&valor venc&@>','Ctr_valor_vencimento','contas_receber','Valor do Vencimento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(181,'<@&dt venc&@>','Crp_data_pagamento','contas_receber','Data de Pagamento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(182,'<@&valor venc&@>','Crp_valor_pago','contas_receber','Valor do Pagamento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(183,'<@&modo pag temp&@>','Mdo_nome','contas_receber','Modo de Pag. Temp.')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(184,'<@&duplicata&@>','Ctr_duplicata','contas_receber','Duplicata')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(185,'<@&dupl impres&@>','Ctr_duplicataImp','contas_receber','Duplicata Impressa')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(186,'<@&dt dup imp&@>','Ctr_duplicataImpData','contas_receber','Dt Impress
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(187,'<@&situacao parc&@>','Ctr_situacao','contas_receber','Situa
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(188,'<@&modo pag&@>','Mdo_nome_pag','contas_receber','Modo Pagamento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(189,'<@&recibo&@>','Crp_recibo','contas_receber','Recibo')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(190,'<@&recibo impres&@>','Crp_reciboImp','contas_receber','Recibo Impresso')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(191,'<@&dt rec imp&@>','Crp_reciboImpData','contas_receber','Dt Impress
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(192,'<@&nome&@>','nome','contas_receber','Nome')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(193,'<@&codigo doc&@>','Ctp_cod_documento','contas_pagar','C
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(194,'<@&tipo doc&@>','Tpd_descricao','contas_pagar','Tipo do Documento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(195,'<@&tipo vinc&@>','Ctp_vinculo','contas_pagar','Tipo do Vinculo')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(196,'<@&historico&@>','Ctp_historico','contas_pagar','Hist
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(197,'<@&obs&@>','Ctp_obs','contas_pagar','Observa
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(198,'<@&Forma Pag&@>','Fpf_descricao','contas_pagar','Forma de Pagamento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(199,'<@&valor total&@>','Ctp_valor_total_original','contas_pagar','Valor Total')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(200,'<@&plano conta&@>','Pco_descricao','contas_pagar','Plano de Contas')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(201,'<@&parcela&@>','Ctp_parcela','contas_pagar','Parcela')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(202,'<@&dt venc&@>','Ctp_dt_vencimento','contas_pagar','Data de Vencimento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(203,'<@&valor venc&@>','Ctp_valor_vencimento','contas_pagar','Valor do Vencimento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(204,'<@&dt venc&@>','Cpp_data_pagamento','contas_pagar','Data de Pagamento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(205,'<@&valor venc&@>','Cpp_valor_pago','contas_pagar','Valor do Pagamento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(206,'<@&modo pag temp&@>','Mdo_nome','contas_pagar','Modo de Pag. Temp.')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(207,'<@&situacao parc&@>','Ctp_situacao','contas_pagar','Situa
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(208,'<@&modo pag&@>','Mdo_nome_pag','contas_pagar','Modo Pagamento')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(209,'<@&recibo&@>','Cpp_recibo','contas_pagar','Recibo')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(210,'<@&recibo impres&@>','Cpp_reciboImp','contas_pagar','Recibo Impresso')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(211,'<@&dt rec imp&@>','Cpp_reciboImpData','contas_pagar','Dt Impress
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(212,'<@&nome&@>','nome','contas_receber','Nome')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(213,'<@&vl ext ven&@>','ValorExtensoVen','contas_pagar','Valor do Vencimento por Extenso')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(214,'<@&vl ext pag&@>','ValorExtensoPag','contas_pagar','Valor do Pagamento por Extenso')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(215,'<@&vl ext ven&@>','ValorExtensoVen','contas_receber','Valor do Vencimento por Extenso')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(216,'<@&vl ext pag&@>','ValorExtensoPag','contas_receber','Valor do Pagamento por Extenso')
INSERT INTO @numeros VALUES('Um', 1, 1)
INSERT INTO @numeros VALUES('Dois', 2, 2)
INSERT INTO @numeros VALUES('Tr
INSERT INTO @numeros VALUES('Quatro', 4, 4)
INSERT INTO @numeros VALUES('Cinco', 5, 5)
INSERT INTO @numeros VALUES('Seis', 6, 6)
INSERT INTO @numeros VALUES('Sete', 7, 7)
INSERT INTO @numeros VALUES('Oito', 8, 8)
INSERT INTO @numeros VALUES('Nove', 9, 9)
INSERT INTO @numeros VALUES('Dez', 10, 10)
INSERT INTO @numeros VALUES('Onze', 11, 11)
INSERT INTO @numeros VALUES('Doze', 12, 12)
INSERT INTO @numeros VALUES('Treze', 13, 13)
INSERT INTO @numeros VALUES('Catorze', 14, 14)
INSERT INTO @numeros VALUES('Quinze', 15, 15)
INSERT INTO @numeros VALUES('Dezesseis', 16, 16)
INSERT INTO @numeros VALUES('Dezessete', 17, 17)
INSERT INTO @numeros VALUES('Dezoito', 18, 18)
INSERT INTO @numeros VALUES('Dezenove', 19, 19)
INSERT INTO @numeros VALUES('Vinte', 20, 20)
INSERT INTO @numeros VALUES('Vinte e', 21, 29)
INSERT INTO @numeros VALUES('Trinta', 30, 30)
INSERT INTO @numeros VALUES('Trinta e', 31, 39)
INSERT INTO @numeros VALUES('Quarenta', 40, 40)
INSERT INTO @numeros VALUES('Quarenta e', 41, 49)
INSERT INTO @numeros VALUES('Cinquenta', 50, 50)
INSERT INTO @numeros VALUES('Cinquenta e', 51, 59)
INSERT INTO @numeros VALUES('Sessenta', 60, 60)
INSERT INTO @numeros VALUES('Sessenta e', 61, 69)
INSERT INTO @numeros VALUES('Setenta', 70, 70)
INSERT INTO @numeros VALUES('Setenta e', 71, 79)
INSERT INTO @numeros VALUES('Oitenta', 80, 80)
INSERT INTO @numeros VALUES('Oitenta e', 81, 89)
INSERT INTO @numeros VALUES('Noventa', 90, 90)
INSERT INTO @numeros VALUES('Noventa e', 91, 99)
INSERT INTO @numeros VALUES('Cem', 100, 100)
INSERT INTO @numeros VALUES('Cento e', 101, 199)
INSERT INTO @numeros VALUES('Duzentos', 200, 200)
INSERT INTO @numeros VALUES('Duzentos e', 201, 299)
INSERT INTO @numeros VALUES('Trezentos', 300, 300)
INSERT INTO @numeros VALUES('Trezentos e', 301, 399)
INSERT INTO @numeros VALUES('Quatrocentos', 400, 400)
INSERT INTO @numeros VALUES('Quatrocentos e', 401, 499)
INSERT INTO @numeros VALUES('Quinhentos', 500, 500)
INSERT INTO @numeros VALUES('Quinhentos e', 501, 599)
INSERT INTO @numeros VALUES('Seiscentos', 600, 600)
INSERT INTO @numeros VALUES('Seiscentos e', 601, 699)
INSERT INTO @numeros VALUES('Setecentos', 700, 700)
INSERT INTO @numeros VALUES('Setecentos e', 701, 799)
INSERT INTO @numeros VALUES('Oitocentos', 800, 800)
INSERT INTO @numeros VALUES('Oitocentos e', 801, 899)
INSERT INTO @numeros VALUES('Novecentos', 900, 900)
INSERT INTO @numeros VALUES('Novecentos e', 901, 999)
INSERT INTO @milhar VALUES('Mil', 'Mil', 4, 6)
INSERT INTO @milhar VALUES('Milh
INSERT INTO @milhar VALUES('Bilh
INSERT INTO @milhar VALUES('Trilh
INSERT INTO @milhar VALUES('Quadrilh
INSERT INTO [TipoContaFinanceira] ([Tcf_codigo], [Tcf_descricao]) VALUES (1,'OFICIAL')
INSERT INTO [TipoContaFinanceira] ([Tcf_codigo], [Tcf_descricao]) VALUES (2,'SIMULA
INSERT INTO [TipoContaFinanceira] ([Tcf_codigo], [Tcf_descricao]) VALUES (3,'APROVISIONAMENTO')
INSERT INTO [TipoContaFinanceira] ([Tcf_codigo], [Tcf_descricao]) VALUES (4,'CONTA CLONE')
insert into NotaFiscalImportaDoc  (NTF_Codigo, NTFImp_DocCodigo, NTFImp_DocTipo)(SELECT NTF_Codigo,NTF_ImportNumero, case when NTF_ImportTipo = 'P' then 'PRO' else case when NTF_ImportTipo = 'A'  THEN 'AVU' ELSE case when NTF_ImportTipo = 'E'  THEN 'EPD' ELSE case when NTF_ImportTipo = 'S'  THEN 'SPC' END  END END end from NotaFiscal where NTF_ImportNumero is not null and  NTF_ImportNumero > 0)
insert into IndicacaoGrupProd (ind_codigo,GrupoProduto_Codigo,IndGruProd_Porc,Emp_Codigo) SELECT ind_codigo, 5 AS grupo, 0 AS valor, 1 AS empresa FROM IndicacaoGrupProd GROUP BY ind_codigo HAVING  (NOT (ind_codigo IN (SELECT ind_codigo FROM IndicacaoGrupProd AS IndicacaoGrupProd_1 WHERE (GrupoProduto_Codigo = 5))))
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(217,'<@&email cliente&@>','Cli_email','clientes','Email do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(218,'<@&fone comercial cliente&@>','Cli_Fcomercial','clientes','Fone comercial do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(219,'<@&fone residencial cliente&@>','Cli_Fresidencial','clientes','Fone residencial do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(220,'<@&fax cliente&@>','Cli_fax','clientes','FAX do Cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(221,'<@&celular cliente&@>','Cli_celular','clientes','Celular do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(222,'<@&dataNasc cliente&@>','Cli_dataNasc','clientes','Data nasc do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(223,'<@&naturalidade cliente&@>','cli_naturalidade','clientes','Naturalidade do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(224,'<@&nacionalidade cliente&@>','cli_nacionalidade','clientes','Nacionalidade do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(225,'<@&naturalidade cliente&@>','cli_naturalidade','clientes','Naturalidade do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(226,'<@&estado civil cliente&@>','Cli_estadocivil','clientes','Estado civil do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(227,'<@&nome pai cliente&@>','cli_pai','clientes','Nome do pai do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(228,'<@&nome mae cliente&@>','cli_mae','clientes','Nome da m
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(229,'<@&nome conjuge cliente&@>','Cli_conjuge','clientes','Nome do c
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(230,'<@&dt.nasc.conjuge cliente&@>','Cli_dtnasc_conjuge','clientes','Data de nascimento do c
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(231,'<@&fone com. conjuge cliente&@>','Cli_conj_Fcomercial','clientes','Fone comercial do c
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(232,'<@&fax conjuge cliente&@>','Cli_conj_Fresidencial','clientes','Fax do c
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(233,'<@&celular conjuge cliente&@>','Cli_conj_celular','clientes','celular do c
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(234,'<@&prop.nome cliente&@>','cli_PropNome','clientes','Nome do propriet
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(235,'<@&cpf prop. cliente&@>','cli_PropCFP','clientes','CPF do propriet
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(236,'<@&rg prop. cliente&@>','cli_PropRG','clientes','RG do propriet
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(237,'<@&org rg prop. cliente&@>','cli_PropRgOrg','clientes','Org
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(238,'<@&uf rg prop. cliente&@>','cli_PropRgOrgUF','clientes','UF RG do propriet
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(239,'<@&prop. end. cliente&@>','cli_PropEndereco','clientes','Endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(240,'<@&prop.num.end.cliente&@>','cli_PropNumero','clientes','Num. endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(241,'<@&prop.comp.end.cliente&@>','cli_PropComplemento','clientes','Compl. endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(242,'<@&prop.bair..end.cliente&@>','cli_PropBairro','clientes','Bairro do propriet
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(243,'<@&prop.mun.end.cliente&@>','cli_PropCodCidade','clientes','Munic
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(244,'<@&prop.cep.end.cliente&@>','cli_PropCEP','clientes','CEP do propriet
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(245,'<@&CNPJ comercial cliente&@>','cli_CNPJComercial','clientes','CNPJ comercial do cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(246,'<@&Nome comercial cliente&@>','Cli_empresa_cor','clientes','Endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(247,'<@&endereco comercial cliente&@>','Cli_Endereco_cor','clientes','Endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(248,'<@&n
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(249,'<@&comp. end. comercial cliente&@>','Cli_complemento_cor','clientes','Complemento do endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(250,'<@&bairro end. comercial cliente&@>','Cli_Bairro_cor','clientes','Bairro do endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(251,'<@&mun. end. comercial cliente&@>','Cli_codcidade_cor','clientes','Munc
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(252,'<@&cep end. comercial cliente&@>','Cli_CEP_cor','clientes','CEP do endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(253,'<@&cargo end. comercial cliente&@>','Cli_cargo_cor','clientes','Cargo do endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(254,'<@&banco cliente&@>','Cli_banco','clientes','Banco do Cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(255,'<@&agencia cliente&@>','Cli_agencia','clientes','Ag
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(256,'<@&conta cliente&@>','Cli_conta','clientes','Conta Banc
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(257,'<@&End. banco cliente&@>','Cli_EnderecoBanco','clientes','Endere
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(258,'<@&SWIFT BIC cliente&@>','Cli_SWIFT_BIC','clientes','SWIFT BIC do Cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(259,'<@&ABA cliente&@>','Cli_ABA','clientes','ABA do Cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(260,'<@&IBAN cliente&@>','Cli_IBAN','clientes','IBAN do Cliente')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(261,'<@&Tempo ct banc. cliente&@>','cli_TempoCtbancaria','clientes','Tempo de conta banc
insert into ParamentrosCliente (Tsu_codigo,ParCli_fisica,ParCli_juridica) (select Texto_Substituicao.Tsu_codigo, 0,0 from Texto_Substituicao where Texto_Substituicao.Tsu_tabela='clientes' or Texto_Substituicao.Tsu_tabela = 'obras')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(225,'<@&indica
insert into contabilista (Cntbt_codigo) values (1)
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao]) VALUES (262,'<@&Municipio Obra&@>','mun_codigo','obras','Munic
insert into ParamentrosCliente (Tsu_codigo,ParCli_fisica,ParCli_juridica) values(262,0,0)
INSERT INTO [Texto_Substituicao] ([Tsu_codigo], [Tsu_texto], [Tsu_campo], [Tsu_tabela], [Tsu_descricao],[Tsu_alinhamento]) VALUES (263,NULL,'IndDet_complemento','Indicacoes','Complemento do End. Indica
INSERT INTO VendaDesconto   (VenDesc_ValorGrupo,VenDesc_ValorGrupoDesc,VenDesc_DescontoValor,VenDesc_DescontoPorc,GrupoProduto_Codigo,Ven_CodigoPre,VenDesc_Quantidade) (SELECT SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) AS valor, CASE WHEN Ven_TipoDesc = 'P' THEN SUM(venpro_vlitem) ELSE SUM(venpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (venpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END AS valorcomdesc, SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(venpro_vlitem) ELSE SUM(venpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (venpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END AS valordesc, CASE WHEN SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(venpro_vlitem) ELSE SUM(venpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (venpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END > 0 THEN (SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(venpro_vlitem) ELSE SUM(venpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (venpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END) * 100 / SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) ELSE 0 END AS desconto, dbo.produtos.GrupoProduto_codigo, dbo.VendaProduto.Ven_CodigoPre, SUM(dbo.VendaProduto.VenPro_Quantidade) as quant FROM dbo.VendaProduto INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Venda ON dbo.VendaProduto.Ven_CodigoPre = dbo.Venda.Ven_CodigoPre GROUP BY dbo.produtos.GrupoProduto_codigo, dbo.VendaProduto.Ven_CodigoPre, dbo.Venda.Ven_DescontoProd, dbo.Venda.Ven_TipoDesc)
INSERT INTO VendaDesconto (GrupoProduto_Codigo,Ven_CodigoPre, VenDesc_ValorGrupo,VenDesc_ValorGrupoDesc,VenDesc_Quantidade,VenDesc_DescontoValor,VenDesc_DescontoPorc) (SELECT 1000 AS grupo, Ven_codigopre, SUM(VenSer_vlitem) AS valorsemdesc, SUM(VenSer_vlitem) AS valorcomdesc, SUM(VenSer_quantidade) AS VenSer_quantidade, 0 AS Expr1, 0 AS Expr2 FROM VendaServico GROUP BY Ven_codigopre)
INSERT INTO [TipoContaFinanceira] ([Tcf_codigo], [Tcf_descricao]) VALUES (1000,'HIST
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao],[Tsu_alinhamento])VALUES(264,'<@&Serie do orcamento&@>','ParSV_serie','Or
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select 2, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select top 1 3, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select top 1 4, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
INSERT INTO Plano_Contas_Tipo (Pct_codigo,Pct_descricao,Pct_situacao) values(1,'APORTE', 'A')
INSERT INTO Plano_Contas_Tipo (Pct_codigo,Pct_descricao,Pct_situacao) values(2,'IMPOSTO', 'A')
INSERT INTO Plano_Contas_Tipo (Pct_codigo,Pct_descricao,Pct_situacao) values(3,'IMPOSTOS VENDAS', 'A')
INSERT INTO Plano_Contas_Tipo (Pct_codigo,Pct_descricao,Pct_situacao) values(4,'IMPOSTOS TRABALHISTAS', 'A')
INSERT INTO Plano_Contas_Tipo (Pct_codigo,Pct_descricao,Pct_situacao) values(5,'OUTROS IMPOSTOS', 'A')
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select top 1 5, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
INSERT INTO Plano_Contas_Tipo (Pct_codigo,Pct_descricao,Pct_situacao) values(6,'COMISS
INSERT INTO Plano_Contas_Tipo (Pct_codigo,Pct_descricao,Pct_situacao) values(7,'COMISS
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (101,'An
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (102,'Programa
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (103,'Processamento de dados e cong
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (104,'Elabora
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (105,'Licenciamento ou cess
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (106,'Assessoria e consultoria em inform
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (107,'Suporte t
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (108,'Planejamento, confec
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (201,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (301,'(VETADO)', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (302,'Cess
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (303,'Explora
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (304,'Loca
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (305,'Cess
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (401,'Medicina e biomedicina.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (402,'An
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (403,'Hospitais, cl
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (404,'Instrumenta
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (405,'Acupuntura.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (406,'Enfermagem, inclusive servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (407,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (408,'Terapia ocupacional, fisioterapia e fonoaudiologia.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (409,'Terapias de qualquer esp
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (410,'Nutri
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (411,'Obstetr
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (412,'Odontologia.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (413,'Ort
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (414,'Pr
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (415,'Psican
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (416,'Psicologia.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (417,'Casas de repouso e de recupera
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (418,'Insemina
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (419,'Bancos de sangue, leite, pele, olhos,
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (420,'Coleta de sangue, leite, tecidos, s
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (421,'Unidade de atendimento, assist
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (422,'Planos de medicina de grupo ou individual e conv
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (423,'Outros planos de sa
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (501,'Medicina veterin
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (502,'Hospitais, cl
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (503,'Laborat
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (504,'Insemina
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (505,'Bancos de sangue e de
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (506,'Coleta de sangue, leite, tecidos, s
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (507,'Unidade de atendimento, assist
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (508,'Guarda, tratamento, amestramento, embelezamento, alojamento e cong
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (509,'Planos de atendimento e assist
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (601,'Barbearia, cabeleireiros, manicuros, pedicuros e cong
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (602,'Esteticistas, tratamento de pele, depila
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (603,'Banhos, duchas, sauna, massagens e cong
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (604,'Gin
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (605,'Centros de emagrecimento,
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (701,'Engenharia, agronomia, agrimensura, arquitetura, geologia, urbanismo, paisagismo e cong
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (702,'Execu
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (703,'Elabora
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (704,'Demoli
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (705,'Repara
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (706,'Coloca
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (707,'Recupera
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (708,'Calafeta
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (709,'Varri
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (710,'Limpeza, manuten
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (711,'Decora
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (712,'Controle e tratamento de efluentes de qualquer natureza e de agentes f
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (713,'Dedetiza
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (714,'(VETADO)', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (715,'(VETADO)', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (716,'Florestamento, reflorestamento, semeadura, aduba
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (717,'Escoramento, conten
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (718,'Limpeza e dragagem de rios, portos, canais, ba
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (719,'Acompanhamento e fiscaliza
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (720,'Aerofotogrametria (inclusive interpreta
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (721,'Pesquisa, perfura
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (722,'Nuclea
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (801,'Ensino regular pr
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (802,'Instru
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (901,'Hospedagem de qualquer natureza em hot
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (902,'Agenciamento, organiza
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (903,'Guias de turismo.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1001,'Agenciamento, corretagem ou intermedia
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1002,'Agenciamento, corretagem ou intermedia
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1003,'Agenciamento, corretagem ou intermedia
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1004,'Agenciamento, corretagem ou intermedia
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1005,'Agenciamento, corretagem ou intermedia
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1006,'Agenciamento mar
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1007,'Agenciamento de not
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1008,'Agenciamento de publicidade e propaganda, inclusive o agenciamento de veicula
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1009,'Representa
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1010,'Distribui
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1101,'Guarda e estacionamento de ve
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1102,'Vigil
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1103,'Escolta, inclusive de ve
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1104,'Armazenamento, dep
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1201,'Espet
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1202,'Exibi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1203,'Espet
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1204,'Programas de audit
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1205,'Parques de divers
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1206,'Boates,
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1207,'Shows,
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1208,'Feiras, exposi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1209,'Bilhares, boliches e divers
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1210,'Corridas e competi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1211,'Competi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1212,'Execu
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1213,'Produ
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1214,'Fornecimento de m
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1215,'Desfiles de blocos carnavalescos ou folcl
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1216,'Exibi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1217,'Recrea
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1301,'(VETADO)', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1302,'Fonografia ou grava
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1303,'Fotografia e cinematografia, inclusive revela
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1304,'Reprografia, microfilmagem e digitaliza
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1305,'Composi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1401,'Lubrifica
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1402,'Assist
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1403,'Recondicionamento de motores (exceto pe
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1404,'Recauchutagem ou regenera
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1405,'Restaura
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1406,'Instala
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1407,'Coloca
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1408,'Encaderna
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1409,'Alfaiataria e costura, quando o material for fornecido pelo usu
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1410,'Tinturaria e lavanderia.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1411,'Tape
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1412,'Funilaria e lanternagem.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1413,'Carpintaria e serralheria.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1501,'Administra
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1502,'Abertura de contas em geral, inclusive conta-corrente, conta de investimentos e aplica
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1503,'Loca
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1504,'Fornecimento ou emiss
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1505,'Cadastro, elabora
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1506,'Emiss
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1507,'Acesso, movimenta
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1508,'Emiss
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1509,'Arrendamento mercantil (leasing) de quaisquer bens, inclusive cess
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1510,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1511,'Devolu
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1512,'Cust
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1513,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1514,'Fornecimento, emiss
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1515,'Compensa
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1516,'Emiss
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1517,'Emiss
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1518,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1601,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1701,'Assessoria ou consultoria de qualquer natureza, n
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1702,'Datilografia, digita
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1703,'Planejamento, coordena
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1704,'Recrutamento, agenciamento, sele
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1705,'Fornecimento de m
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1706,'Propaganda e publicidade, inclusive promo
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1707,'(VETADO)', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1708,'Franquia (franchising).', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1709,'Per
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1710,'Planejamento, organiza
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1711,'Organiza
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1712,'Administra
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1713,'Leil
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1714,'Advocacia.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1715,'Arbitragem de qualquer esp
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1716,'Auditoria.', 1)
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1717,'An
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1718,'Atu
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1719,'Contabilidade, inclusive servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1720,'Consultoria e assessoria econ
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1721,'Estat
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1722,'Cobran
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1723,'Assessoria, an
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1724,'Apresenta
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1801,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (1901,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2001,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2002,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2003,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2101,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2201,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2301,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2401,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2501,'Funerais, inclusive fornecimento de caix
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2502,'Crema
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2503,'Planos ou conv
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2504,'Manuten
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2601,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2701,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2801,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (2901,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3001,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3101,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3201,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3301,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3401,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3501,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3601,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3701,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3801,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (3901,'Servi
INSERT INTO ISSQNServicos (ISSQN_Codigo, ISSQN_Descricao, ISSQN_Situacao) values (4001,'Obras de arte sob encomenda.', 1)
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select top 1 6, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(265,'<@&profissao cliente&@>','COD_ATIVID','clientes','Profiss
insert into ParamentrosCliente (Tsu_codigo,ParCli_fisica,ParCli_juridica) values(265,0,0)
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('3','NACIONAL, MERCADORIA OU BEM COM CONTE
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('4','NACIONAL, CUJA PRODU
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('5','NACIONAL, MERCADORIA OU BEM COM CONTE
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('6','ESTRANGEIRA - IMPORTA
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('7','ESTRANGEIRA - ADQUIRIDA NO MERCADO INTERNO, SEM SIMILAR NACIONAL, CONSTANTE EM LISTA DE RESOLU
INSERT INTO [TipoOrigemProduto] ([TpOriPro_codigo],[TpOriPro_Descricao],[TpOriPro_Situacao],[Emp_Codigo])VALUES('8','NACIONAL, MERCADORIA OU BEM COM CONTE
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select top 1 7, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,3,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values('ProdutosFornecedores', 'ProdFor_Codigo', 1, 1)
INSERT INTO [dbo].[SisSeqTabela]([SeqTab_Tabela],[SeqTab_Campo],[SeqTab_Numero],[Emp_codigo]) VALUES ('GED', 'GED_Codigo', 1, 1)
insert into ProdutosFornecedores (Pro_codnosso, For_codigo, ProdFor_CodigoProduto, ProdFor_DescricaoProduto, ProdFor_Situacao, ProdFor_Padrao
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select top 1 8, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('observacoes', 'obs_seq', (select max(obs_seq)+1 from observacoes), 1)
INSERT INTO @output (concatdata) VALUES(@fornome)    RETURN END
INSERT INTO SisSeqTabela (SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) VALUES ('Motivo_devolucao', 'Mod_codigo', (SELECT MAX(Mod_codigo)+1 FROM Motivo_devolucao), 1)
INSERT INTO SisSeqTabela (SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) VALUES ('produtos', 'pro_codnosso', 1, 1)
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select top 1 9, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra) select top 1 10, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A' from  EtiquetaPronta
INSERT INTO OrdemServicoSituacao (OrdServSit_codigo,OrdServSit_Descricao,OrdServSit_Situacao,emp_codigo) VALUES (1, 'Agendada', 1, 1)
INSERT INTO OrdemServicoSituacao (OrdServSit_codigo,OrdServSit_Descricao,OrdServSit_Situacao,emp_codigo) VALUES (2, 'Em andamento', 1, 1)
INSERT INTO OrdemServicoSituacao (OrdServSit_codigo,OrdServSit_Descricao,OrdServSit_Situacao,emp_codigo) VALUES (3, 'Conclu
INSERT INTO OrdemServicoSituacao (OrdServSit_codigo,OrdServSit_Descricao,OrdServSit_Situacao,emp_codigo) VALUES (4, 'Cancelada', 1, 1)
INSERT INTO OrdemServicoSituacao (OrdServSit_codigo,OrdServSit_Descricao,OrdServSit_Situacao,emp_codigo) VALUES (5, 'Reportada como problema',1,1)
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('01' , 'DINHEIRO', 1)
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('02' , 'CHEQUE', 1)
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('03' , 'CART
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('04' , 'CART
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('05' , 'CR
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('10' , 'VALE ALIMENTA
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('11' , 'VALE REFEI
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('12' , 'VALE PRESENTE', 1)
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('13' , 'VALE COMBUST
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('14' , 'DUPLICATA MERCANTIL', 1)
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('15' , 'BOLETO BANC
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('90' , 'SEM PAGAMENTO', 1)
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('99' , 'OUTROS', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('01' , 'VISA', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('02' , 'MASTERCARD', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('03' , 'AMERICAN EXPRESS', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('04' , 'SOROCRED', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('05' , 'DINERS CLUB', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('06' , 'ELO', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('07' , 'HIPERCARD', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('08' , 'AURA', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('09' , 'CABAL', 1)
insert into SPEDBandeiraCartao (SPEDBanCartao_Codigo,SPEDBanCartao_Descricao,SPEDBanCartao_Situacao) values ('99' , 'OUTROS', 1)
INSERT into #TabelaVendaTmp (Codigo, Descricao, Acabamento,Produto, Peca,QuantVendida, VlAtualUnitVenda, ValorVenda,ValorCusto, ValorLucro,ValorProcLucro )
insert into ParamentrosSerieVenda  (ParSV_serie,ParSV_numeroOrc,ParSV_numeroPed,ParSV_Descricao,ParSV_situacao,Emp_codigo)
insert into TipoCategoriaVenda (TpCatVenda_codigo,TpCatVenda_descricao,TpCatVenda_situacao)
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 11, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 12, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 13, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 14, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('16' , 'DEP
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('17' , 'PAGAMENTO INSTANT
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('18' , 'TRANSFER
insert into SPEDFormaPagamento (SPEDFormaPag_codigo,SPEDFormaPag_Descricao,SPEDFormaPag_Situacao) values ('19' , 'PROGRAMA DE FIDELIDADE, CASHBACK, CR
INSERT into #TabelaVendaTmp (Codigo, Descricao, Acabamento,Produto, Peca,valor1,valor2,diferenca)
INSERT into #TabelaVendaTmp (Codigo, Descricao, Acabamento,Produto,
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 15, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 16, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 17, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 18, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 19, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO [TipoContaFinanceira] ([Tcf_codigo], [Tcf_descricao]) VALUES (1001,'AGRUPADA')
INSERT INTO [GrupoProduto] ([GrupoProduto_codigo],[GrupoProduto_Descricao],[GrupoProduto_Ativo],[usr_cod_criacao],[usr_dt_hr_criacao])VALUES(1001,'FRETE',1,1,
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('Produtos', 'CodigoBarra', 1, 1)
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 20, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
INSERT INTO EtiquetaPronta (EtqPront_codigo,EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup  ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,EtqPront_codigobarra,EtqPront_MargemEsqZebra) select top 1 21, EtqPront_LarguraPag, EtqPront_AlturaPag, EtqPront_MargemEsq,EtqPront_MargemDir,EtqPront_MargemSup ,EtqPront_MargemInf,EtqPront_PosicaoPag,EtqPront_NumColunas,EtqPront_EspacoColunas,EtqPront_AlturaColunas,'bcCodeEAN128A',EtqPront_MargemEsqZebra from  EtiquetaPronta
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('EFD_REGISTRO_150', 'EFDR150_Codigo', 1, 1)
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(266,'','IndDet_CNPJCPF','Indicacoes_Detalhe','CPF\CNPJ do profissional')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(267,'','IndDet_RazaSocial','Indicacoes_Detalhe','Raz
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(268,'','IndDet_Nome','Indicacoes_Detalhe','Nome\fantasia do profissional')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(269,'','IndDet_NumRegistro','Indicacoes_Detalhe','Registro profissional do profissional')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(270,'','IndDet_RGInscricao','Indicacoes_Detalhe','RG/IE do profissional')
insert into ParamentrosProfissional (Tsu_codigo,Parprof_fisica,Parprof_juridica) (select Texto_Substituicao.Tsu_codigo, 0,0 from Texto_Substituicao where Texto_Substituicao.Tsu_tabela='Indicacoes_Detalhe')
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('Assistencia_Tecnica', 'ASTEC_Codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('Assistencia_TecnicaNota', 'ASTECNota_Codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('Assistencia_TecnicaMovimentacao', 'ASTECMov_Codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('Assistencia_TecnicaProdutos', 'ASTECProd_Codigo', 1, 1)
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(271,'','IndDet_comercial','Indicacoes_Detalhe','Telefone comercial do profissional')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(272,'','IndDet_residencial','Indicacoes_Detalhe','Telefone residencial do profissional')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(273,'','IndDet_celular','Indicacoes_Detalhe','Telefone celular do profissional')
INSERT INTO [Texto_Substituicao] ([Tsu_codigo],[Tsu_texto],[Tsu_campo],[Tsu_tabela],[Tsu_descricao])VALUES(274,'','IndDet_email','Indicacoes_Detalhe','Email do profissional')
insert into ParamentrosProfissional (Tsu_codigo,Parprof_fisica,Parprof_juridica) (select Texto_Substituicao.Tsu_codigo, 0,0 from Texto_Substituicao where Texto_Substituicao.Tsu_tabela='Indicacoes_Detalhe' and Texto_Substituicao.Tsu_codigo > 270 )
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('Indice_precoGrupoUsuario', 'IprGrup_codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('Whatsapp_Enviado', 'WsEnv_codigo', 1, 1)
INSERT into #TabelaVendaTmp (Codigo, Descricao, Acabamento,Produto, Peca,QuantVendida, VlAtualUnitVenda, ValorVenda,ValorCusto, ValorLucro,ValorProcLucro, for_nome, estoque )
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('SisUsuariosGrupo', 'SisUsGrupo_codigo', 1, 1)
insert INTO Beneficio (Benf_Codigo,Benf_UF, Benf_Descricao,Benf_Lei) values ('DF819001', 'DF', 'Sa
INSERT INTO Beneficio_CST (Benf_Codigo,Benf_UF,BenfCST_Codigo) VALUES ('DF819001', 'DF', '50')
insert INTO Beneficio (Benf_Codigo,Benf_UF, Benf_Descricao,Benf_Lei) values ('PR840007', 'PR', 'Suspens
INSERT INTO Beneficio_CST (Benf_Codigo,Benf_UF,BenfCST_Codigo) VALUES ('PR840007', 'PR', '50')
INSERT INTO [dbo].[SisSeqTabela] ([SeqTab_Tabela] ,[SeqTab_Campo] ,[SeqTab_Numero] ,[Emp_codigo]) VALUES  ('ordem_compra'  ,'Ocp_codigo'  ,(select case when MAX(Ocp_codigo)+1 is null then 1 else MAX(Ocp_codigo)+1 end from ordem_compra),1)
INSERT INTO [dbo].[SisSeqTabela] ([SeqTab_Tabela] ,[SeqTab_Campo] ,[SeqTab_Numero] ,[Emp_codigo]) VALUES   ('ordem_compra_det'    ,'Ocd_Sequencia'  ,(select case when MAX(Ocd_Sequencia)+1 is null then 1 else MAX(Ocd_Sequencia)+1 end from ordem_compra_det),1)
INSERT INTO [dbo].[SisSeqTabela] ([SeqTab_Tabela] ,[SeqTab_Campo] ,[SeqTab_Numero] ,[Emp_codigo]) VALUES ('ordem_compra_Pag' ,'Ocpp_Sequencia' ,(select case when MAX(Ocpp_Sequencia)+1 is null then 1 else MAX(Ocpp_Sequencia)+1 end from ordem_compra_Pag),1)
INSERT INTO [dbo].[SisSeqTabela] ([SeqTab_Tabela] ,[SeqTab_Campo] ,[SeqTab_Numero] ,[Emp_codigo]) VALUES('Nota_entrada' ,'Nen_codigo' , (select case when MAX(Nen_codigo)+1 is null then 1 else MAX(Nen_codigo)+1 end from Nota_entrada),1)
insert INTO Beneficio (Benf_Codigo,Benf_UF, Benf_Descricao,Benf_Lei) values ('SC800017', 'SC', 'N
INSERT INTO Beneficio_CST (Benf_Codigo,Benf_UF,BenfCST_Codigo) VALUES ('SC800017', 'SC', '30')
INSERT INTO Beneficio_CST (Benf_Codigo,Benf_UF,BenfCST_Codigo) VALUES ('SC800017', 'SC', '41')
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('SisUsuariosGrupo', 'UsuGrid_Codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('CategoriaProfissionaisExterno', 'CatProfExt_Codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('SisUsuariosGrid', 'UsuGrid_Codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('ControleNSU', 'ContrNSU_Codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('DFeResumoNFe', 'DFeResNFe_Codigo', 1, 1)
insert into SisSeqTabela(SeqTab_Tabela, SeqTab_Campo, SeqTab_Numero, Emp_codigo) values ('DFe', 'LOTE', 1, 1)
INSERT INTO [dbo].[SisSeqTabela] ([SeqTab_Tabela] ,[SeqTab_Campo] ,[SeqTab_Numero] ,[Emp_codigo]) VALUES('OrdemServico' ,'OrdServ_CodigoPre' , 1,1)
INSERT INTO [dbo].[SisSeqTabela] ([SeqTab_Tabela] ,[SeqTab_Campo] ,[SeqTab_Numero] ,[Emp_codigo]) VALUES('OrdemServico' ,'OrdServ_Codigo' , 1,1)
INSERT INTO [dbo].[SisSeqTabela] ([SeqTab_Tabela] ,[SeqTab_Campo] ,[SeqTab_Numero] ,[Emp_codigo]) VALUES('OrdemServicoProduto' ,'OrdServProd_codigo' , 1,1)
INSERT INTO SisSeqTabela (SeqTab_Campo, SeqTab_Tabela, SeqTab_Numero, Emp_codigo)
INSERT INTO FechamentoComissaoConta (FechComis_Codigo,FechComisCt_ContaUnica,emp_codigo, fun_codigo)
insert into venda(Ven_codigo,ParSV_serie,Ven_Situacao,Ven_CodigoPre,Ven_Tipo,Ven_CodVinculo,Ven_DataEmissao,Ven_DataValidade,Ven_DataFechaVenda,Emp_codigo,Ven_SubTotal,Ven_DescontoPorc,Ven_Desconto,Ven_Total,Obr_codigo,Ven_PagReduzido,Ven_SubTotalProd,Ven_DescontoPorcProd,Ven_DescontoProd,Ven_TotalProd,Ven_SubTotalServ,Ven_DescontoPorcServ,Ven_DescontoServ,Ven_TotalServ,CatVen_Codigo,Ven_DescGanhoVenda,Ven_LimiteDesconto,Ven_TipoDesc,par_ParcelarVlAcima,par_VlMinParcela,par_QuantMaxParcela,Ven_FormaPagExtra,Ven_Exportacao,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao,Ven_Eletricista) select orc_codigo,'1' as serie,'A' AS situacao,orc_codigo_pre,'O' as tipo,cli_codigo,orc_dt_emissao,orc_dt_validade,orc_dt_fechamento,1 as empresa,orc_tl_orcamento,orc_desc_por_orcamento,orc_desc_orcamento,orc_tl_geral_orcamento,Obr_codigo,orc_PagReduzido,orc_tl_produto,orc_desc_por_produto,orc_desc_produto,orc_tl_geral_produto,orc_tl_servico,orc_desc_por_servico,orc_desc_servico,orc_tl_geral_servico,CatVen_Codigo,orc_desc_por_orcamento,orc_LimiteDesconto,Orc_TipoDesc,par_ParcelarVlAcima,par_VlMinParcela,par_QuantMaxParcela,orc_forma_pag_extra,Orc_exportacao,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao,(select fun_codigo from Funcionario where Fun_CPF = orc_eletricista) from orcamento
insert into VendaProduto(VenPro_Item,Ven_CodigoPre,Pro_codnosso,CodAcabamento,CodAmbiente,VenPro_Seq,VenPro_SeqItem,VenPro_Quantidade,VenPro_QuantidadeOriginal,VenPro_VlUnitario,VenPro_VlItem,VenPro_VlDescontoProc,VenPro_Vlimposto,pld_codindice,VenPro_ProdutoPai,VenPro_ProdutoSubPai,VenPro_ItemPai,VenPro_ItemSubPai,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select oma_item,orc_codigo_pre,Pro_codnosso,oma_acabamento,oma_ambiente,oma_seq,oma_seq_item,oma_quantidade,oma_quantidade,oma_vl_unitario,oma_vl_item,oma_Desconto,oma_VlImposto,oma_codindice,oma_lum_pai,oma_mat_pai,oma_item_lum,oma_item_rel,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao from orcamento_materiais_det
insert into VendaProduto(VenPro_Item,Ven_CodigoPre,Pro_codnosso,CodAcabamento,CodAmbiente,VenPro_Seq,VenPro_SeqItem,VenPro_Quantidade,VenPro_QuantidadeOriginal,VenPro_VlUnitario,VenPro_VlItem,VenPro_VlDescontoProc,VenPro_Vlimposto,pld_codindice,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao)select old_item,orc_codigo_pre,Orcamento_luminaria_det.Pro_codnosso,old_acabamento,old_ambiente,old_seq,old_seq_item,old_quantidade,old_quantidade,old_vl_unitario,old_vl_item,old_Desconto,old_VlImposto,old_codindice,Orcamento_luminaria_det.usr_cod_criacao,Orcamento_luminaria_det.usr_dt_hr_criacao,Orcamento_luminaria_det.usr_cod_alteracao,Orcamento_luminaria_det.usr_dt_hr_alteracao FROM  Orcamento_luminaria_det INNER JOIN produtos ON Orcamento_luminaria_det.Pro_codnosso = produtos.Pro_codnosso
insert into VendaServico(Ven_codigopre,VenSer_item,Sev_cod,VenSer_quantidade,VenSer_vlunitario,VenSer_vlitem,VenSer_VlEletricista,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select orc_codigo_pre,ose_item,Sev_cod,ose_quantidade,ose_vl_unitario,ose_vl_item,ose_vl_eletrecista,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao from orcamento_servico_det
insert into venda(Ven_codigo,ParSV_serie,Ven_Situacao,Ven_CodigoPre,Ven_Tipo,Ven_CodVinculo,Ven_DataEmissao,Ven_DataFechaVenda,Emp_codigo,Ven_SubTotal,Ven_DescontoPorc,Ven_Desconto,Ven_Total,Obr_codigo,Ven_SubTotalProd,Ven_DescontoPorcProd,Ven_DescontoProd,Ven_TotalProd,Ven_SubTotalServ,Ven_DescontoPorcServ,Ven_DescontoServ,Ven_TotalServ,CatVen_Codigo,Ven_DescGanhoVenda,Ven_LimiteDesconto,Ven_TipoDesc,par_ParcelarVlAcima,par_VlMinParcela,par_QuantMaxParcela,Ven_TemFinanceiro,Ven_TemCompra,Ven_TemEstoque,cen_codigo,Ven_ValorCredito,Ven_Requisicao,Par_ComissaoVincParc,Ven_Orcamento,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao,ven_formapag, ven_migrado, Ven_Eletricista )select  ped_codigo,'1' as serie,ped_status,
insert into VendaProduto(VenPro_Item,Ven_CodigoPre,Pro_codnosso,CodAcabamento,CodAmbiente,VenPro_Seq,VenPro_SeqItem,VenPro_Quantidade,VenPro_QuantidadeOriginal,VenPro_VlUnitario,VenPro_VlItem,VenPro_VlDescontoProc,VenPro_Vlimposto,pld_codindice,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao)select  pld_item,
insert into VendaProduto(VenPro_Item,Ven_CodigoPre,Pro_codnosso,CodAcabamento,CodAmbiente,VenPro_Seq,VenPro_SeqItem,VenPro_Quantidade,VenPro_QuantidadeOriginal,VenPro_VlUnitario,VenPro_VlItem,VenPro_VlDescontoProc,VenPro_Vlimposto,pld_codindice,VenPro_ProdutoPai,VenPro_ProdutoSubPai,VenPro_ItemPai,VenPro_ItemSubPai,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao)select  pma_item,
insert into VendaServico(Ven_codigopre,VenSer_item,Sev_cod,VenSer_quantidade,VenSer_vlunitario,VenSer_vlitem,VenSer_VlEletricista,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao,ain_codigo)select
insert into VendaIndicacao (VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,VenInd_DtVigencia,VenInd_Porcentagem,VenInd_Principal,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select 'PRO',
insert into VendaIndicacaoGrupProd(VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,GrupoProduto_Codigo,VenIndGrup_Porc)select 'PRO',
insert into ParamentrosSerieVenda  (ParSV_serie,ParSV_numeroOrc,ParSV_numeroPed,ParSV_Descricao,ParSV_situacao,Emp_codigo) values('2',0,
insert into venda(Ven_codigo,ParSV_serie,Ven_Situacao,Ven_CodigoPre,Ven_Tipo,Ven_CodVinculo,Ven_DataEmissao,Ven_DataFechaVenda,Emp_codigo,Ven_SubTotal,Ven_DescontoPorc,Ven_Desconto,Ven_Total,Obr_codigo,Ven_SubTotalProd,Ven_DescontoPorcProd,Ven_DescontoProd,Ven_TotalProd,CatVen_Codigo,Ven_DescGanhoVenda,Ven_LimiteDesconto,Ven_TipoDesc,par_ParcelarVlAcima,par_VlMinParcela,par_QuantMaxParcela,Ven_TemFinanceiro,Ven_TemCompra,Ven_TemEstoque,cen_codigo,Ven_ValorCredito,Ven_Requisicao,Par_ComissaoVincParc,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao,ven_formapag, Ven_migrado,Ven_Eletricista)select  avu_codigo,'2' as serie,'A' AS SITUACAO,
insert into VendaProduto(VenPro_Item,Ven_CodigoPre,Pro_codnosso,CodAcabamento,CodAmbiente,VenPro_Seq,VenPro_SeqItem,VenPro_Quantidade,VenPro_VlUnitario,VenPro_VlItem,VenPro_VlDescontoProc,VenPro_Vlimposto,pld_codindice,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select ald_item,
insert into VendaProduto(VenPro_Item,Ven_CodigoPre,Pro_codnosso,CodAcabamento,CodAmbiente,VenPro_Seq,VenPro_SeqItem,VenPro_Quantidade,VenPro_VlUnitario,VenPro_VlItem,VenPro_VlDescontoProc,VenPro_Vlimposto,pld_codindice,VenPro_ProdutoPai,VenPro_ProdutoSubPai,VenPro_ItemPai,VenPro_ItemSubPai,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select ama_item,
insert into ParamentrosSerieVenda  (ParSV_serie,ParSV_numeroOrc,ParSV_numeroPed,ParSV_Descricao,ParSV_situacao,Emp_codigo) values('3',0,
insert into venda(Ven_codigo,ParSV_serie,Ven_Situacao,Ven_CodigoPre,Ven_Tipo,Ven_CodVinculo,Ven_DataEmissao,Emp_codigo,Ven_SubTotal,Ven_DescontoPorc,Ven_Desconto,Ven_Total,Ven_SubTotalServ,Ven_DescontoPorcServ,Ven_DescontoServ,Ven_TotalServ,Obr_codigo,Ven_SubTotalProd,Ven_DescontoPorcProd,Ven_DescontoProd,Ven_TotalProd,CatVen_Codigo,Ven_DescGanhoVenda,Ven_LimiteDesconto,Ven_TipoDesc,par_ParcelarVlAcima,par_VlMinParcela,par_QuantMaxParcela,Ven_TemFinanceiro,Ven_TemCompra,Ven_TemEstoque,cen_codigo,Ven_ValorCredito,Ven_Requisicao,Par_ComissaoVincParc,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao,ven_migrado,Ven_Eletricista) select  scp_codigo,'3' as serie,'A' AS SITUACAO,
insert into VendaProduto(VenPro_Item,Ven_CodigoPre,Pro_codnosso,CodAcabamento,CodAmbiente,VenPro_Seq,VenPro_SeqItem,VenPro_Quantidade,VenPro_VlUnitario,VenPro_VlItem,VenPro_VlDescontoProc,VenPro_Vlimposto,pld_codindice,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select  sld_item,
insert into VendaProduto(VenPro_Item,Ven_CodigoPre,Pro_codnosso,CodAcabamento,CodAmbiente,VenPro_Seq,VenPro_SeqItem,VenPro_Quantidade,VenPro_VlUnitario,VenPro_VlItem,VenPro_VlDescontoProc,VenPro_Vlimposto,pld_codindice,VenPro_ProdutoPai,VenPro_ProdutoSubPai,VenPro_ItemPai,VenPro_ItemSubPai,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select sma_item,
insert into VendaServico (Ven_codigopre,VenSer_item,Sev_cod,VenSer_quantidade,VenSer_vlunitario,VenSer_vlitem,VenSer_VlEletricista,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select
insert into VendaAmbiente(VenAmb_TpDoc,VenAmb_NDocPre,CodAmbiente,Emp_Codigo,VenAmb_Descricao,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select 'PRO',
insert into VendaAtendente(VenAten_TpDoc,VenAten_NDocPre,Fun_Codigo,Emp_Codigo,VenAten_Porcentagem,VenAten_Principal,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao,VenAten_DtVigencia) select VenAten_TpDoc,
insert into VendaIndicacaoGrupProd(VenInd_TpDoc,VenInd_NDocPre,Ind_Codigo,Emp_Codigo,GrupoProduto_Codigo,VenIndGrup_Porc)select VenInd_TpDoc,
insert into Devolucao(Dev_codigo,Dev_CodigoPre,ven_codigopre,Dev_Dtemissao,Emp_codigo,Dev_SubTotal,Dev_DescontoPorc,Dev_Desconto,Dev_Total,Obr_codigo,Dev_SubTotalProd,Dev_DescontoPorcProd,Dev_DescontoProd,Dev_TotalProd,Dev_SubTotalServ,Dev_DescontoPorcServ,Dev_DescontoServ,Dev_TotalServ,Dev_CriarFinCred,Dev_obs,Dev_situacao,Dev_Desagio,Dev_ValorDesagio,dev_TipoDesc,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao,usr_cod_criacao,Dev_migrado ) select edv_codigo,edv_codigo_pre,ven_codigopre,edv_data,1 as empresa,edv_TlEntrada,edv_DescPorEntrada,edv_DescEntrada,edv_tl_geral_entrada,venda.Obr_codigo,edv_TlLuminaria + edv_TlMateriais as subtotal,0 as descporc,0 as desconto,edv_tl_geral_luminaria + edv_tl_geral_materiais as total,edv_TlServico,edv_DescPorServico,edv_DescServico,edv_tl_geral_servico,'C' as credito,edv_obs,case when edv_status ='A' then 1 else 0 end,edv_Desagio,edv_DesagioValor,edv_TipoDesc,Ent_devolucao.usr_dt_hr_criacao,Ent_devolucao.usr_cod_alteracao,Ent_devolucao.usr_dt_hr_alteracao,Ent_devolucao.usr_cod_criacao,1 as migrado  FROM Ent_devolucao INNER JOIN Venda ON Ent_devolucao.ped_codigo = Venda.Ven_codigo WHERE (Venda.ParSV_serie = '1' and venda.ven_tipo ='P') and Ent_devolucao.EDV_codigo_pre =:pEDV_codigo_pre and venda.ven_situacao='A'
insert into DevolucaoDesagio(Dev_codigopre,DevDes_porcentagem,DevDes_valor,GrupoProduto_Codigo,DevDes_valorComDesc) select edv_codigo_pre,EdvDes_porcentagem,EdvDes_valor,GrupoProduto_Codigo,EdvDes_valorComDesc FROM Ent_devolucao INNER JOIN Venda ON Ent_devolucao.ped_codigo = Venda.Ven_codigo INNER JOIN Ent_devolucaoDesagio ON Ent_devolucao.edv_codigo = Ent_devolucaoDesagio.edv_codigo WHERE (Venda.ParSV_serie = '1') AND (Venda.Ven_Tipo = 'P') and Ent_devolucao.EDV_codigo_pre =:pEDV_codigo_pre and venda.ven_situacao='A'
insert into DevolucaoProduto(Dev_CodigoPre,DevPro_item,Pro_codnosso,CodAcabamento,CodAmbiente,DevPro_Seq,DevPro_SeqItem,DevPro_Quantidade,DevPro_VlUnitario,DevPro_VlItem,DevPro_VlDescontoProc,DevPro_Vlimposto,DevPro_usuarioestoque,DevPro_DtHrUsuarioEstoque,DevPro_motivodev,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao)  select Ent_devolucao_luminaria_det.edv_codigo_pre,eld_item,Pro_codnosso,eld_acabamento,eld_ambiente,eld_seq,eld_seq_item,eld_quant_dev,eld_vl_unitario,eld_vl_item,eld_desconto,eld_VlImposto,eld_usuario_estoque,eld_datahora,eld_motivo_dev,Ent_devolucao_luminaria_det.usr_cod_criacao,Ent_devolucao_luminaria_det.usr_dt_hr_criacao,Ent_devolucao_luminaria_det.usr_cod_alteracao,Ent_devolucao_luminaria_det.usr_dt_hr_alteracao FROM Ent_devolucao INNER JOIN Venda ON Ent_devolucao.ped_codigo = Venda.Ven_codigo INNER JOIN Ent_devolucao_luminaria_det ON Ent_devolucao.edv_codigo_pre = Ent_devolucao_luminaria_det.edv_codigo_pre WHERE (Venda.ParSV_serie = '1') AND (Venda.Ven_Tipo = 'P') and Ent_devolucao.EDV_codigo_pre =:pEDV_codigo_pre and venda.ven_situacao='A'
insert into DevolucaoProduto ( Dev_CodigoPre,DevPro_item,Pro_codnosso,CodAcabamento,CodAmbiente,DevPro_Seq,DevPro_SeqItem,DevPro_Quantidade,DevPro_VlUnitario,DevPro_VlItem,DevPro_VlDescontoProc,DevPro_Vlimposto,DevPro_usuarioestoque,DevPro_DtHrUsuarioEstoque,DevPro_motivodev,DevPro_ProdutoPai,DevPro_ItemSubPai,DevPro_ProdutoSubPai,DevPro_ItemPai,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao )select Ent_devolucao_materiais_det.edv_codigo_pre,ema_item,Pro_codnosso,ema_acabamento,ema_ambiente,ema_seq,ema_seq_item,ema_quant_dev,ema_vl_unitario,ema_vl_item,ema_desconto,ema_VlImposto,ema_usuario_estoque,ema_datahora,ema_motivo_dev,ema_lum_pai,ema_item_rel,ema_mat_pai,ema_item_lum,Ent_devolucao_materiais_det.usr_cod_criacao,Ent_devolucao_materiais_det.usr_dt_hr_criacao,Ent_devolucao_materiais_det.usr_cod_alteracao,Ent_devolucao_materiais_det.usr_dt_hr_alteracao FROM Ent_devolucao INNER JOIN Venda ON Ent_devolucao.ped_codigo = Venda.Ven_codigo INNER JOIN Ent_devolucao_materiais_det ON Ent_devolucao.edv_codigo_pre = Ent_devolucao_materiais_det.edv_codigo_pre WHERE (Venda.ParSV_serie = '1') AND (Venda.Ven_Tipo = 'P') and Ent_devolucao.EDV_codigo_pre =:pEDV_codigo_pre and venda.ven_situacao='A'
insert into DevolucaoServico(Dev_codigopre,DevSer_item,Sev_cod,DevSer_quantidade,DevSer_vlunitario,DevSer_vlitem,usr_cod_criacao,usr_dt_hr_criacao,usr_cod_alteracao,usr_dt_hr_alteracao) select Ent_devolucao_servico_det.edv_codigo_pre,ese_item,Sev_cod,ese_quantidade,ese_vl_unitario,ese_vl_item,Ent_devolucao_servico_det.usr_cod_criacao,Ent_devolucao_servico_det.usr_dt_hr_criacao,Ent_devolucao_servico_det.usr_cod_alteracao,Ent_devolucao_servico_det.usr_dt_hr_alteracao FROM Ent_devolucao INNER JOIN Venda ON Ent_devolucao.ped_codigo = Venda.Ven_codigo INNER JOIN  Ent_devolucao_servico_det ON Ent_devolucao.edv_codigo_pre = Ent_devolucao_servico_det.edv_codigo_pre WHERE (Venda.ParSV_serie = '1') AND (Venda.Ven_Tipo = 'P') and Ent_devolucao.EDV_codigo_pre =:pEDV_codigo_pre and venda.ven_situacao='A'
insert into  estoque_produto_dia (Epd_data,Epd_hora,Epd_Codnosso,Epd_Acabamento,Epd_estoque,EstTp_Codigo)
INSERT into #TabelaVendaTmp (Codigo, Descricao, Acabamento,Produto, Peca,QuantVendida, QuantProjetoVA,QuantProjetoVAGeral,QuantMediaProjetoVA,QuantMediaProjetoVAgeral,QuantMediaMes,PorcVenda)
INSERT INTO [CFOP] ([CFOP_codigo], [CFOP_Descricao], [CFOP_DescricaoCurta], [CFOP_Aplicacao], [CFOP_Tipo], [CFOP_Situacao], [usr_cod_criacao], [usr_dt_hr_criacao], [usr_cod_alteracao], [usr_dt_hr_alteracao])


/* ================= DELETE (129) ================= */
delete from contas_apagar_pag where ctp_Codigo =:pctp_Codigo
delete from contas_apagar_det where ctp_Codigo =:pctp_Codigo
delete from contas_apagar where ctp_Codigo =:pctp_Codigo
delete from pedido_compra_det where pcp_codigo=:PCPCODIGO and pro_codnosso=:PROCODNOSSO and pcd_acabamento=:ACABAMENTO and Pcd_item=:pPcd_item
delete from ordem_compra_det where ocp_codigo=:OCPCODIGO and pro_codnosso=:PROCODNOSSO and ocd_acabamento=:ACABAMENTO and ocd_item_ped=:OCDITEM  and ocd_cod_pedido=:OCDCOD
delete  from pedido_compra_det where pcp_codigo =:codigo
delete from ordem_compra_det where ocp_codigo=:codigo
delete from ordem_compra where ocp_codigo=:codigo
delete from CategoriaCliente where CatCli_Codigo =:pCatCli_Codigo
delete from clientes where cli_codigo=:codigo
delete FROM movimentos where Crp_cod_pag=:codigo
delete FROM movimento_bancario where Crp_cod_pag=:codigo
delete FROM movimentos where Cpp_cod_pag=:codigo
delete FROM movimento_bancario where Cpp_cod_pag=:codigo
delete from contas_apagar_pag where ctp_codigo=:codigo
delete from contas_apagar_det where ctp_codigo=:codigo
delete from contas_receber_pag where ctr_codigo=:codigo
delete from contas_receber_det where ctr_codigo=:codigo
delete from TipoPeca where TpPeca_Codigo=:PTpPeca_Codigo and GrupoProduto_codigo=:PGrupoProduto_codigo
delete  from Preco_Produto where Pre_Codnosso=:codigo
delete  from Produto_Relacionados where Pre_Cod_Prod_Pai=:codigo
delete  from Estoque_produto where Epr_Codnosso=:codigo
delete  from produtos where Pro_codnosso=:codigo
delete  from ProdutosRelacionadosCadProdutos where Pro_Codnosso=:codigo
delete  from ProdutosFornecedores where Pro_Codnosso=:codigo
delete  FROM Contas_apagar_pag  WHERE (Contas_apagar_pag.Ctp_codigo =:codigo and Contas_apagar_pag.Ctp_codigo_det =:codigo_det )
delete  FROM Contas_apagar_det  WHERE (Ctp_codigo =:codigo and Ctp_codigo_det =:codigo_det )
delete from Transferencia_filiais_produtos where tfi_codigo =:codigo
delete from Transferencia_filiais where tfi_codigo =:codigo
delete from Transferencia_filiais_produtos where tfi_codigo=:codigo
delete from ProdutosRelacionadosDet where ProdRel_codigo =:pProdRel_codigo
delete from ProdutosRelacionados where ProdRel_codigo =:pProdRel_codigo
delete from VendaIndicacaoGrupProd where VenInd_TpDoc ='AUT' AND VenInd_NDocPre=:PVenInd_NDocPre
delete from VendaIndicacao where VenInd_TpDoc ='AUT' AND VenInd_NDocPre=:PVenInd_NDocPre and Emp_Codigo=1
delete from VendaAmbiente where VenAmb_TpDoc ='AUT' AND VenAmb_NDocPre=:PVenAmb_NDocPre and Emp_Codigo=1
delete from AutorizoInclusao_materiais where ain_codigo=:codigo
delete from AutorizoInclusao_luminaria where ain_codigo=:codigo
delete from AutorizoInclusao_servicos where ain_codigo=:codigo
delete from VendaAtendente where VenAten_TpDoc ='AUT' AND VenAten_NDocPre=:PVenAten_NDocPre and Emp_Codigo=1
delete from AutorizoInclusao where ain_codigo=:codigo
delete  from pedido_luminaria_det where ped_codigo_pre =:codigo and pld_saida_comp=:saida
delete  from pedido_materiais_det where ped_codigo_pre =:codigo and pma_saida_comp=:saida
delete  from pedido_servico_det where ped_codigo_pre =:codigo and pse_saida_comp=:saida
delete from controle_entrega_prod where cen_codigo_pre=:codigo
delete  from controle_entrega_data where controle_entrega_data.cen_codigo_pre =:codigo and controle_entrega_data.cep_acabamento=:acabamento and controle_entrega_data.Pro_codnosso=:produto
delete from acerto_eletrecistas_servicos where ael_codigo=:codigo and aes_codigo=:cod_aes
delete  from Saida_comp_luminaria_det where scp_codigo_pre =:codigo
delete  from Saida_comp_servico_det where scp_codigo_pre =:codigo
delete  from Saida_comp_materiais_det where scp_codigo_pre =:codigo
delete from PromocaoEstoque  where  prom_codigo =:pprom_codigo
delete from PromocaoProdutos where  prom_codigo =:pprom_codigo
delete from Promocao where  prom_codigo =:pprom_codigo
delete from SisUsuariosGrid where usr_cod_criacao =:pusr_cod_criacao and UsuGrid_Grid =:pUsuGrid_Grid
delete  FROM Contas_receber_pag  WHERE (Contas_receber_pag.Ctr_codigo =:codigo)
delete  FROM Contas_receber_det  WHERE (Ctr_codigo =:codigo)
delete  FROM Contas_receber  WHERE (Ctr_codigo =:codigo)
delete from Reserva_Estoque where Res_Projeto=:pcodigo and ParSV_serie=:pParSV_serie
delete from contato_grupo_email where gru_codigo=:codigo
delete from grupo_contato_email where gru_codigo=:codigo
delete FROM funcionario where Fun_CPF=:PFun_CPF
delete from ProdutosLocEstoque where Pro_Codnosso=:produto
delete from ProdutosFornecedores where Pro_Codnosso=:produto
delete from Preco_Produto where Pre_Codnosso=:produto
delete  from Forma_Pagamento_Parcela where Fpg_codigo =:codigo
delete from controle_entrega_data where cen_codigo_pre=:codigo
delete from lancamento_estoque where les_codigo=:codigo
delete from lancamento_estoque_det where les_codigo=:codigo
Delete from SisPermissao where idgrupo=:vIdgrupo
Delete from SisPermissao where idusuario=:vIdUsuario
delete from Contas_apagar_pag  WHERE (Contas_apagar_pag.Cpp_cod_pag =:codigo)
delete from Contas_apagar_pag  WHERE (Contas_apagar_pag.Ctp_codigo =:codigo)
delete from Contas_apagar_det  WHERE (Contas_apagar_det.Ctp_codigo =:codigo)
delete from Contas_apagar  WHERE Ctp_codigo =:codigo
delete from Contas_receber_pag where Ctr_codigo =:codigo and Ctr_codigo_det=:cod_det
delete from Contas_receber_det where Ctr_codigo =:codigo and Ctr_codigo_det=:cod_det
delete from Contas_receber_det  WHERE (Contas_receber_det.Ctr_codigo =:codigo)
delete from Contas_receber  WHERE Ctr_codigo =:codigo
delete  from Forma_Pag_Parc_fin where Fpf_codigo =:codigo
delete from plano_contas where pco_codigo=:vCod
delete from Contas_Bancarias where Bcx_codigo=:bcx_cod and Cba_codigo=:cba_cod
delete from Bancos_Caixas where Bcx_codigo=:bcx_cod
delete from movimentos where tra_codigo=:codigo
delete from Movimento_bancario where tra_codigo=:codigo
delete  FROM pos_venda_det where Pve_codigo=:codigo
delete from pos_venda where pve_codigo=:codigo
DELETE FROM acerto_eletrecistas  WHERE ael_codigo =
DELETE FROM acerto_eletrecistas_servicos  WHERE ael_codigo =
DELETE FROM acerto_eletrecistas_det  WHERE ael_codigo =
delete  FROM Orcamento_luminaria_det where orc_codigo_pre in ( SELECT Orcamento_luminaria_det.orc_codigo_pre FROM Orcamento_luminaria_det LEFT OUTER JOIN orcamento ON Orcamento_luminaria_det.orc_codigo_pre = orcamento.orc_codigo_pre WHERE  (orcamento.orc_codigo IS NULL) GROUP BY Orcamento_luminaria_det.orc_codigo_pre)
delete  FROM orcamento_materiais_det where orc_codigo_pre in ( SELECT orcamento_materiais_det.orc_codigo_pre FROM orcamento RIGHT OUTER JOIN orcamento_materiais_det ON orcamento.orc_codigo_pre = orcamento_materiais_det.orc_codigo_pre WHERE (orcamento.orc_codigo IS NULL) GROUP BY orcamento_materiais_det.orc_codigo_pre)
delete  FROM Orcamento_servico_det where orc_codigo_pre in ( SELECT Orcamento_servico_det.orc_codigo_pre FROM orcamento RIGHT OUTER JOIN  Orcamento_servico_det ON orcamento.orc_codigo_pre = Orcamento_servico_det.orc_codigo_pre WHERE (orcamento.orc_codigo IS NULL) GROUP BY Orcamento_servico_det.orc_codigo_pre)
delete from ParamentrosCliente where Tsu_codigo= 17 or Tsu_codigo = 25 or Tsu_codigo=158 or Tsu_codigo = 23
delete from ProdutosFornecedores
delete from Movimentos where Crp_cod_pag=:pcodigo
delete from Movimento_bancario where Crp_cod_pag=:pcodigo
delete from EtiquetaGrupoDet where etq_gru_codigo=:codigo
delete from Etiqueta_Grupo where etq_Gru_codigo=:codigo
delete from etiquetas_textos where etq_codigo =:Petq_codigo
delete from etiquetas_campos where etq_codigo =:Petq_codigo
delete from EtiquetaGrupoDet where (etq_Gru_codigo in (
delete from Etiqueta_Grupo where etq_codigo =:Petq_codigo
delete from etiquetas where etq_codigo =:Petq_codigo
delete from contas_apagar where ctp_codigo=:codigo
delete from contas_receber where ctR_codigo=:codigo
DELETE FROM ControleRH WHERE (dbo.ControleRH.CtrlRH_Codigo = :Pcodigo)
DELETE FROM contas_apagar_det WHERE (ctp_codigo = :Pcodigo)
DELETE FROM contas_apagar WHERE (Ctp_codigo = :Pcodigo)
DELETE FROM MetaVendaTpVenda WHERE (MetaVendaTpVenda.MetaVenda_Codigo =:PmetaVenda_codigo)
DELETE FROM MetaVendaDet WHERE (MetaVendaDet.MetaVenda_Codigo =:PmetaVenda_codigo)
DELETE FROM RateioDet WHERE (Rateio_Codigo=:Prateio_Codigo)
delete from ComissaoPremiacaoTpVenda WHERE ComPre_codigo =:PComPre_codigo
delete from ComissaoPremiacaoGrup WHERE ComPre_codigo =:PComPre_codigo
delete from ComissaoPremiacaoCond WHERE ComPre_codigo =:PComPre_codigo
DELETE FROM FechamentoMetaEmp WHERE (FechMeta_Codigo = :PFechMeta_Codigo)
DELETE FROM FechamentoMetaFunc WHERE (FechMeta_Codigo = :PFechMeta_Codigo)
delete from FornecedorGrupProd where GrupoProduto_Codigo=:PGrupoProduto_Codigo
delete from FornecedorRTGrupProd where GrupoProduto_Codigo=:PGrupoProduto_Codigo
delete from IndicacaoGrupProd where GrupoProduto_Codigo=:PGrupoProduto_Codigo
delete from GrupoProduto where GrupoProduto_Codigo=:PGrupoProduto_Codigo
delete from TributacaoServico where TribServ_codigo =:pTribServ_codigo
delete from Categoriaprofissionaisexterno where Catprofext_Codigo =:pCatprofext_Codigo
delete from contas_apagar_pag where Ctp_codigo =
delete from contas_apagar_det where Ctp_codigo =
delete from contas_apagar where Ctp_codigo =
Delete from  Avulso_luminaria_det where avu_codigo_pre in (
Delete from  Avulso_materiais_det where avu_codigo_pre in (
Delete from  Ent_devolucao_luminaria_det where edv_codigo_pre in (
Delete from  Ent_devolucao_materiais_det where edv_codigo_pre in (
DELETE FROM tabela FROM ( SELECT


/* ================= EXEC (4) ================= */
EXEC dbo.GravaEstoqueMinimo
EXEC GravaEstoqueMinimo @produto, @acab
EXEC sp_rename 'Nota_Entrada_Dif.NenDf_codigo1', 'NenDf_codigo', 'COLUMN'
EXEC sp_executesql  @sqltemp


/* ================= SELECT (2137) ================= */
SELECT produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto
SELECT dbo.Preco_Produto.Pre_Codnosso
SELECT fornecedor.For_Nome, produtos.Pro_codnosso FROM ProdutosFornecedores INNER JOIN fornecedor ON ProdutosFornecedores.For_codigo = fornecedor.For_codigo INNER JOIN produtos ON ProdutosFornecedores.Pro_codnosso = produtos.Pro_codnosso WHERE produtos.Pro_codnosso=:produto
SELECT SUM(Elg_quantidade) AS SOMA FROM estoque_log WHERE (Elg_operacao = 'S')  AND (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo=1
SELECT SUM(Elg_quantidade) AS SOMA FROM estoque_log WHERE (Elg_operacao = 'E')  AND (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo=1
SELECT SUM(Elg_quantidade) AS SOMA FROM estoque_log WHERE (Elg_operacao = 'E')  AND (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo =1
SELECT Clientes.Cli_Nome, Avulso.avu_codigo FROM Avulso INNER JOIN Clientes ON Avulso.cli_codigo = Clientes.Cli_Codigo where Avulso.avu_codigo=:codigo
SELECT Clientes.Cli_Nome, venda.ven_codigo FROM Clientes INNER JOIN venda ON Clientes.Cli_Codigo = venda.Ven_CodVinculo  where venda.ven_codigo=:codigo AND VENDA.ParSV_serie =:pParSV_serie
SELECT SUM(Elg_quantidade) AS SOMA FROM estoque_log WHERE (Elg_operacao = 'S')  AND (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo=1 and ParSV_serie =:pParSV_serie
SELECT SUM(Elg_quantidade) AS SOMA FROM estoque_log WHERE (Elg_operacao = 'E')  AND (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo=1 and ParSV_serie =:pParSV_serie
SELECT Clientes.Cli_Nome, Ent_devolucao.edv_codigo, Ent_devolucao.ped_codigo FROM Clientes INNER JOIN Ent_devolucao ON Clientes.Cli_Codigo = Ent_devolucao.cli_codigo where Ent_devolucao.edv_codigo=:codigo
SELECT Elg_operacao, Elg_quantidade AS SOMA FROM estoque_log WHERE (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo=1
SELECT Clientes.Cli_Nome, venda.ven_codigo,venda.Ven_DataConclusao  FROM Clientes INNER JOIN venda ON Clientes.Cli_Codigo = venda.Ven_CodVinculo  where venda.ven_codigo=:codigo AND VENDA.ParSV_serie =:pParSV_serie and ven_tipo ='P' and Ven_Situacao ='A'
SELECT Transferencia_filiais.Tfi_codigo, Filiais.Fil_fantasia FROM Transferencia_filiais INNER JOIN  Filiais ON Transferencia_filiais.Fil_codigo = Filiais.Fil_codigo where Transferencia_filiais.Tfi_codigo=:codigo
SELECT Elg_quantidade AS SOMA FROM estoque_log WHERE (Elg_operacao = 'A')  AND (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo=1
SELECT Elg_quantidade AS SOMA FROM estoque_log WHERE (Elg_operacao = 'Z')  AND (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo=1
SELECT Clientes.Cli_Nome  FROM Venda_TEF INNER JOIN clientes ON Clientes.Cli_Codigo = Venda_TEF.cli_codigo  where Venda_TEF.TEF_Num_cupom_venda=:codigo
SELECT Clientes.Cli_Nome FROM Factura INNER JOIN Clientes ON Factura.Cli_Codigo = Clientes.Cli_Codigo where Factura.Fact_Tipo=:pFact_Tipo and Factura.Fact_Codigo=:PFact_Codigo
SELECT   Elg_codigo, Elg_acao, Elg_tipo, Pro_codnosso, CodAcabamento, ParSV_serie, CAST(CONVERT(CHAR(8),elg_data,112) AS DATETIME) AS  elg_data FROM  estoque_log where EstTp_Codigo = 1 and Elg_data >=:data1 and elg_data <=:data2 and Pro_codnosso=:codigo and CodAcabamento=:acabamento
select * from estoque_produto_dia where epd_data=:data and Epd_Codnosso=:produto and epd_acabamento=:acabamento and EstTp_Codigo=1
SELECT  NotaFiscal.NTF_Numero, NotaFiscal.NTF_Serie, notaFiscal.NTF_SubSerie, NotaFiscal.NTF_Modelo, CASE WHEN Clientes.Cli_Nome IS NULL  THEN NTF_Nome ELSE Clientes.Cli_Nome END AS cli_nome, NotaFiscal.NTF_Tipo FROM notaFiscal LEFT OUTER JOIN Clientes ON NotaFiscal.Cli_Codigo = Clientes.Cli_Codigo where NotaFiscal.NTF_numero=:codigo
SELECT  dbo.Clientes.Cli_Nome, dbo.Devolucao.Dev_codigo, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie FROM dbo.Devolucao INNER JOIN dbo.Venda ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN  dbo.Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo where Devolucao.Dev_codigo =:codigo
SELECT Elg_quantidade AS SOMA FROM estoque_log WHERE (Elg_operacao = 'B')  AND (Elg_codigo =:CODIGO) and Pro_codnosso=:produto and CodAcabamento=:acabamento and EstTp_Codigo=1
SELECT TransferenciaEstoque.TransfEst_codigo, 'PV: ' + CAST(Venda.Ven_codigo AS VARchar(10)) + ' S
SELECT Clientes.Cli_Nome, Assistencia_Tecnica.ASTEC_Codigo FROM Clientes INNER JOIN Assistencia_Tecnica ON Clientes.Cli_Codigo = Assistencia_Tecnica.cli_codigo  where Assistencia_Tecnica.ASTEC_Codigo=:codigo
SELECT dbo.NotaFiscalTroca.NTF_Codigo, dbo.NotaFiscal.NTF_Nome, dbo.NotaFiscalTroca.NTFT_Codigo FROM     dbo.NotaFiscalTroca INNER JOIN dbo.NotaFiscal ON dbo.NotaFiscalTroca.NTF_Codigo = dbo.NotaFiscal.NTF_Codigo WHERE  (dbo.NotaFiscalTroca.NTFT_Codigo =:pNTFT_Codigo)
SELECT dbo.RequisicaoEstoq.ReqEst_Data, dbo.RequisicaoEstoq.ReqEst_Codigo, dbo.Clientes.Cli_Nome FROM     dbo.Obras INNER JOIN dbo.Venda ON dbo.Obras.Obr_Codigo = dbo.Venda.Obr_codigo INNER JOIN dbo.Clientes ON dbo.Obras.Cli_codigo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.RequisicaoEstoq ON dbo.Venda.Ven_codigo = dbo.RequisicaoEstoq.ReqEst_NumDoc AND dbo.Venda.ParSV_serie = dbo.RequisicaoEstoq.ParSV_serie WHERE  (dbo.Venda.Ven_Tipo = 'P') AND RequisicaoEstoq.ReqEst_Codigo=:CODIGO
SELECT ordem_compra_det.Ocp_codigo, ordem_compra_det.Ocd_item, ordem_compra_det.Pro_codnosso,
SELECT Nota_entrada.Nen_dt_nota,Nota_entrada.Nen_numero_nota,Nota_entrada_det.Ned_quantidade_recebida FROM nota_entrada_det INNER JOIN
SELECT Clientes.Cli_Nome FROM venda INNER JOIN Clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo where venda.ven_codigopre=:pedido  and venda.ven_tipo ='P'
select For_Nome,For_codigo from fornecedor WITH (NOLOCK) where for_classificacao = 'F' order by For_Nome
Select * from EstoqueTipo  where  EstTp_externo = 0 order by EstTp_Descricao
SELECT 0 as Nosso_Codico_num,empresa.EMPRESA, produtos.Pro_codnosso , dbo.Estoque_produto.Epr_estoque, dbo.Estoque_produto.EstTp_Codigo, dbo.produtos.Pro_CodEspecial,
SELECT 0 as Nosso_Codico_num, dbo.Estoque_produto.Epr_estoque, dbo.Estoque_produto.EstTp_Codigo, dbo.produtos.Pro_CodEspecial, dbo.produtos.Pro_unidade, ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase,
Select * from EstoqueTipo  where  EstTp_externo = 1 order by EstTp_Descricao
SELECT CASE WHEN  (SELECT  SUM(VenPro_Quantidade) AS Expr1  FROM            dbo.Venda INNER JOIN  dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre  WHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.PromocaoProdutos.Prom_Codigo = prom_codigo) AND (dbo.PromocaoProdutos.Pro_codnosso = Pro_codnosso) AND (dbo.PromocaoProdutos.CodAcabamento = CodAcabamento)) > 0 THEN (dbo.PromocaoEstoque.PromEst_Quantidade) - (SELECT  SUM(VenPro_Quantidade) AS Expr1  FROM            dbo.Venda INNER JOIN  dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre  WHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.PromocaoProdutos.Prom_Codigo = prom_codigo) AND (dbo.PromocaoProdutos.Pro_codnosso = Pro_codnosso) AND (dbo.PromocaoProdutos.CodAcabamento = CodAcabamento))   ELSE (PromocaoEstoque.PromEst_Quantidade) END AS QuantRest, dbo.PromocaoProdutos.PromProd_Vlpromocional, Promocao.Prom_Codigo  , Promocao.Prom_DataInicial, Promocao.Prom_DataFinal FROM dbo.Promocao INNER JOIN dbo.PromocaoProdutos ON dbo.Promocao.Prom_Codigo = dbo.PromocaoProdutos.Prom_Codigo INNER JOIN dbo.PromocaoEstoque ON dbo.PromocaoProdutos.Prom_Codigo = dbo.PromocaoEstoque.Prom_Codigo AND dbo.PromocaoProdutos.Pro_codnosso = dbo.PromocaoEstoque.Pro_codnosso AND  dbo.PromocaoProdutos.CodAcabamento = dbo.PromocaoEstoque.CodAcabamento WHERE  dbo.Promocao.Prom_codigo =:pProm_codigo  AND  (dbo.PromocaoProdutos.Pro_codnosso =:pPro_codnosso) AND (dbo.PromocaoProdutos.CodAcabamento =:pCodAcabamento)  and dbo.Promocao.Prom_DataInicial <=:pProm_DataInicial  AND dbo.Promocao.Prom_DataFinal >=:pProm_DataFinal
SELECT sum(dbo.VendaProduto.VenPro_Quantidade) as quant
SELECT Venda.*,Obras.Obr_Descricao
select * from venda where ven_codigo =:pven_codigo and ven_situacao <> 'C' and ParSV_serie=:pParSV_serie and Ven_Tipo='P'
SELECT VenPro_Obs FROM     dbo.VendaProduto
select Pcp_codigo from pedido_compra where Pcp_ped_av_fan =:pPcp_ped_av_fan and ParSV_serie =:pParSV_serie and Pcp_status = 'A'
select max(Pcd_item) as Pcd_item  from Pedido_compra_det where Pcp_codigo =:pPcp_codigo
SELECT Dev_CodigoPre, Pro_codnosso, sum(DevPro_Quantidade) as DevPro_Quantidade , Tam_codigo, CodAcabamento
select * from Pedido_compra_det where Pcp_codigo =:pPcp_codigo and Pro_codnosso =:pPro_codnosso and Pcd_acabamento =:pPcd_acabamento
select * from DevolucaoProduto where dev_CodigoPre =:Pdev_CodigoPre
SELECT * FROM Estoque_produto where Epr_Codnosso=:produto and Epr_acabamento=:acabamento and EstTp_Codigo=:pEstTp_Codigo
SELECT Devolucao.*, Obras.Obr_Descricao,Clientes.Cli_codigo,
SELECT ctp_Codigo from contas_apagar where Tpd_Codigo=1013 and Ctp_cod_documento =:pCtp_cod_documento
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade)
select * from ParamentrosDesagio
SELECT Credito_Codigo from Credito where Tpd_Codigo=1013 and Credito_TpdcodigoOrigem=1013 and Credito_CodigoDoc =:pCredito_Docvenda and ParSV_serie =:pParSV_serie
select * from contas_apagar
select * from contas_apagar_det
select * from funcionario where fun_atendimento= 'SIM' order by fun_nome
select * from motivo_devolucao where mod_tipo= 'D' order by mod_descricao
SELECT devolucao.dev_codigo FROM devolucao INNER JOIN DevolucaoServico ON devolucao.dev_codigopre = DevolucaoServico.dev_codigopre WHERE DevolucaoServico.Sev_cod =
SELECT Devolucao.Dev_codigo, Devolucao.Dev_CodigoPre, Devolucao.ven_codigopre, Devolucao.Dev_Dtemissao, VendaAmbiente.VenAmb_Descricao, DevolucaoProduto.DevPro_Seq, DevolucaoProduto.DevPro_SeqItem, DevolucaoProduto.CodAmbiente, DevolucaoProduto.CodAcabamento, DevolucaoProduto.Pro_codnosso, DevolucaoProduto.DevPro_VlUnitario, DevolucaoProduto.DevPro_VlItem, DevolucaoProduto.DevPro_Quantidade, DevolucaoProduto.DevPro_QuantidadeOriginal, DevolucaoProduto.DevPro_motivodev, Motivo_devolucao.Mod_descricao,DevolucaoProduto.DevPro_usuarioestoque,  produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, produtos.Pro_tp_peca, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_CodEspecial, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.GrupoProduto.GrupoProduto_ordem, Venda.Ven_codigo, dbo.Venda.Ven_Situacao, dbo.Venda.ParSV_serie, dbo.Venda.Ven_CodigoPre AS Expr1, devolucao.Dev_situacao,Clientes.Cli_Nome ,Venda.Ven_DataEmissao, case when Devolucao.Dev_TipoDesc = 'P' then DevolucaoProduto.DevPro_VlItem  else   case when Dev_DescontoPorcProd is null then  DevolucaoProduto.DevPro_VlItem else DevolucaoProduto.DevPro_VlItem - DevolucaoProduto.DevPro_VlItem *(Dev_DescontoPorcProd/100) end  end as valoritemdesc  ,CASE WHEN DevolucaoDesagio.DevDes_porcentagem > 0 THEN CASE WHEN Devolucao.Dev_TipoDesc = 'P' THEN DevolucaoProduto.DevPro_VlItem * (DevolucaoDesagio.DevDes_porcentagem / 100) ELSE CASE WHEN Dev_DescontoPorcProd IS NULL THEN DevolucaoProduto.DevPro_VlItem * (DevolucaoDesagio.DevDes_porcentagem / 100) ELSE DevolucaoProduto.DevPro_VlItem * (DevolucaoDesagio.DevDes_porcentagem / 100) -  DevolucaoProduto.DevPro_VlItem * (DevolucaoDesagio.DevDes_porcentagem / 100) * (Dev_DescontoPorcProd / 100) end end  ELSE 0 END AS ValorDesagio FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre INNER JOIN dbo.VendaAmbiente ON dbo.Devolucao.ven_codigopre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.DevolucaoProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.Motivo_devolucao ON dbo.DevolucaoProduto.DevPro_motivodev = dbo.Motivo_devolucao.Mod_codigo INNER JOIN dbo.produtos ON dbo.DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN dbo.Venda ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN dbo.Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso LEFT OUTER JOIN dbo.DevolucaoDesagio ON dbo.produtos.GrupoProduto_codigo = dbo.DevolucaoDesagio.GrupoProduto_Codigo AND dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoDesagio.Dev_codigopre
SELECT DevolucaoServico.DevSer_item, DevolucaoServico.Dev_codigopre, DevolucaoServico.Sev_cod, Servicos.Serv_Desc, DevolucaoServico.DevSer_quantidade, DevolucaoServico.DevSer_vlunitario, DevolucaoServico.DevSer_vlitem, DevolucaoServico.DevSer_VlEletricista, Devolucao.Dev_codigo, Clientes.Cli_Nome, Venda.Ven_codigo, Venda.Ven_CodigoPre, Venda.Ven_Situacao,Venda.Ven_DataEmissao , Devolucao.dev_situacao FROM Devolucao INNER JOIN DevolucaoServico ON Devolucao.Dev_CodigoPre = DevolucaoServico.Dev_codigopre INNER JOIN Servicos ON DevolucaoServico.Sev_cod = Servicos.sev_cod INNER JOIN Venda ON Devolucao.ven_codigopre = Venda.Ven_CodigoPre INNER JOIN Clientes ON Venda.Ven_CodVinculo = Clientes.Cli_Codigo
select * from sisusuarios where sisusu_situacao = 'A' and
select * from sisusuarios where
SELECT * from observacoes where obs_codigo=:Vencodigopre and obs_tipo ='O' and obs_relatorio= 'OR
SELECT Paises_codigo FROM Paises WHERE Paises_Descricao =
SELECT Regiao_codigo FROM Regiao WHERE Regiao_Descricao =
select * from municipio where mun_uf=:codigo
select mun_codigo, mun_nome,mun_uf from municipio order by
select mun_nome, mun_uf from municipio where mun_codigo=:Pmun_codigo
select ocp_transportadora from ordem_compra where ocp_transportadora=:Pocp_transportadora
select * from transportadora order by
select ban_codigo from bancos where ban_codigo=
select ban_codigo from bancos where ban_codigo <>
select * from bancos order by
select ban_codigo,ban_nome from bancos where ban_situacao = 'A' order by
select * from pedido_compra
SELECT Clientes.Cli_Nome, Obras.Obr_Descricao, Venda.Ven_codigo, Venda.ParSV_serie
SELECT ordem_compra_det.Ocd_cod_pedido
SELECT Pedido_compra_det.*, produtos.Pro_CodEspecial, ProdutosFornecedores.ProdFor_CodigoProduto, ProdutosFornecedores.ProdFor_DescricaoProduto
select max(pcd_item) as maximo from Pedido_compra_det where Pcp_codigo=:codigo
select * from pedido_compra_det
SELECT DISTINCT  0 as selecionar,fornecedor.For_codigo, pedido_compra.Pcp_status, Pedido_compra_det.Pro_codnosso, Pedido_compra_det.Pcd_acabamento, pedido_compra_det.Pcd_destino,
SELECT    DISTINCT  dbo.fornecedor.For_codigo, dbo.OrdemCompraDetExt.Pro_codnosso, dbo.OrdemCompraDetExt.Ocdex_acabamento, dbo.produtos.Pro_descricao, dbo.Filiais.Fil_fantasia,
SELECT Preco_Produto.Pre_Codnosso, Preco_Produto.Pre_Acabamento, Preco_Produto.Pre_Codindice, Preco_Produto.Pre_EstMinCalcular, Preco_Produto.pre_codigo, Preco_Produto.Pre_Ativo,
SELECT Preco_Produto.Pre_Codnosso, Preco_Produto.Pre_Acabamento
SELECT Preco_Produto.Pre_Codnosso, Preco_Produto.Pre_Acabamento,Preco_Produto.Pre_Codindice, Preco_Produto.Pre_EstMinCalcular, Preco_Produto.pre_codigo,Preco_Produto.Pre_Ativo, produtos.Pro_descricao, produtos.Pro_descricao_for, produtos.Pro_Codbase,  TipoPeca.TpPeca_Codigo, GrupoProduto.GrupoProduto_Descricao, Preco_Produto.Pre_est_min, Estoque_produto.Epr_estoque, dbo.CompraEstoque(Preco_Produto.Pre_Codnosso, Preco_Produto.Pre_Acabamento,'G') AS ComprasEstoque, produtos.Pro_foto,  CASE WHEN  (dbo.Estoque_produto.Epr_estoque + dbo.CompraEstoque(dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento,'G')) >  dbo.Preco_Produto.Pre_est_min THEN 0 ELSE case when (dbo.Estoque_produto.Epr_estoque + dbo.CompraEstoque(dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento,'G'))  - dbo.Preco_Produto.Pre_est_min < 0  then ((dbo.Estoque_produto.Epr_estoque + dbo.CompraEstoque(dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento,'G')) - dbo.Preco_Produto.Pre_est_min )* -1 else  (dbo.Estoque_produto.Epr_estoque + dbo.CompraEstoque(dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento,'G')) - dbo.Preco_Produto.Pre_est_min end END AS RESULTADO, produtos.Pro_CodEspecial, produtos.pro_unidade, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.ProdutosFornecedores.For_codigo FROM dbo.ProdutosFornecedores INNER JOIN dbo.Estoque_produto INNER JOIN dbo.Preco_Produto INNER JOIN dbo.produtos ON dbo.Preco_Produto.Pre_Codnosso = dbo.produtos.Pro_codnosso ON dbo.Estoque_produto.Epr_Codnosso = dbo.Preco_Produto.Pre_Codnosso AND dbo.Estoque_produto.Epr_Acabamento = dbo.Preco_Produto.Pre_Acabamento ON dbo.ProdutosFornecedores.Pro_codnosso = dbo.produtos.Pro_codnosso LEFT OUTER JOIN dbo.TipoPeca ON dbo.produtos.Pro_tp_peca = dbo.TipoPeca.TpPeca_Codigo LEFT OUTER JOIN dbo.GrupoProduto ON dbo.TipoPeca.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo WHERE (Preco_Produto.Pre_Ativo = 'S') AND (dbo.produtos.Pro_ativo = 'S') and Preco_Produto.Pre_est_min > 0
select * from ordem_compra
select * from ordem_compra where ocp_codigo=:codigo
select max(ocd_item) as maximo from ordem_compra_det where ocp_codigo=:codigo
SELECT nota_entrada_det.Ned_cod_ordem
select For_EmpresaCompradora from fornecedor where for_codigo =:pfor_codigo
select For_prazo_entrega from fornecedor where For_codigo=:codigo
select For_faturamento_minimo, tra_codigo, col_cidade, col_uf from fornecedor where For_codigo=:codigo
SELECT sum(Ned_quantidade_recebida) as quantidade FROM nota_entrada_det
select * from fornecedor where for_classificacao='F' and for_nome is not null
SELECT * from Mensagem_Relatorio WITH (NOLOCK) where men_codigo= 16
SELECT CASE WHEN dbo.Funcionario.Fun_Nome IS NULL THEN 'USU
SELECT fornecedor.For_Nome AS For_Nome, ordem_compra.*
SELECT Nota_entrada.Nen_status,nota_entrada_det.Ned_cod_ordem
select Ctp_codigo from contas_apagar where Tpd_codigo = 1023 and Ctp_cod_documento=:pCtp_cod_documento
SELECT * FROM ordem_compra_det WHERE Ocp_Codigo=:codigo
SELECT GrupoProduto_Codigo
select * from contatos where Con_codigo=:codigo and Con_tpcadastro = 'FOR'
select * from fornecedor where For_cnpj_cpf =:codigo
select * from fornecedor where For_Sigla =:SIGLA
select * from fornecedor where For_cnpj_cpf =:cfp and For_codigo<>:codigo
select * from fornecedor where For_Sigla =:sigla and For_codigo<>:codigo
select max(for_codigo)as maximo from fornecedor where  for_codigo < 999999999
select * from FornecedorEmpresaCompradora
select ban_nome, ban_codigo from bancos where ban_codigo=:Pban_codigo
select mun_codigo, mun_nome, mun_uf from municipio where mun_nome=:Pmun_nome and mun_uf=:pmun_uf
SELECT For_codigo FROM produtos where For_codigo=:codigo
SELECT Ctp_vinculo FROM contas_apagar where Ctp_vinculo ='FORNECEDOR' and Ctp_codigo_vinculo=:codigo
SELECT Ctr_vinculo FROM contas_receber where Ctr_vinculo ='FORNECEDOR' and Ctr_codigo_vinculo=:codigo
select * from fornecedor where for_codigo < 999999999 order by
select mun_codigo from municipio where mun_nome=:Pmun_nome and mun_uf=:Pmun_uf
select max(indDet_codigo) as maximo from indicacoes_Detalhe
SELECT * FROM IndicacaoGrupProd
SELECT dbo.IndicacaoGrupProd.*, dbo.GrupoProduto.GrupoProduto_Descricao
SELECT GrupoProduto_Codigo, GrupoProduto_Descricao
SELECT pedido.ped_codigo, dbo.Indicacoes.Ind_codigo
SELECT dbo.Indicacoes.Ind_codigo, dbo.orcamento.orc_codigo FROM Indicacoes LEFT OUTER JOIN
SELECT Indicacoes.Ind_codigo, Avulso.avu_codigo
SELECT Ctp_vinculo FROM contas_apagar where Ctp_vinculo ='INDICA
SELECT Ctr_vinculo FROM contas_receber where Ctr_vinculo ='INDICA
SELECT Municipio.mun_codigo, Municipio.mun_nome, Municipio.mun_uf, Municipio.mun_situacao, Paises.Paises_Descricao,
select nac_codigo from nacionalidade where nac_nome=
select nac_codigo from nacionalidade where nac_codigo <>
select * from Nacionalidade order by
select cod_ativid,nome_ativi, prof_situacao
select Catcli_Descricao from Categoriacliente where Catcli_Descricao=:PCatcli_Descricao
SELECT *,   case when catcli_situacao =1 then 'ATIVO' else 'DESATIVADO' end as situacao FROM CategoriaCliente WITH (NOLOCK)
SELECT *,   case when catcli_situacao =1 then 'ATIVO' else 'DESATIVADO' end as situacao from categoriacliente
select CatCli_Codigo from clientes where CatCli_Codigo =:pCatCli_Codigo
select * from municipio where mun_nome=:Pmun_nome and mun_uf=:Pmun_uf
select * from clientes where cli_codigo <>:pcli_codigo
SELECT CatCli_Codigo, CatCli_Descricao FROM CategoriaCliente where CatCli_Situacao = 1  ORDER BY CatCli_Descricao
SELECT CatCli_Codigo, CatCli_Descricao FROM CategoriaCliente where CatCli_Situacao = 1 or CatCli_Codigo=:pCatCli_Codigo  ORDER BY CatCli_Descricao
select ban_nome, ban_site from bancos where ban_codigo=:Pban_codigo
select * from clientes where cli_nome like '%
SELECT pedido.ped_codigo, dbo.Clientes.Cli_Codigo FROM Clientes LEFT OUTER JOIN
SELECT orcamento.orc_codigo, dbo.Clientes.Cli_Codigo FROM Clientes LEFT OUTER JOIN
SELECT Avulso.avu_codigo, dbo.Clientes.Cli_Codigo FROM Clientes LEFT OUTER JOIN
SELECT Ctp_vinculo FROM contas_apagar where Ctp_vinculo ='CLIENTE' and Ctp_codigo_vinculo=:codigo
SELECT Ctr_vinculo FROM contas_receber where Ctr_vinculo ='CLIENTE' and Ctr_codigo_vinculo=:codigo
select * from dbo.clientes NOLOCK order by
select * from dbo.clientes NOLOCK where Cli_nome like
select * from dbo.clientes NOLOCK where cli_situacao like
select * from dbo.clientes NOLOCK where cli_cnpj_cpf like
select * from dbo.clientes NOLOCK where
SELECT CatCli_Descricao FROM CategoriaCliente where CatCli_Codigo=:pCatCli_Codigo
SELECT  MAX(dbo.FacturaProduto.Fact_Codigo) AS CODIGOPRE,  MAX(dbo.FacturaProduto.Pro_codnosso) AS CODIGOPRO,  MAX(dbo.FacturaProduto.CodAcabamento) AS ACAB,  SUM(dbo.FacturaProduto.FactProd_Quant) AS QUANT,   MAX(dbo.FacturaProduto.FactProd_VlUnit) AS VLUNIT,  MAX(dbo.FacturaProduto.FactProd_IVA) AS IVA, MAX(FactProd_Desconto) as desconto  FROM dbo.FacturaProduto with (nolock) WHERE   (dbo.FacturaProduto.FactProd_Quant > 0) AND   (dbo.FacturaProduto.Fact_Tipo ='
SELECT  MAX(dbo.Ent_devolucao_luminaria_det.edv_codigo_pre) AS CODIGOPRE, MAX(dbo.Ent_devolucao_luminaria_det.Pro_codnosso) AS CODIGOPRO, MAX(dbo.Ent_devolucao_luminaria_det.eld_acabamento) AS ACAB, SUM(dbo.Ent_devolucao_luminaria_det.eld_quantidade) AS QUANT, MAX(dbo.Ent_devolucao_luminaria_det.eld_vl_unitario) AS VLUNIT,  MAX(dbo.produtos.Pro_AliqICMS) AS IVA,  MAX(Ent_devolucao_luminaria_det.eld_desconto) AS desconto FROM dbo.produtos with (nolock) INNER JOIN dbo.Ent_devolucao_luminaria_det ON (dbo.produtos.Pro_codnosso = dbo.Ent_devolucao_luminaria_det.Pro_codnosso) WHERE    (dbo.Ent_devolucao_luminaria_det.eld_quantidade > 0) AND  (dbo.Ent_devolucao_luminaria_det.edv_codigo_pre in(
SELECT  MAX (dbo.pedido_luminaria_det.ped_codigo_pre) AS CODIGOPRE,  MAX (dbo.pedido_luminaria_det.Pro_codnosso) AS CODIGOPRO,  MAX (dbo.pedido_luminaria_det.pld_acabamento) AS ACAB,   SUM (dbo.pedido_luminaria_det.pld_quantidade) AS QUANT,  MAX (dbo.pedido_luminaria_det.pld_vl_unitario) AS VLUNIT, MAX (dbo.produtos.Pro_AliqICMS) AS IVA,  MAX (dbo.pedido_luminaria_det.pld_desconto) AS desconto  FROM produtos with (nolock) INNER JOIN dbo.pedido_luminaria_det ON (dbo.produtos.Pro_codnosso = dbo.pedido_luminaria_det.Pro_codnosso)  WHERE dbo.pedido_luminaria_det.pld_quantidade > 0 and (dbo.pedido_luminaria_det.ped_codigo_pre in(
SELECT   MAX(dbo.Saida_comp_luminaria_det.scp_codigo_pre) AS CODIGOPRE,   MAX(dbo.Saida_comp_luminaria_det.Pro_codnosso) AS CODIGOPRO,    MAX(dbo.Saida_comp_luminaria_det.sld_acabamento) AS ACAB,   SUM(dbo.Saida_comp_luminaria_det.sld_quantidade) AS QUANT,  MAX(dbo.Saida_comp_luminaria_det.sld_vl_unitario) AS VLUNIT, MAX(dbo.produtos.Pro_AliqICMS) AS IVA,     MAX(dbo.Saida_comp_luminaria_det.sld_desconto) AS desconto  FROM dbo.produtos  with (nolock)  INNER JOIN dbo.Saida_comp_luminaria_det ON (dbo.produtos.Pro_codnosso = dbo.Saida_comp_luminaria_det.Pro_codnosso) WHERE (dbo.Saida_comp_luminaria_det.sld_quantidade > 0) AND   (dbo.Saida_comp_luminaria_det.scp_codigo_pre in(
SELECT MAX(dbo.Avulso_luminaria_det.avu_codigo_pre) AS CODIGOPRE,  MAX(dbo.Avulso_luminaria_det.Pro_codnosso) AS CODIGOPRO,  MAX(dbo.Avulso_luminaria_det.ald_acabamento) AS ACAB,   SUM(dbo.Avulso_luminaria_det.ald_quantidade) AS QUANT,   MAX(dbo.Avulso_luminaria_det.ald_vl_unitario) AS VLUNIT,  MAX(dbo.produtos.Pro_AliqICMS) AS IVA,    MAX(Avulso_luminaria_det.ald_DESCONTO) AS DESCONTOFROM dbo.produtos with (nolock) INNER JOIN dbo.Avulso_luminaria_det ON (dbo.produtos.Pro_codnosso = dbo.Avulso_luminaria_det.Pro_codnosso)  WHERE   (dbo.Avulso_luminaria_det.ald_quantidade > 0) AND   (dbo.Avulso_luminaria_det.avu_codigo_pre in(
SELECT  MAX(DevolucaoProduto.Dev_CodigoPre) AS CODIGOPRE, MAX(DevolucaoProduto.Pro_codnosso) AS CODIGOPRO,  MAX(DevolucaoProduto.CodAcabamento) AS ACAB,   SUM(DevolucaoProduto.DevPro_Quantidade) AS QUANT,    SUM(DevolucaoProduto.DevPro_VlItem) / SUM(DevolucaoProduto.DevPro_Quantidade) AS VLUNIT, MAX(dbo.produtos.Pro_AliqICMS) AS IVA, Devolucao.Dev_DescontoPorc AS desconto FROM produtos WITH (nolock) INNER JOIN DevolucaoProduto ON produtos.Pro_codnosso = devolucaoProduto.Pro_codnosso INNER JOIN Devolucao ON DevolucaoProduto.Dev_CodigoPre = Devolucao.Dev_CodigoPre  WHERE    (DevolucaoProduto.DevPro_Quantidade > 0) AND  (DevolucaoProduto.dev_codigopre in(
SELECT  MAX(VendaProduto.ven_CodigoPre) AS CODIGOPRE, MAX(VendaProduto.Pro_codnosso) AS CODIGOPRO,  MAX(VendaProduto.CodAcabamento) AS ACAB,   SUM(VendaProduto.VenPro_Quantidade) - (SELECT CASE WHEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) > 0 THEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) ELSE 0 END AS Expr1 FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE (dbo.Devolucao.Dev_migrado IS NULL) AND (dbo.Devolucao.Dev_situacao = 1) AND DEVOLUCAO.ven_codigopre = vendaproduto.ven_codigopre and vendaproduto.pro_codnosso = devolucaoproduto.pro_codnosso and vendaproduto.CodAcabamento = devolucaoproduto.CodAcabamento) AS quant, SUM(VendaProduto.VenPro_VlItem) / SUM(VendaProduto.VenPro_Quantidade) AS VLUNIT, MAX(dbo.produtos.Pro_AliqICMS) AS IVA, Venda.Ven_DescontoPorc as desconto FROM  produtos WITH (nolock) INNER JOIN VendaProduto ON produtos.Pro_codnosso = VendaProduto.Pro_codnosso INNER JOIN Venda ON VendaProduto.Ven_CodigoPre = Venda.Ven_CodigoPre WHERE VendaProduto.VenPro_Quantidade > 0 and (VendaProduto.ven_CodigoPre in(
SELECT   MAX(dbo.Saida_comp_luminaria_det.scp_codigo_pre) AS CODIGOPRE,   MAX(dbo.Saida_comp_luminaria_det.Pro_codnosso) AS CODIGOPRO,    MAX(dbo.Saida_comp_luminaria_det.sld_acabamento) AS ACAB,   SUM(dbo.Saida_comp_luminaria_det.sld_quantidade) AS QUANT,  SUM(Saida_comp_luminaria_det.sld_vl_item) / SUM(Saida_comp_luminaria_det.sld_quantidade) AS VLUNIT, MAX(dbo.produtos.Pro_AliqICMS) AS IVA,     MAX(dbo.Saida_comp_luminaria_det.sld_desconto) AS DESCONTO  FROM dbo.produtos  with (nolock)  INNER JOIN dbo.Saida_comp_luminaria_det ON (dbo.produtos.Pro_codnosso = dbo.Saida_comp_luminaria_det.Pro_codnosso) WHERE (dbo.Saida_comp_luminaria_det.sld_quantidade > 0) AND   (dbo.Saida_comp_luminaria_det.scp_codigo_pre in(
SELECT MAX(dbo.Avulso_luminaria_det.avu_codigo_pre) AS CODIGOPRE,  MAX(dbo.Avulso_luminaria_det.Pro_codnosso) AS CODIGOPRO,  MAX(dbo.Avulso_luminaria_det.ald_acabamento) AS ACAB,   SUM(dbo.Avulso_luminaria_det.ald_quantidade) AS QUANT,   SUM(Avulso_luminaria_det.ald_vl_item) / SUM(Avulso_luminaria_det.ald_quantidade) AS VLUNIT,   MAX(dbo.produtos.Pro_AliqICMS) AS IVA,    MAX(dbo.Avulso_luminaria_det.ald_desconto) AS desconto  FROM dbo.produtos with (nolock) INNER JOIN dbo.Avulso_luminaria_det ON (dbo.produtos.Pro_codnosso = dbo.Avulso_luminaria_det.Pro_codnosso)  WHERE   (dbo.Avulso_luminaria_det.ald_quantidade > 0) AND   (dbo.Avulso_luminaria_det.avu_codigo_pre in(
SELECT Clientes.Cli_Nome,Factura.Fact_Tipo,Factura.Fact_Codigo AS CODIGO, Factura.Fact_DtEmissao AS DATA_,Factura.Fact_VlTotal AS TOTAL FROM Factura with (nolock)  LEFT OUTER JOIN Clientes ON (Factura.Cli_Codigo = Clientes.Cli_Codigo) WHERE (Factura.Fact_Situacao = 'A') and (Factura.Fact_DtEmissao BETWEEN :dataini AND :datafim)
SELECT Ent_devolucao.edv_codigo as CODIGO,Ent_devolucao.edv_codigo_pre AS CODIGOPRE,Ent_devolucao.ped_codigo,Ent_devolucao.edv_tl_geral_entrada AS TOTAL,Ent_devolucao.edv_data AS DATA_,Clientes.Cli_Nome FROM Ent_devolucao with (nolock)  LEFT OUTER JOIN Clientes ON (Ent_devolucao.cli_codigo = Clientes.Cli_Codigo)  WHERE (Ent_devolucao.edv_status = 'A') and (Ent_devolucao.edv_data BETWEEN :dataini AND :datafim)
SELECT Clientes.Cli_Nome,pedido.ped_codigo as CODIGO,pedido.ped_codigo_pre AS CODIGOPRE,pedido.ped_dt_fechamento AS DATA_, pedido.ped_tl_geral_orcamento AS TOTAL FROM pedido with (nolock)  INNER JOIN Clientes ON (pedido.cli_codigo = Clientes.Cli_Codigo)  WHERE (pedido.ped_status = 'A') and (pedido.ped_dt_fechamento BETWEEN :dataini AND :datafim)
SELECT Clientes.Cli_Nome,Saida_complementacao.Scp_codigo AS CODIGO,Saida_complementacao.Scp_codigo_pre AS CODIGOPRE,Saida_complementacao.Scp_data AS DATA_,Saida_complementacao.scp_tl_geral_saida AS TOTAL FROM Saida_complementacao with (nolock) INNER JOIN Clientes ON (Saida_complementacao.cli_codigo = Clientes.Cli_Codigo) WHERE (Saida_complementacao.scp_status = 'A')and (Saida_complementacao.Scp_data BETWEEN :dataini AND :datafim)
SELECT Clientes.Cli_Nome,Avulso.avu_codigo as CODIGO,Avulso.avu_codigo_pre AS CODIGOPRE,Avulso.avu_dt_fechamento AS DATA_,Avulso.avu_tl_geral_avulso AS TOTAL FROM Avulso with (nolock) INNER JOIN Clientes ON (Avulso.cli_codigo = Clientes.Cli_Codigo)  WHERE (Avulso.avu_status = 0) and (Avulso.avu_dt_emissao BETWEEN :dataini AND :datafim)
SELECT dbo.Devolucao.Dev_codigo AS CODIGO, dbo.Devolucao.Dev_CodigoPre AS CODIGOPRE, dbo.Venda.Ven_codigo, dbo.Devolucao.Dev_Total AS TOTAL, dbo.Devolucao.Dev_Dtemissao AS DATA_, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_CodigoPre, dbo.Devolucao.Dev_DescontoPorc AS DESCONTO,  dbo.Clientes.Cli_Codigo, dbo.Venda.Ven_formaPag AS forma_pag, dbo.Venda.Ven_TipoDesc AS tipodesc,  (SELECT     TOP (1) dbo.NotaFiscal.NTF_Numero  FROM   dbo.NotaFiscal INNER JOIN  dbo.NotaFiscalImportaDoc ON dbo.NotaFiscal.NTF_Codigo = dbo.NotaFiscalImportaDoc.NTF_Codigo  WHERE (dbo.NotaFiscalImportaDoc.NTFImp_DocCodigo = dbo.Devolucao.Dev_codigo) AND (dbo.NotaFiscalImportaDoc.NTFImp_DocTipo = 'EPD')) AS nota  FROM dbo.Clientes INNER JOIN dbo.Venda ON dbo.Clientes.Cli_Codigo = dbo.Venda.Ven_CodVinculo RIGHT OUTER JOIN  dbo.Devolucao WITH (nolock) ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre WHERE (venda.ven_situacao = 'A') AND  (devolucao.Dev_situacao = 1) and (Devolucao.Dev_Dtemissao BETWEEN :dataini AND :datafim) and venda.ven_tipo='P'
SELECT Clientes.Cli_Nome,venda.ven_codigo as CODIGO,venda.ven_codigopre AS CODIGOPRE,venda.Ven_DataEmissao AS DATA_, venda.Ven_Total AS TOTAL, venda.Ven_DescontoPorc as desconto, Clientes.Cli_Codigo, venda.Ven_formaPag as forma_pag  , venda.ven_TipoDesc as tipodesc,(SELECT TOP (1) dbo.NotaFiscal.NTF_Numero FROM NotaFiscal INNER JOIN   NotaFiscalImportaDoc ON NotaFiscal.NTF_Codigo = NotaFiscalImportaDoc.NTF_Codigo    WHERE (NotaFiscalImportaDoc.NTFImp_DocCodigo = venda.ven_codigo) AND   (NotaFiscalImportaDoc.NTFImp_DocTipo = 'PRO')) AS nota    FROM venda with (nolock)    INNER JOIN Clientes ON (venda.Ven_CodVinculo = Clientes.Cli_Codigo) WHERE venda.ven_tipo='P' and (venda.ven_situacao = 'A') and (venda.Ven_DataEmissao BETWEEN :dataini AND :datafim)
SELECT Clientes.Cli_Nome, Saida_complementacao.Scp_codigo AS CODIGO, Saida_complementacao.Scp_codigo_pre AS CODIGOPRE, Saida_complementacao.ped_codigo, Saida_complementacao.Scp_data AS DATA_, Saida_complementacao.scp_tl_geral_saida AS TOTAL, pedido.ped_desc_por_produto as desconto, Clientes.Cli_Codigo, pedido.ped_codigo_pre,pedido.Ped_TipoDesc as tipodesc, pedido.ped_forma_pag as forma_pag ,(SELECT TOP (1) NotaFiscal.NTF_Numero FROM NotaFiscal INNER JOIN NotaFiscalImportaDoc ON NotaFiscal.NTF_Codigo = NotaFiscalImportaDoc.NTF_Codigo WHERE (NotaFiscalImportaDoc.NTFImp_DocCodigo = Saida_complementacao.Scp_codigo) AND (NotaFiscalImportaDoc.NTFImp_DocTipo = 'SPC')) AS nota  FROM Saida_complementacao WITH (nolock) INNER JOIN Clientes ON Saida_complementacao.cli_codigo = Clientes.Cli_Codigo INNER JOIN pedido ON Saida_complementacao.ped_codigo = pedido.ped_codigo WHERE (pedido.ped_status = 'A') and (Saida_complementacao.scp_status = 'A')and (Saida_complementacao.Scp_data BETWEEN :dataini AND :datafim)
SELECT Clientes.Cli_Nome,Avulso.avu_codigo as CODIGO,Avulso.avu_codigo_pre AS CODIGOPRE,Avulso.avu_dt_fechamento AS DATA_,Avulso.avu_tl_geral_avulso AS TOTAL, avulso.avu_desc_por_avulso as desconto, Clientes.Cli_Codigo , avulso.avu_forma_pag as forma_pag , avulso.avu_TipoDesc as tipodesc,(SELECT TOP (1) NotaFiscal.NTF_Numero FROM NotaFiscal INNER JOIN NotaFiscalImportaDoc ON NotaFiscal.NTF_Codigo = NotaFiscalImportaDoc.NTF_Codigo WHERE (NotaFiscalImportaDoc.NTFImp_DocCodigo = Avulso.avu_codigo) AND (NotaFiscalImportaDoc.NTFImp_DocTipo = 'AVU')) AS nota  FROM Avulso with (nolock) INNER JOIN Clientes ON (Avulso.cli_codigo = Clientes.Cli_Codigo)  WHERE (Avulso.avu_status = 0) and (Avulso.avu_dt_emissao BETWEEN :dataini AND :datafim)
SELECT Pro_descricao FROM produtos WHERE (Pro_codnosso = :PcodNosso)
SELECT produtos.*, GrupoProduto.GrupoProduto_Descricao
SELECT  dbo.NotaFiscal.NTF_Codigo,dbo.NotaFiscal.NTF_Numero,dbo.NotaFiscal.NTF_Serie,dbo.NotaFiscal.NTF_SubSerie,dbo.NotaFiscal.NTF_Modelo,dbo.NotaFiscal.NTF_Tipo,dbo.NotaFiscal.CFOP_codigo,dbo.NotaFiscal.NTF_NatOperacao,dbo.NotaFiscal.NTF_IESubsTrib,dbo.NotaFiscal.NTF_DtEmissao,dbo.NotaFiscal.NTF_DtSaidaEntrada,dbo.NotaFiscal.NTF_HoraSaida,dbo.NotaFiscal.Cli_Codigo,dbo.NotaFiscal.NTF_Nome,dbo.NotaFiscal.NTF_InscEst,dbo.NotaFiscal.NTF_CNPJCPF,dbo.NotaFiscal.NTF_Endereco,dbo.NotaFiscal.NTF_EndNumero,dbo.NotaFiscal.NTF_Bairro,dbo.NotaFiscal.NTF_CEP,dbo.NotaFiscal.NTF_Municipio,dbo.NotaFiscal.NTF_UF,dbo.NotaFiscal.NTF_FoneFax,dbo.NotaFiscal.NTF_BaseICMS,dbo.NotaFiscal.NTF_VlICMS,dbo.NotaFiscal.NTF_BaseSubstICMS,dbo.NotaFiscal.NTF_VlSubstICMS,dbo.NotaFiscal.NTF_VLProdutos,dbo.NotaFiscal.NTF_VlFrete,dbo.NotaFiscal.NTF_VlSeguro,dbo.NotaFiscal.NTF_DespAcessoria,dbo.NotaFiscal.NTF_VlIPI,dbo.NotaFiscal.NTF_VlNota,dbo.NotaFiscal.Tra_codigo,dbo.NotaFiscal.NTF_TraNome,dbo.NotaFiscal.NTF_TpFrete,dbo.NotaFiscal.NTF_Placa,dbo.NotaFiscal.NTF_PlacaUF,dbo.NotaFiscal.NTF_TraCNPJCPF,dbo.NotaFiscal.NTF_TraEndereco,dbo.NotaFiscal.NTF_TraMunicipio,dbo.NotaFiscal.NTF_TraUF,dbo.NotaFiscal.NTF_TraIE,dbo.NotaFiscal.NTF_TraQuant,dbo.NotaFiscal.NTF_TraEspecie,dbo.NotaFiscal.NTF_TraMarca,dbo.NotaFiscal.NTF_TraNumero,dbo.NotaFiscal.NTF_TraPesoLiq,dbo.NotaFiscal.NTF_TraPesoBruto,dbo.NotaFiscal.NTF_Dados1,dbo.NotaFiscal.NTF_Dados2,dbo.NotaFiscal.Emp_Codigo,dbo.NotaFiscal.CatVen_Codigo,dbo.NotaFiscal.Par_ComissaoVincParc,dbo.NotaFiscal.NTF_FormaPagamento,dbo.NotaFiscal.NTF_Impresso,dbo.NotaFiscal.Mod_codigo,dbo.NotaFiscal.usr_cod_criacao,dbo.NotaFiscal.usr_dt_hr_criacao,dbo.NotaFiscal.usr_cod_alteracao,dbo.NotaFiscal.usr_dt_hr_alteracao,dbo.NotaFiscal.NTF_Situacao,dbo.NotaFiscal.NTF_ImportTipo,dbo.NotaFiscal.NTF_ImportNumero,dbo.NotaFiscal.NTF_ImpCodFor, NotaFiscal.NTF_CriarConta, case when NotaFiscal.NTF_Tipo = 'S' Then 'X' ELSE '' END AS MarcaSaida,case when NotaFiscal.NTF_Tipo = 'E' Then 'X' ELSE '' END AS MarcaEntrada, (SELECT  NTFC_data FROM  NotaFiscalContas WHERE (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 1)) AS FaturaData1, (SELECT  NTFC_valor  FROM NotaFiscalContas AS contas_Receber_det_1  WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 1)) AS FaturaValor1,  str(NotaFiscal.NTF_Numero) + '-A' AS FaturaNumero1,  (SELECT     NTFC_data  FROM         NotaFiscalContas AS contas_Receber_det_2   WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 2)) AS FaturaData2,  (SELECT     NTFC_valor FROM         NotaFiscalContas AS contas_Receber_det_1  WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 2)) AS FaturaValor2, str(NotaFiscal.NTF_Numero) + '-B' AS FaturaNumero2, (SELECT  NTFC_data  FROM NotaFiscalContas AS contas_Receber_det_2  WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 3)) AS FaturaData3,  (SELECT     NTFC_valor   FROM         NotaFiscalContas AS contas_Receber_det_1  WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 3)) AS FaturaValor3,  str(NotaFiscal.NTF_Numero) + '-C' AS FaturaNumero3,  (SELECT     NTFC_data  FROM         NotaFiscalContas AS contas_Receber_det_2   WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 4)) AS FaturaData4,  (SELECT  NTFC_valor  FROM  NotaFiscalContas AS contas_Receber_det_1  WHERE  (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 4)) AS FaturaValor4, str(NotaFiscal.NTF_Numero) + '-D' AS FaturaNumero4,  (SELECT  NTFC_data  FROM  NotaFiscalContas AS contas_Receber_det_2    WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 5)) AS FaturaData5,  (SELECT     NTFC_valor   FROM         NotaFiscalContas AS contas_Receber_det_1  WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 5)) AS FaturaValor5,  str(NotaFiscal.NTF_Numero) + '-E' AS FaturaNumero5,  (SELECT     NTFC_data  FROM         NotaFiscalContas AS contas_Receber_det_2  WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 6)) AS FaturaData6,  (SELECT   NTFC_valor  FROM   NotaFiscalContas AS contas_Receber_det_1  WHERE      (NTF_Codigo = NotaFiscal.NTF_Codigo) AND (NTFC_parcela = 6)) AS FaturaValor6,   str(NotaFiscal.NTF_Numero) + '-F' AS FaturaNumero6 FROM NotaFiscal WHERE  (dbo.NotaFiscal.NTF_Codigo =:pNTF_Codigo)
SELECT   dbo.NotaFiscalProdutos.NTFPro_Codigo,  dbo.NotaFiscalProdutos.NTF_Codigo,  dbo.NotaFiscalProdutos.Pro_codnosso,  dbo.NotaFiscalProdutos.NTFPro_ProdDescr,  dbo.NotaFiscalProdutos.CodAcabamento,  dbo.NotaFiscalProdutos.NTFPro_StTrib,  dbo.NotaFiscalProdutos.uni_codigo,  dbo.NotaFiscalProdutos.NTFPro_Quant,  dbo.NotaFiscalProdutos.NTFPro_Desconto,  dbo.NotaFiscalProdutos.NTFPro_VlUnitario,  dbo.NotaFiscalProdutos.NTFPro_VlTotal,  dbo.NotaFiscalProdutos.NTFPro_ICMS,  dbo.NotaFiscalProdutos.NTFPro_IPI,  dbo.NotaFiscalProdutos.CFOP_codigo,  dbo.NotaFiscalProdutos.Emp_Codigo,  dbo.NotaFiscalProdutos.usr_cod_criacao,  dbo.NotaFiscalProdutos.usr_dt_hr_criacao,  dbo.NotaFiscalProdutos.usr_cod_alteracao,  dbo.NotaFiscalProdutos.usr_dt_hr_alteracao  FROM NotaFiscalProdutos WHERE   (dbo.NotaFiscalProdutos.NTF_Codigo = :CodNTF)
select Tsu_descricao from Texto_Substituicao where Tsu_campo=:PTsu_campo and Tsu_tabela=:pTsu_tabela
select Tsu_alinhamento from Texto_Substituicao where Tsu_campo=:PTsu_campo and Tsu_tabela=:pTsu_tabela
select Pro_Codbase from produtos where Pro_codnosso=:pPro_codnosso
select Pro_descricao_for from produtos where Pro_codnosso=:pPro_codnosso
select Mod_codigo, Mod_descricao, Mod_situacao,Mod_tipo from Motivo_devolucao
select * from Motivo_devolucao
SELECT  COUNT(dbo.Motivo_devolucao.Mod_codigo) AS numero FROM Motivo_devolucao LEFT OUTER JOIN
SELECT Clientes.Cli_Endereco as RUA,Clientes.Cli_numero as NUM,Clientes.Cli_complemento as COMP,Clientes.Cli_Bairro as BAIRRO,Municipio.mun_nome as CIDADE,Municipio.mun_uf as UF,Clientes.Cli_CEP as CEP FROM Clientes LEFT  OUTER JOIN dbo.Municipio ON (dbo.Clientes.Cli_codcidade = dbo.Municipio.mun_codigo) WHERE (dbo.Clientes.Cli_Codigo =:Pcli_codigo)
SELECT Clientes.Cli_Endereco_cob as RUA,Clientes.Cli_numero_cob as NUM,Clientes.Cli_complemento_cob as COMP,Clientes.Cli_Bairro_cob as BAIRRO,Municipio.mun_nome as CIDADE,Municipio.mun_uf as UF,Clientes.Cli_CEP_cob as CEP FROM Clientes LEFT  OUTER  JOIN dbo.Municipio ON (dbo.Clientes.Cli_codcidade_cob = dbo.Municipio.mun_codigo) WHERE (dbo.Clientes.Cli_Codigo =:Pcli_codigo)
SELECT Municipio.mun_nome as CIDADE,Municipio.mun_uf as UF,  Obras.Obr_Descricao as NomeObra,Obras.Obr_Endereco as RUA,Obras.Obr_numero as NUM,Obras.Obr_complemento as COMP,Obras.Obr_Bairro as BAIRRO,Obras.Obr_CEP as CEP,Obras.Obr_codigo FROM Clientes  INNER JOIN dbo.Obras ON (dbo.Clientes.Cli_Codigo = dbo.Obras.Cli_codigo)  INNER  JOIN dbo.Municipio ON (dbo.Obras.mun_codigo = dbo.Municipio.mun_codigo)  WHERE(dbo.Clientes.Cli_Codigo =:Pcli_codigo)
SELECT CFOP_codigo FROM CFOP WHERE (CFOP_codigo =:CFOP_codigo)
SELECT Contas_Bancarias.Cba_codigo, Bancos_Caixas.Bcx_tipo, Bancos_Caixas.Bcx_codigo FROM Bancos_Caixas INNER JOIN
SELECT max(Mvt_codigo) as maximo FROM movimentos
SELECT * FROM movimentos where Crp_cod_pag=:codigo
SELECT max(Mba_codigo) as maximo FROM movimento_bancario
SELECT * FROM movimento_bancario where Crp_cod_pag=:codigo
select max(Crp_cod_pag) as maximo from contas_receber_pag
select max(ControlCheque_codigo) as maximo from ControleCheque
select max(ControlChequedet_codigo) as maximo from ControleChequedet
SELECT  *  from  contas_receber_det  where Ctr_codigo =:codigo and Ctr_codigo_det =:cod_det
select * from contas_Receber_det where emp_codigo=:empresa and ctr_codigo_det=:cod_det and ctr_codigo=:codigo
select * from contas_receber_DET where emp_codigo=:empresa and ctr_codigo=:codigo and (Ctr_situacao = 'N' OR Ctr_situacao IS NULL)
select * from contas_receber where emp_codigo=:empresa and ctr_codigo=:codigo
SELECT ctr_situacao from contas_receber_det where Ctr_codigo =:codigo and Ctr_codigo_det=:cod_det
SELECT   Bancos_Caixas.Bcx_situacao,  dbo.Contas_Bancarias.Cba_codigo, dbo.Contas_Bancarias.Bcx_codigo, dbo.Contas_Bancarias.Emp_codigo, dbo.Bancos_Caixas.Bcx_Nome,
select Ctr_vinculo,Ctr_codigo_vinculo,Ctr_nome from contas_receber where ctr_codigo=
select For_codigo,For_nome from fornecedor  ORDER BY for_nome
select Cli_codigo,Cli_nome from clientes  ORDER BY cli_nome
select Fun_cpf,Fun_nome from Funcionario  ORDER BY FUN_nome
select Ind_codigo,Ind_nome from indicacoes ORDER BY ind_nome
select Fil_codigo,Fil_fantasia from Filiais ORDER BY Fil_fantasia
select Cba_codigo from FechamentoContas where Cba_codigo=:pCba_codigo and FechContas_data >=:pFechContas_data
select max(ControlCheque_codigo) as maximo from ControleCheque where ControlCheque_codigo < 1000000
select max(ControlChequedet_codigo) as maximo from ControleChequedet where ControlChequedet_codigo < 1000000
select * from  ControleRH where CtrlRH_ContaRefVincDet=:pctr_codigo_det and CtrlRH_ContaRefVinc =:pctr_codigo and CtrlRH_pendente is null
select FechComis_Situacao from FechamentoComissao where FechComis_Codigo=:PFechComis_Codigo
SELECT CASE WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'OUTROS' THEN ControleChequeDet.ControlChequeDet_emitente WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'CLIENTE' THEN (SELECT cli_nome FROM clientes WHERE clientes.cli_codigo = ControleChequeDet.ControlChequeDet_vinculocodigo) WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'INDICA
SELECT * FROM movimentos where Cpp_cod_pag=:codigo
SELECT * FROM movimento_bancario where Cpp_cod_pag=:codigo
select max(Cpp_cod_pag) as maximo from contas_apagar_pag
SELECT  *  from  contas_apagar_det  where Ctp_codigo =:codigo and Ctp_codigo_det =:cod_det
select * from contas_apagar_det where emp_codigo=:empresa and ctp_codigo_det=:cod_det and ctp_codigo=:codigo
select * from contas_apagar_DET where emp_codigo=:empresa and ctp_codigo=:codigo and (Ctp_situacao = 'N' OR Ctp_situacao IS NULL)
select * from contas_apagar where emp_codigo=:empresa and ctp_codigo=:codigo
SELECT  ctp_situacao  from  contas_apagar_det  where Ctp_codigo =:codigo and Ctp_codigo_det =:cod_det
SELECT CODLANC,razao from empresa where razao is not null order by razao
select * from ControleChequedet where ControleChequedet.ControlChequeDet_Codigo=
SELECT Clientes.Cli_nome as NOME,Clientes.Cli_cnpj_cpf as CNPJ,Clientes.Cli_IE_RG as IE,Clientes.Cli_Endereco as RUA,Clientes.Cli_numero as NUM,Clientes.Cli_complemento as COMP,Clientes.Cli_Bairro as BAIRRO,Municipio.mun_nome as CIDADE,Municipio.mun_uf as UF,Clientes.Cli_CEP as CEP,Clientes.Cli_Fcomercial as FONE FROM Clientes LEFT  OUTER JOIN dbo.Municipio ON (dbo.Clientes.Cli_codcidade = dbo.Municipio.mun_codigo) WHERE (dbo.Clientes.Cli_Codigo =:Pcli_codigo)
SELECT VendaAtendente.Fun_Codigo, VendaAtendente.VenAten_Porcentagem, VendaAtendente.VenAten_Principal FROM VendaAtendente INNER JOIN Funcionario ON VendaAtendente.Fun_Codigo = Funcionario.Fun_CPF WHERE VenAten_TpDoc=:pVenAten_TpDoc and VenAten_NDocPre=:pVenAten_NDocPre AND (Funcionario.Fun_situacao = 'A')
SELECT  contas_Receber_det.Ctr_dt_vencimento, contas_Receber_det.Ctr_valor_vencimento, contas_Receber_det.Mdo_codigo FROM contas_receber INNER JOIN contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo where contas_receber.Ctr_cod_documento =:pCtr_cod_documento and  contas_receber.Tpd_codigo =:pTpd_codigo
SELECT contas_receber.Ctr_codigo FROM contas_receber WHERE (contas_receber.Ctr_cod_documento =:PCtr_cod_documento) AND (contas_receber.Tpd_codigo =:PTpd_codigo)
SELECT contas_Receber_det.Ctr_dt_vencimento FROM contas_Receber_det WHERE (contas_Receber_det.Ctr_codigo =:Pctr_codigo)
SELECT contas_apagar.Ctp_codigo FROM contas_apagar  WHERE (contas_apagar.Ctp_cod_documento =:PCtp_cod_documento) AND  (contas_apagar.Tpd_codigo =:PTpd_codigo)
SELECT contas_apagar_det.Ctp_dt_vencimento FROM contas_apagar_det WHERE (contas_apagar_det.Ctp_codigo = :Pctp_codigo)
SELECT Clientes.Cli_cnpj_cpf as cpf, Clientes.Cli_Nome as nome ,Clientes.Cli_Endereco as endereco,Clientes.Cli_numero as num,Clientes.Cli_complemento as comp, Clientes.Cli_Bairro as bairro,Clientes.Cli_CEP as cep,Municipio.mun_nome as cidade, Municipio.mun_uf as uf  FROM Clientes INNER JOIN Municipio ON (Clientes.Cli_codcidade = Municipio.mun_codigo) WHERE (Clientes.Cli_Codigo = :Pcli_codigo)
SELECT Municipio.mun_nome AS cidade,Clientes.Cli_Nome as nome,Municipio.mun_uf AS uf,Clientes.Cli_Endereco_cob AS endereco,Clientes.Cli_numero_cob AS Num,Clientes.Cli_complemento_cob AS comp,Clientes.Cli_Bairro_cob AS bairro,Clientes.Cli_CEP_cob AS cep,Clientes.Cli_cnpj_cpf as cpf FROM Clientes INNER JOIN dbo.Municipio ON (dbo.Clientes.Cli_codcidade = dbo.Municipio.mun_codigo)WHERE (Clientes.Cli_Codigo = :Pcli_codigo)
SELECT Municipio.mun_nome AS cidade,Municipio.mun_uf AS uf,Clientes.Cli_Nome AS nome,Obras.Obr_Endereco AS endereco,Obras.Obr_numero AS num,Obras.Obr_complemento AS comp,Obras.Obr_Bairro AS bairro,Obras.Obr_CEP AS cep,Clientes.Cli_cnpj_cpf as cpf FROM Obras  INNER JOIN dbo.Clientes ON (dbo.Obras.Cli_codigo = dbo.Clientes.Cli_Codigo)  INNER JOIN dbo.Municipio ON (dbo.Obras.mun_codigo = dbo.Municipio.mun_codigo) WHERE (Obras.Cli_codigo = :Pcli_codigo)
SELECT Funcionario.Fun_Nome FROM VendaAtendente
SELECT forma_pagamento_fin.Fpf_descricao from
SELECT Clientes.Cli_cnpj_cpf as cpf, Clientes.Cli_Nome as nome ,Clientes.Cli_Endereco as endereco,Clientes.Cli_numero as num,Clientes.Cli_complemento as comp, Clientes.Cli_Bairro as bairro,Clientes.Cli_CEP as cep,Municipio.mun_nome as cidade, Municipio.mun_uf as uf, Paises.Paises_Descricao, Paises.Paises_UE   FROM Clientes INNER JOIN Municipio ON (Clientes.Cli_codcidade = Municipio.mun_codigo) INNER JOIN Paises ON Municipio.Paises_codigo = Paises.Paises_Codigo WHERE (Clientes.Cli_Codigo = :Pcli_codigo)
SELECT Municipio.mun_nome AS cidade,Clientes.Cli_Nome as nome,Municipio.mun_uf AS uf,Clientes.Cli_Endereco_cob AS endereco,Clientes.Cli_numero_cob AS Num,Clientes.Cli_complemento_cob AS comp,Clientes.Cli_Bairro_cob AS bairro,Clientes.Cli_CEP_cob AS cep,Clientes.Cli_cnpj_cpf as cpf, Paises.Paises_Descricao, Paises.Paises_UE  FROM Clientes INNER JOIN dbo.Municipio ON (dbo.Clientes.Cli_codcidade = dbo.Municipio.mun_codigo)INNER JOIN Paises ON Municipio.Paises_codigo = Paises.Paises_Codigo WHERE (Clientes.Cli_Codigo = :Pcli_codigo)
SELECT Municipio.mun_nome AS cidade,Municipio.mun_uf AS uf,Clientes.Cli_Nome AS nome,Obras.Obr_Endereco AS endereco,Obras.Obr_numero AS num,Obras.Obr_complemento AS comp,Obras.Obr_Bairro AS bairro,Obras.Obr_CEP AS cep,Clientes.Cli_cnpj_cpf as cpf, Paises.Paises_Descricao, Paises.Paises_UE FROM Obras  INNER JOIN dbo.Clientes ON (dbo.Obras.Cli_codigo = dbo.Clientes.Cli_Codigo)  INNER JOIN dbo.Municipio ON (dbo.Obras.mun_codigo = dbo.Municipio.mun_codigo) INNER JOIN Paises ON Municipio.Paises_codigo = Paises.Paises_Codigo WHERE (Obras.Cli_codigo = :Pcli_codigo)
SELECT cli_Nome,cli_codigo FROM clientes order by cli_nome
SELECT Fact_Codigo,Factura.Fact_Tipo,Factura.Fact_Impresso,Fact_Situacao,Fact_DtEmissao,Clientes.Cli_Nome,  case when dbo.Factura.Fact_importacao = 1 then 'EXPORTA
SELECT FactImp_TipoImportado FROM FacturaImport WHERE(Fact_Tipo = :Pfact_tipo) AND (Fact_Codigo = :Pfact_codigo)
SELECT Ctp_codigo as Codigo FROM contas_apagar
SELECT Ctr_codigo as codigo FROM contas_receber
select * from FacturaProduto where Fact_Tipo =:pFact_Tipo and Fact_Codigo =:PFact_Codigo
select max(elg_codigo) as maximo from estoque_log
SELECT Epr_estoque as Estoque FROM Estoque_produto WHERE (Epr_Codnosso = :PcodNosso) AND (Epr_Acabamento = :Pacb)
select max(Catven_codigo) as maximo from CategoriaVenda
select CatVen_Descricao from CategoriaVenda where CatVen_Descricao=:PCatVen_Descricao
SELECT * FROM CategoriaVenda WITH (NOLOCK)
select * from categoriaVenda
SELECT Epr_estoque as Estoque FROM Estoque_produto WHERE (Epr_Codnosso = :PcodNosso) AND (Epr_Acabamento = :Pacb) and EstTp_Codigo=:pEstTp_Codigo
SELECT Clientes.Cli_Nome FROM Clientes WHERE (dbo.Clientes.Cli_Codigo =:PcodCliente)
SELECT Pro_descricao,Pro_unidade FROM produtos
SELECT * FROM Transportadora
SELECT * FROM TipoExpedicao
SELECT * FROM forma_pagamento_fin
select Fact_Tipo from Factura where Fact_Tipo =:PFact_Tipo and Fact_Codigo =:pFact_Codigo
select * from Forma_Pag_parc_fin where Fpf_codigo=:codigo
SELECT '' as NomeObra, Clientes.Cli_Endereco as RUA,Clientes.Cli_numero as NUM,Clientes.Cli_complemento as COMP,Clientes.Cli_Bairro as BAIRRO,Municipio.mun_nome as CIDADE,Municipio.mun_uf as UF,Clientes.Cli_CEP as CEP FROM Clientes LEFT  OUTER JOIN dbo.Municipio ON (dbo.Clientes.Cli_codcidade = dbo.Municipio.mun_codigo) WHERE Clientes.Cli_Codigo =
SELECT '' as NomeObra, Clientes.Cli_Endereco_cob as RUA,Clientes.Cli_numero_cob as NUM,Clientes.Cli_complemento_cob as COMP,Clientes.Cli_Bairro_cob as BAIRRO,Municipio.mun_nome as CIDADE,Municipio.mun_uf as UF,Clientes.Cli_CEP_cob as CEP FROM Clientes LEFT  OUTER  JOIN dbo.Municipio ON (dbo.Clientes.Cli_codcidade_cob = dbo.Municipio.mun_codigo) WHERE Clientes.Cli_Codigo =
SELECT Municipio.mun_nome as CIDADE,Municipio.mun_uf as UF,  Obras.Obr_Descricao as NomeObra,Obras.Obr_Endereco as RUA,Obras.Obr_numero as NUM,Obras.Obr_complemento as COMP,Obras.Obr_Bairro as BAIRRO,Obras.Obr_CEP as CEP,Obras.Obr_codigo FROM Clientes  INNER JOIN dbo.Obras ON (dbo.Clientes.Cli_Codigo = dbo.Obras.Cli_codigo)  INNER  JOIN dbo.Municipio ON (dbo.Obras.mun_codigo = dbo.Municipio.mun_codigo)  WHERE Obras.Obr_codigo =
SELECT contas_apagar_det.Ctp_codigo,contas_apagar_det.Ctp_parcela,contas_apagar_det.Ctp_dt_vencimento,contas_apagar_det.Ctp_valor_vencimento,contas_apagar_det.Mdo_codigo,contas_apagar_det.ctp_codigo_det FROM contas_apagar INNER JOIN contas_apagar_det ON (contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo) WHERE (contas_apagar.Ctp_cod_documento =:PCtp_cod_documento) AND (contas_apagar.Tpd_codigo=:PTpd_codigo)order by  contas_apagar_det.Ctp_parcela
SELECT contas_receber_det.Ctr_codigo,contas_receber_det.Ctr_parcela,contas_receber_det.Ctr_dt_vencimento,contas_receber_det.Ctr_valor_vencimento,contas_receber_det.Mdo_codigo,contas_receber_det.ctr_codigo_det FROM contas_receber INNER JOIN contas_receber_det ON (contas_receber.Ctr_codigo = contas_receber_det.Ctr_codigo) WHERE (contas_receber.Ctr_cod_documento =:PCtr_cod_documento) AND (contas_receber.Tpd_codigo=:PTpd_codigo)order by  contas_receber_det.Ctr_parcela
SELECT * FROM contas_apagar_det WHERE (contas_apagar_det.Ctp_codigo = :PCtp_codigo)
SELECT * FROM contas_receber
SELECT * FROM contas_receber_det WHERE (contas_receber_det.Ctr_codigo = :PCtr_codigo)
select * from contas_receber_det where Ctr_codigo=:codigo order by Ctr_parcela
select * from contas_apagar_det where Ctp_codigo=:codigo order by Ctp_parcela
select SeqTab_Numero from SisSeqTabela where  SeqTab_Tabela=:pSeqTab_Tabela AND SeqTab_Campo=:pSeqTab_Campo and emp_codigo=:pemp_codigo
SELECT dbo.VendaAmbiente.VenAmb_Descricao, dbo.VendaProduto.VenPro_Seq AS SEQ, dbo.VendaProduto.VenPro_SeqItem AS seq_item, dbo.produtos.Pro_unidade AS unidade, dbo.VendaProduto.CodAcabamento AS acabamento,
SELECT Clientes.Cli_CODIGO, Clientes.Cli_Nome, Venda.Ven_codigo, Venda.Ven_Situacao, Venda.ParSV_serie, Venda.Ven_Orcamento, Venda.Ven_DataEmissao,
select * from VendaDataEntrega where Ven_CodigoPre =:PVen_CodigoPre
select * from VendaDataRetorno where Ven_CodigoPre =:PVen_CodigoPre
SELECT nota_entrada_det.Ned_cod_ordem FROM nota_entrada_det INNER JOIN
SELECT Nota_entrada.*, fornecedor.For_Nome AS For_Nome fROM Nota_entrada INNER JOIN
select * from nota_entrada_det where Nen_codigo=:codigo
SELECT * FROM Estoque_produto where Epr_Codnosso=:produto and Epr_acabamento=:acabamento
select Ned_item_ordem,Ned_cod_ordem,nen_codigo from nota_entrada_det where nen_codigo=:codigo and Ned_cod_ordem is not null
SELECT * FROM ordem_compra_det
select * from contas_apagar where Ctp_cod_externo=:CODIGO and tpd_codigo= 1003
select * from nota_entrada where nen_codigo=:CODIGO
SELECT for_codigo, for_nome from fornecedor where for_classificacao = 'F' AND for_nome is not null and  ((for_situacao='A') or (for_codigo=:Pfor_codigo)) order by for_nome
SELECT  top 1 Indice_preco.Ipr_descricao, Indice_preco.for_codigo, Indice_preco.Ipr_Indice, Indice_preco.Ipr_desconto, Indice_preco.Ipr_vl_com_inter,
SELECT ordem_compra.Ocp_dt_envio, ordem_compra.Ocp_status, ordem_compra_det.ocd_codindice, ordem_compra_det.Ocd_item, ordem_compra_det.Pro_codnosso,
SELECT SUM(nota_entrada_det.Ned_quantidade_recebida) AS quantidade
select * from Preco_Produto where pre_codnosso=:produto and pre_acabamento=:acabamento
SELECT dbo.unidades.uni_descricao, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_descricao,
SELECT ordem_compra.Ocp_dt_envio, ordem_compra.Ocp_status, ordem_compra_det.ocd_ped_av_fan, case when ordem_compra_det.Ocd_destino = null then '' else ordem_compra_det.Ocd_destino end as Ocd_destino,
SELECT * FROM produtos where pro_ativo='S' AND Pro_codnosso <>:pPro_codnosso and For_codigo =:forne and  GrupoProduto_codigo <> 1
SELECT * FROM GrupoProduto  where  GrupoProduto_Codigo < 1000 order by GrupoProduto_codigo
SELECT * FROM GrupoProduto order by GrupoProduto_codigo
select TpPeca_sigla from TipoPeca where TpPeca_sigla=:PTpPeca_sigla
SELECT TipoPeca.TpPeca_sigla,TipoPeca.TpPeca_Codigo, TipoPeca.TpPeca_Situacao, TipoPeca.GrupoProduto_codigo,
select count(Pro_tp_produto) as total from produtos where Pro_tp_peca=:PPro_tp_peca and Pro_tp_produto=:PPro_tp_produto
SELECT TipoPeca.TpPeca_Codigo, TipoPeca.TpPeca_Situacao, TipoPeca.GrupoProduto_codigo, GrupoProduto.GrupoProduto_Descricao
SELECT  CFOP_codigo + ' - ' + CFOP_Descricao AS DESCRICAO, CFOP_codigo FROM CFOP
select * from TabelaImposto order by
select TbImp_codigo from produtos where TbImp_codigo=:pTbImp_codigo and Pro_ativo ='S'
select fab_codigo from produtos where fab_codigo =:pfab_codigo
select marca_codigo from produtos where marca_codigo =:pmarca_codigo
select desig_codigo from produtos where desig_codigo =:pdesig_codigo
SELECT GrupoProduto.GrupoProduto_Descricao
select TpLinha_Codigo from Produtos where TpLinha_Codigo =:pTpLinha_Codigo
select * from produtos where Pro_codnosso =:pPro_codnosso
select * from ProdutosFornecedores where Pro_codnosso =:pPro_codnosso
select * from Preco_Produto where Pre_Codnosso =:pPre_Codnosso
select * from ProdutosLocEstoque where Pro_codnosso =:pPro_codnosso
SELECT Indice_preco.Ipr_descricao,Indice_preco.for_codigo, Indice_preco.Ipr_Indice,Indice_preco.Ipr_desconto,Indice_preco.Ipr_vl_com_inter,Indice_preco.Ipr_vl_com_exter ,Custo.Cus_Nome,
SELECT for_codigo, for_nome from fornecedor where for_classificacao = 'F' AND for_nome is not null and  for_situacao='A' order by for_nome
SELECT for_codigo, for_nome from fornecedor where for_classificacao = 'F' order by for_nome
SELECT DBO.ProdutoUtilidado('
select count(pro_codnosso) as quant from produtos where pro_codnosso =:Ppro_codnosso
select count(pro_codnosso) as quant from produtos where pro_codnosso <>:Ppro_codnosso and Pro_CodEspecial=:PPro_CodEspecial
select case when (select max(bdprodutos.dbo.produtos.pro_codreduzido)
select case when (select max(pro_codreduzido) as maximo from produtos where Pro_codnosso =:pPro_codnosso1) > 0 THEN
SELECT * FROM Estoque_produto where Epr_Codnosso=:produto and Epr_acabamento=:acabamento AND TAM_CODIGO=0 and emp_codigo=:pemp_codigo
SELECT * FROM Estoque_produto where Epr_Codnosso=:produto and Epr_acabamento=:acabamento AND TAM_CODIGO=0
select * from Indice_preco where for_codigo =:codigo and ipr_situacao='A'
select * from tamanho order by tam_descricao
select * from tamanho where GrupoProduto_codigo=:pGrupoProduto_codigo order by tam_descricao
SELECT * FROM tributacao where trib_tipo='ICMS'and SysPaises_codigo=1
SELECT * FROM tributacao where trib_tipo='IVA'and SysPaises_codigo=2
select Trib_Porcentagem from Tributacao where Trib_Codigo=:PTrib_Codigo
select * from Caracteristicas order by Caract_Descricao
select * from Caracteristicas where GrupoProduto_codigo=:pGrupoProduto_codigo order by Caract_Descricao
select pro_codnosso from produtos where pro_codnosso =:Ppro_codnosso
SELECT dbo.produtos.Pro_codnosso, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao,
SELECT Preco_Produto.Pre_VlNFor, dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento, dbo.Preco_Produto.Pre_Codindice,
SELECT produtos.Pro_codnosso, dbo.ProdutosRelacionados.ProdRel_Descricao, dbo.ProdutosRelacionadosDet.CodAcabamento, dbo.ProdutosRelacionadosDet.ProdRelDet_Quantidade,
SELECT fornecedor.For_Nome, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.ProdutosFornecedores.ProdFor_CodigoBarra,
SELECT Bdprodutos.dbo.produtos.Pro_codnosso, Bdprodutos.dbo.produtos.Pro_tp_produto, Bdprodutos.dbo.produtos.Pro_tp_peca, Bdprodutos.dbo.produtos.Pro_descricao,
SELECT Bdprodutos.dbo.Preco_Produto.Pre_VlNFor, Bdprodutos.dbo.Preco_Produto.Pre_Codnosso, Bdprodutos.dbo.Preco_Produto.Pre_Acabamento, Bdprodutos.dbo.Preco_Produto.Pre_Codindice,
SELECT bdprodutos.dbo.produtos.Pro_codnosso, dbo.ProdutosRelacionados.ProdRel_Descricao, dbo.ProdutosRelacionadosDet.CodAcabamento, dbo.ProdutosRelacionadosDet.ProdRelDet_Quantidade,
SELECT fornecedor.For_Nome, bdprodutos.dbo.ProdutosFornecedores.ProdFor_CodigoProduto, bdprodutos.dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, bdprodutos.dbo.ProdutosFornecedores.ProdFor_CodigoBarra,
SELECT Ven_Codigo FROM VendaProduto
select dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS pro_codbase, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto AS pro_descricao_for,
SELECT For_codigo,For_Nome FROM fornecedor where For_Sigla is not null and for_classificacao='F' order by For_Nome
SELECT * FROM produtos  WHERE Pro_codnosso =:codigo
select * from produtos where Pro_codnosso =(
SELECT ProdutosFornecedores.Pro_codnosso FROM fornecedor INNER JOIN
select max(Pro_CodReduzido) as maximo from produtos
SELECT ProdutosFornecedores.Pro_codnosso FROM bdprincipal.dbo.fornecedor INNER JOIN
SELECT Pro_codnosso from produtos where Pro_codnosso=:PPro_codnosso
SELECT Pro_codnosso from Bdprodutos.dbo.produtos where Pro_codnosso=:PPro_codnosso
select * from Bdprodutos.dbo.produtos where Bdprodutos.dbo.produtos.Pro_codnosso =(
SELECT Bdprodutos.dbo.ProdutosFornecedores.Pro_codnosso FROM fornecedor INNER JOIN
SELECT Bdprodutos.dbo.produtos.Pro_codnosso, Indice_preco.Ipr_descricao
SELECT produtos.Pro_codnosso, Indice_preco.Ipr_descricao, ProdutosFornecedores.ProdFor_Padrao
SELECT Bdprodutos.dbo.produtos.Pro_codnosso,  Bdprodutos.dbo.Preco_Produto.Pre_Acabamento,  Bdprodutos.dbo.Preco_Produto.Pre_Codindice
SELECT dbo.produtos.Pro_codnosso,  dbo.Preco_Produto.Pre_Acabamento,  dbo.Preco_Produto.Pre_Codindice
SELECT produtos.Pro_codnosso, Indice_preco.Ipr_descricao
SELECT Bdprodutos.dbo.produtos.Pro_codnosso, Indice_preco.Ipr_descricao, bdprodutos.dbo.ProdutosFornecedores.for_codigo
SELECT produtos.Pro_codnosso, Indice_preco.Ipr_descricao, ProdutosFornecedores.for_codigo
select * from Preco_Produto where Pre_Codnosso =:PPre_Codnosso and Pre_Acabamento =:PPre_Acabamento
select * from Preco_Produto where Pre_Codnosso =:PPre_Codnosso and Pre_Acabamento =:PPre_Acabamento and Pre_Codindice=:PPre_Codindice
select * from Estoque_produto where Epr_Codnosso=:pEpr_Codnosso and Epr_acabamento=:pEpr_acabamento
SELECT ProdutosFornecedores.For_codigo FROM produtos INNER JOIN
SELECT Bdprodutos.dbo.ProdutosFornecedores.For_codigo FROM Bdprodutos.dbo.produtos INNER JOIN
SELECT Indice_preco.Ipr_descricao, Indice_preco.Ipr_Indice, Indice_preco.Ipr_desconto, Indice_preco.Ipr_vl_com_inter, Indice_preco.Ipr_vl_com_exter, Custo.Cus_Nome, Custo.Cus_desconto1,
SELECT Indice_preco.Ipr_descricao, Indice_preco.for_codigo, Indice_preco.Ipr_Indice, Indice_preco.Ipr_desconto,
SELECT * FROM acabamento order by DescAcabamento
SELECT For_Sigla,For_Nome FROM fornecedor where For_Sigla is not null and for_classificacao='F' order by For_Nome
select Ipr_descricao,Ipr_Indice from Indice_preco where for_codigo=:Pfor_codigo order by Ipr_descricao
SELECT GrupoProduto.GrupoProduto_Descricao, TipoPeca.TpPeca_Codigo, TipoPeca.TpPeca_sigla, TipoPeca.GrupoProduto_codigo
select uni_descricao,uni_codigo from unidades order by uni_descricao
select TpOriPro_Descricao,TpOriPro_codigo from TipoOrigemProduto order by TpOriPro_codigo
select TpTrib_Descricao,TpTrib_codigo from TipoTributadaICMS order by TpTrib_codigo
SELECT CFOP_codigo +' - '+ TbImp_descricao AS descricao, TbImp_codigo, CFOP_codigo FROM TabelaImposto ORDER BY CFOP_codigo
select Ipr_codigosigla ,Ipr_descricao,Ipr_Indice from Indice_preco where for_codigo=:Pfor_codigo order by Ipr_descricao
select * from ImportacaoProduto where   ImpProd_CodigoFor =:pImpProd_CodigoFor and  ImpProd_SiglaFor =:pImpProd_SiglaFor
SELECT Pro_codnosso, Pro_CodReduzido  from produtos where Pro_codnosso=:PPro_codnosso
SELECT Pro_codnosso, Pro_CodReduzido from Bdprodutos.dbo.produtos where Pro_codnosso=:PPro_codnosso
SELECT contas_apagar.Ctp_codigo AS CodigoConta, contas_apagar_det.ctp_codigo_det AS CodigoContaParcela, contas_apagar.Ctp_nome AS nome,
select * from contas_apagar where Ctp_codigo =
select contas_apagar_det.*,(SELECT top 1 Contas_apagar_pag.Cpp_cod_pag  FROM Contas_apagar_pag where contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det and contas_apagar_det.Ctp_codigo= contas_apagar_pag.Ctp_codigo)as Cpp_cod_pag from contas_apagar_det where contas_apagar_det.Ctp_codigo=:codigo
SELECT * FROM nota_entrada
SELECT for_codigo, for_nome from fornecedor where for_classificacao = 'F' AND for_nome is not null and (for_situacao='A')  order by for_nome
SELECT tra_codigo, tra_nome from transportadora where (tra_situacao='A')  order by tra_nome
SELECT tra_codigo, tra_nome from transportadora where ((tra_situacao='A') or (tra_codigo=:Ptra_codigo)) order by tra_nome
SELECT nota_entrada_det.*, produtos.*
SELECT max(ned_item) as maximo from nota_entrada_det where nen_codigo=:codigo
select * from contas_apagar where Ctp_cod_externo=:CODIGO and tpd_codigo = 1003
select * from contas_apagar where Ctp_cod_externo=:CODIGO and tpd_codigo = 1024
select * from nota_entrada where nen_status = 'A' and Nen_numero_nota=:nota and Nen_fornecedor=:fornecedor
select * from nota_entrada where nen_status = 'A' and Nen_numero_nota=:nota and nen_codigo<>:codigo and Nen_fornecedor=:fornecedor
select * from cfop where cfop_codigo =:CFOP
select * from contas_apagar_det where ctp_codigo_det=:cod_det
select * from contas_apagar where Ctp_cod_externo=:CODIGO and tpd_codigo= 1024
SELECT contas_apagar.Ctp_codigo FROM contas_apagar INNER JOIN
SELECT TOP (1) Preco_Produto.Pre_VlNFor FROM produtos INNER JOIN
SELECT Filiais.Fil_fantasia AS Fil_fantasia, Transferencia_filiais.* FROM Transferencia_filiais INNER JOIN Filiais ON Transferencia_filiais.Fil_codigo = Filiais.Fil_codigo
select * from Transferencia_filiais_produtos where tfi_codigo =:codigo
select * from filiais  WHERE fil_situacao ='A' order by fil_fantasia
select * from filiais  WHERE ((fil_situacao ='A') OR (fil_codigo=:Pfil_codigo)) order by fil_fantasia
select max(tfi_codigo) as maximo from Transferencia_filiais
select max(tfp_codigo) as maximo from Transferencia_filiais_produtos
SELECT    ProdRel_codigo, ProdRel_Descricao,CASE WHEN ProdRel_Situacao = 'True' THEN 'ATIVO' ELSE 'DESATIVADO' END as ProdRel_Situacao
SELECT ProdRel_codigo, ProdRel_Descricao, ProdRel_Situacao,
select ProdRel_codigo from ProdutosRelacionadosCadProdutos where ProdRel_codigo =:pProdRel_codigo
SELECT * FROM Estoque_produto where Epr_Codnosso=:produto and Epr_acabamento=:acabamento AND TAM_CODIGO=0 and emp_codigo=:emp_codigo
SELECT CASE WHEN  (SELECT        SUM(VenPro_Quantidade) AS Expr1  FROM            dbo.Venda INNER JOIN  dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre  WHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.PromocaoProdutos.Prom_Codigo = prom_codigo) AND (dbo.PromocaoProdutos.Pro_codnosso = Pro_codnosso) AND (dbo.PromocaoProdutos.CodAcabamento = CodAcabamento)) > 0 THEN (dbo.PromocaoEstoque.PromEst_Quantidade) - (SELECT  SUM(VenPro_Quantidade) AS Expr1  FROM  dbo.Venda INNER JOIN  dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre  WHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.PromocaoProdutos.Prom_Codigo = prom_codigo) AND (dbo.PromocaoProdutos.Pro_codnosso = Pro_codnosso) AND (dbo.PromocaoProdutos.CodAcabamento = CodAcabamento))   ELSE (PromocaoEstoque.PromEst_Quantidade) END AS QuantRest, dbo.PromocaoProdutos.PromProd_Vlpromocional, Promocao.Prom_Codigo FROM dbo.Promocao INNER JOIN dbo.PromocaoProdutos ON dbo.Promocao.Prom_Codigo = dbo.PromocaoProdutos.Prom_Codigo INNER JOIN dbo.PromocaoEstoque ON dbo.PromocaoProdutos.Prom_Codigo = dbo.PromocaoEstoque.Prom_Codigo AND dbo.PromocaoProdutos.Pro_codnosso = dbo.PromocaoEstoque.Pro_codnosso AND  dbo.PromocaoProdutos.CodAcabamento = dbo.PromocaoEstoque.CodAcabamento WHERE  dbo.Promocao.Prom_DataInicial <=:pProm_DataInicial  AND dbo.Promocao.Prom_DataFinal >=:pProm_DataFinal AND (dbo.PromocaoProdutos.Pro_codnosso =:pPro_codnosso) AND (dbo.PromocaoProdutos.CodAcabamento =:pCodAcabamento)
SELECT  dbo.PromocaoProdutos.PromProd_Vlpromocional, Promocao.Prom_Codigo FROM dbo.Promocao INNER JOIN dbo.PromocaoProdutos ON dbo.Promocao.Prom_Codigo = dbo.PromocaoProdutos.Prom_Codigo INNER JOIN dbo.PromocaoEstoque ON dbo.PromocaoProdutos.Prom_Codigo = dbo.PromocaoEstoque.Prom_Codigo AND dbo.PromocaoProdutos.Pro_codnosso = dbo.PromocaoEstoque.Pro_codnosso AND  dbo.PromocaoProdutos.CodAcabamento = dbo.PromocaoEstoque.CodAcabamento WHERE  dbo.Promocao.Prom_DataInicial <=:pProm_DataInicial  AND dbo.Promocao.Prom_DataFinal >=:pProm_DataFinal AND (dbo.PromocaoProdutos.Pro_codnosso =:pPro_codnosso)
SELECT produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto, ProdutosFornecedores.For_codigo, produtos.GrupoProduto_codigo,
SELECT produtos.Pro_ConsultarValor, produtos.Pro_AliqICMS, produtos.Trib_Codigo, produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto, produtosfornecedores.For_codigo,
SELECT Pre_Codnosso, Pre_Acabamento, Pre_Custo fROM Preco_Produto
SELECT Pasta.*, Clientes.Cli_Nome, Obras.Obr_Descricao
select pasta_codigo from venda where pasta_codigo=:ppasta_codigo and Ven_Situacao='A'
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade) - (SELECT CASE WHEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) > 0 THEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) ELSE 0 END AS Expr1 FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE     (dbo.Devolucao.Dev_migrado IS NULL) AND (dbo.Devolucao.Dev_situacao = 1) AND DEVOLUCAO.ven_codigopre = VENDA.ven_codigopre and vendaproduto.pro_codnosso = devolucaoproduto.pro_codnosso and vendaproduto.CodAcabamento = devolucaoproduto.CodAcabamento and vendaproduto.CodAmbiente = devolucaoproduto.CodAmbiente and vendaproduto.VenPro_Seq = devolucaoproduto.devPro_Seq and vendaproduto.VenPro_SeqItem = devolucaoproduto.devPro_SeqItem) AS quantidade, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAmbiente, dbo.VendaProduto.CodAcabamento, dbo.VendaProduto.VenPro_Seq, dbo.VendaProduto.VenPro_SeqItem, dbo.VendaProduto.VenPro_Quantidade, dbo.VendaProduto.VenPro_QuantidadeOriginal, dbo.VendaProduto.VenPro_VlUnitario, dbo.VendaProduto.VenPro_VlItem, dbo.VendaProduto.VenPro_Vldesconto, dbo.VendaProduto.VenPro_VlDescontoProc, dbo.VendaProduto.VenPro_Vlimposto, dbo.VendaProduto.VenPro_ProdutoPai, dbo.VendaProduto.VenPro_ProdutoSubPai, dbo.VendaProduto.VenPro_ItemPai, dbo.VendaProduto.VenPro_ItemSubPai, dbo.VendaProduto.Ven_ValorCredito, dbo.VendaProduto.pld_codindice, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao, dbo.produtos.Pro_foto, dbo.produtos.Pro_unidade, dbo.produtos.Pro_CodEspecial, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.GrupoProduto.GrupoProduto_ordem, dbo.VendaAmbiente.VenAmb_Descricao , dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for FROM  dbo.Venda INNER JOIN dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN dbo.Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo INNER JOIN dbo.VendaAmbiente ON dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso WHERE  (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (dbo.VendaAmbiente.VenAmb_TpDoc = 'PRO') AND (dbo.Pasta.Pasta_codigo =:ppasta_codigo)  AND (dbo.ProdutosFornecedores.ProdFor_Padrao = 1) GROUP BY dbo.VendaAmbiente.VenAmb_Descricao, dbo.VendaProduto.VenPro_Seq, dbo.VendaProduto.VenPro_SeqItem,  dbo.GrupoProduto.GrupoProduto_ordem, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAmbiente, dbo.VendaProduto.CodAcabamento, dbo.VendaProduto.VenPro_Quantidade, dbo.VendaProduto.VenPro_QuantidadeOriginal, dbo.VendaProduto.VenPro_VlUnitario, dbo.VendaProduto.VenPro_VlItem, dbo.VendaProduto.VenPro_Vldesconto, dbo.VendaProduto.VenPro_VlDescontoProc, dbo.VendaProduto.VenPro_Vlimposto, dbo.VendaProduto.VenPro_ProdutoPai, dbo.VendaProduto.VenPro_ProdutoSubPai, dbo.VendaProduto.VenPro_ItemPai, dbo.VendaProduto.VenPro_ItemSubPai, dbo.VendaProduto.Ven_ValorCredito, dbo.VendaProduto.pld_codindice, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.produtos.Pro_Codbase, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao, dbo.produtos.Pro_descricao_for, dbo.produtos.Pro_foto, dbo.produtos.Pro_unidade, dbo.produtos.Pro_CodEspecial, dbo.GrupoProduto.GrupoProduto_Descricao,VENDA.ven_codigopre , dbo.ProdutosFornecedores.ProdFor_CodigoProduto , dbo.ProdutosFornecedores.ProdFor_DescricaoProduto order by dbo.VendaAmbiente.VenAmb_Descricao, dbo.VendaProduto.VenPro_Seq, dbo.VendaProduto.VenPro_SeqItem,  dbo.GrupoProduto.GrupoProduto_ordem
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade) -
SELECT SUM(Ven_SubTotalProd) AS Ven_SubTotalProd,
SELECT SUM(dbo.Devolucao.Dev_SubTotal) AS Dev_SubTotal, SUM(dbo.Devolucao.Dev_Total) AS Dev_Total, SUM(dbo.Devolucao.Dev_SubTotalProd) AS Dev_SubTotalProd,
SELECT SUM(dbo.VendaServico.VenSer_vlunitario) AS VenSer_vlunitario,
SELECT produtos.Pro_codnosso, Preco_Produto.Pre_Acabamento, Preco_Produto.Pre_Venda, produtos.Pro_unidade, dbo.fornecedor.For_Nome, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, Estoque_produto.EstTp_Codigo, Estoque_produto.Epr_estoque,Preco_Produto.Pre_CodBarra FROM produtos INNER JOIN dbo.ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN dbo.Preco_Produto ON dbo.produtos.Pro_codnosso = dbo.Preco_Produto.Pre_Codnosso INNER JOIN dbo.fornecedor ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo INNER JOIN dbo.Estoque_produto ON dbo.Preco_Produto.Pre_Codnosso = dbo.Estoque_produto.Epr_Codnosso AND dbo.Preco_Produto.Pre_Acabamento = dbo.Estoque_produto.Epr_Acabamento WHERE (dbo.Estoque_produto.EstTp_Codigo = 1) and produtos.Pro_ativo ='S' and Preco_Produto.Pre_Ativo='S'
SELECT empresa.*, Municipio.mun_nome, Municipio.mun_uf
SELECT Clientes.Cli_Nome, Obras.Obr_Endereco, Obras.Obr_numero, Obras.Obr_complemento, Obras.Obr_Bairro, Obras.Obr_CEP,
SELECT produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto, ProdutosFornecedores.ProdFor_DescricaoProduto, fornecedor.For_Nome,
SELECT TOP (1) Clientes.Cli_Codigo, Clientes.Cli_Nome, Obras.Obr_Codigo
select * from EtiquetaPronta where EtqPront_codigo=16
SELECT SUBSTRING(dbo.empresa.EMPRESA, 1, 35) AS EMPRESA, SUBSTRING(dbo.empresa.ENDER, 1, 25) + ', ' + dbo.empresa.numero AS ENDERECO,
select * from EtiquetaPronta where EtqPront_codigo=17
SELECT SUBSTRING(dbo.Clientes.Cli_Nome, 1, 35) AS cli_nome, SUBSTRING(dbo.Entrega.Ent_endereco, 1, 25) + ', ' + dbo.Entrega.Ent_numero AS endereco,
select * from EtiquetaPronta where EtqPront_codigo=18
SELECT emp_imagemzebrasedex FROM EMPRESA
select * from EtiquetaPronta where EtqPront_codigo=19
SELECT emp_imagemzebrapac FROM EMPRESA
SELECT Entrega.Ent_Codigo, Entrega.Ent_dataEntrega, Clientes.Cli_Nome, Entrega.Ent_CodigoIndividual
select Ent_Codigo from Entrega where Ent_dataEntrega =:pEnt_dataEntrega order by Ent_Codigo desc
SELECT dbo.Clientes.Cli_Nome, dbo.Funcionario.Fun_Nome, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.OrdemServico.OrdServ_Codigo, dbo.OrdemServico.OrdServ_descricao, dbo.OrdemServico.OrdServ_dataemissao,
select * from clientes where cli_situacao = 'A' and cli_nome like
SELECT AutorizaInclusao.Ain_codigo, Clientes.Cli_Nome, AutorizaInclusao.Ain_dt_emissao,AutorizaInclusao.Ain_dt_fechamento
select * from AutorizoInclusao_luminaria where ain_codigo=:codigo
select * from AutorizoInclusao_materiais where ain_codigo=:codigo
select * from AutorizaInclusao_servicos where ain_codigo=:codigo
select max(Ais_item) as maximo from AutorizaInclusao_Servicos where ain_codigo=:codigo
select max(ail_item) as maximo from AutorizoInclusao_Luminaria where ain_codigo=:codigo
select max(aim_item) as maximo from AutorizoInclusao_materiais where ain_codigo=:codigo
select * from pedido where ped_codigo=:codigo and ped_status='A'
select * from VendaAtendente where VenAten_NDocPre=:PVenAten_NDocPre and VenAten_TpDoc='PRO' and emp_codigo=1
select * from VendaIndicacao where VenInd_TpDoc='PRO' and emp_codigo=1 and VenInd_NDocPre=:PVenInd_NDocPre
SELECT * FROM VendaIndicacaoGrupProd WHERE VenInd_TpDoc ='PRO' AND Emp_Codigo =1 AND Ind_Codigo =:Ind_Codigo AND VenInd_NDocPre =:PVenInd_NDocPre
SELECT pedido.ped_codigo FROM pedido LEFT OUTER JOIN
SELECT orcamento.orc_codigo FROM orcamento LEFT OUTER JOIN
select * from servicos where sev_cod=:codigo
select max(ain_codigo) as maximo from AutorizaInclusao
select venda.*, obras.obr_descricao from venda, obras where Ven_CodVinculo=
select QCargas_Codigo from QuadroCargas where QCargas_nome=
select QCargas_codigo from QuadroCargas where QCargas_Codigo <>
select max(QCargas_codigo) as maximo from QuadroCargas
SELECT produtos.Pro_Consumo, produtos.Pro_Tensao, SUM(VendaProduto.VenPro_Quantidade * produtos.Pro_Consumo) AS total,
SELECT Par_QcargasHorasResidencial,Par_QcargasDiasResidencial,
select ped_codigo, ven_codigopre,ven_tipo  from  QuadroCargasProjeto
SELECT VendaAmbiente.VenAmb_TpDoc, produtos.Pro_codnosso, produtos.Pro_Codbase, VendaAmbiente.VenAmb_Descricao,
SELECT Obras.Obr_tipoObra FROM venda
select * from QuadroCargas order by
select ven_codigopre from venda where (ven_codigopre=:codPedido) and
select ped_codigo, ven_tipo from  QuadroCargasProjeto
select Ven_CodVinculo from venda  where (ven_codigopre=:codPedido) and
select * from Saida_complementacao where scp_codigo_pre=:codigo
select * from ent_devolucao where edv_codigo_pre=:codigo
SELECT Saida_complementacao.scp_codigo, Saida_comp_luminaria_det.sld_seq, Saida_comp_luminaria_det.sld_seq_item, Saida_comp_luminaria_det.Pro_codnosso FROM Saida_complementacao INNER JOIN Saida_comp_luminaria_det ON Saida_complementacao.scp_codigo_pre = Saida_comp_luminaria_det.scp_codigo_pre WHERE Saida_comp_luminaria_det.Pro_codnosso in
SELECT Saida_comp_materiais_det.Pro_codnosso FROM Saida_comp_materiais_det INNER JOIN Saida_complementacao ON Saida_comp_materiais_det.scp_codigo_pre = Saida_complementacao.scp_codigo_pre WHERE Saida_complementacao.scp_codigo IN (
SELECT Pro_codnosso FROM Saida_comp_materiais_det WHERE Pro_codnosso in
SELECT pedido.ped_codigo, pedido.ped_dt_fechamento, Saida_complementacao.scp_cliente, Ambiente.DescAmbiente, Funcionario.Fun_Nome, Indicacoes.Ind_Nome, Saida_comp_luminaria_det.sld_seq, Saida_comp_luminaria_det.sld_seq_item, Saida_comp_luminaria_det.Pro_codnosso, Saida_comp_luminaria_det.sld_produto, Saida_comp_luminaria_det.sld_quantidade, Saida_comp_luminaria_det.sld_vl_unitario, Saida_comp_luminaria_det.sld_vl_item, Saida_comp_luminaria_det.sld_acabamento , saida_complementacao.scp_status FROM pedido INNER JOIN Saida_complementacao ON pedido.ped_codigo = Saida_complementacao.ped_codigo INNER JOIN Saida_comp_luminaria_det ON Saida_complementacao.Scp_codigo_pre = Saida_comp_luminaria_det.scp_codigo_pre INNER JOIN Ambiente ON Saida_comp_luminaria_det.sld_ambiente = Ambiente.CodAmbiente INNER JOIN Funcionario ON pedido.ped_arquiteta = Funcionario.Fun_CPF INNER JOIN Indicacoes ON pedido.ped_indicacao = Indicacoes.Ind_codigo
SELECT pedido.ped_codigo, pedido.ped_dt_fechamento, Saida_complementacao.scp_cliente, Ambiente.DescAmbiente, Funcionario.Fun_Nome, Indicacoes.Ind_Nome, Saida_comp_materiais_det.sma_seq, Saida_comp_materiais_det.sma_seq_item, Saida_comp_materiais_det.Pro_codnosso, Saida_comp_materiais_det.sma_produto, Saida_comp_materiais_det.sma_acabamento, Saida_comp_materiais_det.sma_quantidade, Saida_comp_materiais_det.sma_vl_unitario, Saida_comp_materiais_det.sma_vl_item , saida_complementacao.scp_status FROM pedido INNER JOIN Saida_complementacao ON pedido.ped_codigo = Saida_complementacao.ped_codigo INNER JOIN Funcionario ON pedido.ped_arquiteta = Funcionario.Fun_CPF INNER JOIN  Indicacoes ON pedido.ped_indicacao = Indicacoes.Ind_codigo INNER JOIN Saida_comp_materiais_det ON Saida_complementacao.Scp_codigo_pre = Saida_comp_materiais_det.scp_codigo_pre INNER JOIN Ambiente ON Saida_comp_materiais_det.sma_ambiente = Ambiente.CodAmbiente
SELECT pedido.ped_codigo, pedido.ped_dt_fechamento, Saida_complementacao.scp_cliente, Funcionario.Fun_Nome, Indicacoes.Ind_Nome, Saida_comp_servico_det.sse_descricao, Saida_comp_servico_det.sse_quantidade, Saida_comp_servico_det.sse_vl_unitario, Saida_comp_servico_det.sse_vl_item , saida_complementacao.scp_status FROM pedido INNER JOIN Saida_complementacao ON pedido.ped_codigo = Saida_complementacao.ped_codigo INNER JOIN Funcionario ON pedido.ped_arquiteta = Funcionario.Fun_CPF INNER JOIN Indicacoes ON pedido.ped_indicacao = Indicacoes.Ind_codigo INNER JOIN Saida_comp_servico_det ON Saida_complementacao.Scp_codigo_pre = Saida_comp_servico_det.Scp_codigo_pre
SELECT Saida_complementacao.scp_codigo FROM Saida_complementacao INNER JOIN Saida_comp_luminaria_det ON Saida_complementacao.scp_codigo_pre = Saida_comp_luminaria_det.scp_codigo_pre WHERE Saida_comp_luminaria_det.Pro_codnosso in
SELECT Saida_complementacao.scp_codigo FROM Saida_complementacao INNER JOIN Saida_comp_materiais_det ON Saida_complementacao.scp_codigo_pre = saida_comp_materiais_det.scp_codigo_pre WHERE saida_comp_materiais_det.Pro_codnosso in
SELECT Saida_complementacao.scp_codigo FROM saida_complementacao INNER JOIN saida_comp_servico_det ON saida_complementacao.scp_codigo_pre = saida_comp_servico_det.scp_codigo_pre WHERE saida_comp_servico_det.Sev_cod =
SELECT pedido.ped_codigo_pre, pedido.ped_codigo, pedido.ped_dt_fechamento, Saida_complementacao.scp_cliente, Ambiente.DescAmbiente, Saida_comp_luminaria_det.sld_seq, Saida_comp_luminaria_det.sld_seq_item, Saida_comp_luminaria_det.Pro_codnosso, Saida_comp_luminaria_det.sld_produto, Saida_comp_luminaria_det.sld_quantidade, Saida_comp_luminaria_det.sld_vl_unitario, Saida_comp_luminaria_det.sld_vl_item, Saida_comp_luminaria_det.sld_acabamento , saida_complementacao.scp_status FROM pedido INNER JOIN Saida_complementacao ON pedido.ped_codigo = Saida_complementacao.ped_codigo INNER JOIN Saida_comp_luminaria_det ON Saida_complementacao.Scp_codigo_pre = Saida_comp_luminaria_det.scp_codigo_pre INNER JOIN Ambiente ON Saida_comp_luminaria_det.sld_ambiente = Ambiente.CodAmbiente
SELECT pedido.ped_codigo_pre,pedido.ped_codigo, pedido.ped_dt_fechamento, Saida_complementacao.scp_cliente, Ambiente.DescAmbiente,  Saida_comp_materiais_det.sma_seq, Saida_comp_materiais_det.sma_seq_item, Saida_comp_materiais_det.Pro_codnosso, Saida_comp_materiais_det.sma_produto, Saida_comp_materiais_det.sma_acabamento, Saida_comp_materiais_det.sma_quantidade, Saida_comp_materiais_det.sma_vl_unitario, Saida_comp_materiais_det.sma_vl_item , saida_complementacao.scp_status FROM pedido INNER JOIN Saida_complementacao ON pedido.ped_codigo = Saida_complementacao.ped_codigo INNER JOIN Saida_comp_materiais_det ON Saida_complementacao.Scp_codigo_pre = Saida_comp_materiais_det.scp_codigo_pre INNER JOIN Ambiente ON Saida_comp_materiais_det.sma_ambiente = Ambiente.CodAmbiente
SELECT pedido.ped_codigo_pre,pedido.ped_codigo, pedido.ped_dt_fechamento, Saida_complementacao.scp_cliente,  Saida_comp_servico_det.sse_descricao, Saida_comp_servico_det.sse_quantidade, Saida_comp_servico_det.sse_vl_unitario, Saida_comp_servico_det.sse_vl_item , saida_complementacao.scp_status FROM pedido INNER JOIN Saida_complementacao ON pedido.ped_codigo = Saida_complementacao.ped_codigo INNER JOIN Saida_comp_servico_det ON Saida_complementacao.Scp_codigo_pre = Saida_comp_servico_det.Scp_codigo_pre
select * from pedido where ped_codigo =:codigo
select * from pedido where ped_codigo =:codigo and ped_status <> 'C'
select sum(pld_vl_item) as total from pedido_luminaria_det where ped_codigo_pre =:codigo
select sum(pma_vl_item) as total from pedido_materiais_det where ped_codigo_pre =:codigo
select sum(pse_vl_item) as total from pedido_servico_det where ped_codigo_pre =:codigo
SELECT SUM(pedido_servico_det.pse_vl_item) AS total FROM pedido_servico_det INNER JOIN
select * from pedido where ped_codigo_pre =:codigo
SELECT * from Controle_entrega where cen_tipo='P' AND cen_pedido_avulso=:codigo
SELECT ped_codigo_pre, Pro_codnosso, pld_produto, pld_acabamento, Sum(pld_quantidade) AS pld_quantidade
SELECT ped_codigo_pre, Pro_codnosso, pma_produto, pma_acabamento, Sum(pma_quantidade) AS pma_quantidade
SELECT controle_entrega_data.cen_codigo_pre, controle_entrega_data.Pro_codnosso, controle_entrega_data.cep_acabamento
SELECT Saida_complementacao.*, Clientes.Cli_Nome AS Cli_Nome
select * from Saida_comp_luminaria_det where scp_codigo_pre =:codigo
select * from Saida_comp_materiais_det where scp_codigo_pre =:codigo
SELECT * from acerto_eletrecistas where ped_ped_codigo =:codigo
SELECT SUM(dbo.pedido_servico_det.pse_quantidade) AS pse_quantidade, MIN(dbo.pedido_servico_det.pse_vl_unitario) AS pse_vl_unitario,
SELECT * from acerto_eletrecistas_servicos where ael_codigo=:codigo and sev_cod=:servico
select * from acerto_eletrecistas where ael_codigo=:codigo
SELECT sum(acerto_eletrecistas_det.aed_qtde) as quant FROM acerto_eletrecistas_servicos INNER JOIN
SELECT sum(acerto_eletrecistas_det.aed_qtde) as quant FROM acerto_eletrecistas_det
SELECT * FROM acerto_eletrecistas_det where ael_codigo=:codigo and aes_codigo=:servico and aed_operacao='D
select max(aed_qtde) as maximo from acerto_eletrecistas_det where aes_codigo=:Xaes_codigo and ael_codigo=:Xael_codigo
SELECT acerto_eletrecistas_servicos.pse_quantidade, acerto_eletrecistas_servicos.sev_cod, acerto_eletrecistas_servicos.aes_codigo,
select sum(aed_qtde) as debito from acerto_eletrecistas_det where ael_codigo=:codigo and aes_codigo=:cod_aes and aed_operacao = 'D
select sum(aed_qtde) as credito from acerto_eletrecistas_det where ael_codigo=:codigo and aes_codigo=:cod_aes and aed_operacao = 'CR
select * from acerto_eletrecistas_servicos where ael_codigo=:codigo and aes_codigo=:cod_aes
select * from acerto_eletrecistas_det
select sum(pld_vl_item) as total, sum(Pld_quantidade*Pld_vl_unitario ) as totalsemdesconto from pedido_luminaria_det where ped_codigo_pre =:codigo
select sum(pma_vl_item) as total, sum(PMa_quantidade*Pma_vl_unitario ) as totalsemdesconto from pedido_materiais_det where ped_codigo_pre =:codigo
select (SELECT ProVelho.Pro_tp_produto FROM produtos as ProVelho where ProVelho.Pro_codnosso=:PPro_codnosso1) as Grupo1
select * from pedido where ped_codigo =:codigo and ped_status = 'A'
select * from pedido_luminaria_det where ped_codigo_pre =:codigo
select * from pedido_materiais_det where ped_codigo_pre =:codigo
select * from pedido_servico_det where ped_codigo_pre =:codigo
SELECT Saida_comp_servico_det.*, Servicos.Serv_tipo AS Serv_tipo
select max(scp_codigo) as maximo from Saida_complementacao
select * from pedido_luminaria_det
select * from Saida_comp_luminaria_det
select * from pedido_servico_det
select * from Saida_comp_servico_det
select * from pedido_materiais_det
select * from Saida_comp_materiais_det
select * from pedido_luminaria_det where ped_codigo_pre =:codigo and pld_seq=:sequencia and pld_seq_item=:item and Pro_codnosso=:produto and pld_acabamento=:acabamento and pld_ambiente=:ambiente and pld_saida_comp<>:saida
select * from pedido_MATERIAIS_det where ped_codigo_pre =:codigo and pma_seq=:sequencia and pma_seq_item=:item and Pro_codnosso=:produto and pma_acabamento=:acabamento and pma_ambiente=:ambiente and pma_saida_comp<>:saida
SELECT * FROM VendaAmbiente
SELECT pedido.ped_dt_fechamento, pedido.Par_ComissaoVincParc, Pedido.ped_forma_pag, VendaAtendente.Fun_Codigo,
SELECT (SELECT MAX(pld_seq) AS Expr1 FROM pedido_luminaria_det WHERE (ped_codigo_pre = dbo.pedido.ped_codigo_pre) and pld_ambiente=:pambiente1) AS maxseql, (SELECT MAX(pld_seq_item) AS Expr1 FROM dbo.pedido_luminaria_det AS pedido_luminaria_det_1 WHERE (ped_codigo_pre = dbo.pedido.ped_codigo_pre) and pld_ambiente=:pambiente2) AS maxseqIteml, (SELECT MAX(pma_seq) AS Expr1  FROM pedido_materiais_det WHERE (ped_codigo_pre = dbo.pedido.ped_codigo_pre) and pma_ambiente=:pambiente3) AS maxseqm, (SELECT MAX(pma_seq_item) AS Expr1  FROM pedido_materiais_det AS pedido_materiais_det_1 WHERE (ped_codigo_pre = dbo.pedido.ped_codigo_pre) and pma_ambiente=:pambiente4) AS maxseqItemm FROM pedido WHERE (ped_codigo =:pped_codigo)
SELECT (SELECT MAX(pld_seq) AS Expr1 FROM pedido_luminaria_det WHERE (ped_codigo_pre = dbo.pedido.ped_codigo_pre)) AS maxseql, (SELECT MAX(pld_seq_item) AS Expr1 FROM dbo.pedido_luminaria_det AS pedido_luminaria_det_1 WHERE (ped_codigo_pre = dbo.pedido.ped_codigo_pre) ) AS maxseqIteml, (SELECT MAX(pma_seq) AS Expr1  FROM pedido_materiais_det WHERE (ped_codigo_pre = dbo.pedido.ped_codigo_pre)) AS maxseqm, (SELECT MAX(pma_seq_item) AS Expr1  FROM pedido_materiais_det AS pedido_materiais_det_1 WHERE (ped_codigo_pre = dbo.pedido.ped_codigo_pre)) AS maxseqItemm FROM pedido WHERE (ped_codigo =:pped_codigo)
SELECT 0 as selecionar , * FROM Ambiente where amb_situacao='A'  AND DescAmbiente <> '' AND DescAmbiente IS NOT NULL
select Par_cidade from Paramentros
SELECT * FROM promocao where Prom_Codigo < 999999
select  prom_codigo from VendaProduto  where  prom_codigo =:pprom_codigo
SELECT produtos.Pro_AliqICMS, produtos.Trib_Codigo, produtos.Pro_codnosso, produtos.For_codigo, produtos.Pro_tp_produto, produtos.Pro_tp_peca, produtos.Pro_descricao,
select uni_codigo  from unidades order by uni_codigo
SELECT IndicacaoGrupProd.GrupoProduto_codigo, IndicacaoGrupProd.IndGruProd_Porc, GrupoProduto.GrupoProduto_Descricao
SELECT VendaAmbiente.CodAmbiente FROM Venda INNER JOIN
select top 1 VenAmb_Descricao fROM Venda INNER JOIN
select * from VendaAtendente where VenAten_TpDoc ='PST' and emp_codigo=1 and VenAten_NDocPre=:PVenAten_NDocPre
select * from VendaIndicacao where VenInd_TpDoc ='PST' and emp_codigo=1 and VenInd_NDocPre=:pVenInd_NDocPre
SELECT * FROM VendaIndicacaoGrupProd WHERE VenInd_TpDoc = 'PST' AND Emp_Codigo =1
select case when SisPerEsp_permissao = 'true' then 'true' else 'false' end as permissao from SisPermissaoEspecial where SisOpEsp_Codigo=32
SELECT ProdutosRelacionadosDet.Pro_codnosso, ProdutosRelacionadosDet.CodAcabamento, ProdutosRelacionadosDet.ProdRelDet_Quantidade, dbo.ProdutosRelacionadosDet.ProdRelDet_padrao, ProdutosRelacionadosCadProdutos.ProdRelCadProd_situacao,ProdutosRelacionadosCadProdutos.ProdRelCadProd_padrao,produtos.GrupoProduto_codigo,ProdutosFornecedores.ProdFor_CodigoProduto, ProdutosFornecedores.ProdFor_DescricaoProduto,fornecedor.For_Nome,produtos.Pro_tp_peca,produtos.Pro_descricao,produtos.Pro_unidade,produtos.Pro_CodReduzido, produtos.Pro_CodEspecial,Preco_Produto.Pre_Venda,GrupoProduto.GrupoProduto_Descricao,Preco_Produto.Pre_Codindice FROM ProdutosRelacionadosCadProdutos INNER JOIN ProdutosRelacionados ON ProdutosRelacionadosCadProdutos.ProdRel_codigo = ProdutosRelacionados.ProdRel_codigo AND ProdutosRelacionadosCadProdutos.Emp_codigo = ProdutosRelacionados.Emp_codigo INNER JOIN ProdutosRelacionadosDet ON ProdutosRelacionados.ProdRel_codigo = ProdutosRelacionadosDet.ProdRel_codigo AND ProdutosRelacionados.Emp_codigo = ProdutosRelacionadosDet.Emp_codigo INNER JOIN produtos ON ProdutosRelacionadosDet.Pro_codnosso = produtos.Pro_codnosso AND ProdutosRelacionadosDet.Emp_codigo = dbo.produtos.Emp_codigo INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor ON ProdutosFornecedores.For_codigo = fornecedor.For_codigo INNER JOIN Preco_Produto ON ProdutosRelacionadosDet.Pro_codnosso = Preco_Produto.Pre_Codnosso AND ProdutosRelacionadosDet.CodAcabamento = Preco_Produto.Pre_Acabamento INNER JOIN GrupoProduto ON produtos.GrupoProduto_codigo = GrupoProduto.GrupoProduto_Codigo WHERE  (ProdutosRelacionadosDet.ProdRelDet_padrao = 1) AND (ProdutosRelacionadosCadProdutos.ProdRelCadProd_situacao = 1) AND (ProdutosRelacionadosCadProdutos.ProdRelCadProd_padrao = 1) and ProdutosRelacionadosCadProdutos.Pro_codnosso =:pPro_codnosso and  (ProdutosFornecedores.ProdFor_Padrao = 1) AND (ProdutosFornecedores.ProdFor_Situacao = 1) and  produtos.GrupoProduto_codigo in (
SELECT produtos.Pro_AliqICMS, produtos.Trib_Codigo, produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto, produtosfornecedores.For_codigo,
select * from SisUsuariosGrid
select * from SisUsuariosGrid where usr_cod_criacao =:pusr_cod_criacao and UsuGrid_Grid =:pUsuGrid_Grid
select Pro_PrazoEntrega from produtos where Pro_codnosso =:pPro_codnosso
select * from VendaEstoqueVendido where Ven_CodigoPre =:pVen_CodigoPre and Pro_codnosso =:pPro_codnosso
select * from VendaEstoqueVendido
SELECT *  FROM contas_Receber_det  where contas_Receber_det.Ctr_codigo =
select * from contas_receber_det
select * from contas_receber_det where ctr_codigo_det=:cod_det
select * from contas_receber where Ctr_cod_documento=:CODIGO and tpd_codigo= 1001
select Pro_EmpresaCompradora from produtos where Pro_codnosso =:pPro_codnosso
select * from TransferenciaEstoque
select * from TransferenciaEstoqueProduto
select * from EstoqueTipo where EstTp_codigo > 1
Select TbImp_codigo from TabelaImposto where TbImp_NCM=:pTbImp_NCM and TbImp_Operacao=:pTbImp_Operacao  and TbImp_UF=:pTbImp_UF and TbImp_consumidorFinal =:pTbImp_consumidorFinal
select TbImp_codigo from produtos where Pro_codnosso =:pPro_codnosso
select * from TabelaImposto where TbImp_codigo =:pTbImp_codigo
select * from estado where UF=:pUF
select * from GrupoProduto order by GrupoProduto_ordem
select * from venda where ven_codigopre =:pven_codigopre
select * from vendaestoque where ven_codigopre =:pven_codigopre
SELECT * FROM VendaAmbiente WHERE  VenAmb_TpDoc='ORC'  AND Emp_Codigo=1  AND VenAmb_NDocPre=:VenAmb_NDocPre
SELECT * FROM VendaAmbiente WHERE  VenAmb_TpDoc='DEM'  AND Emp_Codigo=1  AND VenAmb_NDocPre=:VenAmb_NDocPre
select vendaproduto.*,ProdutosFornecedores.ProdFor_CodigoProduto,produtos.Pro_tp_peca,GrupoProduto.GrupoProduto_Descricao,produtos.Pro_descricao,ProdutosFornecedores.ProdFor_DescricaoProduto,
select * from VendaDesconto where Ven_CodigoPre =:pVen_CodigoPre
SELECT VendaServico.Ven_codigopre, VendaServico.VenSer_item, VendaServico.Sev_cod, VendaServico.CodAmbiente,
select * from VendaAtendente where VenAten_TpDoc ='ORC' and emp_codigo=1 and VenAten_NDocPre=:PVenAten_NDocPre
select * from VendaAtendente where VenAten_TpDoc ='DEM' and emp_codigo=1 and VenAten_NDocPre=:PVenAten_NDocPre
select * from VendaIndicacao where VenInd_TpDoc ='ORC' and emp_codigo=1 and VenInd_NDocPre=:pVenInd_NDocPre
select * from VendaIndicacao where VenInd_TpDoc ='DEM' and emp_codigo=1 and VenInd_NDocPre=:pVenInd_NDocPre
SELECT * FROM VendaIndicacaoGrupProd WHERE VenInd_TpDoc = 'ORC' AND Emp_Codigo =1
SELECT * FROM VendaIndicacaoGrupProd WHERE VenInd_TpDoc = 'DEM' AND Emp_Codigo =1
select * from OBSERVACOES where obs_codigo=:codigo and obs_tipo='O'
select SisUsu_monitor from SisUsuarios where Id=:pId
SELECT *  FROM contas_Receber_det where Ctr_codigo is null
select * from CategoriaVenda where CatVen_Codigo=:pCatVen_Codigo
select Pre_Venda from Preco_Produto where Pre_Codnosso =:pPre_Codnosso and Pre_Acabamento =:pPre_Acabamento AND Pre_Codindice =:PPre_Codindice
SELECT * from Forma_Pagamento where (fpg_orcamento = 'S' and fpg_situacao='A')
select Fpg_LimiteDesconto from Forma_Pagamento where Fpg_codigo=:pFpg_codigo
select * from VendaProduto where Ven_CodigoPre =:PVen_CodigoPre
SELECT MAX(dbo.VendaProduto.pld_codindice) AS pld_codindice, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, SUM(dbo.VendaProduto.VenPro_Quantidade) AS total,
SELECT  (dbo.VendaProduto.pld_codindice) AS pld_codindice, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, dbo.VendaProduto.VenPro_Quantidade AS total,
SELECT * FROM pedido_compra where Pcp_ped_av_fan=:codigo and ParSV_serie =:pParSV_serie and pcp_status ='A'
SELECT * FROM ordem_compra_det where ocd_cod_pedido=:codigo
SELECT * FROM PEDIDO_compra_det WHERE Pro_codnosso=:codigo and Pcd_acabamento=:acabamento and pcp_codigo=:pedido
SELECT sum(Res_Quantidade) as quantidade FROM Reserva_Estoque
SELECT max(Res_Codigo) as maximo from reserva_estoque
SELECT * from reserva_estoque
select * from venda where Ven_codigo=:codigo and Ven_Tipo ='O'
SELECT * FROM VendaAmbiente WHERE  VenAmb_TpDoc='ORC'  AND Emp_Codigo=1  AND VenAmb_NDocPre=:codigo
SELECT VendaProduto.*, fornecedor.For_Nome,GrupoProduto.GrupoProduto_codigo ,GrupoProduto.GrupoProduto_Descricao, produtos.Pro_tp_peca,
SELECT VendaServico.*, Servicos.Serv_tempoInstalacao, Servicos.Serv_Desc, Servicos.serv_tipo
select VENDA.*,Clientes.*, obras.*
SELECT Clientes.Cli_cnpj_cpf, Clientes.Cli_Codigo, Clientes.Cli_Nome, Obras.Obr_Codigo
SELECT VendaProduto.*, GrupoProduto.GrupoProduto_codigo,fornecedor.For_Nome, GrupoProduto.GrupoProduto_Descricao, produtos.Pro_tp_peca,
SELECT SUM(DevolucaoProduto.DevPro_Quantidade) AS quantidade
SELECT SUM(controle_entrega_prod.cep_quantidade_entregue) AS ENTREGUE, sum(controle_entrega_prod.cep_quantidade_separada)as separada
SELECT SUM(Epr_estoque) AS Epr_estoque FROM dbo.Estoque_produto
SELECT ordem_compra_det.Ocp_codigo, ordem_compra.Ocp_dt_ordem, ordem_compra.Ocp_dt_envio, ordem_compra.Ocp_dt_prevista, ordem_compra.Ocp_Reagendamento
SELECT venda.Ven_codigo, venda.ParSV_serie, venda.Ven_DataEmissao,VendaProduto.Pro_codnosso, VendaProduto.CodAcabamento, produtos.Pro_tp_peca, ProdutosFornecedores.ProdFor_CodigoProduto, ProdutosFornecedores.ProdFor_DescricaoProduto,
select Pre_Custo from Preco_Produto where Pre_Codnosso =:pPre_Codnosso and Pre_Acabamento =:pPre_Acabamento
SELECT ordem_compra_det.Ocp_codigo, ordem_compra.Ocp_dt_ordem, ordem_compra.Ocp_dt_envio, ordem_compra.Ocp_dt_prevista, ordem_compra.Ocp_Reagendamento, SisUsuarios.Nome,
SELECT controle_entrega_data.ced_data, controle_entrega_data.cep_tipo
SELECT DISTINCT Dev_Dtemissao
select * from VendaProduto where ven_codigopre=:codigo
SELECT dbo.Preco_Produto.Pre_Venda, dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento, dbo.produtos.Trib_Codigo,
select * from VendaServico where Ven_codigopre =:pVen_codigopre
select * from Servicos where sev_cod =:psev_cod and Serv_NaoAtualizarValor = 0
select * from contas_receber where Ctr_cod_documento=:CODIGO and tpd_codigo= 1001 and ParSV_serie=:pParSV_serie
select ret_codigo from reserva_tecnica where ret_tipo ='PROJETO' AND Ret_projeto_avulsa=:codigo and Ret_situacao='ATIVO' and ParSV_serie=:pParSV_serie
select cen_codigo from Controle_entrega where cen_tipo ='P' AND cen_pedido_avulso=:codigo  and ParSV_serie=:pParSV_serie
SELECT ven_codigopre FROM dbo.Devolucao WHERE (Dev_situacao = 1) and ven_codigopre =:pven_codigopre
select ret_codigo from reserva_tecnica where ret_tipo ='pedido de venda' AND Ret_projeto_avulsa=:codigo and Ret_situacao='ATIVO'
select * from pedido_compra where Pcp_pedido_venda=:codigo  and ParSV_serie=:pParSV_serie
select * from venda where ven_codigo =:pven_codigo and Ven_Tipo='O'
select * from venda where ven_codigo =:pven_codigo and Ven_Tipo='D'
SELECT TransferenciaEstoqueProduto.*, dbo.TransferenciaEstoque.TransfEst_EstSaida, dbo.TransferenciaEstoque.TransfEst_EstEntrada
SELECT produtos.Pro_codnosso, Preco_Produto.Pre_Acabamento, produtos.Pro_CodEspecial, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase,
SELECT dbo.produtos.Pro_ativo, dbo.Preco_Produto.Pre_Ativo, dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento
SELECT dbo.TipoPIS.PIS_codigo, dbo.TipoPIS.PIS_descricao, dbo.TabelaImposto.TbImp_pis
SELECT dbo.VendaProduto.Ven_CodigoPre, dbo.TabelaImposto.TbImp_cofins, dbo.TipoCOFINS.COFINS_codigo, dbo.TipoCOFINS.COFINS_descricao
SELECT VendaProduto.Ven_CodigoPre,dbo.TabelaImposto.CFOP_codigo, dbo.TabelaImposto.TpOriPro_codigo, dbo.TabelaImposto.TpTrib_codigo, dbo.TabelaImposto.TbImp_TpMdobc, dbo.TabelaImposto.TbImp_TpMdobcSt, dbo.TabelaImposto.TbImp_icms,
SELECT dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_CodigoPre, dbo.Venda.Ven_DataEmissao, dbo.Venda.Ven_SubTotal, dbo.Venda.Ven_Acrescimo, dbo.Venda.Ven_Desconto, dbo.Venda.Ven_AcrescimoPorc,
SELECT TabelaImposto.TpOriPro_codigo, TabelaImposto.TpTrib_codigo, dbo.TabelaImposto.TbImp_iva, dbo.TabelaImposto.TbImp_CSOSN, dbo.TabelaImposto.TbImp_codigo, dbo.VendaProduto.VenPro_Item,
select Ven_codigopre from VendaServico where Ven_codigopre =:pVen_codigopre
select cen_modo from Controle_entrega
SELECT SUM(dbo.controle_entrega_prod.cep_quantidade_entregue) AS totalentregue
SELECT * from observacoes where obS_codigo=:codigo and obs_tipo = 'P' and obs_relatorio = 'QUANTITATIVO'
SELECT dbo.VendaAmbiente.VenAmb_Descricao, dbo.VendaProduto.VenPro_Seq AS SEQ, dbo.VendaProduto.VenPro_SeqItem AS seq_item,
select * from venda where Ven_CodVinculo=:codigo and Ven_Situacao = 'A' and ven_tipo ='P' AND  ((SELECT Pasta_DtFechamento FROM dbo.Pasta WHERE (Pasta_codigo = dbo.Venda.Pasta_codigo)) IS NULL) and venda.Ven_DataConclusao is null  order by ven_codigo
select * from venda where Ven_CodVinculo=:codigo and Ven_Situacao = 'A' and ven_tipo ='P'  order by ven_codigo
select * from venda where Ven_CodVinculo=:codigo and Ven_Situacao = 'A' and ven_tipo ='O'  order by ven_codigo
SELECT  dbo.Acabamento.DescAcabamento + ' - ' + dbo.Acabamento.CodAcabamento AS Acabamento, Acabamento.CodAcabamento,
SELECT venda.*,  Funcionario.Fun_Nome AS eletricista,cli_nome,  Clientes.Cli_Fcomercial, Clientes.Cli_Fresidencial, Clientes.Cli_fax, Clientes.Cli_celular
SELECT * from observacoes where obS_codigo=:codigo and obs_tipo = 'P' and obs_relatorio = 'CONTROLE DE OBRA'
SELECT venda.*,  Funcionario.Fun_Nome AS eletricista,clientes.cli_nome, Clientes.Cli_Fcomercial, Clientes.Cli_Fresidencial, Clientes.Cli_fax, Clientes.Cli_celular
SELECT  dbo.Clientes.Cli_Fcomercial, dbo.Clientes.Cli_Fresidencial, dbo.Clientes.Cli_fax, dbo.Clientes.Cli_celular
SELECT dbo.VendaProduto.*, dbo.VendaAmbiente.VenAmb_Descricao, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_descricao,
SELECT * from observacoes where obS_codigo=:codigo and obs_tipo = 'P' and obs_relatorio = 'ORDEM DE SERVI
SELECT * from Mensagem_Relatorio where Men_codigo = 17
SELECT Venda.*, Funcionario.Fun_Nome AS eletricista, Obras.Cli_codigo,
SELECT vendaservico.ven_codigopre, vendaservico.venser_quantidade, Servicos.Serv_Desc, Servicos.Serv_tipo
SELECT vendaservico.ven_codigopre
SELECT  VendaProduto.CodAmbiente,fornecedor.For_Nome, dbo.VendaAmbiente.VenAmb_Descricao, dbo.produtos.Pro_descricao,
SELECT SUM(dbo.Contas_receber_pag.Crp_valor_pago) AS VALOR FROM dbo.ControleCheque INNER JOIN dbo.Contas_receber_pag ON (dbo.ControleCheque.ControlCheque_CodPagamento = dbo.Contas_receber_pag.Crp_cod_pag) INNER JOIN dbo.ControleChequeDet ON (dbo.ControleCheque.ControlCheque_codigo = dbo.ControleChequeDet.ControlCheque_Codigo) WHERE (dbo.ControleCheque.ControlCheque_tipo = 'R') AND  (dbo.ControleChequeDet.ControlChequeDet_Factoring = 1) AND  (dbo.Contas_receber_pag.Crp_data_pagamento BETWEEN :Dataini AND :Datafin)
SELECT Bancos_Caixas.Bcx_tipo, SUM(Contas_Bancarias.Cba_Saldo_inicial) AS SALDO FROM Bancos_Caixas INNER JOIN
SELECT  SUM(Mba_valor) AS total, Mba_operacao, Mba_efetivado,Mba_data_efetivacao,cpp_cod_pag,crp_cod_pag FROM Movimento_bancario GROUP BY Mba_operacao, Mba_efetivado,Mba_data_efetivacao,cpp_cod_pag,crp_cod_pag HAVING Mba_efetivado = 'S' and Mba_data_efetivacao>=:data1 and Mba_data_efetivacao<=:data2 and cpp_cod_pag is null and crp_cod_pag is null
SELECT Contas_apagar_pag.Cpp_valor_pago, Contas_apagar_pag.Cpp_data_pagamento, contas_apagar_det.Ctp_situacao, Bancos_Caixas.Bcx_tipo,Contas_apagar_pag.mdo_codigo FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON  contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = Contas_apagar_pag.Ctp_codigo_det INNER JOIN Contas_Bancarias ON  contas_apagar_det.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Contas_apagar_pag.cba_codigo =  Contas_Bancarias.Cba_codigo INNER JOIN Bancos_Caixas ON  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'B') AND (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento>=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2
SELECT Bancos_Caixas.Bcx_tipo,contas_Receber_det.Ctr_situacao, Contas_receber_pag.Crp_valor_pago, Contas_receber_pag.Crp_data_pagamento,Contas_receber_pag.Mdo_codigo FROM Bancos_Caixas INNER JOIN Contas_Bancarias ON  Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND  Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND  Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo INNER JOIN contas_Receber_det INNER JOIN Contas_receber_pag ON  contas_Receber_det.Ctr_codigo_det =  Contas_receber_pag.Ctr_codigo_det AND contas_Receber_det.Ctr_codigo = Contas_receber_pag.Ctr_codigo ON Contas_Bancarias.Cba_codigo =  Contas_receber_pag.cba_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'B') AND (contas_Receber_det.Ctr_situacao = 'S') and Contas_receber_pag.Crp_data_pagamento >=:data1 and Contas_receber_pag.Crp_data_pagamento <=:data2
SELECT SUM(Mvt_valor) AS TOTAL, Mvt_Credito_debito,Mvt_data,cpp_cod_pag,crp_cod_pag FROM Movimentos GROUP BY Mvt_Credito_debito,Mvt_data,cpp_cod_pag,crp_cod_pag having Mvt_data>=:data1 and Mvt_data<=:data2 and cpp_cod_pag is null and crp_cod_pag is null
SELECT Contas_apagar_pag.Cpp_valor_pago, Contas_apagar_pag.Cpp_data_pagamento, contas_apagar_det.Ctp_situacao, Bancos_Caixas.Bcx_tipo,  Contas_apagar_pag.mdo_codigo FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON  contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = Contas_apagar_pag.Ctp_codigo_det INNER JOIN Contas_Bancarias ON  contas_apagar_det.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Contas_apagar_pag.cba_codigo =  Contas_Bancarias.Cba_codigo INNER JOIN Bancos_Caixas ON  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'C') AND (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento>=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2
SELECT Bancos_Caixas.Bcx_tipo,contas_Receber_det.Ctr_situacao, Contas_receber_pag.Crp_valor_pago, Contas_receber_pag.Crp_data_pagamento,Contas_receber_pag.Mdo_codigo FROM Bancos_Caixas INNER JOIN Contas_Bancarias ON  Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND  Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND  Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo INNER JOIN contas_Receber_det INNER JOIN Contas_receber_pag ON  contas_Receber_det.Ctr_codigo_det =  Contas_receber_pag.Ctr_codigo_det AND contas_Receber_det.Ctr_codigo = Contas_receber_pag.Ctr_codigo ON Contas_Bancarias.Cba_codigo =  Contas_receber_pag.cba_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'C') AND (contas_Receber_det.Ctr_situacao = 'S') and Contas_receber_pag.Crp_data_pagamento >=:data1 and Contas_receber_pag.Crp_data_pagamento <=:data2
select orc_tl_produto as tl_produto,orc_desc_produto as desc_produto, orc_tl_geral_produto as tl_geral_produto, orc_codigo as codigo, orc_codigo_pre as codigo_pre, cli_codigo, orc_dt_emissao as data, orc_desc_por_produto as desc_porc_produtos from orcamento where orc_codigo=:porc_codigo
SELECT produtos.Pro_descricao AS descricao, orcamento_materiais_det.Pro_codnosso AS codigo, orcamento_materiais_det.oma_acabamento AS acabamento, orcamento_materiais_det.oma_unidade AS unidade, sum(orcamento_materiais_det.oma_quantidade) AS quantidade, max(orcamento_materiais_det.oma_vl_unitario) AS vl_unitario, max(orcamento_materiais_det.oma_vl_item) AS vl_item, max(orcamento_materiais_det.oma_VlImposto) AS vlimposto,(  sum(orcamento_materiais_det.oma_quantidade) * max(orcamento_materiais_det.oma_vl_unitario)) as vl_item_sem_iva FROM orcamento_materiais_det INNER JOIN PRodutos ON orcamento_materiais_det.Pro_codnosso = dbo.produtos.Pro_codnosso where orcamento_materiais_det.orc_codigo_pre =:porc_codigo_pre1 GROUP BY produtos.Pro_descricao, orcamento_materiais_det.Pro_codnosso, orcamento_materiais_det.oma_acabamento, orcamento_materiais_det.oma_unidade, orcamento_materiais_det.oma_quantidade, orcamento_materiais_det.oma_vl_unitario, orcamento_materiais_det.oma_vl_item, orcamento_materiais_det.oma_VlImposto union all SELECT produtos.Pro_descricao AS descricao, Orcamento_luminaria_det.Pro_codnosso AS codigo, Orcamento_luminaria_det.old_acabamento AS acabamento, Orcamento_luminaria_det.old_unidade AS unidade, sum(Orcamento_luminaria_det.old_quantidade) AS quantidade, max(Orcamento_luminaria_det.old_vl_unitario) AS vl_unitario, max(Orcamento_luminaria_det.old_vl_item) AS vl_item, max(Orcamento_luminaria_det.old_VlImposto) AS vlimposto,(  sum(orcamento_luminaria_det.old_quantidade) * max(orcamento_luminaria_det.old_vl_unitario)) as vl_item_sem_iva FROM Orcamento_luminaria_det INNER JOIN produtos ON Orcamento_luminaria_det.Pro_codnosso = dbo.produtos.Pro_codnosso where Orcamento_luminaria_det.orc_codigo_pre =:porc_codigo_pre2 GROUP BY produtos.Pro_descricao, Orcamento_luminaria_det.Pro_codnosso, Orcamento_luminaria_det.old_acabamento, Orcamento_luminaria_det.old_unidade, Orcamento_luminaria_det.old_quantidade, Orcamento_luminaria_det.old_vl_unitario, Orcamento_luminaria_det.old_vl_item, Orcamento_luminaria_det.old_VlImposto order by codigo
SELECT  SUM((dbo.produtos.Pro_AliqICMS / 100) * ((orcamento_materiais_det.oma_quantidade) * (orcamento_materiais_det.oma_vl_unitario))) AS valor_iva,  produtos.Pro_AliqICMS AS aliq_iva,  SUM((orcamento_materiais_det.oma_quantidade) * (orcamento_materiais_det.oma_vl_unitario)) as base_iva FROM  orcamento_materiais_det INNER JOIN produtos ON orcamento_materiais_det.Pro_codnosso = produtos.Pro_codnosso where orcamento_materiais_det.orc_codigo_pre =:porc_codigo_pre1 GROUP BY dbo.produtos.Pro_AliqICMS union all SELECT  SUM((produtos.Pro_AliqICMS / 100) * (Orcamento_luminaria_det.old_quantidade * Orcamento_luminaria_det.old_vl_unitario)) AS valor_iva, produtos.Pro_AliqICMS AS aliq_iva, SUM((Orcamento_luminaria_det.old_quantidade * Orcamento_luminaria_det.old_vl_unitario)) as base_iva FROM Orcamento_luminaria_det INNER JOIN produtos ON Orcamento_luminaria_det.Pro_codnosso = produtos.Pro_codnosso where Orcamento_luminaria_det.orc_codigo_pre =:porc_codigo_pre2 GROUP BY produtos.Pro_AliqICMS order by aliq_iva
SELECT orcamento.orc_tl_produto AS tl_produto, orcamento.orc_desc_produto AS desc_produto, orcamento.orc_tl_geral_produto AS tl_geral_produto, orcamento.orc_codigo AS codigo, orcamento.orc_codigo_pre AS codigo_pre, orcamento.cli_codigo, orcamento.orc_dt_emissao AS data, orcamento.orc_dt_validade AS DataValidade, orcamento.orc_desc_por_produto AS desc_porc_produtos, CASE WHEN dbo.Funcionario.Fun_Nome IS NOT NULL THEN Funcionario.Fun_Nome ELSE 'Instala
SELECT produtos.Pro_descricao AS descricao, Orcamento_luminaria_det.Pro_codnosso AS codigo, Orcamento_luminaria_det.old_acabamento AS acabamento, Orcamento_luminaria_det.old_unidade AS unidade, sum(Orcamento_luminaria_det.old_quantidade) AS quantidade, max(Orcamento_luminaria_det.old_vl_unitario) AS vl_unitario, max(Orcamento_luminaria_det.old_vl_item) AS vl_item, max(Orcamento_luminaria_det.old_VlImposto) AS vlimposto,(  sum(orcamento_luminaria_det.old_quantidade) * max(orcamento_luminaria_det.old_vl_unitario)) as vl_item_sem_iva ,produtos.Pro_AliqICMS as aliq  ,CASE WHEN dbo.orcamento.orc_desc_por_luminaria > 0 THEN MAX(Orcamento_luminaria_det.old_vl_item) - (MAX(Orcamento_luminaria_det.old_vl_item) * (orcamento.orc_desc_por_luminaria / 100)) ELSE MAX(Orcamento_luminaria_det.old_vl_item) END AS vl_item_desc, orcamento.orc_desc_por_luminaria as desconto ,VendaAmbiente.VenAmb_Descricao, Orcamento_luminaria_det.old_seq AS sequencia,Orcamento_luminaria_det.old_seq_item AS sequenciaItem FROM Orcamento_luminaria_det INNER JOIN produtos ON Orcamento_luminaria_det.Pro_codnosso = produtos.Pro_codnosso INNER JOIN orcamento ON Orcamento_luminaria_det.orc_codigo_pre = orcamento.orc_codigo_pre INNER JOIN vendaAmbiente ON Orcamento_luminaria_det.orc_codigo_pre = VendaAmbiente.VenAmb_NDocPre AND Orcamento_luminaria_det.old_ambiente = VendaAmbiente.CodAmbiente AND Orcamento_luminaria_det.old_ambiente = dbo.VendaAmbiente.CodAmbiente where Orcamento_luminaria_det.orc_codigo_pre =:porc_codigo_pre2 and (VendaAmbiente.VenAmb_TpDoc = 'ORC') GROUP BY Orcamento_luminaria_det.old_seq, Orcamento_luminaria_det.old_seq_item, VendaAmbiente.VenAmb_Descricao,produtos.Pro_descricao, Orcamento_luminaria_det.Pro_codnosso, Orcamento_luminaria_det.old_acabamento, Orcamento_luminaria_det.old_unidade, Orcamento_luminaria_det.old_quantidade, Orcamento_luminaria_det.old_vl_unitario, Orcamento_luminaria_det.old_vl_item, Orcamento_luminaria_det.old_VlImposto,produtos.Pro_AliqICMS,orcamento.orc_desc_por_luminaria union all SELECT produtos.Pro_descricao AS descricao, orcamento_materiais_det.Pro_codnosso AS codigo, orcamento_materiais_det.oma_acabamento AS acabamento, orcamento_materiais_det.oma_unidade AS unidade, sum(orcamento_materiais_det.oma_quantidade) AS quantidade, max(orcamento_materiais_det.oma_vl_unitario) AS vl_unitario, max(orcamento_materiais_det.oma_vl_item) AS vl_item, max(orcamento_materiais_det.oma_VlImposto) AS vlimposto,(  sum(orcamento_materiais_det.oma_quantidade) * max(orcamento_materiais_det.oma_vl_unitario)) as vl_item_sem_iva ,produtos.Pro_AliqICMS as aliq ,  CASE WHEN dbo.orcamento.orc_desc_por_materiais > 0 THEN MAX(orcamento_materiais_det.oma_vl_item) - (MAX(orcamento_materiais_det.oma_vl_item) * (orcamento.orc_desc_por_materiais / 100)) ELSE MAX(orcamento_materiais_det.oma_vl_item) END AS vl_item_desc,orcamento.orc_desc_por_materiais AS desconto, VendaAmbiente.VenAmb_Descricao, orcamento_materiais_det.oma_seq AS sequencia, orcamento_materiais_det.oma_seq_item as sequenciaItem FROM orcamento_materiais_det INNER JOIN produtos ON orcamento_materiais_det.Pro_codnosso = produtos.Pro_codnosso INNER JOIN orcamento ON orcamento_materiais_det.orc_codigo_pre = orcamento.orc_codigo_pre INNER JOIN VendaAmbiente ON orcamento_materiais_det.orc_codigo_pre = VendaAmbiente.VenAmb_NDocPre AND orcamento_materiais_det.oma_ambiente = VendaAmbiente.CodAmbiente AND Orcamento_materiais_det.oma_ambiente = VendaAmbiente.CodAmbiente where orcamento_materiais_det.orc_codigo_pre =:porc_codigo_pre1 and (VendaAmbiente.VenAmb_TpDoc = 'ORC') GROUP BY orcamento_materiais_det.oma_seq,orcamento_materiais_det.oma_seq_item,VendaAmbiente.VenAmb_Descricao,produtos.Pro_descricao, orcamento_materiais_det.Pro_codnosso, orcamento_materiais_det.oma_acabamento, orcamento_materiais_det.oma_unidade, orcamento_materiais_det.oma_quantidade, orcamento_materiais_det.oma_vl_unitario, orcamento_materiais_det.oma_vl_item, orcamento_materiais_det.oma_VlImposto,produtos.Pro_AliqICMS,orcamento.orc_desc_por_materiais order by  sequencia, sequenciaItem, codigo
SELECT produtos.Pro_descricao AS descricao, Orcamento_luminaria_det.Pro_codnosso AS codigo, Orcamento_luminaria_det.old_acabamento AS acabamento, Orcamento_luminaria_det.old_unidade AS unidade, sum(Orcamento_luminaria_det.old_quantidade) AS quantidade, max(Orcamento_luminaria_det.old_vl_unitario) AS vl_unitario, max(Orcamento_luminaria_det.old_vl_item) AS vl_item, max(Orcamento_luminaria_det.old_VlImposto) AS vlimposto,(  sum(orcamento_luminaria_det.old_quantidade) * max(orcamento_luminaria_det.old_vl_unitario)) as vl_item_sem_iva ,produtos.Pro_AliqICMS as aliq  , max(Orcamento_luminaria_det.old_vl_item)  AS vl_item_desc, Orcamento_luminaria_det.old_desconto as desconto ,VendaAmbiente.VenAmb_Descricao, Orcamento_luminaria_det.old_seq AS sequencia,Orcamento_luminaria_det.old_seq_item AS sequenciaItem FROM Orcamento_luminaria_det INNER JOIN produtos ON Orcamento_luminaria_det.Pro_codnosso = produtos.Pro_codnosso INNER JOIN orcamento ON Orcamento_luminaria_det.orc_codigo_pre = orcamento.orc_codigo_pre INNER JOIN vendaAmbiente ON Orcamento_luminaria_det.orc_codigo_pre = VendaAmbiente.VenAmb_NDocPre AND Orcamento_luminaria_det.old_ambiente = VendaAmbiente.CodAmbiente AND Orcamento_luminaria_det.old_ambiente = dbo.VendaAmbiente.CodAmbiente where Orcamento_luminaria_det.orc_codigo_pre =:porc_codigo_pre2 and (VendaAmbiente.VenAmb_TpDoc = 'ORC') GROUP BY Orcamento_luminaria_det.old_seq, Orcamento_luminaria_det.old_seq_item, VendaAmbiente.VenAmb_Descricao,produtos.Pro_descricao, Orcamento_luminaria_det.Pro_codnosso, Orcamento_luminaria_det.old_acabamento, Orcamento_luminaria_det.old_unidade, Orcamento_luminaria_det.old_quantidade, Orcamento_luminaria_det.old_vl_unitario, Orcamento_luminaria_det.old_vl_item, Orcamento_luminaria_det.old_VlImposto,produtos.Pro_AliqICMS,Orcamento_luminaria_det.old_desconto union all SELECT produtos.Pro_descricao AS descricao, orcamento_materiais_det.Pro_codnosso AS codigo, orcamento_materiais_det.oma_acabamento AS acabamento, orcamento_materiais_det.oma_unidade AS unidade, sum(orcamento_materiais_det.oma_quantidade) AS quantidade, max(orcamento_materiais_det.oma_vl_unitario) AS vl_unitario, max(orcamento_materiais_det.oma_vl_item) AS vl_item, max(orcamento_materiais_det.oma_VlImposto) AS vlimposto,(  sum(orcamento_materiais_det.oma_quantidade) * max(orcamento_materiais_det.oma_vl_unitario)) as vl_item_sem_iva ,produtos.Pro_AliqICMS as aliq  ,MAX(orcamento_materiais_det.oma_vl_item) AS vl_item_desc,orcamento_materiais_det.oma_desconto AS desconto, VendaAmbiente.VenAmb_Descricao, orcamento_materiais_det.oma_seq AS sequencia, orcamento_materiais_det.oma_seq_item as sequenciaItem FROM orcamento_materiais_det INNER JOIN produtos ON orcamento_materiais_det.Pro_codnosso = produtos.Pro_codnosso INNER JOIN orcamento ON orcamento_materiais_det.orc_codigo_pre = orcamento.orc_codigo_pre INNER JOIN VendaAmbiente ON orcamento_materiais_det.orc_codigo_pre = VendaAmbiente.VenAmb_NDocPre AND orcamento_materiais_det.oma_ambiente = VendaAmbiente.CodAmbiente AND Orcamento_materiais_det.oma_ambiente = VendaAmbiente.CodAmbiente where orcamento_materiais_det.orc_codigo_pre =:porc_codigo_pre1 and (VendaAmbiente.VenAmb_TpDoc = 'ORC') GROUP BY orcamento_materiais_det.oma_seq,orcamento_materiais_det.oma_seq_item,VendaAmbiente.VenAmb_Descricao,produtos.Pro_descricao, orcamento_materiais_det.Pro_codnosso, orcamento_materiais_det.oma_acabamento, orcamento_materiais_det.oma_unidade, orcamento_materiais_det.oma_quantidade, orcamento_materiais_det.oma_vl_unitario, orcamento_materiais_det.oma_vl_item, orcamento_materiais_det.oma_VlImposto,produtos.Pro_AliqICMS,orcamento_materiais_det.oma_desconto order by  sequencia, sequenciaItem, codigo
SELECT * from Forma_Pagamento WITH (NOLOCK) where fpg_orcamento = 'S' AND fpg_situacao = 'A'
SELECT Municipio.mun_nome, Municipio.mun_uf, Obras.Obr_Descricao, Obras.Obr_Endereco, Obras.Obr_numero, Obras.Obr_complemento,
SELECT dbo.produtos.Pro_unidade AS unidade, dbo.VendaProduto.CodAcabamento AS acabamento, SUM(dbo.VendaProduto.VenPro_Quantidade)
select max(Cgr_codigo) as maximo from contato_grupo_email
select max(gru_codigo) as maximo from grupo_contato_email
select cli_codigo as codigo, cli_nome as nome, cli_email as email from clientes where cli_email is not null order by cli_nome
select INDDET_codigo as codigo, INDDET_nome as nome, INDDET_email as email from Indicacoes_Detalhe WHERE INDDET_email IS NOT NULL order by INDDET_nome
select FOR_codigo as codigo, for_nome as nome, for_email as email from fornecedor where for_email is not null order by for_nome
select INDDET_codigo as codigo, INDDET_nome as nome, INDDET_email as email from Indicacoes_Detalhe WHERE INDDET_email IS NOT NULL and inddet_profissao=:profissao order by INDDET_nome
SELECT Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_CodigoPre, Clientes.Cli_Nome, Venda.Ven_DataEmissao,
SELECT Par_entrega FROM Paramentros
select * from observacoes where obs_tipo='P' and obs_relatorio = 'LIBERA
select * from Assistencia_TecnicaProdutos where ASTECProd_Codigo =:PASTECProd_Codigo
SELECT Assistencia_Tecnica.ASTEC_Codigo, Assistencia_Tecnica.ASTEC_Data, Venda.Ven_codigo, Venda.ParSV_serie, Clientes.Cli_Nome, fornecedor.For_Nome,case when Assistencia_Tecnica.ASTEC_situacao =1 then 'ATIVO' else 'DESATIVADO' end as situacao ,Assistencia_Tecnica.ASTEC_DATAconclusao, Assistencia_Tecnica.emp_codigo, Assistencia_Tecnica.cli_codigo FROM Assistencia_Tecnica INNER JOIN Clientes ON Assistencia_Tecnica.Cli_Codigo = Clientes.Cli_Codigo INNER JOIN fornecedor ON Assistencia_Tecnica.For_Codigo = fornecedor.For_codigo INNER JOIN Venda ON Assistencia_Tecnica.Ven_CodigoPre = Venda.Ven_CodigoPre
select * from Assistencia_TecnicaProdutos where ASTEC_Codigo =:PASTEC_Codigo
select * from SisUsuarios where id=
select  dbo.fncBase64_Decode(
SELECT * from Clientes where Cli_codigo=
SELECT * from fornecedor where For_codigo=
SELECT cli_email from clientes where cli_codigo =
SELECT produtos.Pro_CodReduzido, dbo.produtos.Pro_unidade AS unidade, dbo.VendaProduto.CodAcabamento AS acabamento, SUM(dbo.VendaProduto.VenPro_Quantidade)
SELECT * from Mensagem_Relatorio WITH (NOLOCK) where men_codigo= 2
SELECT * from Mensagem_Relatorio WITH (NOLOCK) where men_codigo= 3
SELECT * from Mensagem_Relatorio WITH (NOLOCK) where men_codigo= 15
SELECT * from observacoes where obs_relatorio ='OR
SELECT * from Mensagem_Relatorio WITH (NOLOCK) where men_codigo= 5
SELECT * from Mensagem_Relatorio WITH (NOLOCK) where men_codigo= 6
SELECT dbo.Obras.*, Municipio.mun_nome, Municipio.mun_uf from  dbo.Obras INNER JOIN
SELECT Clientes.Cli_Fcomercial, Clientes.Cli_Fresidencial, Clientes.Cli_fax, Clientes.Cli_celular
SELECT Orcamento_luminaria_det.orc_codigo_pre, Orcamento_luminaria_det.old_seq
SELECT orcamento_materiais_det.orc_codigo_pre, orcamento_materiais_det.oma_seq
SELECT * FROM orcamento_luminaria_det WITH (NOLOCK) WHERE(old_seq =:sequencia) AND (orc_codigo_pre =:codigo) AND (old_seq_item >:item) ORDER BY old_seq_item
SELECT DISTINCT oma_seq_item from orcamento_materiais_det WITH (NOLOCK)
SELECT VendaServico.ven_codigopre,VendaServico.Sev_cod, Servicos.Serv_Desc,max(VendaServico.VenSer_DescPorc) as desconto,
select ven_eletricista from venda WITH (NOLOCK) where ven_codigopre=:codigo
select * from vendaservico WITH (NOLOCK) where ven_codigopre=:codigo
SELECT * from Mensagem_Relatorio WITH (NOLOCK) where men_codigo= 4
SELECT fornecedor.For_prazo_entrega,fornecedor.For_Nome, Coletas.col_fone, Transportadora.Tra_Nome, ordem_compra.Ocp_reagendamento,ordem_compra.Ocp_codigo,ordem_compra.Ocp_dt_envio
SELECT Venda.Ven_codigo, Venda.ParSV_serie, Clientes.Cli_Nome FROM Venda INNER JOIN
select ordem_compra.Ocp_obs from ordem_compra WITH (NOLOCK) where ocp_codigo=:codigo
SELECT Clientes.Cli_Fcomercial, Clientes.Cli_Fresidencial, Clientes.Cli_fax, Clientes.Cli_celular, venda.ven_TipoDesc
SELECT dbo.VendaProduto.VenPro_Seq AS sequencia, dbo.VendaProduto.VenPro_SeqItem AS item, dbo.VendaProduto.Pro_codnosso AS codigo, dbo.produtos.Pro_unidade AS unidade,   dbo.VendaAmbiente.VenAmb_Descricao AS ambiente, dbo.VendaProduto.CodAcabamento AS acabamento, dbo.VendaProduto.VenPro_Quantidade AS quantidade,   dbo.produtos.Pro_tp_peca AS Peca, CASE WHEN substring(vendaproduto.Pro_codnosso, 1, 18)   = '999999999999999999' THEN vendaproduto.VenPro_PreProduto ELSE ProdutosFornecedores.ProdFor_DescricaoProduto END AS Pro_descricao_for, CASE WHEN substring(vendaproduto.Pro_codnosso, 1, 18)   = '999999999999999999' THEN vendaproduto.VenPro_PreProduto ELSE produtos.Pro_descricao END AS produto, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.fornecedor.For_Nome,   dbo.produtos.Pro_CodEspecial, dbo.VendaProduto.VenPro_Vlimposto AS VlImposto, dbo.GrupoProduto.GrupoProduto_ordem AS ordem, dbo.VendaProduto.VenPro_VlDescontoProc AS Desconto,   dbo.fornecedor.For_Nome ,case when   Venda.Ven_TipoDesc = 'G' AND Venda.Ven_DescontoPorcProd > 0 THEN dbo.VendaProduto.VenPro_VlUnitario - (dbo.VendaProduto.VenPro_VlUnitario * (Venda.Ven_DescontoPorcProd/100)) ELSE case when Venda.Ven_TipoDesc = 'P' AND VendaProduto.VenPro_VlDescontoProc > 0 THEN dbo.VendaProduto.VenPro_VlUnitario - (dbo.VendaProduto.VenPro_VlUnitario * (VendaProduto.VenPro_VlDescontoProc/100)) ELSE VendaProduto.VenPro_VlUnitario END END AS vlunitario, case when   Venda.Ven_TipoDesc = 'G' AND Venda.Ven_DescontoPorcProd > 0 THEN ROUND(CAST (VendaProduto.VenPro_Quantidade *  (dbo.VendaProduto.VenPro_VlUnitario - (dbo.VendaProduto.VenPro_VlUnitario * (Venda.Ven_DescontoPorcProd/100))) AS decimal (6,2)),2) ELSE case when Venda.Ven_TipoDesc = 'P' AND VendaProduto.VenPro_VlDescontoProc > 0 THEN ROUND(CAST (VendaProduto.VenPro_Quantidade * (dbo.VendaProduto.VenPro_VlUnitario - (dbo.VendaProduto.VenPro_VlUnitario * (VendaProduto.VenPro_VlDescontoProc/100))) AS decimal (6,2)),2) ELSE VendaProduto.VenPro_VlItem END END AS vlitem FROM     dbo.VendaProduto WITH (NOLOCK) INNER JOIN dbo.VendaAmbiente WITH (NOLOCK) ON dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente AND dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre INNER JOIN dbo.produtos WITH (NOLOCK) ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.GrupoProduto WITH (NOLOCK) ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN dbo.ProdutosFornecedores WITH (NOLOCK) ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN dbo.fornecedor WITH (NOLOCK) ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo INNER JOIN dbo.Venda WITH (NOLOCK) ON dbo.VendaProduto.Ven_CodigoPre = dbo.Venda.Ven_CodigoPre WHERE  (dbo.VendaAmbiente.VenAmb_TpDoc =:pVenAmb_TpDoc) AND (dbo.VendaProduto.Ven_CodigoPre =:pVen_CodigoPre) AND (dbo.VendaProduto.VenPro_Quantidade > 0) AND (dbo.ProdutosFornecedores.ProdFor_Padrao = 1)
SELECT  VendaProduto.VenPro_Seq AS sequencia, VendaProduto.VenPro_SeqItem AS item, VendaProduto.Pro_codnosso AS codigo, produtos.Pro_unidade AS unidade, VendaAmbiente.VenAmb_Descricao AS ambiente, VendaProduto.CodAcabamento AS acabamento, VendaProduto.VenPro_Quantidade AS quantidade, VendaProduto.VenPro_VlUnitario AS vlunitario, VendaProduto.VenPro_VlItem AS vlitem, produtos.Pro_tp_peca AS Peca, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else ProdutosFornecedores.ProdFor_DescricaoProduto end Pro_descricao_for, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else produtos.Pro_descricao end produto , ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, fornecedor.For_Nome,  produtos.Pro_CodEspecial, VendaProduto.VenPro_Vlimposto AS VlImposto, GrupoProduto.GrupoProduto_ordem AS ordem,VenPro_VldescontoProc AS Desconto, fornecedor.For_Nome FROM VendaProduto WITH (NOLOCK) INNER JOIN VendaAmbiente WITH (NOLOCK) ON dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente AND dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre INNER JOIN produtos WITH (NOLOCK) ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN GrupoProduto WITH (NOLOCK) ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN ProdutosFornecedores WITH (NOLOCK) ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor WITH (NOLOCK) ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo WHERE (VendaAmbiente.VenAmb_TpDoc =:pVenAmb_TpDoc) and VendaProduto.Ven_CodigoPre =:pVen_CodigoPre and (VendaProduto.VenPro_Quantidade > 0) AND (dbo.ProdutosFornecedores.ProdFor_Padrao = 1) order by sequencia,item, ordem
SELECT  VendaProduto.VenPro_Seq AS sequencia, VendaProduto.VenPro_SeqItem AS item, VendaProduto.Pro_codnosso AS codigo, produtos.Pro_unidade AS unidade, VendaAmbiente.VenAmb_Descricao AS ambiente, VendaProduto.CodAcabamento AS acabamento, VendaProduto.VenPro_Quantidade AS quantidade, VendaProduto.VenPro_VlUnitario AS vlunitario, VendaProduto.VenPro_VlItem AS vlitem, produtos.Pro_tp_peca AS Peca, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else ProdutosFornecedores.ProdFor_DescricaoProduto end Pro_descricao_for, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else produtos.Pro_descricao end produto , ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, fornecedor.For_Nome, produtos.Pro_CodEspecial, VendaProduto.VenPro_Vlimposto AS VlImposto, GrupoProduto.GrupoProduto_ordem AS ordem,VenPro_VldescontoProc AS Desconto FROM VendaProduto WITH (NOLOCK) INNER JOIN VendaAmbiente WITH (NOLOCK) ON dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente AND dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre INNER JOIN produtos WITH (NOLOCK) ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN GrupoProduto WITH (NOLOCK) ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN ProdutosFornecedores WITH (NOLOCK) ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor WITH (NOLOCK) ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo WHERE (VendaAmbiente.VenAmb_TpDoc =:pVenAmb_TpDoc) and VendaProduto.Ven_CodigoPre =:pVen_CodigoPre and (VendaProduto.VenPro_Quantidade > 0)  and produtos.Pro_tp_peca= 'LUMIN
SELECT  VendaProduto.VenPro_Seq AS sequencia, VendaProduto.VenPro_SeqItem AS item, VendaProduto.Pro_codnosso AS codigo, produtos.Pro_unidade AS unidade, VendaAmbiente.VenAmb_Descricao AS ambiente, VendaProduto.CodAcabamento AS acabamento, VendaProduto.VenPro_Quantidade AS quantidade, VendaProduto.VenPro_VlUnitario AS vlunitario, VendaProduto.VenPro_VlItem AS vlitem, produtos.Pro_tp_peca AS Peca, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else ProdutosFornecedores.ProdFor_DescricaoProduto end Pro_descricao_for, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else produtos.Pro_descricao end produto , ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, fornecedor.For_Nome, produtos.Pro_CodEspecial, VendaProduto.VenPro_Vlimposto AS VlImposto, GrupoProduto.GrupoProduto_ordem AS ordem, VenPro_VldescontoProc AS Desconto FROM VendaProduto WITH (NOLOCK) INNER JOIN VendaAmbiente WITH (NOLOCK) ON dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente AND dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre INNER JOIN produtos WITH (NOLOCK) ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN GrupoProduto WITH (NOLOCK) ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN ProdutosFornecedores WITH (NOLOCK) ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor WITH (NOLOCK) ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo WHERE (VendaAmbiente.VenAmb_TpDoc =:pVenAmb_TpDoc) and VendaProduto.Ven_CodigoPre =:pVen_CodigoPre and (VendaProduto.VenPro_Quantidade > 0) And produtos.Pro_tp_peca<> 'LUMIN
SELECT  VendaProduto.VenPro_Seq AS sequencia, VendaProduto.VenPro_SeqItem AS item, VendaProduto.Pro_codnosso AS codigo, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else ProdutosFornecedores.ProdFor_DescricaoProduto end Pro_descricao_for, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else produtos.Pro_descricao end produto , produtos.Pro_unidade AS unidade, VendaAmbiente.VenAmb_Descricao AS ambiente, VendaProduto.CodAcabamento AS acabamento, VendaProduto.VenPro_Quantidade AS quantidade,  VendaProduto.VenPro_VlItem AS vlitem, produtos.Pro_tp_peca AS Peca,   ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, fornecedor.For_Nome, produtos.Pro_CodEspecial, VendaProduto.VenPro_Vlimposto AS VlImposto, GrupoProduto.GrupoProduto_ordem AS ordem,  VendaProduto.VenPro_vlunitario AS vlunitario,VenPro_VldescontoProc AS Desconto FROM VendaProduto WITH (NOLOCK) INNER JOIN VendaAmbiente WITH (NOLOCK) ON dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente AND dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre INNER JOIN produtos WITH (NOLOCK) ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN GrupoProduto WITH (NOLOCK) ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN ProdutosFornecedores WITH (NOLOCK) ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor WITH (NOLOCK) ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo WHERE (VendaAmbiente.VenAmb_TpDoc =:pVenAmb_TpDoc) and VendaProduto.Ven_CodigoPre =:pVen_CodigoPre and (VendaProduto.VenPro_Quantidade > 0) AND (dbo.ProdutosFornecedores.ProdFor_Padrao = 1) order by sequencia,item, ordem
SELECT  VendaProduto.VenPro_Seq AS sequencia, VendaProduto.VenPro_SeqItem AS item, VendaProduto.Pro_codnosso AS codigo, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else ProdutosFornecedores.ProdFor_DescricaoProduto end Pro_descricao_for, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else produtos.Pro_descricao end produto , produtos.Pro_unidade AS unidade, VendaAmbiente.VenAmb_Descricao AS ambiente, VendaProduto.CodAcabamento AS acabamento, VendaProduto.VenPro_Quantidade AS quantidade,  VendaProduto.VenPro_VlItem AS vlitem, produtos.Pro_tp_peca AS Peca,   ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, fornecedor.For_Nome, produtos.Pro_CodEspecial, VendaProduto.VenPro_Vlimposto AS VlImposto, GrupoProduto.GrupoProduto_ordem AS ordem,  VendaProduto.VenPro_vlunitario  AS vlunitario, VenPro_VldescontoProc AS Desconto FROM VendaProduto WITH (NOLOCK) INNER JOIN VendaAmbiente WITH (NOLOCK) ON dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente AND dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre INNER JOIN produtos WITH (NOLOCK) ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN GrupoProduto WITH (NOLOCK) ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN ProdutosFornecedores WITH (NOLOCK) ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor WITH (NOLOCK) ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo WHERE (VendaAmbiente.VenAmb_TpDoc =:pVenAmb_TpDoc) and VendaProduto.Ven_CodigoPre =:pVen_CodigoPre and (VendaProduto.VenPro_Quantidade > 0) And GrupoProduto.GrupoProduto_Codigo =1  AND (dbo.ProdutosFornecedores.ProdFor_Padrao = 1) order by sequencia,item, ordem
SELECT  VendaProduto.VenPro_Seq AS sequencia, VendaProduto.VenPro_SeqItem AS item, VendaProduto.Pro_codnosso AS codigo, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else ProdutosFornecedores.ProdFor_DescricaoProduto end Pro_descricao_for, case when substring(vendaproduto.Pro_codnosso, 1,18)='999999999999999999' then vendaproduto.VenPro_PreProduto else produtos.Pro_descricao end produto , produtos.Pro_unidade AS unidade, VendaAmbiente.VenAmb_Descricao AS ambiente, VendaProduto.CodAcabamento AS acabamento, VendaProduto.VenPro_Quantidade AS quantidade,  VendaProduto.VenPro_VlItem AS vlitem, produtos.Pro_tp_peca AS Peca,  ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, fornecedor.For_Nome, produtos.Pro_CodEspecial, VendaProduto.VenPro_Vlimposto AS VlImposto, GrupoProduto.GrupoProduto_ordem AS ordem,  VendaProduto.VenPro_vlunitario AS vlunitario, VenPro_VldescontoProc AS Desconto FROM VendaProduto WITH (NOLOCK) INNER JOIN VendaAmbiente WITH (NOLOCK) ON dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente AND dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre INNER JOIN produtos WITH (NOLOCK) ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN GrupoProduto WITH (NOLOCK) ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN ProdutosFornecedores WITH (NOLOCK) ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor WITH (NOLOCK) ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo WHERE (VendaAmbiente.VenAmb_TpDoc =:pVenAmb_TpDoc) and VendaProduto.Ven_CodigoPre =:pVen_CodigoPre and (VendaProduto.VenPro_Quantidade > 0) And GrupoProduto.GrupoProduto_Codigo > 1   AND (dbo.ProdutosFornecedores.ProdFor_Padrao = 1) order by sequencia,item, ordem
SELECT VendaServico.ven_codigopre,VendaServico.Sev_cod, Servicos.Serv_Desc , max(VendaServico.VenSer_DescPorc) as desconto,
SELECT * from Mensagem_Relatorio WITH (NOLOCK) where men_codigo= 14
SELECT produtos.Pro_tp_produto AS Grupo, produtos.Pro_tp_peca AS Peca, vendaProduto.VenPro_Seq AS Seq, SUM(VendaProduto.VenPro_Quantidade)  AS qtde, SUM(VendaProduto.VenPro_VlItem) AS Total, VendaAmbiente.VenAmb_Descricao AS Ambiente, GrupoProduto.GrupoProduto_ordem AS OrdemGrupo FROM VendaProduto WITH (NOLOCK) INNER JOIN produtos WITH (NOLOCK) ON VendaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN VendaAmbiente WITH (NOLOCK) ON VendaProduto.CodAmbiente = VendaAmbiente.CodAmbiente AND VendaProduto.Ven_CodigoPre = VendaAmbiente.VenAmb_NDocPre INNER JOIN GrupoProduto ON produtos.GrupoProduto_codigo = GrupoProduto.GrupoProduto_Codigo WHERE (VendaAmbiente.VenAmb_TpDoc = 'ORC') AND (VendaProduto.VenPro_Quantidade > 0) AND (VendaProduto.Ven_CodigoPre =:pVen_CodigoPre) GROUP BY produtos.Pro_tp_produto, produtos.Pro_tp_peca, VendaProduto.VenPro_Seq, VendaAmbiente.VenAmb_Descricao, GrupoProduto.GrupoProduto_ordem order by seq,OrdemGrupo
SELECT Funcionario.Fun_Nome AS eletricista, Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_CodigoPre, Clientes.Cli_Nome,
SELECT produtos.Pro_tp_produto AS Grupo, produtos.Pro_tp_peca AS Peca, vendaProduto.VenPro_Seq AS Seq, SUM(VendaProduto.VenPro_Quantidade)  AS qtde, SUM(VendaProduto.VenPro_VlItem) AS Total, VendaAmbiente.VenAmb_Descricao AS Ambiente, GrupoProduto.GrupoProduto_ordem AS OrdemGrupo FROM VendaProduto WITH (NOLOCK) INNER JOIN produtos WITH (NOLOCK) ON VendaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN VendaAmbiente WITH (NOLOCK) ON VendaProduto.CodAmbiente = VendaAmbiente.CodAmbiente AND VendaProduto.Ven_CodigoPre = VendaAmbiente.VenAmb_NDocPre INNER JOIN GrupoProduto ON produtos.GrupoProduto_codigo = GrupoProduto.GrupoProduto_Codigo WHERE (VendaAmbiente.VenAmb_TpDoc = 'PRO') AND (VendaProduto.VenPro_Quantidade > 0) AND (VendaProduto.Ven_CodigoPre =:pVen_CodigoPre) GROUP BY produtos.Pro_tp_produto, produtos.Pro_tp_peca, VendaProduto.VenPro_Seq, VendaAmbiente.VenAmb_Descricao, GrupoProduto.GrupoProduto_ordem order by seq,OrdemGrupo
select * from obras where obr_codigo=:codigo
SELECT avulso.*, Clientes.Cli_Fcomercial, Clientes.Cli_Fresidencial, Clientes.Cli_fax, Clientes.Cli_celular
SELECT produtos.Pro_tp_produto AS Pro_tp_produto, produtos.Pro_tp_peca AS Pro_tp_peca, Avulso_luminaria_det.avu_codigo_pre,Avulso_luminaria_det.Pro_codnosso, Avulso_luminaria_det.ald_seq, Avulso_luminaria_det.ald_seq_item,
SELECT produtos.Pro_tp_produto AS Pro_tp_produto, produtos.Pro_tp_peca AS Pro_tp_peca, Avulso_materiais_det.avu_codigo_pre,Avulso_materiais_det.Pro_codnosso, Avulso_materiais_det.ama_seq, Avulso_materiais_det.ama_seq_item,
SELECT contas_Receber_det.*, Modo.Mdo_nome AS mdo_nome FROM contas_receber INNER JOIN
SELECT dbo.Modo.Mdo_nome AS mdo_nome, dbo.Contas_receber_pag.Crp_data_pagamento, dbo.Contas_receber_pag.Crp_valor_pago
SELECT Ven_CodigoPre FROM VendaProduto where Ven_CodigoPre =:pVen_CodigoPre
select SisUsu_TelefoneWhatsapp from SisUsuarios where id=:pid
select Cli_celular from clientes where cli_codigo=:pcli_codigo
SELECT Funcionario.Fun_situacao, Funcionario.Fun_CPF, Funcionario.Fun_Nome, Cargo.Cargo_Nome, Setor.Setor_Nome
SELECT  Avulso.avu_codigo, dbo.Funcionario.Fun_CPF FROM Funcionario WITH (NOLOCK) LEFT OUTER JOIN
SELECT Funcionario.Fun_CPF, dbo.orcamento.orc_codigo FROM Funcionario WITH (NOLOCK) LEFT OUTER JOIN
SELECT  Funcionario.Fun_CPF, dbo.pedido.ped_codigo FROM Funcionario WITH (NOLOCK) LEFT OUTER JOIN
SELECT Ctp_codigo_vinculo FROM contas_apagar WITH (NOLOCK) where Ctp_vinculo ='PESSOAL' and Ctp_codigo_vinculo=:codigo
SELECT Ctr_codigo_vinculo FROM contas_receber WITH (NOLOCK) where Ctr_vinculo ='PESSOAL' and Ctr_codigo_vinculo=:codigo
select codambiente,descAmbiente, amb_situacao
SELECT count(dbo.Ambiente.CodAmbiente) as numero FROM dbo.pedido_materiais_det RIGHT OUTER JOIN
select * from ambiente where  CodAmbiente < 1000
SELECT cus_situacao,Cus_codigo,Cus_Nome,Cus_desconto1,
select For_codigo,Cus_Nome from Custo where for_codigo=:codfor
select For_codigo,Cus_Nome from Custo
SELECT * FROM CUSTO where Cus_codigo=:codigo
select max(Irl_codigo) as maximo from Indice_preco_log
select * from Indice_preco_log
SELECT * FROM Indice_preco where Ipr_custo=:codigo
select sev_cod, Serv_Desc, Serv_Pc_Eletricista,
select * from servicos WHERE SEV_COD <1000
select * from custo where for_codigo=:fornecedor and (cus_situacao='A') order by Cus_Nome
select * from custo where for_codigo=:fornecedor and ((cus_situacao='A') or (cus_codigo=:Pcus_codigo)) order by Cus_Nome
select * from custo where Cus_codigo=:codigo  and for_codigo=:fornecedor
SELECT dbo.Preco_Produto.Pre_Codindice, dbo.ProdutosFornecedores.For_codigo
SELECT * FROM Indice_preco where Ipr_descricao=:codigo and for_codigo =:pfor_codigo
SELECT Indice_preco.Ipr_situacao,Indice_preco.Ipr_custo,Indice_preco.Ipr_vl_Tabela,Indice_preco.Ipr_Lucro,Indice_preco.Ipr_vl_venda,
SELECT Indice_preco.Ipr_situacao,Indice_preco.Ipr_custo,Indice_preco.Ipr_vl_Tabela,Indice_preco.Ipr_Lucro,Indice_preco.Ipr_vl_venda,Indice_preco.Ipr_vl_Custo,
select For_codigo,ipr_descricao from indice_preco where for_codigo=:codfor
select For_codigo,ipr_descricao from indice_preco
select Ind_codigo from Indicacoes
SELECT produtos.*,ProdutosFornecedores.*
select * from produtos where Pro_codnosso=:codigo
select * from ProdutosFornecedores where Pro_codnosso=:produto
select * from ProdutosFornecedores
select * from ProdutosLocEstoque where Pro_codnosso=:produto
select * from ProdutosLocEstoque
select * from Preco_Produto where Pre_Codnosso=:produto and Pre_acabamento IS NOT NULL
select * from Preco_Produto
select * from Forma_Pagamento_Parcela where Fpg_codigo=:codigo order by Fpp_parcela
select * from Forma_Pagamento where Fpg_descricao=:descricao
select * from Forma_Pagamento where Fpg_codigo<>:codigo and Fpg_descricao=:descricao
select * from Forma_Pagamento_Parcela
select Fpg_situacao,Fpg_codigo, Fpg_descricao, Fpg_quantidade, fpg_orcamento, Fpg_acrescimo_lu, Fpg_acrescimo_ma, Fpg_acrescimo_se from Forma_Pagamento order by
select * from forma_pagamento
select VenEstVend_Quantidade from VendaEstoqueVendido where Ven_CodigoPre =:pVen_CodigoPre and Pro_codnosso =:pPro_codnosso
select Epr_estoque from Estoque_produto where Epr_Codnosso =:pEpr_Codnosso and Epr_Acabamento =:pEpr_Acabamento
select * from ordem_compra_det where Ocd_cod_venda =:pOcd_cod_venda and Pro_codnosso =:pPro_codnosso
SELECT Ven_CodigoPre,Ven_LiberaSeparacao, Ven_LiberaEntrega  FROM Venda
SELECT Ven_CodigoPre FROM Venda
SELECT produtos.Pro_descricao_for,produtos.Pro_Codbase,produtos.Pro_CodEspecial,produtos.Pro_descricao, VendaAmbiente.VenAmb_Descricao FROM VendaAmbiente INNER JOIN
select produtos.Pro_descricao_for,produtos.Pro_Codbase,produtos.Pro_CodEspecial,dbo.produtos.Pro_descricao
select max(cen_codigo) as maximo from Controle_entrega
select * from venda where ven_codigo=:codigo and ParSV_serie=:pParSV_serie and venda.ven_tipo = 'P' and venda.ven_situacao ='A'
SELECT * FROM controle_entrega_data
SELECT '' as VenAmb_Descricao, controle_entrega_prod.cen_codigo_pre, controle_entrega_prod.Pro_codnosso, controle_entrega_prod.cep_acabamento, controle_entrega_prod.cep_tipo, controle_entrega_prod.cep_quantidade_entregue, controle_entrega_prod.cep_quantidade, controle_entrega_prod.CodAmbiente, controle_entrega_prod.cep_quantidade_separada, controle_entrega_prod.cep_quantidade_separadaRet, controle_entrega_prod.cep_quantidade_entregueRET, controle_entrega_prod.CEP_QuantidadeDevolvida, controle_entrega_prod.CEP_QuantidadeDevolvidaEst, controle_entrega_prod.Cep_VendItem, controle_entrega_prod.Cep_VendSequencia, dbo.controle_entrega_prod.Cep_VendSequenciaItem, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, dbo.produtos.Pro_CodEspecial, Cep_TipoEntrega,Cep_Servico, controle_entrega_prod.CEP_CODIGO, controle_entrega_prod.CEP_obs  FROM controle_entrega_prod INNER JOIN Controle_entrega ON Controle_entrega.cen_codigo_pre = controle_entrega_prod.cen_codigo_pre INNER JOIN produtos ON controle_entrega_prod.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso WHERE (controle_entrega_prod.cen_codigo_pre =:Pcep_codigo_pre) and (controle_entrega_prod.cep_quantidade > 0) and (ProdutosFornecedores.ProdFor_Padrao = 1) and ((Cep_Servico is null) or (Cep_Servico = 0))
SELECT controle_entrega_prod.cen_codigo_pre, controle_entrega_prod.Pro_codnosso, controle_entrega_prod.cep_acabamento, controle_entrega_prod.cep_tipo,  controle_entrega_prod.cep_quantidade_entregue, controle_entrega_prod.cep_quantidade, controle_entrega_prod.CodAmbiente, controle_entrega_prod.cep_quantidade_separada,  controle_entrega_prod.cep_quantidade_separadaRet, controle_entrega_prod.cep_quantidade_entregueRET, controle_entrega_prod.CEP_QuantidadeDevolvida, controle_entrega_prod.CEP_QuantidadeDevolvidaEst, controle_entrega_prod.Cep_VendItem, dbo.controle_entrega_prod.Cep_VendSequencia, controle_entrega_prod.Cep_VendSequenciaItem, VendaAmbiente.VenAmb_Descricao, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, produtos.Pro_CodEspecial,Cep_TipoEntrega,Cep_Servico, controle_entrega_prod.CEP_CODIGO, controle_entrega_prod.CEP_obs  FROM dbo.controle_entrega_prod INNER JOIN dbo.Controle_entrega ON dbo.Controle_entrega.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre INNER JOIN dbo.Venda ON dbo.Controle_entrega.cen_pedido_avulso = dbo.Venda.Ven_codigo AND dbo.Controle_entrega.ParSV_serie = dbo.Venda.ParSV_serie INNER JOIN dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre AND dbo.controle_entrega_prod.Pro_codnosso = dbo.VendaProduto.Pro_codnosso AND dbo.controle_entrega_prod.CodAmbiente = dbo.VendaProduto.CodAmbiente AND dbo.controle_entrega_prod.cep_acabamento = dbo.VendaProduto.CodAcabamento AND dbo.controle_entrega_prod.cep_quantidade = dbo.VendaProduto.VenPro_Quantidade AND dbo.controle_entrega_prod.Cep_VendSequencia = dbo.VendaProduto.VenPro_Seq AND dbo.controle_entrega_prod.Cep_VendSequenciaItem = dbo.VendaProduto.VenPro_SeqItem AND dbo.controle_entrega_prod.Cep_VendItem = dbo.VendaProduto.VenPro_Item INNER JOIN dbo.VendaAmbiente ON dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso WHERE (controle_entrega_prod.cep_quantidade > 0) AND (Venda.Ven_Tipo = 'P') AND (Venda.Ven_Situacao = 'A') AND (VendaAmbiente.VenAmb_TpDoc = 'PRO')  and  (dbo.controle_entrega_prod.cen_codigo_pre =:Pcep_codigo_pre) and (ProdutosFornecedores.ProdFor_Padrao = 1) and ((Cep_Servico is null) or (Cep_Servico = 0)) order by controle_entrega_prod.Cep_VendSequencia, controle_entrega_prod.Cep_VendSequenciaItem
SELECT dbo.controle_entrega_prod.cen_codigo_pre, dbo.controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento, dbo.controle_entrega_prod.cep_tipo, dbo.controle_entrega_prod.cep_quantidade_entregue, dbo.controle_entrega_prod.cep_quantidade,  dbo.controle_entrega_prod.cep_quantidade_separada, dbo.controle_entrega_prod.cep_quantidade_separadaRet, dbo.controle_entrega_prod.cep_quantidade_entregueRET, dbo.controle_entrega_prod.CEP_QuantidadeDevolvida, dbo.controle_entrega_prod.CEP_QuantidadeDevolvidaEst,  dbo.controle_entrega_prod.Cep_TipoEntrega, dbo.controle_entrega_prod.cep_codigo, dbo.controle_entrega_prod.CEP_Obs, dbo.controle_entrega_prod.Cep_Servico, dbo.Servicos.Serv_Desc FROM     dbo.controle_entrega_prod INNER JOIN dbo.Controle_entrega ON dbo.Controle_entrega.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre INNER JOIN dbo.Venda ON dbo.Controle_entrega.cen_pedido_avulso = dbo.Venda.Ven_codigo AND dbo.Controle_entrega.ParSV_serie = dbo.Venda.ParSV_serie INNER JOIN dbo.VendaServico ON dbo.Venda.Ven_CodigoPre = dbo.VendaServico.Ven_codigopre AND dbo.controle_entrega_prod.Pro_codnosso = dbo.VendaServico.Sev_cod INNER JOIN dbo.Servicos ON dbo.VendaServico.Sev_cod = dbo.Servicos.sev_cod WHERE  (dbo.controle_entrega_prod.Cep_Servico = 1) and  (dbo.controle_entrega_prod.cep_quantidade > 0) AND (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') and (controle_entrega_prod.cen_codigo_pre =:Pcep_codigo_pre)
SELECT VendaProduto.Pro_codnosso, VendaProduto.codacabamento, VendaProduto.ven_codigopre, SUM(VendaProduto.venpro_quantidade) AS Quant, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_descricao,  ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, produtos.Pro_CodEspecial FROM VendaProduto INNER JOIN produtos ON VendaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso WHERE (VendaProduto.ven_codigopre =:codigo) and  ProdutosFornecedores.ProdFor_Padrao=1 and  VendaProduto.venpro_quantidade > 0 GROUP BY  VendaProduto.Pro_codnosso, VendaProduto.codacabamento, VendaProduto.ven_codigopre, ProdutosFornecedores.ProdFor_CodigoProduto, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto, produtos.Pro_CodEspecial
SELECT  SUM(dbo.DevolucaoProduto.DevPro_Quantidade) AS total FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE (dbo.Devolucao.Dev_situacao = 1) and DevolucaoProduto.Pro_codnosso  =:pPro_codnosso and DevolucaoProduto.CodAcabamento =:pCodAcabamento and Devolucao.ven_codigopre =:pven_codigopre and (Devolucao.Dev_migrado is null or  Devolucao.Dev_migrado = 0) AND  Devolucao.Dev_situacao =1
SELECT  SUM(dbo.DevolucaoProduto.DevPro_Quantidade) AS total FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE (DevolucaoProduto.DevPro_usuarioestoque is not null ) and DevolucaoProduto.Pro_codnosso  =:pPro_codnosso and DevolucaoProduto.CodAcabamento =:pCodAcabamento and Devolucao.ven_codigopre =:pven_codigopre and (Devolucao.Dev_migrado is null or  Devolucao.Dev_migrado = 0) AND  Devolucao.Dev_situacao =1
SELECT VendaProduto.Pro_codnosso,   VendaProduto.codacabamento, VendaProduto.ven_codigopre, VendaProduto.codambiente, VendaProduto.VenPro_Item, VendaProduto.VenPro_Seq, VendaProduto.VenPro_SeqItem, SUM(VendaProduto.venpro_quantidade) AS Quant, VendaAmbiente.VenAmb_Descricao, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, produtos.Pro_CodEspecial,  CAST(VendaProduto.venpro_obs AS VARCHAR(200)) as venpro_obs FROM VendaProduto INNER JOIN VendaAmbiente ON VendaProduto.CodAmbiente = VendaAmbiente.CodAmbiente AND VendaProduto.Ven_CodigoPre = VendaAmbiente.VenAmb_NDocPre INNER JOIN produtos ON VendaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso WHERE (VendaProduto.ven_codigopre =:codigo) and  ProdutosFornecedores.ProdFor_Padrao=1 and VendaProduto.venpro_quantidade > 0 GROUP BY  VendaProduto.Pro_codnosso, VendaProduto.codacabamento, VendaProduto.ven_codigopre,VendaProduto.codambiente,  VendaProduto.VenPro_Item, VendaProduto.VenPro_Seq, VendaProduto.VenPro_SeqItem, VendaAmbiente.VenAmb_Descricao, ProdutosFornecedores.ProdFor_CodigoProduto, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto, produtos.Pro_CodEspecial ,CAST(VendaProduto.venpro_obs AS VARCHAR(200)) order by VendaProduto.VenPro_Seq, VendaProduto.VenPro_SeqItem
SELECT  SUM(dbo.DevolucaoProduto.DevPro_Quantidade) AS total FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE (dbo.Devolucao.Dev_situacao = 1) and DevolucaoProduto.Pro_codnosso  =:pPro_codnosso and DevolucaoProduto.CodAcabamento =:pCodAcabamento  and Devolucao.ven_codigopre =:pven_codigopre and (Devolucao.Dev_migrado is null or  Devolucao.Dev_migrado = 0) and DevolucaoProduto.codambiente =:pcodambiente and DevolucaoProduto.DevPro_Seq =:pDevPro_Seq and DevolucaoProduto.DevPro_SeqItem =:pDevPro_SeqItem AND  Devolucao.Dev_situacao =1
SELECT  SUM(dbo.DevolucaoProduto.DevPro_Quantidade) AS total FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE (dbo.Devolucao.Dev_situacao = 1) and (DevolucaoProduto.DevPro_usuarioestoque is not null) and DevolucaoProduto.Pro_codnosso  =:pPro_codnosso and DevolucaoProduto.CodAcabamento =:pCodAcabamento  and Devolucao.ven_codigopre =:pven_codigopre and (Devolucao.Dev_migrado is null or  Devolucao.Dev_migrado = 0) and DevolucaoProduto.codambiente =:pcodambiente and DevolucaoProduto.DevPro_Seq =:pDevPro_Seq and DevolucaoProduto.DevPro_SeqItem =:pDevPro_SeqItem AND  Devolucao.Dev_situacao =1
select Pre_Codnosso, Pre_Acabamento from preco_produto where pre_codbarra=:codbar
SELECT dbo.VendaServico.Sev_cod, SUM(dbo.VendaServico.VenSer_quantidade) AS quant, dbo.Servicos.Serv_Desc FROM dbo.VendaServico INNER JOIN  dbo.Servicos ON dbo.VendaServico.Sev_cod = dbo.Servicos.sev_cod WHERE  (dbo.Servicos.Serv_Entrega = 1) and VendaServico.ven_codigopre =:codigo and VendaServico.VenSer_quantidade > 0  GROUP BY dbo.Servicos.Serv_Desc, dbo.VendaServico.Sev_cod
SELECT sum(dbo.DevolucaoServico.DevSer_quantidade) as total FROM     dbo.Devolucao INNER JOIN dbo.DevolucaoServico ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoServico.Dev_codigopre WHERE (dbo.Devolucao.Dev_situacao = 1) and DevolucaoServico.sev_cod =:psev_cod and (Devolucao.Dev_migrado is null or  Devolucao.Dev_migrado = 0) AND  Devolucao.Dev_situacao =1 and Devolucao.ven_codigopre =:pven_codigopre
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade) AS quantidade, dbo.VendaProduto.CodAcabamento AS acabamento, dbo.Venda.Ven_codigo AS codigoDoc, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.pld_codindice AS indices, dbo.VendaProduto.Emp_codigo, (SELECT SUM(Epr_estoque) AS Expr1  FROM      dbo.Estoque_produto  WHERE   (dbo.VendaProduto.Pro_codnosso = Epr_Codnosso) AND (dbo.VendaProduto.CodAcabamento = Epr_Acabamento) AND (Epr_estoque > - 1)) AS Epr_estoque FROM     dbo.Venda INNER JOIN dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre WHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.ParSV_serie =:PParSV_serie) AND (dbo.Venda.Ven_codigo =:PVen_codigo) AND (dbo.VendaProduto.VenPro_Quantidade > 0) GROUP BY dbo.VendaProduto.CodAcabamento, dbo.Venda.Ven_codigo, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.pld_codindice, dbo.VendaProduto.Emp_codigo
select ven_codigopre as precodigo from venda where ven_codigo=:pcodigo and ParSV_serie =:pParSV_serie and ven_tipo = 'P' and ven_situacao ='A'
SELECT (SELECT Clientes.Cli_Nome FROM Venda INNER JOIN Clientes ON Venda.Ven_CodVinculo = Clientes.Cli_Codigo WHERE venda.ven_codigo = RequisicaoEstoq.reqest_numdoc and venda.ParSV_serie = RequisicaoEstoq.ParSV_serie and venda.ven_situacao ='A' AND VENDA.ven_tipo ='P') AS CLIENTE, (SELECT Venda.Ven_CodVinculo FROM Venda WHERE venda.ven_codigo = RequisicaoEstoq.reqest_numdoc and venda.ParSV_serie = RequisicaoEstoq.ParSV_serie and venda.ven_situacao ='A' AND VENDA.ven_tipo ='P') AS CodigoCliente,'PEDIDO DE VENDA' AS tipo,case ReqEst_Situacao when 'A'  then 'ATIVO' else 'CANCELADO' end as situacao ,ReqEst_Codigo,ReqEst_TipoDoc,ReqEst_NumDoc,ReqEst_Data,ReqEst_Situacao FROM RequisicaoEstoq
select * from RequisicaoEstoqProd WHERE (ReqEst_Codigo = :pReqEst_Codigo)
SELECT Obras.Obr_tipoObra,Clientes.Cli_Nome, Obras.Obr_Descricao, Obras.Obr_Endereco, Obras.Obr_numero, Obras.Obr_complemento, Obras.Obr_Bairro,  Obras.Obr_CEP, Municipio.mun_nome, Municipio.mun_uf FROM venda INNER JOIN Obras ON dbo.Venda.Obr_codigo = Obras.Obr_Codigo INNER JOIN Clientes ON Obras.Cli_codigo = Clientes.Cli_Codigo INNER JOIN Municipio ON Obras.mun_codigo = Municipio.mun_codigo where venda.ven_tipo ='P' and venda.ven_situacao='A' and venda.ven_codigo =:pven_codigo and venda.ParSV_serie =:pParSV_serie
SELECT Clientes.Cli_Nome, Obras.Obr_Descricao,obras.Obr_Endereco,Obras.Obr_numero,Obras.Obr_complemento,Obras.Obr_Bairro, Municipio.mun_nome,Municipio.mun_uf, Obras.Obr_tipoObra,Obras.Obr_CEP FROM Obras INNER JOIN Clientes ON Obras.Cli_codigo = Clientes.Cli_Codigo INNER JOIN Municipio ON Obras.mun_codigo = Municipio.mun_codigo  LEFT OUTER JOIN Avulso ON Obras.Obr_Codigo = Avulso.Obr_Codigo where avulso.avu_codigo=:pcodigo
SELECT venda.Ven_TipoEntrega,0 AS requisicao, 'PEDIDO DE VENDA' as tipo, Venda.ParSV_serie as serie, Clientes.Cli_Nome as nome, Venda.Ven_codigo as codigo, Venda.Pasta_codigo as pasta ,CLIENTES.CLI_CODIGO, venda.ven_codigopre as codigo_pre  FROM Venda INNER JOIN Clientes ON Venda.Ven_CodVinculo = Clientes.Cli_Codigo WHERE (Venda.Ven_Tipo = 'P') AND (Venda.Ven_Situacao = 'A') AND (select count(ven_codigopre) from VendaProduto where  VendaProduto.ven_codigopre = venda.ven_codigopre and VenPro_Quantidade>0) > 0
SELECT venda.Ven_TipoEntrega, VENDA.Ven_CodVinculo AS CLI_CODIGO,  0.00 AS PASTA, 'PEDIDO DE VENDA' as tipo, dbo.Clientes.Cli_Nome AS nome, dbo.Venda.ParSV_serie AS serie, dbo.Venda.Ven_codigo AS codigo, dbo.Venda.Ven_CodigoPre AS Codigo_Pre,   dbo.RequisicaoEstoque('PRO', dbo.Venda.Ven_codigo) AS requisicao FROM dbo.Venda INNER JOIN dbo.Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo WHERE (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Requisicao = 1)
SELECT VendaAmbiente.VenAmb_Descricao
SELECT controle_entrega_data.Pro_codnosso, controle_entrega_data.cep_acabamento, SUM(controle_entrega_data.ced_quantidade) AS ced_quantidade, controle_entrega_data.cep_tipo, produtos.Pro_descricao,
select * from EtiquetaPronta where EtqPront_codigo=15
select *, CASE WHEN cen_modo ='A' then 'SIM' else 'N
SELECT Pasta.Pasta_DtFechamento FROM Venda LEFT OUTER JOIN
select * from venda where venda.Ven_codigo=:pVen_codigo and Venda.ParSV_serie=:pParSV_serie and ven_tipo = 'P'
SELECT Pasta.Pasta_DtFechamento, venda.Ven_DataConclusao FROM Venda LEFT OUTER JOIN
SELECT cen_codigo_pre, ced_data, Ced_ordemSeparacao
SELECT * FROM  controle_entrega_data where cen_codigo_pre =:pcen_codigo_pre and Ced_ordem =:pCed_ordem and cep_tipo ='E'
select (cep_quantidade - cep_quantidade_entregue) as resultado from controle_entrega_prod where cen_codigo_pre =:pcen_codigo_pre
SELECT cen_codigo_pre, ced_data, Ced_ordem
select * from Lancamento_estoque
SELECT * from Estoque_produto where epr_codnosso=:codigo and epr_acabamento=:acabamento and EstTp_Codigo=:pEstTp_Codigo
select For_Nome,For_codigo from fornecedor where for_classificacao='F' order by For_Nome
SELECT * from Estoque_produto where epr_codnosso=:codigo and epr_acabamento=:acabamento
SELECT Estoque_produto.Epr_Codnosso, Estoque_produto.Epr_Acabamento, Estoque_produto.Epr_estoque, Estoque_produto.Epr_PreEstoque, Estoque_produto.EstTp_Codigo,
select * from lancamento_estoque_det where les_codigo=:codigo and lesd_cod_produto=:produto and  lesd_acabamento=:acab
select * from lancamento_estoque_det where les_codigo=:codigo
SELECT * from Estoque_produto where epr_codnosso=:codigo and
select * from lancamento_estoque_det
SELECT Municipio.mun_codigo, Municipio.mun_nome, Municipio.mun_uf, Paises.Paises_Descricao
SELECT ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for, produtos.Pro_CodEspecial, produtos.Pro_tp_peca,
SELECT * FROM Estoque_produto where Epr_estoque < 0
SELECT * FROM Estoque_produto
select DBO.estoquefisicoEMPRESA(
SELECT dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_CodEspecial, dbo.produtos.Pro_descricao,
SELECT * fROM GrupoProduto ORDER BY GrupoProduto_Descricao
SELECT * fROM EstoqueTipo ORDER BY EstTp_Descricao
SELECT * fROM fabrica ORDER BY fab_Descricao
SELECT * fROM empresa ORDER BY empresa
SELECT TpPeca_Codigo fROM TipoPeca WHERE GrupoProduto_codigo=:pGrupoProduto_codigo ORDER BY TpPeca_Codigo
SELECT dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_CodEspecial, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_tp_produto,
select * from CategoriaVenda order by CatVen_Descricao
SELECT Venda.Ven_CodVinculo ,Venda.Ven_codigo, dbo.Venda.Ven_CodigoPre, dbo.Venda.Ven_Orcamento, dbo.Venda.ParSV_serie, dbo.Venda.Ven_DataEmissao,
SELECT Venda.Ven_CodVinculo, dbo.Venda.Ven_codigo, dbo.Venda.Ven_CodigoPre, dbo.Venda.Ven_Orcamento, dbo.Venda.ParSV_serie, dbo.Venda.Ven_DataEmissao, dbo.Venda.Ven_DataConclusao, 0.00 AS Ven_Totalserv,
SELECT Venda.Ven_CodVinculo ,dbo.Venda.Ven_codigo, dbo.Venda.Ven_CodigoPre, dbo.Venda.Ven_Orcamento, dbo.Venda.ParSV_serie, SUM(dbo.Venda.Ven_TotalProd * (VendaAtendente.VenAten_Porcentagem/100))
SELECT  venda.*, CategoriaVenda.CatVen_Descricao
SELECT Venda.Ven_CodVinculo , dbo.Venda.Ven_codigo, dbo.Venda.Ven_CodigoPre, dbo.Venda.Ven_Orcamento, dbo.Venda.ParSV_serie, SUM(dbo.Venda.Ven_TotalProd)
SELECT Venda.Ven_ValorCredito , dbo.Venda.Ven_codigopre, VendaIndicacao.VenInd_TpDoc, Indicacoes.Ind_Nome, Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_DataEmissao,
sELECT Clientes.Cli_Nome, Clientes.Cli_Codigo FROM Clientes INNER JOIN
select convert(varchar(10),VEN_CODIGO) + ' - ' +ParSV_serie as codigo, VEN_codigopre as pre_codigo from venda where Ven_CodVinculo=:codigo and ven_situacao = 'A' and ven_tipo='O'  order by ven_codigo
select convert(varchar(10),VEN_CODIGO) + ' - ' +ParSV_serie as codigo, VEN_codigopre as pre_codigo from venda where Ven_CodVinculo=:codigo and ven_situacao = 'A' and ven_tipo='P'  order by ven_codigo
SELECT dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, SUM(dbo.VendaProduto.VenPro_Quantidade) AS VenPro_Quantidade, ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_tp_peca,
select * from sispermissao where idgrupo =:vIdgrupo
select * from sispermissao where idusuario =:vIdusuario
select * from SisGrupo_Usuario order by descricao
select * from SisUsuarios order by nome
SELECT * from SisPermissaoEspecial
select  dbo.fncBase64_Encode(
SELECT SisUsuarios.fun_codigo FROM Funcionario INNER JOIN
SELECT     sysobjects.name, syscolumns.name AS Expr1, syscolumns.length, systypes.name AS Expr2
select * from Contas_apagar_pag where Cpp_data_pagamento>=:data1 and Cpp_data_pagamento<=:data2
select * from Contas_apagar_det where Ctp_dt_vencimento>=:data1 and Ctp_dt_vencimento<=:data2
SELECT * from contas_apagar where Ctp_codigo=0
SELECT * from contas_apagar_det where Ctp_codigo=0
select * from TipoContaFinanceira
SELECT top(1) contas_apagar.*, contas_apagar_det.Ctp_dt_vencimento, contas_apagar_det.Ctp_valor_vencimento
SELECT contas_apagar.*, Tipo_documento.Tpd_descricao AS desc_doc, TipoContaFinanceira.Tcf_descricao
select FechComis_Situacao from FechamentoComissao where FechComis_ContaUnica =:PFechComis_ContaUnica
SELECT For_codigo,For_Nome from fornecedor where For_Nome is not null order by for_nome
SELECT cli_codigo,cli_nome from clientes where cli_nome is not null order by cli_nome
SELECT FUN_CPF,fun_nome from funcionario where fun_nome is not null order by fun_nome
SELECT ind_codigo,ind_nome from indicacoes where ind_nome is not null order by ind_nome
SELECT Tra_codigo,Tra_Nome from Transportadora where Tra_Nome is not null order by Tra_Nome
SELECT Ctp_nome, Ctp_vinculo FROM contas_apagar GROUP BY Ctp_nome, Ctp_vinculo
select * from Contas_apagar_pag where Cpp_CodigoAgrupada =:pCpp_CodigoAgrupada
select * from Contas_apagar_pag where Ctp_codigo = null
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento WHERE Tpd_codigo < 1001 AND (Tpd_situacao='A')
select * from Centro_de_custo where Cdc_situacao='A' order by cdc_descricao
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_CreditoDebito ='D') or (Pco_CreditoDebito ='A')) and Pco_situacao='A'
select * from fornecedor where for_codigo < 999999999 ORDER BY for_nome
select * from Centro_de_custo where Cdc_situacao='A' or Cdc_codigo=:PCdc_codigo order by cdc_descricao
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_CreditoDebito ='D') or (Pco_CreditoDebito ='A')) AND  ((Pco_situacao='A') or (Pco_codigo=:PPco_codigo)) ORDER BY Pco_descricao
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento WHERE (Tpd_codigo < 1001) AND  ((Tpd_situacao='A') OR (Tpd_codigo=:PTpd_codigo))
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_CreditoDebito ='D') or (Pco_CreditoDebito ='A'))
select * from contas_apagar_det where contas_apagar_det.Ctp_codigo=:codigo order by contas_apagar_det.ctp_parcela
select top(1) Contas_apagar_pag.Cpp_cod_pag from Contas_apagar_pag where Contas_apagar_pag.ctp_codigo_det =:codigo
select * from Forma_Pagamento_fin where Fpf_codigo=:codigo
select * from clientes  ORDER BY cli_nome
select * from Funcionario  ORDER BY FUN_nome
select * from indicacoes ORDER BY ind_nome
select * from Transportadora ORDER BY Tra_Nome
select distinct Ctp_nome from contas_apagar where Ctp_vinculo ='OUTROS' order by Ctp_nome
select * from fornecedor  ORDER BY for_nome
SELECT contas_receber.Ctr_codigo AS CodigoConta, contas_receber_det.ctr_codigo_det AS CodigoContaParcela, contas_receber.Ctr_nome AS nome,
select * from Contas_RECEBER_pag where CtR_codigo = null
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento WHERE Tpd_codigo < 1001 and Tpd_situacao='A'
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_CreditoDebito ='C') OR (Pco_CreditoDebito ='A')) and pco_situacao='A'
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_CreditoDebito ='C') or (Pco_CreditoDebito ='A')) AND  ((Pco_situacao='A') or (Pco_codigo=:PPco_codigo)) ORDER BY Pco_descricao
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento WHERE (Tpd_codigo <1001) and ((Tpd_situacao='A') or (Tpd_codigo=:PTpd_codigo))
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_CreditoDebito ='C') or (Pco_CreditoDebito ='A'))
select top(1) Contas_receber_pag.Crp_cod_pag from Contas_receber_pag where Contas_receber_pag.ctr_codigo_det =:codigo
select distinct Ctr_nome from contas_receber where Ctr_vinculo ='OUTROS' order by Ctr_nome
select Par_ComissaoVincParc from pedido where ped_status='A' AND  ped_codigo=
select Par_ComissaoVincParc from avulso where avu_codigo=
select Par_ComissaoVincParc from Factura where Fact_tipo='FCT' and Fact_Codigo=
select Par_ComissaoVincParc from Factura where Fact_tipo='VDI' and Fact_Codigo=
SELECT  Ven_formaPagHist FROM dbo.Venda WHERE  (Ven_Tipo = 'P') AND ven_situacao='A' AND  ven_codigo=
select Ven_formaPagHist from venda where ven_tipo='P' and ven_situacao ='A' and ParSV_serie =:pParSV_serie and ven_codigo =:pven_codigo
select * from contas_receber_pag
select * from contas_receber_pag where ctr_codigo_det =:pctr_codigo_det
select * from Contas_receber_pag where Crp_data_pagamento>=:data1 and Crp_data_pagamento<=:data2
select * from Contas_receber_det where Ctr_dt_vencimento>=:data1 and Ctr_dt_vencimento<=:data2
SELECT Clientes.Cli_cnpj_cpf AS documento, Clientes.Cli_Endereco AS endereco, Clientes.Cli_numero AS numero,  Clientes.Cli_Nome AS nome, Clientes.Cli_Bairro AS bairro, Municipio.mun_nome AS cidade, Municipio.mun_uf AS estado, Clientes.Cli_rg_org AS rg, Clientes.Cli_CEP AS cep, Clientes.Cli_Fcomercial as fone2, Clientes.Cli_Fresidencial as fone1  FROM Clientes INNER JOIN Municipio ON Clientes.Cli_codcidade = Municipio.mun_codigo where clientes.cli_codigo =:Pcodigo
SELECT Municipio.mun_nome AS cidade, Municipio.mun_uf AS estado, fornecedor.For_cnpj_cpf AS documento, fornecedor.For_Nome AS nome, fornecedor.For_Endereco AS endereco, fornecedor.For_numero AS numero, ' AS rg, fornecedor.For_Bairro AS bairro, dbo.fornecedor.For_CEP AS cep, fornecedor.For_fone1 AS fone1, fornecedor.For_fone2 AS fone2 FROM Municipio INNER JOIN fornecedor ON Municipio.mun_codigo = fornecedor.For_codcidade where fornecedor.For_codigo =:Pcodigo
SELECT Municipio.mun_nome AS cidade, Municipio.mun_uf AS estado, ' AS rg, Funcionario.Fun_CPF AS documento, Funcionario.Fun_Nome AS nome, Funcionario.Fun_RG, Funcionario.Fun_Endereco AS endereco, Funcionario.Fun_numero AS numero, Funcionario.Fun_Bairro AS bairro, Funcionario.Fun_CEP AS cep, Funcionario.Fun_comercial AS fone2, Funcionario.Fun_residencial as fone1 FROM Municipio INNER JOIN Funcionario ON Municipio.mun_codigo = Funcionario.Fun_codcidade where Funcionario.Fun_CPF =:Pcodigo
SELECT TOP (1) Municipio.mun_nome AS cidade, Municipio.mun_uf AS estado, Indicacoes.Ind_Nome AS nome, Indicacoes_Detalhe.IndDet_Endereco AS endereco, Indicacoes_Detalhe.IndDet_numero AS numero,  Indicacoes_Detalhe.IndDet_Bairro AS bairro,Indicacoes_Detalhe.IndDet_CEP AS cep, Indicacoes_Detalhe.IndDet_comercial AS fone2, Indicacoes_Detalhe.IndDet_residencial AS fone1, Indicacoes_Detalhe.IndDet_CNPJCPF AS documento, Indicacoes_Detalhe.IndDet_RGInscricao AS rg  FROM  Municipio INNER JOIN Indicacoes_Detalhe ON Municipio.mun_codigo = Indicacoes_Detalhe.IndDet_CodCidade INNER JOIN Indicacoes ON Indicacoes_Detalhe.Ind_codigo = Indicacoes.Ind_codigo where Indicacoes.Ind_codigo =:Pcodigo
SELECT Ctr_nome AS nome, ' AS rg, ' AS documento, ' AS endereco, ' AS numero, ' AS cidade, ' AS estado, ' AS cep, ' AS bairro, ' AS fone1, ' AS fone2 FROM contas_receber where Ctr_codigo =:Pcodigo
SELECT contas_receber.*, Tipo_documento.Tpd_descricao AS desc_doc,  TipoContaFinanceira.Tcf_descricao
SELECT DISTINCT contas_receber_det.Ctr_codigo FROM dbo.contas_receber_det
SELECT Ctr_nome, Ctr_vinculo FROM contas_receber GROUP BY Ctr_nome, Ctr_vinculo
select max(id) as atual from sisbackup
SELECT     SisBackup.ID, SisUsuarios.Nome, SisBackup.Datahora, SisBackup.NomeArquivo,SisBackup.local_arquivo
select * from Forma_Pag_Parc_fin where Fpf_codigo=:codigo order by Ffp_parcela
select * from Forma_Pagamento_fin where Fpf_descricao=:descricao
select * from Forma_Pagamento_fin where Fpf_codigo<>:codigo and Fpf_descricao=:descricao
select max(fpf_codigo) as maximo from forma_pagamento_fin where fpf_codigo < 1000
select * from Forma_Pag_Parc_fin
select Fpf_situacao,Fpf_codigo, Fpf_descricao, Fpf_quantidade, Fpf_desconto, Fpf_acrescimo from forma_pagamento_fin order by
select Tpd_codigo, Tpd_descricao, Tpd_situacao from Tipo_documento
SELECT dbo.Modo.Mdo_codigo, dbo.Modo.Mdo_nome, dbo.Modo.Mdo_tipo, dbo.Modo.Mdo_situacao, dbo.SPEDFormaPagamento.SPEDFormaPag_Descricao,
select * from modo where mdo_codigo > 0
SELECT COUNT(contas_apagar_det.mdo_codigo) AS total, Modo.Mdo_codigo
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_situacao='A') or (pco_codigo=:ppco_codigo)) and ((Pco_CreditoDebito =:PPco_CreditoDebito) OR (Pco_CreditoDebito ='A')) ORDER BY Pco_descricao
select  sum(mba_valor) as credito  from  Movimento_bancario where mba_operacao = 'CR
select  sum(mba_valor) as debito  from  Movimento_bancario where mba_operacao = 'D
SELECT Movimento_bancario.*, Plano_Contas.Pco_descricao AS Pco_descricao, dbo.Centro_de_custo.Cdc_descricao AS Cdc_descricao
select * from TipoContaFinanceira where tcf_codigo < 1000
SELECT Contas_apagar_pag.Cpp_cod_pag,Contas_apagar_pag.Cpp_valor_pago, Contas_apagar_pag.Cpp_data_pagamento, contas_apagar_det.Ctp_situacao, Bancos_Caixas.Bcx_tipo,  Contas_Bancarias.Cba_numero,  Bancos_Caixas.Bcx_Nome,  Modo.Mdo_nome, Contas_apagar_pag.Cpp_numero_cheque,  contas_apagar.Ctp_cod_documento,  Tipo_documento.Tpd_descricao, contas_apagar.Ctp_nome, contas_apagar.Ctp_historico FROM contas_apagar_det INNER JOIN  Contas_apagar_pag ON  contas_apagar_det.Ctp_codigo =  Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det =  Contas_apagar_pag.Ctp_codigo_det INNER JOIN Contas_Bancarias ON  Contas_apagar_pag.cba_codigo =  Contas_Bancarias.Cba_codigo   INNER JOIN Bancos_Caixas ON  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo INNER JOIN Modo ON  Contas_apagar_pag.mdo_codigo =  Modo.Mdo_codigo INNER JOIN contas_apagar ON  contas_apagar_det.Ctp_codigo =  contas_apagar.Ctp_codigo LEFT OUTER JOIN Tipo_documento ON  contas_apagar.Tpd_codigo =  Tipo_documento.Tpd_codigo where (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento>=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2 and tcf_codigo < 1000
SELECT Contas_receber_pag.Crp_cod_pag,Bancos_Caixas.Bcx_tipo, contas_Receber_det.Ctr_situacao, Contas_receber_pag.Crp_valor_pago, Contas_receber_pag.Crp_data_pagamento, Tipo_documento.Tpd_descricao, Modo.Mdo_nome, Bancos_Caixas.Bcx_Nome, Contas_Bancarias.Cba_numero, dbo.contas_receber.Ctr_historico, contas_receber.Ctr_cod_documento, Contas_receber_pag.Crp_numero_cheque, contas_receber.Ctr_vinculo, contas_receber.Ctr_codigo_vinculo, contas_receber.Ctr_nome FROM  Bancos_Caixas INNER JOIN Contas_Bancarias ON dbo.Bancos_Caixas.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Emp_codigo = Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo = Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo = Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo = Contas_Bancarias.Emp_codigo INNER JOIN contas_Receber_det INNER JOIN Contas_receber_pag ON contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det AND contas_Receber_det.Ctr_codigo = Contas_receber_pag.Ctr_codigo ON Contas_Bancarias.Cba_codigo = Contas_receber_pag.cba_codigo INNER JOIN contas_receber ON dbo.contas_Receber_det.Ctr_codigo = contas_receber.Ctr_codigo INNER JOIN Modo ON Contas_receber_pag.Mdo_codigo = Modo.Mdo_codigo LEFT OUTER JOIN Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo where (contas_RECEBER_det.Ctr_situacao = 'S') and Contas_receber_pag.Crp_data_pagamento>=:data1 and Contas_receber_pag.Crp_data_pagamento <=:data2 and tcf_codigo < 1000
SELECT Movimento_bancario.Mba_historico,   Movimento_bancario.Mba_operacao,   Movimento_bancario.Mba_din_che_tra, Movimento_bancario.Mba_valor, Movimento_bancario.Mba_data_efetivacao, Movimento_bancario.Mba_data_emissao, Movimento_bancario.Mba_efetivado, Movimento_bancario.Mba_numero_cheque, Contas_Bancarias.Cba_numero, Bancos_Caixas.Bcx_Nome,Movimento_bancario.Cpp_cod_pag,Movimento_bancario.Crp_cod_pag FROM Contas_Bancarias INNER JOIN Bancos_Caixas ON   Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo INNER JOIN Movimento_bancario ON   Contas_Bancarias.Cba_codigo = Movimento_bancario.Cba_codigo   WHERE Mba_efetivado = 'S' and Mba_data_efetivacao>=:data1 and Mba_data_efetivacao<=:data2 and cpp_cod_pag is null and crp_cod_pag is null
SELECT Contas_Bancarias.Cba_numero,Bancos_Caixas.Bcx_Nome,Movimentos.Mvt_Numero_doc,Movimentos.Mvt_Credito_debito, Movimentos.Mvt_valor,Movimentos.Mvt_data,Movimentos.mvt_din_che_tran,Movimentos.Cpp_cod_pag,  Movimentos.Crp_cod_pag,Movimentos.Mvt_obs  FROM Movimentos INNER JOIN Contas_Bancarias ON Movimentos.Cba_codigo = Contas_Bancarias.Cba_codigo AND Movimentos.Cba_codigo = Contas_Bancarias.Cba_codigo AND Movimentos.Cba_codigo = Contas_Bancarias.Cba_codigo AND Movimentos.Cba_codigo = Contas_Bancarias.Cba_codigo AND Movimentos.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND Movimentos.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND Movimentos.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND Movimentos.Bcx_codigo = dbo.Contas_Bancarias.Bcx_codigo INNER JOIN Bancos_Caixas ON Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND dbo.Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo WHERE Movimentos.Mvt_data>=:data1 and Movimentos.Mvt_data<=:data2 and cpp_cod_pag is null and crp_cod_pag is null
SELECT contas_apagar_det.Ctp_situacao, dbo.contas_apagar.Ctp_cod_documento, dbo.Tipo_documento.Tpd_descricao,   contas_apagar.Ctp_historico, dbo.contas_apagar_det.Ctp_dt_vencimento, dbo.contas_apagar_det.Ctp_valor_vencimento,contas_apagar.ctp_nome  FROM contas_apagar_det INNER JOIN contas_apagar ON dbo.contas_apagar_det.Ctp_codigo = dbo.contas_apagar.Ctp_codigo  LEFT OUTER JOIN  Tipo_documento ON dbo.contas_apagar.Tpd_codigo = dbo.Tipo_documento.Tpd_codigo where ((contas_apagar_det.Ctp_situacao = 'N') OR (contas_apagar_det.Ctp_situacao IS NULL)) and contas_apagar_det.Ctp_DT_vencimento >=:data1 and contas_apagar_det.Ctp_DT_vencimento <=:data2 and tcf_codigo < 1000
SELECT contas_Receber_det.Ctr_situacao, Tipo_documento.Tpd_descricao, contas_receber.Ctr_historico,  contas_receber.Ctr_cod_documento,contas_Receber_det.Ctr_dt_vencimento, contas_Receber_det.Ctr_valor_vencimento,contas_receber.Ctr_nome FROM contas_receber INNER JOIN contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo LEFT OUTER JOIN Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo WHERE ((contas_Receber_det.Ctr_situacao <> 'S') OR (contas_Receber_det.Ctr_situacao IS NULL)) AND  contas_Receber_det.Ctr_dt_vencimento>=:data1 and contas_Receber_det.Ctr_dt_vencimento <=:data2 and tcf_codigo < 1000
SELECT Movimento_bancario.Mba_historico,   Movimento_bancario.Mba_operacao,   Movimento_bancario.Mba_din_che_tra, Movimento_bancario.Mba_valor, Movimento_bancario.Mba_data_efetivacao, Movimento_bancario.Mba_data_emissao, Movimento_bancario.Mba_efetivado, Movimento_bancario.Mba_numero_cheque, Contas_Bancarias.Cba_numero, Bancos_Caixas.Bcx_Nome,Movimento_bancario.Cpp_cod_pag,Movimento_bancario.Crp_cod_pag FROM Contas_Bancarias INNER JOIN Bancos_Caixas ON   Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo = Bancos_Caixas.Emp_codigo INNER JOIN Movimento_bancario ON   Contas_Bancarias.Cba_codigo = Movimento_bancario.Cba_codigo   WHERE Mba_efetivado = 'N' and Mba_data_emissao>=:data1 and Mba_data_emissao<=:data2 and cpp_cod_pag is null and crp_cod_pag is null
select Bancos_Caixas.Bcx_Nome, Bancos_Caixas.Bcx_agencia, Bancos_Caixas.Bcx_endereco, Bcx_numero,Bancos_Caixas.Bcx_situacao,
select Bcx_codigo from Contas_Bancarias where Bcx_codigo=:PBcx_codigo
SELECT Bancos_Caixas.Bcx_situacao, Bancos.Ban_Nome, Bancos_Caixas.Bcx_codigo, Bancos_Caixas.Bcx_tipo, Bancos_Caixas.Bcx_agencia, Municipio.mun_nome,
SELECT Bancos.ban_codigo,Contas_Bancarias.Cba_numero, Contas_Bancarias.Cba_dt_abertura, Contas_Bancarias.Cba_gerente,
select * from Contas_Bancarias where Cba_tipo_CONTA <> 'X'
select max(Tpd_codigo) as maximo from Tipo_documento where Tpd_codigo < 1000
select * from Tipo_Documento
select Cdc_situacao, Cdc_codigo, Cdc_descricao, Cdc_obs,
select * from centro_de_custo
select isnull(max(pco_codigo)+1,1) as ultimo from plano_contas
select count(pco_codigo) as qtd from plano_contas where pco_pai = :vCod
Select * from Plano_Contas where pco_codigo = :vpco_codigo
Select * from Plano_Contas where pco_pai=:vPai  And Pco_CreditoDebito = 'D'
Select * from Plano_Contas where pco_pai=:vPai  And Pco_CreditoDebito = 'C'
Select * from Plano_Contas where pco_pai=:vPai
Select * from Plano_Contas where pco_pai=:vPai  And (Pco_CreditoDebito = 'D' or Pco_CreditoDebito = 'A')
Select * from Plano_Contas where pco_pai=:vPai  And (Pco_CreditoDebito = 'C' or Pco_CreditoDebito = 'A')
select * from Plano_Contas
Select * from Plano_Contas where pco_pai=:vPai and pco_descricao is not null order by Pco_hierarquia
select * from plano_contas where pco_codigo = :vCod
Select Bancos_Caixas.Bcx_situacao,Cba_Saldo_inicial,Bancos_Caixas.Bcx_codigo,Bancos_Caixas.Bcx_Nome
SELECT Bancos_Caixas.Bcx_situacao, Bancos_Caixas.Bcx_codigo, Bancos_Caixas.Emp_codigo, Bancos_Caixas.Bcx_tipo, Bancos_Caixas.Bcx_Nome,
select * from mensagem_relatorio where men_codigo <> 12 and men_codigo <> 13
select * from mensagem_relatorio
select uni_codigo, uni_descricao, uni_situacao from unidades
select * from contas_Receber_det where Ctr_documento IS NOT NULL
select * from contas_Receber_pag where Ctr_codigo=:codigo and Ctr_parcelas=:parcela
select * from contas_Receber_det where Ctr_codigo =:codigo and Ctr_parcela=:parcela
select * from contas_apagar_det where Ctp_documento  IS NOT NULl
select * from contas_apagar_pag where Ctp_codigo =:codigo and Ctp_parcelas=:parcela
select * from contas_apagar_det where Ctp_codigo =:codigo and Ctp_parcela=:parcela
select * from Forma_Pagamento order by Fpg_descricao
SELECT Fun_CPF, Fun_Nome FROM Funcionario WHERE  (Fun_atendimento = 'SIM') ORDER BY Fun_Nome
SELECT contas_receber.Tpd_codigo, contas_Receber_det.Ctr_codigo, contas_Receber_det.Ctr_parcela, contas_Receber_det.Ctr_documento,
SELECT contas_Receber_det.*, Modo.Mdo_nome AS mdo_nome, Tipo_documento.Tpd_descricao AS Tpd_descricao,contas_receber.Ctr_cod_documento AS Ctr_cod_documento, contas_receber.Ctr_historico AS Ctr_historico
SELECT Ctp_historico FROM contas_apagar GROUP by Ctp_historico
SELECT Cdc_codigo, Cdc_descricao fROM Centro_de_custo ORDER BY Cdc_descricao
SELECT contas_apagar.Tpd_codigo AS Tpd_codigo, Modo.Mdo_nome AS mdo_nome, dbo.Tipo_documento.Tpd_descricao AS Tpd_descricao,
SELECT contas_apagar_det.usr_dt_hr_criacao AS usr_dt_hr_criacao, dbo.contas_apagar.Tpd_codigo AS Tpd_codigo, dbo.Modo.Mdo_nome AS mdo_nome,
SELECT Bancos_Caixas.Bcx_codigo, Contas_Bancarias.Cba_codigo, Bancos_Caixas.Emp_codigo, Contas_Bancarias.Cba_numero, Bancos_Caixas.Bcx_Nome, Bancos_Caixas.Bcx_tipo, Contas_Bancarias.Cba_tipo_conta, Bancos_Caixas.Bcx_agencia
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_situacao='A') or (pco_codigo=:ppco_codigo)) and ((Pco_CreditoDebito ='C') OR (Pco_CreditoDebito ='A')) ORDER BY Pco_descricao
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_situacao='A') or (pco_codigo=:ppco_codigo)) and ((Pco_CreditoDebito ='D') OR (Pco_CreditoDebito ='A')) ORDER BY Pco_descricao
SELECT Centro_de_custo.* FROM Centro_de_custo where Cdc_situacao='A' ORDER BY Cdc_descricao
SELECT Centro_de_custo.* FROM Centro_de_custo where Cdc_situacao='A' or Cdc_codigo=:PCdc_codigoOrigem or Cdc_codigo=:PCdc_codigoDestino ORDER BY Cdc_descricao
select *, mvt_codigo AS codigo, Mvt_Credito_debito as operacao, mvt_valor as valor, Mvt_data as data, mvt_obs as historico, Mvt_din_che_tran as realizado from movimentos
select *, Mba_codigo as codigo,Mba_operacao as operacao,Mba_valor as valor,Mba_data_emissao as data, Mba_historico as historico, Mba_din_che_tra as realizado,Mba_EFETIVADO as efetivado,Mba_DATA_EFETIVACAO as DATA_EF from movimento_bancario
select *, Mba_codigo as codigo,Mba_operacao as operacao,Mba_valor as valor,Mba_data_emissao as data, Mba_historico as historico, Mba_din_che_tra as realizado, Mba_EFETIVADO as efetivado,Mba_DATA_EFETIVACAO as DATA_EF from movimento_bancario
select * from transferencia where Tra_tipo=:tipo
SELECT Plano_Contas.Pco_descricao, contas_apagar.Ctp_cod_documento, contas_apagar_det.Ctp_dt_vencimento, contas_apagar_det.Ctp_valor_vencimento,contas_apagar_det.Ctp_situacao, Contas_apagar_pag.Cpp_numero_cheque, contas_apagar.Pco_codigo, contas_apagar.Ctp_vinculo,contas_apagar.Ctp_codigo_vinculo, contas_apagar.Ctp_nome FROM contas_apagar INNER JOIN contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo LEFT OUTER JOIN Contas_apagar_pag ON contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det LEFT OUTER JOIN Plano_Contas ON contas_apagar.Pco_codigo = Plano_Contas.Pco_codigo where contas_apagar_det.Ctp_dt_vencimento >=CONVERT(DATETIME,
select Ind_Nome,Ind_codigo from Indicacoes order by Ind_Nome
SELECT Venda.Ven_DataValidade, Venda.Ven_CodigoPre, dbo.Funcionario.Fun_Nome, dbo.Clientes.Cli_Nome, dbo.Clientes.Cli_Fcomercial, dbo.Clientes.Cli_Fresidencial, dbo.Venda.Ven_DataEmissao, dbo.Venda.Ven_codigo,  dbo.Venda.Ven_Total, dbo.Venda.Ven_DataFechaVenda, dbo.Venda.usr_dt_hr_criacao, dbo.VendaAtendente.VenAten_Porcentagem,  ROUND(dbo.VendaIndicacao.VenInd_Porcentagem / 100 * ROUND(dbo.VendaAtendente.VenAten_Porcentagem / 100 * dbo.Venda.Ven_Total, 2), 2) AS total,  dbo.VendaIndicacao.VenInd_TpDoc, dbo.Indicacoes.Ind_Nome, dbo.VendaIndicacao.Ind_Codigo, dbo.Motivo_devolucao.Mod_descricao  ,Venda.Ven_situacao  FROM  dbo.VendaIndicacao INNER JOIN dbo.Venda INNER JOIN  dbo.VendaAtendente INNER JOIN  dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre ON  dbo.VendaIndicacao.VenInd_NDocPre = dbo.Venda.Ven_CodigoPre INNER JOIN  dbo.Indicacoes ON dbo.VendaIndicacao.Ind_Codigo = dbo.Indicacoes.Ind_codigo LEFT OUTER JOIN  dbo.Motivo_devolucao ON dbo.Venda.Mod_codigo = dbo.Motivo_devolucao.Mod_codigo LEFT OUTER JOIN  dbo.Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo WHERE (VendaIndicacao.VenInd_TpDoc = 'ORC') and (VendaAtendente.VenAten_TpDoc = 'ORC') AND (VendaAtendente.VenAten_Porcentagem > 0)
SELECT Transferencia.Tra_codigo, Transferencia.Tra_tipo, dbo.Transferencia.Tra_situacao,Transferencia.Tra_operacao_origem,Transferencia.Tra_valor_origem,Transferencia.Tra_data_origem,Transferencia.Tra_historico_origem, Transferencia.Tra_realizado_origem, Contas_Bancarias_1.Cba_numero AS cba_numero_destino, Bancos_Caixas_1.Bcx_Nome AS bcx_nome_destino, Contas_Bancarias_1.Cba_codigo AS cba_destino,Contas_Bancarias_1.Bcx_codigo AS bcx_destino, Contas_Bancarias_2.Cba_codigo AS cba_origem, Contas_Bancarias_2.Bcx_codigo AS bcx_origem,Contas_Bancarias_2.Cba_numero AS cba_numero_origem, Bancos_Caixas_2.Bcx_Nome AS bcx_nome_origem FROM Bancos_Caixas Bancos_Caixas_1 INNER JOIN Contas_Bancarias Contas_Bancarias_1 ON Bancos_Caixas_1.Bcx_codigo = Contas_Bancarias_1.Bcx_codigo INNER JOIN Contas_Bancarias Contas_Bancarias_2 INNER JOIN Bancos_Caixas Bancos_Caixas_2 ON Contas_Bancarias_2.Bcx_codigo = Bancos_Caixas_2.Bcx_codigo AND  Contas_Bancarias_2.Bcx_codigo = Bancos_Caixas_2.Bcx_codigo INNER JOIN Transferencia ON Contas_Bancarias_2.Bcx_codigo = Transferencia.Tra_Bcx_origem AND Contas_Bancarias_2.Cba_codigo = Transferencia.Tra_Cba_origem ON Contas_Bancarias_1.Bcx_codigo = dbo.Transferencia.Tra_Bcx_destino AND Contas_Bancarias_1.Cba_codigo = dbo.Transferencia.Tra_Cba_destino where Transferencia.Tra_data_origem >=:data1 and Transferencia.Tra_data_origem <=:data2
SELECT fornecedor.For_Sigla, ProdutosFornecedores.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto, ProdutosFornecedores.ProdFor_DescricaoProduto,  ProdutosFornecedores.ProdFor_CodigoBarra, ProdutosFornecedores.ProdFor_prazo_entrega, ProdutosFornecedores.ProdFor_EmbFechada, ProdutosFornecedores.ProdFor_QtdeMinEmb,  case when produtos.Pro_ativo ='N' then 'N' else(CASE WHEN ProdutosFornecedores.ProdFor_Situacao = 1 THEN 'S' ELSE 'N' END) end AS ProdFor_Situacao, CASE WHEN ProdutosFornecedores.ProdFor_Padrao = 1 THEN 'S' ELSE 'N' END AS ProdFor_Padrao FROM ProdutosFornecedores INNER JOIN dbo.fornecedor ON ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo INNER JOIN produtos ON ProdutosFornecedores.Pro_codnosso = produtos.Pro_codnosso
SELECT fornecedor.For_Sigla, Bdprodutos.dbo.ProdutosFornecedores.Pro_codnosso, Bdprodutos.dbo.ProdutosFornecedores.ProdFor_CodigoProduto, Bdprodutos.dbo.ProdutosFornecedores.ProdFor_DescricaoProduto,  Bdprodutos.dbo.ProdutosFornecedores.ProdFor_CodigoBarra, Bdprodutos.dbo.ProdutosFornecedores.ProdFor_prazo_entrega, Bdprodutos.dbo.ProdutosFornecedores.ProdFor_EmbFechada, Bdprodutos.dbo.ProdutosFornecedores.ProdFor_QtdeMinEmb,  case when Bdprodutos.dbo.produtos.Pro_ativo ='N' then 'N' else(CASE WHEN Bdprodutos.dbo.ProdutosFornecedores.ProdFor_Situacao = 1 THEN 'S' ELSE 'N' END) end AS ProdFor_Situacao,  CASE WHEN Bdprodutos.dbo.ProdutosFornecedores.ProdFor_Padrao = 1 THEN 'S' ELSE 'N' END AS ProdFor_Padrao FROM Bdprodutos.dbo.ProdutosFornecedores INNER JOIN dbo.fornecedor ON Bdprodutos.dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo INNER JOIN Bdprodutos.dbo.produtos ON Bdprodutos.dbo.ProdutosFornecedores.Pro_codnosso = Bdprodutos.dbo.produtos.Pro_codnosso
SELECT dbo.Preco_Produto.Pre_Tabela,dbo.Preco_Produto.Pre_Codindice,dbo.Preco_Produto.Pre_est_min,dbo.Preco_Produto.Pre_Ativo,dbo.Preco_Produto.Pre_Codnosso,dbo.Preco_Produto.Pre_VlNFor,dbo.Preco_Produto.Pre_Custo,dbo.Preco_Produto.Pre_Venda,dbo.Indice_preco.Ipr_CodigoSigla,produtos.Pro_Codbase,Preco_Produto.Pre_EstMinCalcular,ProdutosFornecedores.ProdFor_CodigoProduto,fornecedor.For_Sigla, case when Preco_Produto.Pre_CodBarra is not null then Preco_Produto.Pre_CodBarra else '' end as Pre_CodBarra, CONVERT(VARCHAR(400),  COALESCE(  (SELECT CAST(pre_acabamento AS VARCHAR(10)) + ';' AS [text()]  FROM Preco_Produto AS O  WHERE O.Pre_Codnosso  = Preco_Produto.Pre_Codnosso  and   O.Pre_Tabela = Preco_Produto.Pre_Tabela and   o.Pre_Ativo = Preco_Produto.Pre_Ativo and case when o.Pre_CodBarra is not null then o.Pre_CodBarra else '' end = case when Preco_Produto.Pre_CodBarra is not null then Preco_Produto.Pre_CodBarra else '' end and o.Pre_est_min = Preco_Produto.Pre_est_min and o.Pre_EstMinCalcular =  Preco_Produto.Pre_EstMinCalcular ORDER BY O.Pre_Codnosso FOR XML PATH(''), TYPE).value('.[1]', 'VARCHAR(MAX)') , '')) AS CodAcabamento FROM dbo.Preco_Produto INNER JOIN dbo.produtos ON dbo.Preco_Produto.Pre_Codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Acabamento ON dbo.Preco_Produto.Pre_Acabamento = dbo.Acabamento.CodAcabamento INNER JOIN dbo.ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN dbo.fornecedor ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo LEFT OUTER JOIN dbo.Indice_preco ON dbo.ProdutosFornecedores.For_codigo = dbo.Indice_preco.for_codigo AND dbo.Preco_Produto.Pre_Codindice = dbo.Indice_preco.Ipr_descricao GROUP BY dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_Codindice, dbo.Preco_Produto.Pre_est_min, dbo.Preco_Produto.Pre_Ativo, dbo.Preco_Produto.Pre_Codnosso,  dbo.Indice_preco.Ipr_CodigoSigla,dbo.Preco_Produto.Pre_VlNFor,dbo.Preco_Produto.Pre_Custo,dbo.Preco_Produto.Pre_Venda,  produtos.Pro_Codbase,  Preco_Produto.Pre_EstMinCalcular,  case when Preco_Produto.Pre_CodBarra is not null then Preco_Produto.Pre_CodBarra else '' end,  ProdutosFornecedores.ProdFor_CodigoProduto,  fornecedor.For_Sigla, ProdutosFornecedores.For_codigo, produtos.Fab_Codigo
SELECT dbo.Preco_Produto.Pre_Tabela,  dbo.Preco_Produto.Pre_Codindice, dbo.Preco_Produto.Pre_est_min, dbo.Acabamento.CodAcabamento, dbo.Preco_Produto.Pre_Ativo, dbo.Preco_Produto.Pre_Codnosso, dbo.Indice_preco.Ipr_CodigoSigla,dbo.Preco_Produto.Pre_VlNFor,dbo.Preco_Produto.Pre_Custo,dbo.Preco_Produto.Pre_Venda, produtos.Pro_Codbase, Preco_Produto.Pre_EstMinCalcular, Preco_Produto.Pre_CodBarra, ProdutosFornecedores.ProdFor_CodigoProduto, fornecedor.For_Sigla FROM dbo.Preco_Produto INNER JOIN dbo.produtos ON dbo.Preco_Produto.Pre_Codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Acabamento ON dbo.Preco_Produto.Pre_Acabamento = dbo.Acabamento.CodAcabamento INNER JOIN dbo.ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN dbo.fornecedor ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo LEFT OUTER JOIN dbo.Indice_preco ON dbo.ProdutosFornecedores.For_codigo = dbo.Indice_preco.for_codigo AND dbo.Preco_Produto.Pre_Codindice = dbo.Indice_preco.Ipr_descricao
SELECT Bdprodutos.dbo.Preco_Produto.Pre_Tabela,  Bdprodutos.dbo.Preco_Produto.Pre_Codindice,  Bdprodutos.dbo.Preco_Produto.Pre_est_min,  Bdprodutos.dbo.Preco_Produto.Pre_Ativo,  Bdprodutos.dbo.Preco_Produto.Pre_Codnosso,Bdprodutos.dbo.Preco_Produto.Pre_VlNFor,Bdprodutos.dbo.Preco_Produto.Pre_Custo,Bdprodutos.dbo.Preco_Produto.Pre_Venda,  Indice_preco.Ipr_CodigoSigla,  Bdprodutos.dbo.produtos.Pro_Codbase,  Bdprodutos.dbo.Preco_Produto.Pre_EstMinCalcular,  Bdprodutos.dbo.ProdutosFornecedores.ProdFor_CodigoProduto,  fornecedor.For_Sigla,  case when Bdprodutos.dbo.Preco_Produto.Pre_CodBarra is not null then Bdprodutos.dbo.Preco_Produto.Pre_CodBarra else '' end as Pre_CodBarra,  CONVERT(VARCHAR(500), COALESCE(  (SELECT CAST(pre_acabamento AS VARCHAR(10)) + ';' AS [text()]  FROM Bdprodutos.dbo.Preco_Produto AS O  WHERE O.Pre_Codnosso  = Bdprodutos.dbo.Preco_Produto.Pre_Codnosso  and   O.Pre_Tabela = Bdprodutos.dbo.Preco_Produto.Pre_Tabela  and   o.Pre_Ativo = Bdprodutos.dbo.Preco_Produto.Pre_Ativo  and case when o.Pre_CodBarra is not null then o.Pre_CodBarra else '' end = case when Bdprodutos.dbo.Preco_Produto.Pre_CodBarra is not null   then Bdprodutos.dbo.Preco_Produto.Pre_CodBarra else '' end  and o.Pre_est_min = Bdprodutos.dbo.Preco_Produto.Pre_est_min  and o.Pre_EstMinCalcular =  Bdprodutos.dbo.Preco_Produto.Pre_EstMinCalcular  ORDER BY O.Pre_Codnosso  FOR XML PATH(''), TYPE).value('.[1]', 'VARCHAR(MAX)') , '')) AS CodAcabamento  FROM Bdprodutos.dbo.Preco_Produto INNER JOIN  Bdprodutos.dbo.produtos ON Bdprodutos.dbo.Preco_Produto.Pre_Codnosso = Bdprodutos.dbo.produtos.Pro_codnosso INNER JOIN  dbo.Acabamento ON Bdprodutos.dbo.Preco_Produto.Pre_Acabamento = dbo.Acabamento.CodAcabamento INNER JOIN  Bdprodutos.dbo.ProdutosFornecedores ON Bdprodutos.dbo.produtos.Pro_codnosso = Bdprodutos.dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN  dbo.fornecedor ON Bdprodutos.dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo LEFT OUTER JOIN  dbo.Indice_preco ON Bdprodutos.dbo.ProdutosFornecedores.For_codigo = dbo.Indice_preco.for_codigo AND Bdprodutos.dbo.Preco_Produto.Pre_Codindice = dbo.Indice_preco.Ipr_descricao  GROUP BY  Bdprodutos.dbo.Preco_Produto.Pre_Tabela,  Bdprodutos.dbo.Preco_Produto.Pre_Codindice,  Bdprodutos.dbo.Preco_Produto.Pre_est_min,  Bdprodutos.dbo.Preco_Produto.Pre_Ativo,  Bdprodutos.dbo.Preco_Produto.Pre_Codnosso,Bdprodutos.dbo.Preco_Produto.Pre_VlNFor,Bdprodutos.dbo.Preco_Produto.Pre_Custo,Bdprodutos.dbo.Preco_Produto.Pre_Venda,  dbo.Indice_preco.Ipr_CodigoSigla,  Bdprodutos.dbo.produtos.Pro_Codbase,  Bdprodutos.dbo.Preco_Produto.Pre_EstMinCalcular,  case when Bdprodutos.dbo.Preco_Produto.Pre_CodBarra is not null then Bdprodutos.dbo.Preco_Produto.Pre_CodBarra else '' end,  Bdprodutos.dbo.ProdutosFornecedores.ProdFor_CodigoProduto,  fornecedor.For_Sigla,  Bdprodutos.dbo.ProdutosFornecedores.For_codigo,  Bdprodutos.dbo.produtos.Fab_Codigo
SELECT Bdprodutos.dbo.Preco_Produto.Pre_Tabela, Bdprodutos.dbo.Preco_Produto.Pre_Codindice, Bdprodutos.dbo.Preco_Produto.Pre_est_min, dbo.Acabamento.DescAcabamento, dbo.Acabamento.codAcabamento, Bdprodutos.dbo.Preco_Produto.Pre_Ativo, Bdprodutos.dbo.Preco_Produto.Pre_Codnosso, dbo.Indice_preco.Ipr_CodigoSigla, Bdprodutos.dbo.Preco_Produto.Pre_EstMinCalcular, Bdprodutos.dbo.produtos.*, Bdprodutos.dbo.Preco_Produto.Pre_CodBarra,  Bdprodutos.dbo.ProdutosFornecedores.ProdFor_CodigoProduto,Bdprodutos.dbo.Preco_Produto.Pre_VlNFor,Bdprodutos.dbo.Preco_Produto.Pre_Custo,Bdprodutos.dbo.Preco_Produto.Pre_Venda, fornecedor.For_Sigla FROM bdprodutos.dbo.Preco_Produto INNER JOIN Bdprodutos.dbo.produtos ON Bdprodutos.dbo.Preco_Produto.Pre_Codnosso = Bdprodutos.dbo.produtos.Pro_codnosso INNER JOIN dbo.Acabamento ON Bdprodutos.dbo.Preco_Produto.Pre_Acabamento = dbo.Acabamento.CodAcabamento INNER JOIN Bdprodutos.dbo.ProdutosFornecedores ON Bdprodutos.dbo.produtos.Pro_codnosso = Bdprodutos.dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN dbo.fornecedor ON Bdprodutos.dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo LEFT OUTER JOIN dbo.Indice_preco ON Bdprodutos.dbo.ProdutosFornecedores.For_codigo = dbo.Indice_preco.for_codigo AND Bdprodutos.dbo.Preco_Produto.Pre_Codindice = dbo.Indice_preco.Ipr_descricao
SELECT produtos.*, fornecedor.For_sigla, dbo.TipoPeca.TpPeca_Sigla, ProdFor_CodigoProduto     FROM produtosFornecedores INNER JOIN fornecedor ON ProdutosFornecedores.For_codigo = fornecedor.For_codigo INNER JOIN produtos INNER JOIN TipoPeca ON produtos.GrupoProduto_codigo = TipoPeca.GrupoProduto_codigo  AND produtos.Pro_tp_peca = TipoPeca.TpPeca_Codigo ON ProdutosFornecedores.Pro_codnosso = produtos.Pro_codnosso
SELECT bdprodutos.dbo.produtos.*,bdprincipal.dbo.fornecedor.For_sigla, dbo.TipoPeca.TpPeca_Sigla, ProdFor_CodigoProduto FROM bdprodutos.dbo.produtosFornecedores INNER JOIN bdprincipal.dbo.fornecedor ON bdprodutos.dbo.ProdutosFornecedores.For_codigo = bdprincipal.dbo.fornecedor.For_codigo INNER JOIN bdprodutos.dbo.produtos INNER JOIN bdprincipal.dbo.TipoPeca ON bdprodutos.dbo.produtos.GrupoProduto_codigo = bdprincipal.dbo.TipoPeca.GrupoProduto_codigo  AND bdprodutos.dbo.produtos.Pro_tp_peca = bdprincipal.dbo.TipoPeca.TpPeca_Codigo ON bdprodutos.dbo.ProdutosFornecedores.Pro_codnosso = bdprodutos.dbo.produtos.Pro_codnosso
select ProdRel_codigo, ProdRel_Descricao from ProdutosRelacionados where ProdRel_Situacao = 1 order by ProdRel_Descricao
select ProdRel_codigo from ProdutosRelacionadosDet where Pro_codnosso =:pPro_codnosso and CodAcabamento =:pCodAcabamento
SELECT sum(Contas_apagar_pag.Cpp_valor_pago) as Cpp_valor_pago  FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON  contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = Contas_apagar_pag.Ctp_codigo_det INNER JOIN Contas_Bancarias ON  contas_apagar_det.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Contas_apagar_pag.cba_codigo =  Contas_Bancarias.Cba_codigo INNER JOIN Bancos_Caixas ON  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'B') AND (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento>=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2 and Contas_apagar.tcf_codigo < 1000
SELECT sum(Contas_receber_pag.Crp_valor_pago) as Crp_valor_pago  FROM Bancos_Caixas INNER JOIN Contas_Bancarias ON  Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND  Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND  Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo INNER JOIN contas_Receber_det INNER JOIN Contas_receber_pag ON  contas_Receber_det.Ctr_codigo_det =  Contas_receber_pag.Ctr_codigo_det AND contas_Receber_det.Ctr_codigo = Contas_receber_pag.Ctr_codigo ON Contas_Bancarias.Cba_codigo =  Contas_receber_pag.cba_codigo  INNER JOIN contas_receber ON contas_receber_det.Ctr_codigo = contas_receber.Ctr_codigo  WHERE (Bancos_Caixas.Bcx_tipo = 'B') AND (contas_Receber_det.Ctr_situacao = 'S') and Contas_receber_pag.Crp_data_pagamento >=:data1 and Contas_receber_pag.Crp_data_pagamento <=:data2 and Contas_receber.tcf_codigo < 1000
SELECT sum(Contas_apagar_pag.Cpp_valor_pago) as Cpp_valor_pago  FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON  contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = Contas_apagar_pag.Ctp_codigo_det INNER JOIN Contas_Bancarias ON  contas_apagar_det.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Contas_apagar_pag.cba_codigo =  Contas_Bancarias.Cba_codigo INNER JOIN Bancos_Caixas ON  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'C') AND (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento>=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2 and Contas_apagar.tcf_codigo < 1000
SELECT sum(Contas_receber_pag.Crp_valor_pago) as Crp_valor_pago  FROM Bancos_Caixas INNER JOIN Contas_Bancarias ON  Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo = Contas_Bancarias.Bcx_codigo AND  Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND Bancos_Caixas.Bcx_codigo =  Contas_Bancarias.Bcx_codigo AND  Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Bancos_Caixas.Emp_codigo =  Contas_Bancarias.Emp_codigo INNER JOIN contas_Receber_det INNER JOIN Contas_receber_pag ON  contas_Receber_det.Ctr_codigo_det =  Contas_receber_pag.Ctr_codigo_det AND contas_Receber_det.Ctr_codigo = Contas_receber_pag.Ctr_codigo ON Contas_Bancarias.Cba_codigo =  Contas_receber_pag.cba_codigo  INNER JOIN contas_receber ON contas_receber_det.Ctr_codigo = contas_receber.Ctr_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'C') AND (contas_Receber_det.Ctr_situacao = 'S') and Contas_receber_pag.Crp_data_pagamento >=:data1 and Contas_receber_pag.Crp_data_pagamento <=:data2 and Contas_receber.tcf_codigo < 1000
SELECT sum(Contas_receber_pag.Crp_valor_pago) as Crp_valor_pago FROM contas_Receber_det INNER JOIN Contas_receber_pag ON dbo.contas_Receber_det.Ctr_codigo = Contas_receber_pag.Ctr_codigo AND contas_Receber_det.Ctr_codigo_det = Contas_receber_pag.Ctr_codigo_det  INNER JOIN contas_receber ON contas_receber_det.Ctr_codigo = contas_receber.Ctr_codigo WHERE  (dbo.contas_Receber_det.Ctr_situacao = 'S') AND (dbo.Contas_receber_pag.Crp_valor_pago IS NOT NULL) and Contas_receber_pag.CrP_data_pagamento =:data and Contas_receber.tcf_codigo < 1000
SELECT sum(Contas_apagar_pag.Cpp_valor_pago) as Cpp_valor_pago FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON dbo.contas_apagar_det.Ctp_codigo = dbo.Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = dbo.Contas_apagar_pag.Ctp_codigo_det  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo WHERE  (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_valor_pago IS NOT NULL AND Contas_apagar_pag.Cpp_data_pagamento=:DATA and Contas_apagar.tcf_codigo < 1000
select * from Movimento_bancario where Mba_data_EFETIVACAO =:data1 and Mba_efetivado = 'S' and cpp_cod_pag is null and crp_cod_pag is null
select * from Movimentos where (Mvt_data =:data1) and cpp_cod_pag is null and crp_cod_pag is null
SELECT sum(Ctr_valor_vencimento) as Ctr_valor_vencimento FROM  contas_Receber_det   INNER JOIN contas_receber ON contas_receber_det.Ctr_codigo = contas_receber.Ctr_codigo WHERE  Ctr_dt_vencimento=:data and (Ctr_valor_vencimento IS NOT NULL) AND (Ctr_situacao = 'N' OR ctr_situacao IS NULL) and Contas_receber.tcf_codigo < 1000
SELECT sum(Contas_receber_pag.Crp_valor_pago) as Crp_valor_pago FROM contas_Receber_det INNER JOIN Contas_receber_pag ON dbo.contas_Receber_det.Ctr_codigo = dbo.Contas_receber_pag.Ctr_codigo AND contas_Receber_det.Ctr_codigo_det = dbo.Contas_receber_pag.Ctr_codigo_det   INNER JOIN contas_receber ON contas_receber_det.Ctr_codigo = contas_receber.Ctr_codigo   WHERE Contas_receber_pag.Crp_data_pagamento=:data and (contas_Receber_det.Ctr_situacao = 'S') AND (Contas_receber_pag.Crp_valor_pago IS NOT NULL) and Contas_receber.tcf_codigo < 1000
SELECT sum(Ctp_valor_vencimento) as Ctp_valor_vencimento FROM contas_apagar_det  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo WHERE ((Ctp_situacao = 'N') OR (Ctp_situacao IS NULL)) AND (Ctp_valor_vencimento IS NOT NULL) and Ctp_dt_vencimento =:data and Contas_apagar.tcf_codigo < 1000
SELECT sum(Contas_apagar_pag.Cpp_valor_pago) as Cpp_valor_pago FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON dbo.contas_apagar_det.Ctp_codigo = dbo.Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = dbo.Contas_apagar_pag.Ctp_codigo_det  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo WHERE Contas_apagar_pag.Cpp_data_pagamento =:data and (contas_apagar_det.Ctp_situacao = 'S') AND (Contas_apagar_pag.Cpp_valor_pago IS NOT NULL) and Contas_apagar.tcf_codigo < 1000
select * from Movimento_bancario where (Mba_data_emissao =:data1) and MBA_EFETIVADO = 'N' and cpp_cod_pag is null and crp_cod_pag is null
select * from Movimento_bancario where (Mba_data_efetivacao =:data1) and MBA_EFETIVADO = 'S' and cpp_cod_pag is null and crp_cod_pag is null
SELECT sum(Ctp_valor_vencimento) as Ctp_valor_vencimento FROM contas_apagar_det  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo  where ((Ctp_situacao = 'N') OR (Ctp_situacao IS NULL)) AND (Ctp_valor_vencimento IS NOT NULL) and Ctp_dt_vencimento >=:data1 and Ctp_dt_vencimento <=:data2 and Contas_apagar.tcf_codigo < 1000
select * from Movimento_bancario where (Mba_data_emissao >=:data1) AND Mba_data_emissao <=:data2 and MBA_EFETIVADO = 'N' and cpp_cod_pag is null and crp_cod_pag is null
SELECT sum(Ctr_valor_vencimento) as Ctr_valor_vencimento FROM  contas_Receber_det  INNER JOIN contas_receber ON contas_receber_det.Ctr_codigo = contas_receber.Ctr_codigo  where  Ctr_dt_vencimento>=:data1 and Ctr_dt_vencimento<=:data2 and (Ctr_valor_vencimento IS NOT NULL) AND (Ctr_situacao = 'N' OR ctr_situacao IS NULL) and Contas_receber.tcf_codigo < 1000
SELECT  SUM(Mba_valor) AS total, Mba_operacao, Mba_efetivado,Mba_data_efetivacao,cpp_cod_pag,crp_cod_pag FROM Movimento_bancario
SELECT sum(Contas_apagar_pag.Cpp_valor_pago) as Cpp_valor_pago  FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON  contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = Contas_apagar_pag.Ctp_codigo_det INNER JOIN Contas_Bancarias ON Contas_apagar_pag.cba_codigo =  Contas_Bancarias.Cba_codigo INNER JOIN Bancos_Caixas ON  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'B') AND (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento>=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2 and Contas_apagar.tcf_codigo < 1000
SELECT SUM(Mvt_valor) AS TOTAL, Mvt_Credito_debito,Mvt_data,cpp_cod_pag,crp_cod_pag FROM Movimentos
SELECT sum(Contas_apagar_pag.Cpp_valor_pago) as Cpp_valor_pago  FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON  contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = Contas_apagar_pag.Ctp_codigo_det INNER JOIN Contas_Bancarias ON  Contas_apagar_pag.cba_codigo =  Contas_Bancarias.Cba_codigo INNER JOIN Bancos_Caixas ON  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'C') AND (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento>=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2 and Contas_apagar.tcf_codigo < 1000
SELECT Bancos_Caixas.Bcx_tipo, Contas_Bancarias.Cba_Saldo_inicial AS SALDO FROM Bancos_Caixas INNER JOIN
SELECT contas_Receber_det.Ctr_situacao, Contas_receber_pag.Crp_valor_pago, dbo.Contas_receber_pag.Crp_data_pagamento FROM contas_Receber_det INNER JOIN Contas_receber_pag ON dbo.contas_Receber_det.Ctr_codigo = Contas_receber_pag.Ctr_codigo AND contas_Receber_det.Ctr_codigo_det = Contas_receber_pag.Ctr_codigo_det  where  (dbo.contas_Receber_det.Ctr_situacao = 'S') AND (dbo.Contas_receber_pag.Crp_valor_pago IS NOT NULL) and Contas_receber_pag.CrP_data_pagamento =:data
SELECT contas_apagar_det.Ctp_situacao, Contas_apagar_pag.Cpp_valor_pago, dbo.Contas_apagar_pag.Cpp_data_pagamento FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON dbo.contas_apagar_det.Ctp_codigo = dbo.Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = dbo.Contas_apagar_pag.Ctp_codigo_det  where (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_valor_pago IS NOT NULL AND Contas_apagar_pag.Cpp_data_pagamento=:DATA
SELECT Ctr_codigo, Ctr_dt_vencimento, Ctr_valor_vencimento, Ctr_situacao FROM  contas_Receber_det where  Ctr_dt_vencimento=:data and (Ctr_valor_vencimento IS NOT NULL) AND (Ctr_situacao = 'N' OR ctr_situacao IS NULL)
SELECT contas_Receber_det.Ctr_situacao, Contas_receber_pag.Crp_valor_pago, dbo.Contas_receber_pag.Crp_data_pagamento FROM contas_Receber_det INNER JOIN Contas_receber_pag ON dbo.contas_Receber_det.Ctr_codigo = dbo.Contas_receber_pag.Ctr_codigo AND contas_Receber_det.Ctr_parcela = dbo.Contas_receber_pag.Ctr_parcelas where Contas_receber_pag.Crp_data_pagamento=:data and (contas_Receber_det.Ctr_situacao = 'S') AND (Contas_receber_pag.Crp_valor_pago IS NOT NULL)
SELECT Ctp_dt_vencimento, Ctp_valor_vencimento, Ctp_situacao FROM contas_apagar_det  where ((Ctp_situacao = 'N') OR (Ctp_situacao IS NULL)) AND (Ctp_valor_vencimento IS NOT NULL) and Ctp_dt_vencimento =:data
SELECT contas_apagar_det.Ctp_situacao, dbo.Contas_apagar_pag.Cpp_valor_pago, dbo.Contas_apagar_pag.Cpp_data_pagamento  FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON dbo.contas_apagar_det.Ctp_codigo = dbo.Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = dbo.Contas_apagar_pag.Ctp_codigo_det  where Contas_apagar_pag.Cpp_data_pagamento =:data and (contas_apagar_det.Ctp_situacao = 'S') AND (Contas_apagar_pag.Cpp_valor_pago IS NOT NULL)
SELECT Ctr_codigo, Ctr_dt_vencimento, Ctr_valor_vencimento, Ctr_situacao FROM  contas_Receber_det where  Ctr_dt_vencimento>=:data1 and Ctr_dt_vencimento<=:data2 and (Ctr_valor_vencimento IS NOT NULL) AND (Ctr_situacao = 'N' OR ctr_situacao IS NULL)
SELECT pedido.ped_codigo, pedido.ped_codigo_pre, pedido.cli_codigo, pedido.ped_arquiteta, pedido.ped_dt_emissao, pedido.ped_dt_fechamento, pedido.ped_cliente, pedido.ped_tl_geral_luminaria + pedido.ped_tl_geral_materiais + pedido.ped_tl_geral_servico AS total, pedido.ped_Descricao, pedido.ped_tl_geral_orcamento, Clientes.Cli_Nome, Funcionario.Fun_Nome, pedido.ped_tl_geral_luminaria, pedido.ped_tl_geral_materiais, pedido.ped_tl_geral_servico FROM pedido INNER JOIN Clientes ON pedido.cli_codigo = Clientes.Cli_Codigo INNER JOIN VendaAtendente ON pedido.ped_codigo_pre = VendaAtendente.VenAten_NDocPre INNER JOIN Funcionario ON VendaAtendente.Fun_Codigo = Funcionario.Fun_CPF where pedido.ped_dt_fechamento>=:data1 and pedido.ped_dt_fechamento<=:data2 and pedido.ped_status='A'  AND (VendaAtendente.VenAten_TpDoc = 'PRO')
SELECT Clientes.Cli_Nome, dbo.pedido.ped_codigo, pedido.cli_codigo, '1' as serie  FROM pedido INNER JOIN Clientes ON dbo.pedido.cli_codigo = dbo.Clientes.Cli_Codigo LEFT OUTER JOIN  Ent_devolucao ON dbo.pedido.ped_codigo = dbo.Ent_devolucao.ped_codigo LEFT OUTER JOIN Saida_complementacao ON dbo.pedido.ped_codigo = dbo.Saida_complementacao.ped_codigo  WHERE ((Ent_devolucao.ped_codigo IS NOT NULL) OR (dbo.Saida_complementacao.ped_codigo IS NOT NULL))
SELECT     dbo.Clientes.Cli_Nome , dbo.Venda.Ven_codigo as ped_codigo,Clientes.Cli_codigo ,dbo.Venda.ParSV_serie as serie
SELECT Ent_devolucao.edv_codigo, Ent_devolucao.edv_status, Ent_devolucao.ped_codigo, Servicos.Serv_Desc, Ent_devolucao_servico_det.ese_vl_unitario,  Ent_devolucao_servico_det.ese_vl_item, Ent_devolucao_servico_det.ese_quant_dev FROM Ent_devolucao INNER JOIN Ent_devolucao_servico_det ON Ent_devolucao.edv_codigo_pre = Ent_devolucao_servico_det.edv_codigo_pre INNER JOIN Servicos ON Ent_devolucao_servico_det.Sev_cod = Servicos.sev_cod WHERE Ent_devolucao.ped_codigo=:codigo and Ent_devolucao.edv_status='A'
SELECT  Ent_devolucao.edv_codigo, VendaAmbiente.VenAmb_Descricao, Ent_devolucao.edv_status, Ent_devolucao_luminaria_det.Pro_codnosso, Ent_devolucao_luminaria_det.eld_produto, Ent_devolucao_luminaria_det.eld_acabamento, Ent_devolucao_luminaria_det.eld_vl_unitario, Ent_devolucao_luminaria_det.eld_vl_item, Ent_devolucao_luminaria_det.eld_quant_dev, Ent_devolucao.ped_codigo, produtos.Pro_descricao, produtos.Pro_Codbase, produtos.Pro_descricao_for, produtos.Pro_CodEspecial FROM Ent_devolucao INNER JOIN Ent_devolucao_luminaria_det ON Ent_devolucao.edv_codigo_pre = Ent_devolucao_luminaria_det.edv_codigo_pre INNER JOIN VendaAmbiente ON Ent_devolucao_luminaria_det.eld_ambiente = VendaAmbiente.CodAmbiente INNER JOIN produtos ON Ent_devolucao_luminaria_det.Pro_codnosso = produtos.Pro_codnosso WHERE Ent_devolucao.ped_codigo=:codigo and Ent_devolucao.edv_status='A' and VendaAmbiente.VenAmb_TpDoc='EPD' and VendaAmbiente.VenAmb_NDocPre = Ent_devolucao_luminaria_det.edv_codigo_pre
SELECT Ent_devolucao.edv_codigo, Ent_devolucao.edv_status, VendaAmbiente.VenAmb_Descricao, Ent_devolucao.ped_codigo, produtos.Pro_descricao, Ent_devolucao_materiais_det.Pro_codnosso, Ent_devolucao_materiais_det.ema_acabamento, Ent_devolucao_materiais_det.ema_vl_unitario, Ent_devolucao_materiais_det.ema_vl_item, Ent_devolucao_materiais_det.ema_quant_dev, produtos.Pro_CodEspecial, produtos.Pro_Codbase, produtos.Pro_descricao_for FROM  Ent_devolucao INNER JOIN Ent_devolucao_materiais_det ON Ent_devolucao.edv_codigo_pre = Ent_devolucao_materiais_det.edv_codigo_pre INNER JOIN VendaAmbiente ON Ent_devolucao_materiais_det.ema_ambiente = VendaAmbiente.CodAmbiente INNER JOIN produtos ON Ent_devolucao_materiais_det.Pro_codnosso = produtos.Pro_codnosso WHERE  (dbo.Ent_devolucao.ped_codigo IS NOT NULL) and Ent_devolucao.ped_codigo=:codigo AND Ent_devolucao.edv_status='A' and VendaAmbiente.VenAmb_TpDoc='EPD' and VendaAmbiente.VenAmb_NDocPre = Ent_devolucao_materiais_det.edv_codigo_pre
SELECT Devolucao.Dev_codigo   ,dbo.DevolucaoProduto.DevPro_Quantidade, dbo.DevolucaoProduto.DevPro_VlUnitario, dbo.DevolucaoProduto.DevPro_VlItem, dbo.DevolucaoProduto.Pro_codnosso, dbo.DevolucaoProduto.CodAcabamento, dbo.VendaAmbiente.VenAmb_Descricao, dbo.produtos.Pro_descricao, dbo.produtos.Pro_descricao_for, dbo.produtos.Pro_Codbase, dbo.produtos.Pro_CodEspecial, CASE WHEN dbo.produtos.GrupoProduto_codigo = 1 THEN '1' ELSE '2' END AS tipo FROM dbo.DevolucaoProduto INNER JOIN dbo.produtos ON dbo.DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Venda INNER JOIN dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre ON dbo.DevolucaoProduto.Dev_CodigoPre = dbo.Devolucao.Dev_CodigoPre INNER JOIN dbo.VendaAmbiente ON dbo.DevolucaoProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente AND  dbo.Venda.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre WHERE  (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado IS NULL) AND (dbo.Venda.Ven_Tipo = 'P') AND (dbo.VendaAmbiente.VenAmb_TpDoc = 'PRO') and venda.ven_codigo =:pven_codigo and Venda.ParSV_serie ='1'
SELECT Saida_complementacao.scp_codigo ,Saida_complementacao.scp_status, dbo.Saida_complementacao.ped_codigo, dbo.Servicos.Serv_Desc,  Saida_comp_servico_det.sse_vl_item, dbo.Saida_comp_servico_det.sse_vl_unitario, dbo.Saida_comp_servico_det.sse_quantidade FROM Saida_complementacao INNER JOIN Saida_comp_servico_det ON Saida_complementacao.Scp_codigo_pre = Saida_comp_servico_det.Scp_codigo_pre INNER JOIN Servicos ON dbo.Saida_comp_servico_det.Sev_cod = dbo.Servicos.sev_cod where Saida_complementacao.ped_codigo=:codigo and Saida_complementacao.Scp_status='A'
SELECT Saida_complementacao.scp_codigo, Saida_complementacao.scp_status, VendaAmbiente.VenAmb_Descricao, produtos.Pro_descricao, Saida_comp_luminaria_det.sld_acabamento, produtos.Pro_codnosso, Saida_comp_luminaria_det.sld_vl_unitario, Saida_comp_luminaria_det.sld_vl_item, Saida_comp_luminaria_det.sld_quantidade, Saida_complementacao.ped_codigo, produtos.Pro_Codbase, produtos.Pro_descricao_for, produtos.Pro_CodEspecial FROM Saida_comp_luminaria_det INNER JOIN produtos ON Saida_comp_luminaria_det.Pro_codnosso = produtos.Pro_codnosso INNER JOIN Saida_complementacao ON Saida_comp_luminaria_det.scp_codigo_pre = Saida_complementacao.Scp_codigo_pre INNER JOIN VendaAmbiente ON Saida_comp_luminaria_det.sld_ambiente = VendaAmbiente.CodAmbiente where Saida_complementacao.ped_codigo=:codigo and Saida_complementacao.Scp_status='A' and VendaAmbiente.VenAmb_TpDoc='SPC' and VendaAmbiente.VenAmb_NDocPre = Saida_comp_luminaria_det.scp_codigo_pre
SELECT Saida_complementacao.scp_codigo, Saida_complementacao.scp_status, VendaAmbiente.VenAmb_Descricao, produtos.Pro_descricao, Saida_complementacao.ped_codigo, Saida_comp_materiais_det.Pro_codnosso, Saida_comp_materiais_det.sma_acabamento, Saida_comp_materiais_det.sma_quantidade, Saida_comp_materiais_det.sma_vl_unitario, Saida_comp_materiais_det.sma_vl_item, produtos.Pro_Codbase, produtos.Pro_descricao_for, produtos.Pro_CodEspecial FROM produtos INNER JOIN Saida_comp_materiais_det ON produtos.Pro_codnosso = Saida_comp_materiais_det.Pro_codnosso INNER JOIN VendaAmbiente ON Saida_comp_materiais_det.sma_ambiente = VendaAmbiente.CodAmbiente INNER JOIN Saida_complementacao ON Saida_comp_materiais_det.scp_codigo_pre = Saida_complementacao.Scp_codigo_pre where Saida_complementacao.ped_codigo=:codigo AND Saida_complementacao.Scp_status='A' and VendaAmbiente.VenAmb_TpDoc='SPC' and VendaAmbiente.VenAmb_NDocPre = Saida_comp_materiais_det.scp_codigo_pre
select * from ParamentrosDesagio where ParDes_data>:data
select * from ParamentrosDesagio where ParDes_data<:data order by ParDes_data desc
select * from ParamentrosDesagio where ParDes_data=:data
select * from Mensagem_Relatorio where Men_codigo=7
select * from Mensagem_Relatorio where Men_codigo=8
SELECT dbo.produtos.Pro_codnosso, ProdutosFornecedores.For_codigo, dbo.fornecedor.For_Nome, dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_VlNFor, dbo.Preco_Produto.Pre_Venda, dbo.Preco_Produto.Pre_Codindice,
SELECT dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.For_codigo, dbo.fornecedor.For_Nome, dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_VlNFor, dbo.Preco_Produto.Pre_Venda,
SELECT dbo.produtos.Pro_codnosso, ProdutosFornecedores.For_codigo, bdprincipal.dbo.fornecedor.For_Nome, dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_VlNFor, dbo.Preco_Produto.Pre_Venda, dbo.Preco_Produto.Pre_Codindice,
SELECT dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.For_codigo, bdprincipal.dbo.fornecedor.For_Nome, dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_VlNFor, dbo.Preco_Produto.Pre_Venda,
select max(Sct_codigo) as maximo from siscontrole
sELECT Devolucao.Dev_CodigoPre FROM  Devolucao INNER JOIN Venda ON Devolucao.ven_codigopre = Venda.Ven_CodigoPre  WHERE (Devolucao.Dev_CodigoPre IN (SELECT Dev_CodigoPre FROM DevolucaoProduto WHERE (DevPro_usuarioestoque IS NULL) AND (Dev_CodigoPre = dbo.Devolucao.Dev_CodigoPre))) AND (dbo.Devolucao.Dev_situacao = 1) and Devolucao.Dev_Dtemissao >=:data1 and Devolucao.Dev_Dtemissao <=:data2
SELECT dbo.Devolucao.Dev_codigo, dbo.Devolucao.Dev_CodigoPre, dbo.Devolucao.ven_codigopre, dbo.Devolucao.Dev_Dtemissao, dbo.VendaAmbiente.VenAmb_Descricao, dbo.DevolucaoProduto.DevPro_Seq, dbo.DevolucaoProduto.DevPro_SeqItem, dbo.DevolucaoProduto.CodAmbiente, dbo.DevolucaoProduto.CodAcabamento, dbo.DevolucaoProduto.Pro_codnosso, dbo.DevolucaoProduto.DevPro_VlUnitario, dbo.DevolucaoProduto.DevPro_VlItem, dbo.DevolucaoProduto.DevPro_Quantidade, dbo.DevolucaoProduto.DevPro_QuantidadeOriginal, dbo.produtos.Pro_descricao, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for, dbo.produtos.Pro_tp_peca, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_CodEspecial, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.GrupoProduto.GrupoProduto_ordem FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre INNER JOIN dbo.VendaAmbiente ON dbo.Devolucao.ven_codigopre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.DevolucaoProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.produtos ON dbo.DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN dbo.ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso WHERE (dbo.VendaAmbiente.VenAmb_TpDoc = 'PRO') AND (dbo.Devolucao.Dev_CodigoPre =:codigo) AND (dbo.Devolucao.Dev_situacao = 1) AND (dbo.DevolucaoProduto.DevPro_usuarioestoque = 0 OR dbo.DevolucaoProduto.DevPro_usuarioestoque IS NULL) AND (dbo.ProdutosFornecedores.ProdFor_Padrao = 1)
select (SELECT case when SUM(CASE WHEN (vend1.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0) THEN venpro_vlitem - (venpro_vlitem * (Ven_DescontoPorcProd / 100)) ELSE venpro_vlitem END) > 0 then SUM(CASE WHEN (vend1.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0) THEN venpro_vlitem - (venpro_vlitem * (Ven_DescontoPorcProd / 100)) ELSE venpro_vlitem END) else 0 end FROM  dbo.VendaProduto INNER JOIN dbo.Venda  as vend1 ON dbo.VendaProduto.Ven_CodigoPre = vend1.Ven_CodigoPre INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.VendaIndicacao ON vend1.ven_codigopre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (vend1.Ven_Situacao = 'A') AND (vend1.Ven_Tipo = 'P') AND (vend1.ParSV_serie <> '3') AND (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and vend1.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo  and dbo.produtos.GrupoProduto_codigo = 1) - (SELECT CASE WHEN SUM(CASE WHEN VenInd_Porcentagem > 0 THEN CASE WHEN (vdev.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0) THEN devpro_vlitem - (devpro_vlitem * (Ven_DescontoPorcProd / 100)) ELSE devpro_vlitem END * (VenInd_Porcentagem / 100) ELSE CASE WHEN (vdev.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0) THEN devpro_vlitem - (devpro_vlitem * (Ven_DescontoPorcProd / 100)) ELSE devpro_vlitem END END) > 0 THEN SUM(CASE WHEN VenInd_Porcentagem > 0 THEN CASE WHEN (vdev.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0) THEN devpro_vlitem - (devpro_vlitem * (Ven_DescontoPorcProd / 100)) ELSE devpro_vlitem END * (VenInd_Porcentagem / 100) ELSE CASE WHEN (vdev.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0) THEN devpro_vlitem - (devpro_vlitem * (Ven_DescontoPorcProd / 100)) ELSE devpro_vlitem END END) ELSE 0 END AS ValorComDesc FROM  dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre INNER JOIN dbo.produtos ON dbo.DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Venda as vdev ON dbo.Devolucao.ven_codigopre = vdev.Ven_CodigoPre INNER JOIN dbo.VendaIndicacao ON vdev.Ven_CodigoPre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (dbo.produtos.GrupoProduto_codigo = 1) AND  (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and ((dbo.Devolucao.Dev_migrado = 0) or (dbo.Devolucao.Dev_migrado IS NULL)) and Devolucao.Dev_situacao = 1 and vdev.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo and Devolucao.Dev_Dtemissao >= :data1 and  Devolucao.Dev_Dtemissao <= :data2 and dbo.produtos.GrupoProduto_codigo = 1 ) AS vl_luminaria, (SELECT case when SUM(CASE WHEN vend2.Ven_Total > 0 THEN vend2.Ven_Total ELSE 0 END * (VenInd_Porcentagem / 100)) > 0 then SUM(CASE WHEN vend2.Ven_Total > 0 THEN vend2.Ven_Total ELSE 0 END * (VenInd_Porcentagem / 100)) else 0 end FROM dbo.Venda AS vend2 INNER JOIN  dbo.VendaIndicacao ON vend2.ven_codigopre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (vend2.Ven_Situacao = 'A') AND (vend2.Ven_Tipo = 'P') AND (vend2.ParSV_serie <> '3') AND (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and vend2.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo)  - ( SELECT case when sum(case when Dev_TotalProd > 0 then Dev_TotalProd else 0 end + case when Dev_TotalServ > 0 then Dev_TotalServ else 0 end * (VenInd_Porcentagem / 100)) > 0 then sum(case when Dev_TotalProd > 0 then Dev_TotalProd else 0 end + case when Dev_TotalServ > 0 then Dev_TotalServ else 0 end * (VenInd_Porcentagem / 100)) else 0 end FROM         dbo.Devolucao INNER JOIN dbo.Venda AS vdev ON dbo.Devolucao.ven_codigopre = vdev.Ven_CodigoPre INNER JOIN dbo.VendaIndicacao ON vdev.Ven_CodigoPre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and ((dbo.Devolucao.Dev_migrado = 0) or (dbo.Devolucao.Dev_migrado IS NULL)) and Devolucao.Dev_situacao = 1 and vdev.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo and Devolucao.Dev_Dtemissao >= :data3 and  Devolucao.Dev_Dtemissao <= :data4 )  AS vl_total, (SELECT case when  SUM(CASE WHEN (VenPro_Quantidade > 0) THEN VenPro_Quantidade ELSE 0 END * (Ven_DescontoPorcProd / 100)) > 0 then SUM(CASE WHEN (VenPro_Quantidade > 0) THEN VenPro_Quantidade ELSE 0 END * (Ven_DescontoPorcProd / 100)) else 0 end FROM VendaProduto INNER JOIN dbo.Venda  as vend1 ON dbo.VendaProduto.Ven_CodigoPre = vend1.Ven_CodigoPre INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.VendaIndicacao ON vend1.ven_codigopre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (vend1.Ven_Situacao = 'A') AND (vend1.Ven_Tipo = 'P') AND (vend1.ParSV_serie <> '3') AND (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and vend1.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo and produtos.GrupoProduto_codigo = 1) - (SELECT case when SUM(CASE WHEN (DevPro_Quantidade > 0) THEN devPro_Quantidade ELSE 0 END * (Ven_DescontoPorcProd / 100)) > 0 then SUM(CASE WHEN (devPro_Quantidade > 0) THEN devPro_Quantidade ELSE 0 END * (Ven_DescontoPorcProd / 100)) else 0 end FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre INNER JOIN dbo.produtos ON dbo.DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Venda as vdev2 ON dbo.Devolucao.ven_codigopre = vdev2.Ven_CodigoPre INNER JOIN dbo.VendaIndicacao ON vdev2.Ven_CodigoPre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (dbo.produtos.GrupoProduto_codigo = 1) AND  (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and ((dbo.Devolucao.Dev_migrado = 0) or (dbo.Devolucao.Dev_migrado IS NULL)) and Devolucao.Dev_situacao = 1 and vdev2.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo and Devolucao.Dev_Dtemissao >= :data5 and  Devolucao.Dev_Dtemissao <= :data6 and produtos.GrupoProduto_codigo = 1 )  AS quant_luminaria, vendInd.ind_codigo from venda INNER JOIN dbo.VendaIndicacao as vendInd ON venda.Ven_CodigoPre = vendInd.VenInd_NDocPre where (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.ParSV_serie <> '3') and venda.Ven_DataEmissao >= :data7 and  venda.Ven_DataEmissao <= :data8 and venda.emp_codigo =:pemp_codigo
select (SELECT case when SUM(CASE WHEN (vend1.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0) THEN venpro_vlitem - (venpro_vlitem * (Ven_DescontoPorcProd / 100)) ELSE venpro_vlitem END) > 0 then SUM(CASE WHEN (vend1.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0) THEN venpro_vlitem - (venpro_vlitem * (Ven_DescontoPorcProd / 100)) ELSE venpro_vlitem END) else 0 end FROM  dbo.VendaProduto INNER JOIN dbo.Venda  as vend1 ON dbo.VendaProduto.Ven_CodigoPre = vend1.Ven_CodigoPre INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.VendaIndicacao ON vend1.ven_codigopre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (vend1.Ven_Situacao = 'A') AND (vend1.Ven_Tipo = 'P') AND (vend1.ParSV_serie <> '3') AND (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and vend1.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo  and dbo.produtos.GrupoProduto_codigo = 1) AS vl_luminaria, (SELECT case when SUM(CASE WHEN vend2.Ven_Total > 0 THEN vend2.Ven_Total ELSE 0 END * (VenInd_Porcentagem / 100)) > 0 then SUM(CASE WHEN vend2.Ven_Total > 0 THEN vend2.Ven_Total ELSE 0 END * (VenInd_Porcentagem / 100)) else 0 end FROM dbo.Venda AS vend2 INNER JOIN  dbo.VendaIndicacao ON vend2.ven_codigopre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (vend2.Ven_Situacao = 'A') AND (vend2.Ven_Tipo = 'P') AND (vend2.ParSV_serie <> '3') AND (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and vend2.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo)    AS vl_total, (SELECT case when  SUM(CASE WHEN (VenPro_Quantidade > 0) THEN VenPro_Quantidade ELSE 0 END * (Ven_DescontoPorcProd / 100)) > 0 then SUM(CASE WHEN (VenPro_Quantidade > 0) THEN VenPro_Quantidade ELSE 0 END * (Ven_DescontoPorcProd / 100)) else 0 end FROM VendaProduto INNER JOIN dbo.Venda  as vend1 ON dbo.VendaProduto.Ven_CodigoPre = vend1.Ven_CodigoPre INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.VendaIndicacao ON vend1.ven_codigopre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (vend1.Ven_Situacao = 'A') AND (vend1.Ven_Tipo = 'P') AND (vend1.ParSV_serie <> '3') AND (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and vend1.ven_codigopre = venda.ven_codigopre and VendaIndicacao.Ind_Codigo = vendInd.Ind_Codigo and produtos.GrupoProduto_codigo = 1)   AS quant_luminaria, vendInd.ind_codigo from venda INNER JOIN dbo.VendaIndicacao as vendInd ON venda.Ven_CodigoPre = vendInd.VenInd_NDocPre where (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.ParSV_serie <> '3') and venda.Ven_DataEmissao >= :data7 and  venda.Ven_DataEmissao <= :data8 and venda.emp_codigo =:pemp_codigo
SELECT dbo.VendaIndicacao.Ind_Codigo
SELECT TOP (100) PERCENT dbo.Indicacoes.Ind_codigo, dbo.Indicacoes.Ind_Nome
select max(Pve_codigo) as maximo FROM pos_venda
SELECT  pos_venda.Pve_cliente,pos_venda.usr_dt_hr_criacao, pos_venda.Pve_codigo, dbo.pos_venda.Pve_cliente, dbo.Clientes.Cli_Nome,pos_venda.Pve_data
SELECT Ind_codigo, Ind_Nome, Ind_profissao, Ind_comercial, Ind_residencial, Ind_celular FROM Indicacoes where Ind_codigo=:codigo
SELECT Fun_CPF, Fun_Nome FROM Funcionario where Fun_CPF=:codigo
SELECT ROUND(SUM(dbo.pedido.ped_tl_geral_materiais * dbo.VendaIndicacao.VenInd_Porcentagem / 100), 2) AS vl_materiais, ROUND(SUM(dbo.pedido.ped_tl_geral_servico * dbo.VendaIndicacao.VenInd_Porcentagem / 100), 2) AS vl_servico, ROUND(SUM(dbo.pedido.ped_tl_geral_luminaria * dbo.VendaIndicacao.VenInd_Porcentagem / 100), 2) AS vl_luminaria, ROUND(SUM((dbo.pedido.ped_tl_geral_luminaria + dbo.pedido.ped_tl_geral_servico) + dbo.pedido.ped_tl_geral_materiais * dbo.VendaIndicacao.VenInd_Porcentagem / 100), 2) AS vl_projeto, SUM(1 * dbo.VendaIndicacao.VenInd_Porcentagem / 100) AS quant_projeto , Clientes.Cli_Nome,Clientes.Cli_codigo FROM dbo.pedido INNER JOIN  dbo.Clientes ON dbo.pedido.cli_codigo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.VendaIndicacao ON dbo.pedido.ped_codigo_pre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') AND ped_dt_fechamento>=:data1 and ped_dt_fechamento<=:data2 and pedido.ped_status ='A'
SELECT round(SUM(pedido.ped_tl_geral_materiais * (VendaAtendente.VenAten_Porcentagem / 100)),2) AS vl_materiais, round(SUM(dbo.pedido.ped_tl_geral_servico* (VendaAtendente.VenAten_Porcentagem / 100)),2)  AS vl_servico, round(SUM(pedido.ped_tl_geral_luminaria* (VendaAtendente.VenAten_Porcentagem / 100)),2) AS vl_luminaria,  round(SUM((pedido.ped_tl_geral_luminaria + pedido.ped_tl_geral_servico + pedido.ped_tl_geral_materiais)* (VendaAtendente.VenAten_Porcentagem / 100)),2) AS vl_projeto  , Clientes.Cli_Nome, Clientes.Cli_Codigo,COUNT(*) AS quant_projeto  FROM pedido INNER JOIN  Clientes ON dbo.pedido.cli_codigo = dbo.Clientes.Cli_Codigo INNER JOIN  VendaAtendente ON dbo.pedido.ped_codigo_pre = dbo.VendaAtendente.VenAten_NDocPre  where (VendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.VenAten_Porcentagem > 0) AND (VendaAtendente.Emp_Codigo = 1) and ped_dt_fechamento>=:data1 and ped_dt_fechamento<=:data2 and pedido.ped_status ='A'
SELECT SUM(pedido_luminaria_det.pld_quantidade * VendaIndicacao.VenInd_Porcentagem / 100) AS quant_luminaria,Clientes.Cli_Nome FROM dbo.pedido INNER JOIN dbo.pedido_luminaria_det ON dbo.pedido.ped_codigo_pre = dbo.pedido_luminaria_det.ped_codigo_pre INNER JOIN dbo.Clientes ON dbo.pedido.cli_codigo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.VendaIndicacao ON dbo.pedido.ped_codigo_pre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and pedido.ped_dt_fechamento>=:data1 and pedido.ped_dt_fechamento<=:data2 and pedido.cli_codigo=:cliente and pedido.ped_status ='A'
SELECT  ROUND(SUM(pedido_luminaria_det.pld_quantidade*(VendaAtendente.VenAten_Porcentagem/100)),2) AS quant_luminaria, Clientes.Cli_Nome FROM pedido INNER JOIN pedido_luminaria_det ON pedido.ped_codigo_pre = pedido_luminaria_det.ped_codigo_pre INNER JOIN Clientes ON pedido.cli_codigo = Clientes.Cli_Codigo INNER JOIN VendaAtendente ON pedido.ped_codigo_pre = VendaAtendente.VenAten_NDocPre where (VendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0) pedido.ped_dt_fechamento>=:data1 and pedido.ped_dt_fechamento<=:data2 and pedido.cli_codigo=:cliente and pedido.ped_status ='A'
SELECT SUM(pedido_luminaria_det.pld_quantidade * VendaIndicacao.VenInd_Porcentagem / 100) AS quant_luminaria FROM pedido INNER JOIN pedido_luminaria_det ON pedido.ped_codigo_pre = pedido_luminaria_det.ped_codigo_pre INNER JOIN VendaIndicacao ON pedido.ped_codigo_pre = VendaIndicacao.VenInd_NDocPre WHERE (VendaIndicacao.VenInd_TpDoc = 'PRO') AND pedido.ped_dt_fechamento>=:data1 and pedido.ped_dt_fechamento<=:data2  and pedido.ped_status ='A'
SELECT  ROUND(SUM(pedido_luminaria_det.pld_quantidade * (VendaAtendente.VenAten_Porcentagem / 100)), 2) AS quant_luminaria  FROM pedido INNER JOIN pedido_luminaria_det ON pedido.ped_codigo_pre = pedido_luminaria_det.ped_codigo_pre INNER JOIN VendaAtendente ON pedido.ped_codigo_pre = VendaAtendente.VenAten_NDocPre where (VendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0) and pedido.ped_dt_fechamento>=:data1 and pedido.ped_dt_fechamento<=:data2  and pedido.ped_status ='A'
SELECT ROUND(SUM(dbo.pedido.ped_tl_geral_materiais * dbo.VendaIndicacao.VenInd_Porcentagem / 100), 2) AS vl_materiais, ROUND(SUM(dbo.pedido.ped_tl_geral_servico * dbo.VendaIndicacao.VenInd_Porcentagem / 100), 2) AS vl_servico, ROUND(SUM(dbo.pedido.ped_tl_geral_luminaria * dbo.VendaIndicacao.VenInd_Porcentagem / 100), 2) AS vl_luminaria, ROUND(SUM((dbo.pedido.ped_tl_geral_luminaria + dbo.pedido.ped_tl_geral_servico) + dbo.pedido.ped_tl_geral_materiais * dbo.VendaIndicacao.VenInd_Porcentagem / 100), 2) AS vl_projeto, SUM(1 * dbo.VendaIndicacao.VenInd_Porcentagem / 100) AS quant_projeto FROM  dbo.pedido INNER JOIN dbo.VendaIndicacao ON dbo.pedido.ped_codigo_pre = dbo.VendaIndicacao.VenInd_NDocPre WHERE (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO') and ped_dt_fechamento>=:data1 and ped_dt_fechamento<=:data2 and ped_status = 'A'
SELECT ROUND(SUM(pedido.ped_tl_geral_materiais * (VendaAtendente.VenAten_Porcentagem / 100)), 2) AS vl_materiais, ROUND(SUM(pedido.ped_tl_geral_servico * (VendaAtendente.VenAten_Porcentagem / 100)), 2) AS vl_servico, ROUND(SUM(pedido.ped_tl_geral_luminaria * (VendaAtendente.VenAten_Porcentagem / 100)), 2) AS vl_luminaria, ROUND(SUM((pedido.ped_tl_geral_luminaria + pedido.ped_tl_geral_servico + pedido.ped_tl_geral_materiais) * (VendaAtendente.VenAten_Porcentagem / 100)), 2) AS vl_projeto ,ROUND(SUM(1 * (dbo.VendaAtendente.VenAten_Porcentagem / 100)), 2)  AS quant_projeto  FROM pedido INNER JOIN VendaAtendente ON pedido.ped_codigo_pre = VendaAtendente.VenAten_NDocPre where (VendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.VenAten_Porcentagem > 0) AND (VendaAtendente.Emp_Codigo = 1) and ped_dt_fechamento>=:data1 and ped_dt_fechamento<=:data2 and ped_status = 'A'
SELECT Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_CodigoPre, Pasta.Pasta_Descricao, Pasta.Pasta_codigo, Clientes.Cli_Nome, Obras.Obr_Descricao, VendaIndicacao.VenInd_TpDoc, VendaIndicacao.ind_codigo, Indicacoes.Ind_Nome, dbo.Venda.Ven_DataEmissao FROM  Venda INNER JOIN Obras ON Venda.Obr_codigo = Obras.Obr_Codigo INNER JOIN Clientes ON Venda.Ven_CodVinculo = Clientes.Cli_Codigo INNER JOIN VendaIndicacao ON Venda.Ven_CodigoPre = VendaIndicacao.VenInd_NDocPre INNER JOIN Indicacoes ON VendaIndicacao.Ind_Codigo = Indicacoes.Ind_codigo LEFT OUTER JOIN Pasta ON dbo.Venda.Pasta_codigo = Pasta.Pasta_codigo WHERE(Venda.Ven_CodigoPre NOT IN  (SELECT Venda_1.Ven_CodigoPre  FROM dbo.Venda AS Venda_1 INNER JOIN  dbo.Reserva_tecnica ON Venda_1.Ven_codigo = dbo.Reserva_tecnica.Ret_projeto_avulsa AND Venda_1.ParSV_serie = dbo.Reserva_tecnica.ParSV_serie INNER JOIN dbo.VendaIndicacao AS VI ON Venda_1.Ven_CodigoPre = VI.VenInd_NDocPre and VI.VenInd_TpDoc = 'PRO'  WHERE (Reserva_tecnica.Ret_tipo = 'PROJETO') AND (Reserva_tecnica.Ret_situacao = 'ATIVO') AND VI.ind_codigo = VendaIndicacao.ind_codigo and Reserva_tecnica.Ind_codigo =VendaIndicacao.ind_codigo )) AND (dbo.VendaIndicacao.VenInd_TpDoc = 'PRO')  and venda.ven_dataemissao >=:data1 and venda.ven_dataemissao <=:data2 AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P')
select ind_nome,ind_codigo from indicacoes where ind_nome is not null order by ind_nome
SELECT     dbo.GrupoProduto.GrupoProduto_Descricao, dbo.Reserva_tecnica_GrupoProd.Ret_codigo, dbo.Reserva_tecnica_GrupoProd.GrupoProduto_Codigo,
select * from reserva_tecnica
SELECT Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_CodigoPre, Pasta.Pasta_Descricao, Pasta.Pasta_codigo,Clientes.Cli_Nome, Obras.Obr_Descricao, dbo.VendaIndicacao.VenInd_TpDoc, dbo.Indicacoes.Ind_Nome, dbo.Venda.Ven_DataEmissao, Clientes.Cli_codigo, venda.Par_impostofixoRT  FROM Venda INNER JOIN Obras ON Venda.Obr_codigo = Obras.Obr_Codigo INNER JOIN Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo INNER JOIN VendaIndicacao ON dbo.Venda.Ven_CodigoPre = dbo.VendaIndicacao.VenInd_NDocPre INNER JOIN Indicacoes ON dbo.VendaIndicacao.Ind_Codigo = dbo.Indicacoes.Ind_codigo LEFT OUTER JOIN Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo WHERE VendaIndicacao.VenInd_TpDoc = 'PRO' and venda.ven_codigo=:codigo AND venda.ven_situacao = 'A' and VendaIndicacao.ind_codigo=:Pind_codigo and venda.ParSV_serie=:pParSV_serie AND venda.ven_TIPO = 'P'
SELECT Indicacoes.Ind_Nome, Clientes.Cli_Nome, Avulso.avu_codigo, Avulso.cli_codigo, Avulso.avu_indicacao,Avulso.avu_Descricao, Avulso.avu_tl_geral_materiais, Avulso.avu_tl_geral_luminaria, Avulso.avu_tl_geral_avulso,VendaIndicacao.VenInd_TpDoc,Obras.Obr_Descricao FROM VendaIndicacao INNER JOIN Indicacoes ON VendaIndicacao.Ind_Codigo = Indicacoes.Ind_codigo INNER JOIN Clientes INNER JOIN Avulso ON Clientes.Cli_Codigo = Avulso.cli_codigo ON VendaIndicacao.VenInd_NDocPre = Avulso.avu_codigo_pre INNER JOIN Obras ON AVULSO.Obr_Codigo = Obras.Obr_Codigo  WHERE (VendaIndicacao.VenInd_TpDoc = 'AVU') AND avu_codigo=:codigo and VendaIndicacao.ind_codigo=:Pind_codigo
select * from reserva_tecnica where ret_codigo=:codigo
SELECT Indicacoes.Ind_Nome, Clientes.Cli_Nome, Avulso.avu_codigo, Avulso.cli_codigo, Avulso.avu_indicacao, Avulso.avu_tl_geral_avulso, Avulso.avu_Descricao, Avulso.avu_tl_geral_materiais, Avulso.avu_tl_geral_luminaria ,Obras.Obr_Descricao FROM VendaIndicacao INNER JOIN Indicacoes ON VendaIndicacao.Ind_Codigo = Indicacoes.Ind_codigo INNER JOIN Clientes INNER JOIN Avulso ON Clientes.Cli_Codigo = Avulso.cli_codigo ON VendaIndicacao.VenInd_NDocPre = Avulso.avu_codigo_pre INNER JOIN Obras ON AVULSO.Obr_Codigo = Obras.Obr_Codigo  WHERE (VendaIndicacao.VenInd_TpDoc = 'AVU') AND avu_codigo=:codigo
SELECT Venda.Ven_codigopre, Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_CodigoPre, Pasta.Pasta_Descricao, Pasta.Pasta_codigo,Clientes.Cli_Nome, Obras.Obr_Descricao, dbo.VendaIndicacao.VenInd_TpDoc, dbo.Indicacoes.Ind_Nome, dbo.Venda.Ven_DataEmissao, Clientes.Cli_codigo, venda.Par_impostofixoRT  FROM Venda INNER JOIN Obras ON Venda.Obr_codigo = Obras.Obr_Codigo INNER JOIN Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo INNER JOIN VendaIndicacao ON dbo.Venda.Ven_CodigoPre = dbo.VendaIndicacao.VenInd_NDocPre INNER JOIN Indicacoes ON dbo.VendaIndicacao.Ind_Codigo = dbo.Indicacoes.Ind_codigo LEFT OUTER JOIN Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo WHERE VendaIndicacao.VenInd_TpDoc = 'PRO' and ven_tipo ='P' and  venda.ven_codigo=:codigo AND venda.ven_situacao = 'A' and VendaIndicacao.ind_codigo=:Pind_codigo and venda.ParSV_serie=:pParSV_serie
SELECT  * FROM contas_apagar where ctp_cod_documento=:codigo and tpd_codigo=:tipo
SELECT * FROM CreditoIndicacao WHERE  Ret_codigo =:codigo
SELECT     CASE WHEN ped_DESC_POR_materiais IS NOT NULL THEN SUM(dbo.pedido_materiais_det.pma_vl_item)
SELECT     CASE WHEN ped_DESC_POR_luminaria IS NOT NULL THEN SUM(dbo.pedido_luminaria_det.pld_vl_item)
SELECT     CASE WHEN ped_DESC_POR_servico IS NOT NULL THEN SUM(dbo.pedido_servico_det.pse_vl_item) - (SUM(dbo.pedido_servico_det.pse_vl_item)
SELECT     CASE WHEN avu_DESC_POR_materiais IS NOT NULL THEN SUM(dbo.avulso_materiais_det.ama_vl_item)
SELECT     CASE WHEN avu_DESC_POR_luminaria IS NOT NULL THEN SUM(dbo.avulso_luminaria_det.ald_vl_item)
SELECT  0 as soma,'1000' AS GrupoProduto_codigo,'SERVI
SELECT  CASE WHEN ped_DESC_POR_materiais IS NOT NULL THEN SUM(dbo.pedido_materiais_det.pma_vl_item * (FornecedorRTGrupProd.forrtgruprod_porc / 100))
SELECT CASE WHEN ped_DESC_POR_luminaria IS NOT NULL THEN SUM(dbo.pedido_luminaria_det.pld_vl_item * (FornecedorRTGrupProd.forrtgruprod_porc / 100))
SELECT CASE WHEN avu_DESC_POR_materiais IS NOT NULL THEN SUM(dbo.avulso_materiais_det.ama_vl_item * (FornecedorRTGrupProd.forrtgruprod_porc / 100))
SELECT  CASE WHEN avu_DESC_POR_luminaria IS NOT NULL THEN SUM(dbo.avulso_luminaria_det.ald_vl_item * (FornecedorRTGrupProd.forrtgruprod_porc / 100))
SELECT  CASE WHEN Ven_DescontoPorcProd IS NOT NULL THEN SUM(VendaProduto.VenPro_VlItem)
SELECT  CASE WHEN Ven_DescontoPorcServ IS NOT NULL THEN SUM(VendaServico.VenSer_vlitem) - (SUM(VendaServico.VenSer_vlitem)
SELECT CASE WHEN avu_DESC_POR_materiais IS NOT NULL THEN SUM(dbo.avulso_materiais_det.ama_vl_item * (CONVERT (float,FornecedorRTGrupProd.forrtgruprod_porc) / 100))
SELECT  CASE WHEN avu_DESC_POR_luminaria IS NOT NULL THEN SUM(dbo.avulso_luminaria_det.ald_vl_item * (CONVERT (float,FornecedorRTGrupProd.forrtgruprod_porc) / 100))
select * from contas_apagar where ctp_codigo=:codigo
SELECT * FROM Reserva_tecnica_GrupoProd where ret_codigo=:Pret_codigo and GrupoProduto_Codigo=:PGrupoProduto_Codigo
SELECT * FROM CreditoIndicacao WHERE CredInd_Codigo =:codigo1 AND Ret_codigo =:codigo2
SELECT Reserva_tecnica.*, Clientes.Cli_Nome AS Cli_Nome, Indicacoes.Ind_Nome AS Ind_Nome  FROM Reserva_tecnica INNER JOIN Indicacoes ON dbo.Reserva_tecnica.Ind_codigo = dbo.Indicacoes.Ind_codigo INNER JOIN  Clientes ON Reserva_tecnica.Cli_codigo = Clientes.Cli_Codigo
select * from contas_apagar where Ctp_cod_documento=:CODIGO and tpd_codigo= 1004
select ret_situacao from reserva_tecnica where ret_codigo=:codigo
SELECT Reserva_tecnica.Ret_codigo, dbo.contas_apagar.Tpd_codigo, dbo.Reserva_tecnica.Ret_tipo,  Reserva_tecnica.Ret_projeto_avulsa, dbo.Reserva_tecnica.Ret_data, dbo.Clientes.Cli_Nome, dbo.Indicacoes.Ind_Nome,  contas_apagar.Ctp_codigo, dbo.Reserva_tecnica.Ret_situacao FROM contas_apagar INNER JOIN Reserva_tecnica ON dbo.contas_apagar.Ctp_cod_documento = dbo.Reserva_tecnica.Ret_codigo INNER JOIN Clientes ON dbo.Reserva_tecnica.Cli_codigo = dbo.Clientes.Cli_Codigo INNER JOIN  Indicacoes ON dbo.Reserva_tecnica.Ind_codigo = dbo.Indicacoes.Ind_codigo WHERE Reserva_tecnica.Ret_data>=:data1 and Reserva_tecnica.Ret_data<=:data2 and(contas_apagar.Tpd_codigo = 1004) AND (Reserva_tecnica.Ret_situacao = 'ATIVO')
SELECT dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for, dbo.produtos.Pro_CodEspecial, dbo.fornecedor.For_Nome, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao, dbo.Preco_Produto.Pre_Acabamento, MAX(dbo.Preco_Produto.Pre_Tabela) AS Pre_Tabela, MAX(dbo.Preco_Produto.Pre_VlNFor) AS Pre_compra, MAX(dbo.Preco_Produto.Pre_Venda) AS Pre_Venda, MAX(dbo.Preco_Produto.Pre_Custo) AS Pre_Custo, SUM(dbo.Estoque_produto.Epr_estoque) AS estoque, dbo.Fabrica.Fab_Descricao, dbo.ProdutosFornecedores.For_codigo FROM dbo.ProdutosFornecedores INNER JOIN dbo.fornecedor ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo INNER JOIN dbo.produtos INNER JOIN dbo.Preco_Produto ON dbo.produtos.Pro_codnosso = dbo.Preco_Produto.Pre_Codnosso INNER JOIN dbo.Estoque_produto ON dbo.Preco_Produto.Pre_Codnosso = dbo.Estoque_produto.Epr_Codnosso AND dbo.Preco_Produto.Pre_Acabamento = dbo.Estoque_produto.Epr_Acabamento ON dbo.ProdutosFornecedores.Pro_codnosso = dbo.produtos.Pro_codnosso LEFT OUTER JOIN dbo.Fabrica ON dbo.produtos.Fab_Codigo = dbo.Fabrica.Fab_Codigo
SELECT ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for, dbo.produtos.Pro_CodEspecial ,dbo.fornecedor.For_Nome, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao,  dbo.Preco_Produto.Pre_Acabamento, MAX(dbo.Preco_Produto.Pre_Tabela) AS Pre_Tabela, MAX(dbo.Preco_Produto.Pre_VlNFor) AS Pre_compra,  MAX(dbo.Preco_Produto.Pre_Venda) AS Pre_Venda, MAX(dbo.Preco_Produto.Pre_Custo) AS Pre_Custo, ProdutosFornecedores.For_codigo, dbo.Fabrica.Fab_Descricao
select max(cod_grupo) as maximo from SisGrupo_Usuario
select * from SisGrupo_Usuario
SELECT Cli_Nome as Nome, Cli_Fcomercial as FComercial, Cli_Fresidencial as FResidencial, Cli_celular as Celular, Cli_dataNasc as DataNasc, Cli_conjuge as Conjuge, Cli_dtnasc_conjuge as DataNascConj, Cli_email as Email FROM Clientes WHERE SUBSTRING(Cli_dataNasc,4,2) = :Mes) and Cli_dataNasc is not null
SELECT Cli_Nome as Nome, Cli_Fcomercial as FComercial, Cli_Fresidencial as FResidencial, Cli_celular as Celular, Cli_dataNasc as DataNasc, Cli_conjuge as Conjuge, Cli_dtnasc_conjuge as DataNascConj, Cli_email as Email FROM Clientes WHERE SUBSTRING(Cli_dtnasc_conjuge,4,2) = :Mes) and Cli_dtnasc_conjuge is not null
SELECT Ind_Nome as Nome, Ind_Dtnacimento as DataNasc, Ind_conjuge as Conjuge, Ind_dtnasc_conjuge as DataNascConj, Ind_comercial as FComercial, Ind_residencial FResidencial, Ind_celular as Celular, Ind_email as Email FROM Indicacoes WHERE (RIGHT(Ind_Dtnacimento, 2) = :Mes)
SELECT Ind_Nome as Nome, Ind_Dtnacimento as DataNasc, Ind_conjuge as Conjuge, Ind_dtnasc_conjuge as DataNascConj, Ind_comercial as FComercial, Ind_residencial FResidencial, Ind_celular as Celular, Ind_email as Email FROM Indicacoes WHERE (RIGHT(Ind_dtnasc_conjuge, 2) = :MesConj)
SELECT Fun_Nome as Nome, Fun_Dtnacimento as DataNasc, Fun_conjuge as Conjuge, Fun_dtnasc_conjuge as DataNascConj, Fun_comercial as FComercial, Fun_residencial as FResidencial, Fun_celular as Celular FROM Funcionario WHERE (MONTH(Fun_Dtnacimento) = :Mes)
SELECT Fun_Nome as Nome, Fun_Dtnacimento as DataNasc, Fun_conjuge as Conjuge, Fun_dtnasc_conjuge as DataNascConj, Fun_comercial as FComercial, Fun_residencial as FResidencial, Fun_celular as Celular FROM Funcionario WHERE (MONTH(Fun_dtnasc_conjuge) = :MesConj)
SELECT Cli_Nome as Nome, Cli_Fcomercial as FComercial, Cli_Fresidencial as FResidencial, Cli_celular as Celular, Cli_dataNasc as DataNasc, Cli_conjuge as Conjuge, Cli_dtnasc_conjuge as DataNascConj, Cli_email as Email FROM Clientes WHERE Cli_dataNasc is not null
SELECT Cli_Nome as Nome, Cli_Fcomercial as FComercial, Cli_Fresidencial as FResidencial, Cli_celular as Celular, Cli_dataNasc as DataNasc, Cli_conjuge as Conjuge, Cli_dtnasc_conjuge as DataNascConj, Cli_email as Email FROM Clientes WHERE Cli_dtnasc_conjuge is not null
SELECT Ind_Nome as Nome, Ind_Dtnacimento as DataNasc, Ind_conjuge as Conjuge, Ind_dtnasc_conjuge as DataNascConj, Ind_comercial as FComercial, Ind_residencial FResidencial, Ind_celular as Celular, Ind_email as Email FROM Indicacoes
SELECT Fun_Nome as Nome, Fun_Dtnacimento as DataNasc, Fun_conjuge as Conjuge, Fun_dtnasc_conjuge as DataNascConj, Fun_comercial as FComercial, Fun_residencial as FResidencial, Fun_celular as Celular FROM Funcionario
SELECT Cli_Nome as Nome, Cli_Fcomercial as FComercial, Cli_Fresidencial as FResidencial, Cli_celular as Celular, Cli_dataNasc as DataNasc, Cli_conjuge as Conjuge, Cli_dtnasc_conjuge as DataNascConj, Cli_email as Email, SUBSTRING(Cli_dataNasc,4,2) as mes FROM Clientes WHERE (SUBSTRING(Cli_dataNasc,4,2) = :Mes) and cli_datanasc is not null order by mes, Cli_dataNasc
SELECT Cli_Nome as Nome, Cli_Fcomercial as FComercial, Cli_Fresidencial as FResidencial, Cli_celular as Celular, Cli_dataNasc as DataNasc, Cli_conjuge as Conjuge, Cli_dtnasc_conjuge as DataNascConj, Cli_email as Email, SUBSTRING(Cli_dtnasc_conjuge,4, 2) as mes FROM Clientes WHERE (SUBSTRING(Cli_dtnasc_conjuge,4, 2) = :MesConj) and cli_dtnasc_conjuge is not null order by mes, Cli_dtnasc_conjuge
SELECT IndDet_Nome as Nome, IndDet_Dtnacimento as DataNasc, IndDet_conjuge as Conjuge, IndDet_dtnasc_conjuge as DataNascConj, IndDet_comercial as FComercial, IndDet_residencial FResidencial, IndDet_celular as Celular, IndDet_email as Email, RIGHT(IndDet_Dtnacimento, 2) as mes FROM Indicacoes_Detalhe WHERE (RIGHT(IndDet_Dtnacimento, 2) = :Mes) and inddet_dtnacimento is not null Order by mes, IndDet_Dtnacimento
SELECT IndDet_Nome as Nome, IndDet_Dtnacimento as DataNasc, IndDet_conjuge as Conjuge, IndDet_dtnasc_conjuge as DataNascConj, IndDet_comercial as FComercial, IndDet_residencial FResidencial, IndDet_celular as Celular, IndDet_email as Email, RIGHT(IndDet_dtnasc_conjuge, 2) as mes FROM Indicacoes_Detalhe WHERE (RIGHT(IndDet_dtnasc_conjuge, 2) = :MesConj) and inddet_dtnasc_conjuge is not null Order by mes, IndDet_dtnasc_conjuge
SELECT Fun_Nome as Nome, Fun_Dtnacimento as DataNasc, Fun_conjuge as Conjuge, Fun_dtnasc_conjuge as DataNascConj, Fun_comercial as FComercial, Fun_residencial as FResidencial, Fun_celular as Celular, Month(Fun_dtnacimento) as mes FROM Funcionario WHERE (MONTH(Fun_Dtnacimento) = :Mes) and fun_dtnacimento is not null Order by mes, fun_dtnacimento
SELECT Fun_Nome as Nome, Fun_Dtnacimento as DataNasc, Fun_conjuge as Conjuge, Fun_dtnasc_conjuge as DataNascConj, Fun_comercial as FComercial, Fun_residencial as FResidencial, Fun_celular as Celular, Month(Fun_dtnasc_conjuge) as mes FROM Funcionario WHERE (MONTH(Fun_dtnasc_conjuge) = :MesConj) and fun_dtnasc_conjuge is not null Order by mes, Fun_dtnasc_conjuge
SELECT Cli_Nome as Nome, Cli_Fcomercial as FComercial, Cli_Fresidencial as FResidencial, Cli_celular as Celular, Cli_dataNasc as DataNasc, Cli_conjuge as Conjuge, Cli_dtnasc_conjuge as DataNascConj, Cli_email as Email, SUBSTRING(Cli_dataNasc,4,2) as mes FROM Clientes WHERE Cli_dataNasc is not null order by mes, Cli_dataNasc
SELECT Cli_Nome as Nome, Cli_Fcomercial as FComercial, Cli_Fresidencial as FResidencial, Cli_celular as Celular, Cli_dataNasc as DataNasc, Cli_conjuge as Conjuge, Cli_dtnasc_conjuge as DataNascConj, Cli_email as Email, SUBSTRING(Cli_dtnasc_conjuge,4, 2) as mes FROM Clientes WHERE Cli_dtnasc_conjuge is not null order by mes, Cli_dtnasc_conjuge
SELECT indicacoes.Ind_Nome AS Nome, Indicacoes_Detalhe.IndDet_Dtnacimento AS DataNasc, IndDet_conjuge AS Conjuge, IndDet_dtnasc_conjuge AS DataNascConj, IndDet_comercial AS FComercial, IndDet_residencial AS FResidencial,  RIGHT(Indicacoes_Detalhe.IndDet_Dtnacimento, 2) AS mes, IndDet_celular AS Celular, IndDet_email AS Email FROM Indicacoes INNER JOIN Indicacoes_Detalhe ON Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo WHERE (Indicacoes_Detalhe.IndDet_Dtnacimento IS NOT NULL) ORDER BY mes, DataNasc
SELECT indicacoes.Ind_Nome AS Nome, Indicacoes_Detalhe.IndDet_Dtnacimento AS DataNasc, IndDet_conjuge AS Conjuge, IndDet_dtnasc_conjuge AS DataNascConj, IndDet_comercial AS FComercial, IndDet_residencial AS FResidencial,  RIGHT(IndDet_dtnasc_conjuge, 2) AS mes, IndDet_celular AS Celular, IndDet_email AS Email FROM Indicacoes INNER JOIN Indicacoes_Detalhe ON Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo WHERE (Indicacoes_Detalhe.IndDet_Dtnacimento IS NOT NULL) ORDER BY mes, IndDet_dtnasc_conjuge
SELECT Fun_Nome as Nome, Fun_Dtnacimento as DataNasc, Fun_conjuge as Conjuge, Fun_dtnasc_conjuge as DataNascConj, Fun_comercial as FComercial, Fun_residencial as FResidencial, Fun_celular as Celular, Month(Fun_dtnacimento) as mes FROM Funcionario WHERE Fun_dtnacimento is not null Order by mes, Fun_dtnacimento
SELECT Fun_Nome as Nome, Fun_Dtnacimento as DataNasc, Fun_conjuge as Conjuge, Fun_dtnasc_conjuge as DataNascConj, Fun_comercial as FComercial, Fun_residencial as FResidencial, Fun_celular as Celular, Month(Fun_dtnasc_conjuge) as mes FROM Funcionario WHERE fun_dtnasc_conjuge is not null Order by mes, Fun_dtnasc_conjuge
SELECT ped_dt_fechamento FROM Pedido WHERE ped_codigo =
select for_codigo, for_nome from fornecedor where for_classificacao='F' order by for_nome
select cli_codigo, cli_nome from clientes order by cli_nome
SELECT venda.ven_codigo, venda.Ven_CodVinculo, venda.ParSV_serie FROM venda INNER JOIN
SELECT Clientes.Cli_Nome FROM AVULSO INNER JOIN Clientes ON avulso.cli_codigo = Clientes.Cli_Codigo where avulso.avu_codigo=:avulso
SELECT Clientes.Cli_Nome FROM venda INNER JOIN Clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo where venda.ven_codigopre=:pedido
SELECT ordem_compra_det.Ocp_codigo, ordem_compra_det.Ocd_item, ordem_compra_det.Pro_codnosso, ordem_compra_det.Ocd_acabamento, ordem_compra_det.Ocd_quantidade_solicit,
SELECT Clientes.Cli_Nome FROM pedido INNER JOIN Clientes ON pedido.cli_codigo = Clientes.Cli_Codigo where pedido.ped_codigo=:pedido
SELECT dbo.ordem_compra.Ocp_dt_envio, dbo.Reserva_Estoque.Res_Ordem, dbo.Reserva_Estoque.Res_Projeto, dbo.Reserva_Estoque.Res_VendaAvulsa,
select cli_nome from clientes where cli_codigo=:codigo
select * from fornecedor where for_classificacao='F' order by for_nome
SELECT Preco_Produto.Pre_Codindice,Preco_Produto.Pre_Tabela, produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto AS pro_Codbase, ProdutosFornecedores.For_codigo, produtos.Pro_tp_produto,
SELECT bdprodutos.dbo.preco_produto.Pre_Tabela, bdprodutos.dbo.preco_produto.Pre_Codindice from bdprodutos.dbo.preco_produto
SELECT pre_tp_vl, dbo.preco_produto.Pre_Tabela, dbo.preco_produto.Pre_Codindice from dbo.preco_produto
select * from TipoPeca where GrupoProduto_codigo =:PGrupoProduto_codigo order by TpPeca_Codigo
select * from TipoPeca order by TpPeca_Codigo
SELECT fornecedor.For_Nome AS For_Nome, AltValorTabela.*, SisUsuarios.Nome AS Usuario, produtos.Pro_descricao AS Pro_descricao, produtos.Pro_tp_produto AS Pro_tp_produto, produtos.Pro_tp_peca AS Pro_tp_peca,ProdFor_CodigoProduto AS Pro_Codbase FROM AltValorTabela INNER JOIN fornecedor ON AltValorTabela.For_codigo = fornecedor.For_codigo INNER JOIN SisUsuarios ON AltValorTabela.usr_cod_criacao = SisUsuarios.Id INNER JOIN produtos ON AltValorTabela.AltValTab_Produto = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso  where AltValorTabela.usr_dt_hr_criacao>=:data1 and AltValorTabela.usr_dt_hr_criacao<=:data2
SELECT DEV.ven_codigopre, PE.Ven_DataEmissao, DET.Pro_codnosso, P.Pro_descricao AS CodProduto, F.For_codigo, F.For_Razao, DET.CodAcabamento, P.Pro_descricao, DET.DevPro_Quantidade AS QuantDEV, dbo.Clientes.Cli_Nome, A.DescAcabamento, PE.Ven_codigo, PE.ParSV_serie, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for, P.Pro_CodEspecial FROM     dbo.ProdutosFornecedores INNER JOIN dbo.fornecedor AS F ON dbo.ProdutosFornecedores.For_codigo = F.For_codigo INNER JOIN dbo.Devolucao AS DEV INNER JOIN dbo.Venda AS PE ON DEV.ven_codigopre = PE.Ven_CodigoPre INNER JOIN dbo.DevolucaoProduto AS DET ON DEV.Dev_CodigoPre = DET.Dev_CodigoPre INNER JOIN dbo.produtos AS P ON DET.Pro_codnosso = P.Pro_codnosso INNER JOIN dbo.Acabamento AS A ON DET.CodAcabamento = A.CodAcabamento INNER JOIN dbo.Clientes ON PE.Ven_CodVinculo = dbo.Clientes.Cli_Codigo ON dbo.ProdutosFornecedores.Pro_codnosso = P.Pro_codnosso WHERE  (DET.DevPro_usuarioestoque IS NULL)
select * from DBO.todasporcentagemVendaMesAtendente(
select * from DBO.todasporcentagemVendatrimestreAtendente(
select * from DBO.todasporcentagemVendaSemestreAtendente(
select fun_nome, fun_cpf from funcionario
SELECT produtos.Pro_codnosso, Pro_descricao,Pro_tp_produto,Pro_tp_peca
SELECT * FROM #TabelaVendaTmp ORDER BY
select * from sisopcoes order by id
select * from ComissaoPremiacao
SELECT ComissaoPremiacao.ComPre_codigo FROM ComissaoPremiacao INNER JOIN
SELECT Preco_Produto.Pre_Codnosso, Preco_Produto.Pre_Acabamento, produtos.Pro_descricao
select * from Reserva_tecnica_GrupoProd
SELECT 'AVU' AS doc, Avulso_materiais_det.avu_codigo_pre as precodigo, Ambiente.CodAmbiente, 1 AS empresa, Ambiente.DescAmbiente
SELECT 'ORC' AS doc, orcamento_materiais_det.orc_codigo_pre as precodigo, Ambiente.CodAmbiente, 1 AS empresa, Ambiente.DescAmbiente
SELECT 'AUT' AS doc, AutorizoInclusao_luminaria.AIN_CODIGO as precodigo, Ambiente.CodAmbiente, 1 AS empresa, Ambiente.DescAmbiente
SELECT 'AUT' AS doc, AutorizoInclusao_materiais.ain_codigo as precodigo, Ambiente.CodAmbiente, 1 AS empresa, Ambiente.DescAmbiente
SELECT  'EPD' AS doc, Ent_devolucao_materiais_det.EDV_codigo_pre as precodigo, Ambiente.CodAmbiente, 1 AS empresa, Ambiente.DescAmbiente
select ControlCheque_codigo from  ControleCheque where ControlCheque_codigo > 1000000
select * from ControleChequeDet where ControlCheque_codigo =
select  @produto = Epr_Codnosso, @acab = Epr_Acabamento from inserted
SELECT ordem_compra_det.Ocd_quantidade_solicit,
SELECT TOP 1 @menorN = menor - 1 FROM @milhar WHERE menor > len(@valorStr)
SELECT @retorno = @retorno + CASE WHEN @pedacoInt1 > 1 THEN descricaoPL ELSE descricaoUm END + ' ' FROM @milhar WHERE (len(@valorStr) BETWEEN menor and maior)
SELECT @retorno = @retorno + 'Centavo' + CASE WHEN @pedacoInt1 > 1 THEN 's' ELSE '' END
SELECT dbo.fn_dateformat(getdate(),10) as [Mes/Ano]
SELECT dbo.fn_dateformat(getdate(),12) as [Dia/Hora]
SELECT NTF_Codigo,NTF_ImportNumero,
SELECT @retorno = @retorno + 'C
SELECT SUM(dbo.pedido_luminaria_det.pld_quantidade) - SUM(dbo.RequisicaoEstoqProd.ReqEstProd_Quant) AS QUANTIDADE,
select Pre_Codnosso,Pre_Acabamento,Pre_Codindice,Pre_tp_vl,getdate(),1,Pre_Ativo,Pre_Tabela,Pre_compra,Pre_Custo,Pre_Venda,Pre_Lucro,Pre_PorLucro,Pre_est_min,Pre_VlNFor  from Preco_Produto
select Fun_codigo from Funcionario
select * from ParamentrosNFe
select SysPaises_codigo from Paramentros
SELECT Nen_codigo, Nen_vl_diferenca, Nen_vl_diferenca_fin
SELECT * from Nota_Entrada_Dif where Nen_codigo=:pNen_codigo and NenDf_DifProd=:pNenDf_DifProd and NenDf_DifFinc=:pNenDf_DifFinc
select pasta_codigo from pasta
SELECT distinct dbo.Venda.Ven_CodigoPre FROM dbo.Venda INNER JOIN
select distinct Elg_codigo FROM estoque_log WHERE (Elg_data > CONVERT(DATETIME, '2011-10-01 00:00:00', 102))
select distinct Elg_doc FROM estoque_log where elg_codigo =:pelg_codigo
SELECT   Epr_estoque as total
select  CASE WHEN sum(VenPro_Quantidade) > 0 THEN sum(VenPro_Quantidade) ELSE 0 END as total from VendaProduto where
SELECT  SUM(dbo.Pedido_compra_det.Pcd_quantidade_solicit) AS total
SELECT SUM(CASE WHEN controle_entrega_prod.cep_quantidade_entregue > controle_entrega_prod.cep_quantidade THEN controle_entrega_prod.cep_quantidade ELSE controle_entrega_prod.cep_quantidade_entregue
SELECT venda.ven_codigo,venda.ParSV_serie, venda.Pasta_codigo, venda.Ven_Orcamento,     Clientes.Cli_Nome, Obras.Obr_Descricao, Obras.Obr_Endereco, Obras.Obr_numero, Obras.Obr_complemento, Obras.Obr_Bairro, Obras.Obr_Cidade, Obras.Obr_UF, Obras.Obr_CEP, Obras.Obr_Codigo, Municipio.mun_nome, Municipio.mun_uf,venda.Ven_DataEmissao, venda.Ven_DataFechaVenda, Clientes.Cli_Fcomercial, Clientes.Cli_Fresidencial, Clientes.Cli_fax, Clientes.Cli_celular, VendaAtendente.VenAten_TpDoc, Funcionario.Fun_Nome, Funcionario.Fun_celular, VendaIndicacao.VenInd_TpDoc, Indicacoes.Ind_Nome, Indicacoes.Ind_comercial, Indicacoes.Ind_residencial, Indicacoes.Ind_fax, Indicacoes.Ind_celular FROM Municipio INNER JOIN Obras ON Municipio.mun_codigo = Obras.mun_codigo INNER JOIN VendaAtendente INNER JOIN venda INNER JOIN Clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo ON VendaAtendente.VenAten_NDocPre = venda.ven_codigopre ON Obras.Obr_Codigo = venda.Obr_Codigo INNER JOIN Funcionario ON VendaAtendente.Fun_Codigo = Funcionario.Fun_CPF INNER JOIN VendaIndicacao ON venda.ven_codigopre = VendaIndicacao.VenInd_NDocPre INNER JOIN Indicacoes ON VendaIndicacao.Ind_Codigo = Indicacoes.Ind_codigo WHERE (VendaAtendente.VenAten_TpDoc = 'ORC') AND (VendaIndicacao.VenInd_TpDoc = 'ORC') and venda.ven_tipo='O' and venda.ven_situacao='A'
SELECT CASE WHEN SUM(VendaProduto.venpro_quantidade) IS NULL THEN 0 ELSE SUM(VendaProduto.venpro_quantidade) end
SELECT CASE WHEN SUM(DevolucaoProduto.Devpro_quantidade) IS NULL THEN 0 ELSE SUM(DevolucaoProduto.Devpro_quantidade) end
SELECT     SUM(dbo.Reserva_Estoque.Res_Quantidade) AS Expr1
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade) - SUM(dbo.RequisicaoEstoqProd.ReqEstProd_Quant) AS quantidade
SELECT Par_PoucoGiro,Par_MedioGiro,Par_AltoGiro
SELECT SUM(CASE WHEN controle_entrega_prod.CEP_QuantidadeDevolvidaEst > 0 THEN controle_entrega_prod.CEP_QuantidadeDevolvidaEst - controle_entrega_prod.cep_quantidade_entregue ELSE 0
SELECT SUM(controle_entrega_prod.cep_quantidade)
SELECT Epd_estoque as total
SELECT sum(Estoque_produto.Epr_estoque) as Epr_estoque
SELECT SUM(dbo.estoque_produto_dia.Epd_estoque) AS Epr_estoque
SELECT  Par_EstFisicoOutrosEst from Paramentros
SELECT SUM(Epr_estoque) AS estoque
SELECT sum(Epd_estoque) as total
select   Pro_codnosso, For_codigo, Pro_Codbase, Pro_descricao_for,1,1,1, Pro_DescricaoComplementarFor,Pro_PrazoEntrega from produtos
SELECT Cod_grupo FROM SisGrupo_Usuario WHERE SisGru_situacao ='A'
select * from produtos where Pro_foto is not null and Pro_foto <> ''
select Produto_Relacionados.* from Produto_Relacionados order by Pre_Cod_Prod_Pai
select Pre_Acabamento from preco_produto where pre_codnosso = '
select * from Produto_Relacionados where Pre_Cod_Prod_Pai= '
select Id from SisUsuarios where SisUsu_situacao ='A'
select max(HistVer_Codigo) as codigo from HistoricoVersoes
select  PreLog_Tabela,PreLog_compra,PreLog_Custo,PreLog_Venda,PreLog_Lucro,PreLog_PorLucro from Preco_Produto_Log where  usr_dt_hr_criacao >=@data and PreLog_Codnosso=@produto and PreLog_Acabamento =@Acabamento
select  Pre_Tabela,Pre_compra,Pre_Custo,Pre_Venda,Pre_Lucro,Pre_PorLucro from Preco_Produto  where pre_Codnosso=@produto and Pre_Acabamento =@Acabamento
SELECT     dbo.fornecedor.For_Nome, dbo.Estoque_produto.Epr_estoque
SELECT @table = 'dbo.ordem_compra_det';
SELECT @sql = 'ALTER TABLE ' + @table
SELECT @table = 'dbo.ordem_compra_Pag';
SELECT Ctp_situacao FROM contas_apagar_det WHERE Ctp_codigo = @codigo
SELECT 'cen_codigo_pre' AS SeqTab_Campo,
SELECT 'cep_codigo' AS SeqTab_Campo,
SELECT SUM(CASE WHEN dbo.estoque_produto_dia.Epd_estoque > 0 THEN dbo.estoque_produto_dia.Epd_estoque ELSE 0 END) AS Epr_estoque
SELECT Pro_codnosso, Pro_descricao,Pro_tp_produto,Pro_tp_peca FROM produtos
Select * from Plano_Contas where pco_pai=:vPai and pco_descricao is not null and pco_codigo=1
Select * from Plano_Contas where pco_pai=:vPai and pco_descricao is not null and pco_codigo=2
Select * from Plano_Contas where pco_pai=:vPai and pco_descricao is not null
select pco_tipo from Plano_Contas where Pco_codigo=:pPco_codigo
select cargo_codigo from cargo where cargo_nome=
select cargo_codigo from cargo where cargo_codigo <>
select * from cargo order by
select setor_codigo from setor where setor_nome=
select setor_codigo from setor where setor_codigo <>
select * from Setor order by
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento WHERE Tpd_codigo < 1000
SELECT (SELECT SUM(dbo.Credito.Credito_Valor) AS C1 FROM dbo.Credito WHERE
SELECT (SELECT SUM(Credito_Valor) AS totalC FROM dbo.Credito c1 WHERE (Credito_Operacao = 'C') AND
SELECT DISTINCT  Clientes.Cli_Codigo,Clientes.Cli_Nome FROM Clientes
SELECT DISTINCT  fornecedor.For_codigo,fornecedor.For_Nome FROM fornecedor
SELECT Credito.Credito_Situacao, Credito.Credito_Codigo, Credito.Credito_TipoVinculo,Clientes.Cli_Nome, Credito.Credito_Operacao,
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento WHERE(NOT (Tpd_codigo IN (1001, 1002, 1003, 1004, 1005, 1006, 1007)))
SELECT Credito.Credito_Situacao, Credito.Credito_Codigo, Credito.Credito_TipoVinculo,fornecedor.for_Nome, Credito.Credito_Operacao,
select * from EmpresaFactoring
select * from  contas_apagar_pag where Ctp_codigo=:pcodigo
SELECT * FROM Movimento_bancario where Cpp_cod_pag=:pcodigo
SELECT * FROM Movimentos where Cpp_cod_pag=:pcodigo
select * from  contas_apagar_pag
SELECT * FROM Movimento_bancario
select * from contas_receber_pag where Crp_cod_pag=:pcodigo
SELECT * FROM Movimento_bancario where Crp_cod_pag=:pCrp_cod_pag
SELECT * FROM Movimentos where Crp_cod_pag=:pCrp_cod_pag
SELECT * FROM Movimento_bancario where Crp_cod_pag=:pcodigo
SELECT * FROM Movimentos where Crp_cod_pag=:pcodigo
SELECT  TOP (1) PERCENT EmpFactAD_Porcentagem, EmpFactAD_Data
SELECT CASE WHEN contas_receber.ctr_vinculo = 'OUTROS' THEN contas_receber.ctr_nome WHEN contas_receber.ctr_vinculo = 'CLIENTE' THEN
SELECT CASE WHEN contas_apagar.ctp_vinculo = 'OUTROS' THEN contas_apagar.ctp_nome WHEN contas_apagar.ctp_vinculo = 'CLIENTE' THEN
select max(ControlChequeDet_Codigo) as maximo from ControlChequeDet
select ctr_codigo_det as contadetalhe, Crp_cod_pag as contapaga from Contas_receber_pag  where crp_cod_pag =
select ctp_codigo_det as contadetalhe, Cpp_cod_pag as contapaga from Contas_apagar_pag  where cpp_cod_pag =
SELECT CASE WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'OUTROS' THEN ControleChequeDet.ControlChequeDet_emitente WHEN ControleChequeDet.ControlChequeDet_Vinculo= 'CLIENTE' THEN (SELECT cli_nome FROM clientes WHERE clientes.cli_codigo = ControleChequeDet.ControlChequeDet_vinculocodigo) WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'INDICA
SELECT * from Tipo_documento where tpd_descricao is not null order by tpd_descricao
SELECT ControlChequeDet_Emitente FROM ControleChequeDet where(ControlChequeDet_Vinculo = 'OUTROS') and ControlChequeDet_Emitente is not null
SELECT Fil_codigo,Fil_fantasia from Filiais where Fil_fantasia is not null order by Fil_fantasia
SELECT 'A PAGAR' AS tipoconta, CASE WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'OUTROS' THEN ControleChequeDet.ControlChequeDet_emitente WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'CLIENTE' THEN (SELECT  cli_nome FROM clientes WHERE clientes.cli_codigo = ControleChequeDet.ControlChequeDet_vinculocodigo) WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'INDICA
SELECT  'A RECEBER' AS tipoconta, CASE WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'OUTROS' THEN ControleChequeDet.ControlChequeDet_emitente WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'CLIENTE' THEN (SELECT cli_nome FROM clientes WHERE clientes.cli_codigo = ControleChequeDet.ControlChequeDet_vinculocodigo) WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'INDICA
SELECT Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_CodigoPre, Pasta.Pasta_Descricao, Pasta.Pasta_codigo, Clientes.Cli_Nome,
select GrupoProduto_Codigo from VendaIndicacaoGrupProd where VenIndGrup_Porc > 0 and VenInd_TpDoc = 'PRO' and Ind_Codigo =:pInd_Codigo
SELECT  sum(dbo.contas_Receber_det.Ctr_valor_vencimento) as valor
SELECT Reserva_tecnica.Ret_codigo,Reserva_tecnica.Ret_projeto_avulsa,
SELECT Reserva_tecnica.Ret_codigo,contas_apagar.Tpd_codigo,contas_apagar.Ctp_status,Reserva_tecnica.Ret_tipo,
SELECT pedido.ped_dt_fechamento,Clientes.Cli_Nome FROM pedido
SELECT TransfIndicacao.TransfInd_codigo,TransfIndicacao.TransfInd_Data,
select TransfIndicacao.*,Indicacoes.Ind_Nome AS daIndicacao,Indicacoes1.Ind_Nome AS ParaIndicacao
select TransfIndicacaoDet.TransfIndDet_codigo,TransfIndicacaoDet.TransfInd_codigo,
SELECT  TransfInd_codigo,TransfInd_DaIndicacao,TransfInd_ParaIndicacao,
SELECT Mensagem_Relatorio.men_mensagem FROM Mensagem_Relatorio
SELECT distinct  controle_entrega_data.CED_Volume,controle_entrega_data.cen_codigo_pre, dbo.controle_entrega_data.Pro_codnosso,
select CIDADE,UF from empresa where codlanc =:pcodlanc
SELECT  Ven_DescontoPorcProd
SELECT     TOP (1) VendaProduto.VenPro_VlUnitario
SELECT   dbo.VendaProduto.VenPro_Obs
select emp_codigo from venda where ven_codigo =:pven_codigo and ParSV_serie=:pParSV_serie and Ven_Tipo ='P'
select cli_codigo as codigo, cli_nome as nome from clientes order by cli_nome
SELECT DISTINCT for_codigo,For_Nome FROM fornecedor order by for_nome
SELECT DATEPART(mm, GETDATE()) AS MesAtual
SELECT DISTINCT Pro_tp_produto from produtos where (Pro_tp_produto is not null)
SELECT DISTINCT Pro_tp_peca from produtos where (Pro_tp_peca is not null)
SELECT  dbo.produtos.Pro_codnosso AS codigo,dbo.produtos.Pro_descricao AS Nome,dbo.Acabamento.DescAcabamento AS Acabamento,dbo.Acabamento.CodAcabamento AS CodAcabamento,dbo.produtos.Pro_tp_produto,dbo.produtos.Pro_tp_peca FROM  dbo.produtos  LEFT OUTER JOIN dbo.Preco_Produto ON (dbo.produtos.Pro_codnosso = dbo.Preco_Produto.Pre_Codnosso)  LEFT OUTER JOIN dbo.Acabamento ON (dbo.Preco_Produto.Pre_Acabamento = dbo.Acabamento.CodAcabamento)
select cli_codigo as codigo,Cli_conjuge AS nome,case when RIGHT(Cli_dtnasc_conjuge, 2) =  :Pdata  then 'TRUE' else 'false' end as resultado from clientes WHERE (Cli_conjuge IS NOT NULL) AND(Cli_dtnasc_conjuge IS NOT NULL) order by Cli_conjuge
SELECT  cli_codigo AS codigo, Cli_conjuge AS nome FROM clientes WHERE (Cli_conjuge IS NOT NULL) and Cli_conjuge <> ''  ORDER BY Cli_conjuge
select cli_codigo as codigo,cli_nome as nome,case when RIGHT(Cli_dataNasc, 2) =  :Pdata  then 'TRUE' else 'false' end as resultado from clientes WHERE (cli_nome IS NOT NULL) AND(Cli_dataNasc IS NOT NULL) order by cli_nome
select Indicacoes.IND_codigo as codigo,Indicacoes_Detalhe.IndDet_conjuge as nome, case when RIGHT(IndDet_dtnasc_conjuge, 2) =  :Pdata  then 'TRUE' else 'false' end as resultado from indicacoes INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo) where (Indicacoes_Detalhe.IndDet_conjuge IS NOT NULL) and Indicacoes_Detalhe.IndDet_conjuge <> '' and  (Indicacoes_Detalhe.IndDet_dtnasc_conjuge IS NOT NULL) and (IndDet_profissao=:Pprofissao) order by IndDet_conjuge
select Indicacoes.IND_codigo as codigo,Indicacoes_Detalhe.IndDet_conjuge as nome from indicacoes INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo) where (Indicacoes_Detalhe.IndDet_conjuge IS NOT NULL) AND  (IndDet_profissao=:Pprofissao) and Indicacoes_Detalhe.IndDet_conjuge <> '' order by IndDet_conjuge
select Indicacoes.IND_codigo as codigo,Ind_nome as nome,case when RIGHT(IndDet_Dtnacimento, 2) =  :Pdata  then 'TRUE' else 'false' end as resultado from indicacoes INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo) where (Indicacoes_Detalhe.IndDet_Dtnacimento IS NOT NULL) and  (IndDet_profissao=:Pprofissao) order by Ind_nome
select Indicacoes.IND_codigo as codigo,Ind_nome as nome from indicacoes INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo) where (IndDet_profissao=:Pprofissao) order by Ind_nome
select Indicacoes.IND_codigo as codigo,Indicacoes_Detalhe.IndDet_conjuge as nome from indicacoes INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo) where (Indicacoes_Detalhe.IndDet_conjuge IS NOT NULL) order by IndDet_conjuge
select Indicacoes.IND_codigo as codigo,Ind_nome as nome,case when RIGHT(IndDet_Dtnacimento, 2) =  :Pdata  then 'TRUE' else 'false' end as resultado from indicacoes  INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo) where (Indicacoes_Detalhe.IndDet_Dtnacimento IS NOT NULL)  order by Ind_nome
select Indicacoes.IND_codigo as codigo,Indicacoes_Detalhe.IndDet_conjuge as nome, case when RIGHT(IndDet_dtnasc_conjuge, 2) =  :Pdata  then 'TRUE' else 'false' end as resultado from indicacoes INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo = Indicacoes_Detalhe.Ind_codigo) where (Indicacoes_Detalhe.IndDet_conjuge IS NOT NULL) AND  (Indicacoes_Detalhe.IndDet_dtnasc_conjuge IS NOT NULL) order by IndDet_conjuge
select Indicacoes.IND_codigo as codigo, IND_nome as nome from indicacoes  order by IND_nome
SELECT venda.ven_codigo,venda.ParSV_serie, venda.Pasta_codigo, venda.Ven_Orcamento, Clientes.Cli_Nome, Obras.Obr_Descricao, Obras.Obr_Endereco, Obras.Obr_numero, Obras.Obr_complemento, Obras.Obr_Bairro, Obras.Obr_Cidade, Obras.Obr_UF, Obras.Obr_CEP, Obras.Obr_Codigo, Municipio.mun_nome, Municipio.mun_uf,venda.Ven_DataEmissao, venda.Ven_DataFechaVenda, Clientes.Cli_Fcomercial, Clientes.Cli_Fresidencial, Clientes.Cli_fax, Clientes.Cli_celular, VendaAtendente.VenAten_TpDoc, Funcionario.Fun_Nome, Funcionario.Fun_celular, VendaIndicacao.VenInd_TpDoc, Indicacoes.Ind_Nome, Indicacoes.Ind_comercial, Indicacoes.Ind_residencial, Indicacoes.Ind_fax, Indicacoes.Ind_celular FROM Municipio INNER JOIN Obras ON Municipio.mun_codigo = Obras.mun_codigo INNER JOIN VendaAtendente INNER JOIN venda INNER JOIN Clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo ON VendaAtendente.VenAten_NDocPre = venda.ven_codigopre ON Obras.Obr_Codigo = venda.Obr_Codigo INNER JOIN Funcionario ON VendaAtendente.Fun_Codigo = Funcionario.Fun_CPF INNER JOIN VendaIndicacao ON venda.ven_codigopre = VendaIndicacao.VenInd_NDocPre INNER JOIN Indicacoes ON VendaIndicacao.Ind_Codigo = Indicacoes.Ind_codigo WHERE (VendaAtendente.VenAten_TpDoc = 'ORC') AND (VendaIndicacao.VenInd_TpDoc = 'ORC') and venda.ven_tipo ='O'  and venda.ven_situacao='A'     order by venda.Ven_DataEmissao
select max(etq_GrpDet_codigo) as maximo from EtiquetaGrupoDet
select max(etq_Gru_codigo) as maximo from Etiqueta_Grupo
select max(etq_codigo) as maximo from etiquetas
SELECT Clientes.*,Municipio.mun_nome,Municipio.mun_uf FROM Clientes LEFT OUTER JOIN Municipio ON Clientes.Cli_codcidade = Municipio.mun_codigo
SELECT Fornecedor.*,Municipio.mun_nome,Municipio.mun_uf FROM Fornecedor LEFT OUTER JOIN Municipio ON Fornecedor.For_codcidade = Municipio.mun_codigo
SELECT produtos.*,Preco_Produto.*,Acabamento.DescAcabamento FROM produtos LEFT OUTER JOIN Preco_Produto ON (produtos.Pro_codnosso = Preco_Produto.Pre_Codnosso) LEFT OUTER JOIN Acabamento ON (Preco_Produto.Pre_Acabamento = Acabamento.CodAcabamento)
SELECT Indicacoes.Ind_Nome,Indicacoes_Detalhe.*,mun_nome,mun_uf FROM Indicacoes INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo=Indicacoes_Detalhe.Ind_codigo)  INNER JOIN Municipio ON (Indicacoes_Detalhe.IndDet_CodCidade=Municipio.mun_codigo)
SELECT venda.ven_codigo,venda.ParSV_serie, venda.Pasta_codigo, venda.Ven_Orcamento,     Clientes.Cli_Nome, Obras.Obr_Descricao, Obras.Obr_Endereco, Obras.Obr_numero, Obras.Obr_complemento, Obras.Obr_Bairro, Obras.Obr_Cidade, Obras.Obr_UF, Obras.Obr_CEP, Obras.Obr_Codigo, Municipio.mun_nome, Municipio.mun_uf,venda.Ven_DataEmissao, venda.Ven_DataFechaVenda, Clientes.Cli_Fcomercial, Clientes.Cli_Fresidencial, Clientes.Cli_fax, Clientes.Cli_celular, VendaAtendente.VenAten_TpDoc, Funcionario.Fun_Nome, Funcionario.Fun_celular, VendaIndicacao.VenInd_TpDoc, Indicacoes.Ind_Nome, Indicacoes.Ind_comercial, Indicacoes.Ind_residencial, Indicacoes.Ind_fax, Indicacoes.Ind_celular FROM Municipio INNER JOIN Obras ON Municipio.mun_codigo = Obras.mun_codigo INNER JOIN VendaAtendente INNER JOIN venda INNER JOIN Clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo ON VendaAtendente.VenAten_NDocPre = venda.ven_codigopre ON Obras.Obr_Codigo = venda.Obr_Codigo INNER JOIN Funcionario ON VendaAtendente.Fun_Codigo = Funcionario.Fun_CPF INNER JOIN VendaIndicacao ON venda.ven_codigopre = VendaIndicacao.VenInd_NDocPre INNER JOIN Indicacoes ON VendaIndicacao.Ind_Codigo = Indicacoes.Ind_codigo WHERE (VendaAtendente.VenAten_TpDoc = 'ORC') AND (VendaIndicacao.VenInd_TpDoc = 'ORC') and venda.ven_tipo ='O' and venda.ven_situacao='A'
SELECT Clientes.*,Municipio.mun_nome,Municipio.mun_uf FROM Clientes INNER JOIN Municipio ON Clientes.Cli_codcidade = Municipio.mun_codigo
SELECT Fornecedor.*,Municipio.mun_nome,Municipio.mun_uf FROM Fornecedor INNER JOIN Municipio ON Fornecedor.For_codcidade = Municipio.mun_codigo
SELECT Indicacoes.Ind_Nome,Indicacoes_Detalhe.*,Municipio.mun_nome,Municipio.mun_uf FROM Indicacoes INNER JOIN Indicacoes_Detalhe ON (Indicacoes.Ind_codigo=Indicacoes_Detalhe.Ind_codigo)  INNER JOIN Municipio ON (Indicacoes_Detalhe.IndDet_CodCidade=Municipio.mun_codigo)
select * from Texto_Substituicao where (Texto_Substituicao.Tsu_tabela = 'Clientes')
select * from Texto_Substituicao where (Texto_Substituicao.Tsu_tabela = 'Fornecedor')
select * from Texto_Substituicao where (Texto_Substituicao.Tsu_tabela = 'Produtos')
select * from Texto_Substituicao where (Texto_Substituicao.Tsu_tabela = 'Indicacoes')
select * from Texto_Substituicao where (Texto_Substituicao.Tsu_tabela = 'Or
SELECT DISTINCT  str(etq_Gru_codigo) as codigo from Etiqueta_Grupo where etq_codigo =:Petq_codigo
select max(CatRem_codigo) as maximo from CategoriaRemuneracao
select CatRem_Descricao from CategoriaRemuneracao where CatRem_Descricao=:PCatRem_Descricao
SELECT * FROM CategoriaRemuneracao WITH (NOLOCK)
select * from CategoriaRemuneracao
SELECT * FROM Tipo_documento WHERE (Tpd_codigo =:PTpd_codigo)
SELECT Ctp_codigo as Codigo FROM contas_apagar WHERE
SELECT Ctr_codigo as codigo FROM contas_receber WHERE
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento  WHERE  Tpd_situacao='A' and Tpd_codigo < 1000
SELECT Tpd_codigo, Tpd_descricao FROM Tipo_documento WHERE (Tpd_codigo=:PTpd_codigo or Tpd_situacao='A') and Tpd_codigo < 1000
SELECT contas_apagar_det.Ctp_codigo,contas_apagar_det.Ctp_parcela,contas_apagar_det.Ctp_dt_vencimento,contas_apagar_det.Ctp_valor_vencimento,contas_apagar_det.Mdo_codigo,contas_apagar_det.ctp_codigo_det FROM contas_apagar INNER JOIN contas_apagar_det ON (contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo) WHERE (contas_apagar.Ctp_cod_externo = :PcodigoRH) AND (contas_apagar.CTP_ControlReferencia = 'RH')order by  contas_apagar_det.Ctp_parcela
SELECT contas_receber_det.Ctr_codigo,contas_receber_det.Ctr_parcela,contas_receber_det.Ctr_dt_vencimento,contas_receber_det.Ctr_valor_vencimento,contas_receber_det.Mdo_codigo,contas_receber_det.ctr_codigo_det FROM contas_receber INNER JOIN contas_receber_det ON (contas_receber.Ctr_codigo = contas_receber_det.Ctr_codigo) WHERE (contas_receber.Ctr_cod_externo = :PcodigoRH) AND (contas_receber.CTr_ControlReferencia = 'RH') order by  contas_receber_det.Ctr_parcela
SELECT contas_apagar_det.Ctp_codigo,contas_apagar_det.Ctp_parcela,contas_apagar_det.Ctp_dt_vencimento,contas_apagar_det.Ctp_valor_vencimento,contas_apagar_det.Mdo_codigo,contas_apagar_det.ctp_codigo_det FROM contas_apagar INNER JOIN contas_apagar_det ON (contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo) WHERE (contas_apagar.Ctp_cod_externo = :PcodigoRH) AND (contas_apagar.CTP_ControlReferencia = 'RH') order by  contas_apagar_det.Ctp_parcela
SELECT * FROM contas_apagar WHERE contas_apagar.Ctp_codigo =:PCtp_codigo
SELECT * FROM contas_receber WHERE (contas_receber.Ctr_codigo = :PCtr_codigo)
SELECT Ctp_forma_pag,Ctp_codigo as codigo FROM contas_apagar WHERE (Ctp_cod_externo =:PContaCodigo) AND
SELECT Ctr_forma_pag,Ctr_codigo as codigo FROM contas_receber WHERE (Ctr_cod_externo =:PContaCodigo) AND
SELECT * from FechamentoComissao
SELECT Ctp_codigo as codigo FROM contas_apagar WHERE (CTP_ControlReferencia ='RH') AND (Ctp_cod_externo =:Pcodigo)
SELECT Ctr_codigo as codigo FROM contas_receber WHERE (CTr_ControlReferencia ='RH') AND (Ctr_cod_externo =:Pcodigo)
SELECT contas_apagar_det.Ctp_dt_vencimento as vencimento,
SELECT Modo.Mdo_nome as modoPag,Contas_apagar_pag.Cpp_valor_pago as valor,Contas_apagar_pag.Cpp_data_pagamento as dtPag FROM Contas_apagar_pag LEFT OUTER JOIN Modo ON (Contas_apagar_pag.mdo_codigo = Modo.Mdo_codigo) WHERE (Contas_apagar_pag.ctp_codigo_det =:PcodigoDet)
SELECT contas_receber_det.Ctr_dt_vencimento as vencimento,
SELECT Modo.Mdo_nome as modopag,Contas_receber_pag.Crp_valor_pago as valor,Contas_receber_pag.Crp_data_pagamento as dtPag FROM Contas_receber_pag LEFT OUTER JOIN Modo ON (Contas_receber_pag.mdo_codigo = Modo.Mdo_codigo) WHERE (Contas_receber_pag.ctr_codigo_det =:PcodigoDet)
SELECT Ctp_codigo as Codigo FROM contas_apagar WHERE  (Ctp_cod_externo =:PCtrlRH_codigo) AND (CTP_ControlReferencia = 'RH')
SELECT Ctr_codigo as codigo FROM contas_receber WHERE  (Ctr_cod_externo =:PCtrlRH_codigo) AND (CTr_ControlReferencia = 'RH')
SELECT * FROM CONTAS_APAGAR_det WHERE (CTP_Codigo =:Pctp_codigo)
SELECT Fun_Nome,Fun_CPF FROM Funcionario order by Fun_nome
SELECT ControleRH.*,Funcionario.Fun_Nome,Tipo_documento.Tpd_descricao FROM ControleRH INNER JOIN dbo.Funcionario ON (dbo.ControleRH.Fun_Codigo = dbo.Funcionario.Fun_CPF) INNER JOIN dbo.Tipo_documento ON (dbo.ControleRH.Tpd_codigo = dbo.Tipo_documento.Tpd_codigo)
select MetaVenda_Codigo from metaVenda where MetaVenda_descricao=
select  MetaVenda_Codigo from metaVenda  where MetaVenda_Codigo <>
SELECT MetaVenda_Codigo  FROM FechamentoMetaFunc WHERE (MetaVenda_Codigo=:pMetaVenda_Codigo)
SELECT MetaVenda_Codigo FROM FechamentoMetaEmp WHERE (MetaVenda_Codigo=:pMetaVenda_Codigo)
SELECT SUM(RateioDet_Porcentagem)AS TOTAL FROM RateioDet where Rateio_codigo=:pRateio_codigo
select Rateio_Codigo from rateio where rateio_descricao=
select  rateio_Codigo from rateio  where rateio_Codigo <>
SELECT GrupoProduto_Codigo,GrupoProduto_Descricao FROM GrupoProduto  WHERE (GrupoProduto_Codigo =:PGrupoProduto_Codigo)
SELECT ComPre_Descricao FROM ComissaoPremiacao WHERE ComPre_Descricao =:PComPre_Descricao
SELECT ComPre_Descricao FROM ComissaoPremiacao WHERE (ComPre_Descricao =:PComPre_Descricao) AND
select sum(ComPre_CondPorcent) as total from ComissaoPremiacao
SELECT * FROM dbo.ComissaoPremiacao
SELECT Municipio.mun_nome, Regiao.Regiao_Descricao, Paises.Paises_Descricao, Paises.Paises_Sigla, Clientes.Cli_cnpj_cpf,
SELECT  DISTINCT Trib_Porcentagem from Tributacao where trib_tipo='IVA'
SELECT produtos.Pro_codnosso, GrupoProduto.GrupoProduto_Descricao, produtos.Pro_descricao
SELECT sum(Fact_VlTotal) as valor, count(*) as quant from factura where Fact_Tipo='FCT' and Fact_Situacao='A'
SELECT sum(Fact_VlTotal) as valor, count(*) as quant from factura where Fact_Tipo='NCR' and Fact_Situacao='A'
SELECT sum(Fact_VlTotal) as valor, count(*) as quant from factura where Fact_Tipo='NCE' and Fact_Situacao='A'
SELECT sum(Fact_VlTotal) as valor, count(*) as quant from factura where Fact_Tipo='VDI' and Fact_Situacao='A'
SELECT sum(Fact_VlTotal) as valor, count(*) as quant from factura where Fact_Tipo='DEV' and Fact_Situacao='A'
SELECT * from factura where factura.Fact_Situacao='A' and  factura.Fact_Tipo in (
SELECT Obras.Obr_Endereco as endereco, Obras.Obr_numero as numero, Obras.Obr_CEP as cep, Municipio.mun_nome, Paises.Paises_Descricao
SELECT Municipio.mun_nome, Paises.Paises_Descricao, Clientes.Cli_Endereco_cob AS endereco, Clientes.Cli_numero_cob AS numero,
SELECT Municipio.mun_nome, Paises.Paises_Descricao, Clientes.Cli_Endereco AS endereco, Clientes.Cli_numero AS numero,
SELECT produtos.Pro_unidade, produtos.Pro_descricao, FacturaProduto.*
SELECT MONTH(GETDATE()) AS mes
SELECT Year(GETDATE()) AS ano
SELECT Funcionario.Fun_Nome, Funcionario.Fun_CPF, MetaVenda.MetaVenda_descricao, MetaVenda.MetaVenda_Codigo, MetaVenda.MetaVenda_valor, MetaVendaDet.MetaVendaDet_Valor, MetaVendaDet.CatRem_Codigo,venda.ven_codigo  , (SELECT   round( SUM((VendaProduto.VenPro_VlItem - CASE WHEN Vendap.Ven_DescontoPorcProd IS NULL OR (VendaProduto.VenPro_VlDescontoProc > 0) THEN 0 ELSE round((VendaProduto.VenPro_VlItem * Vendap.Ven_DescontoPorcProd) / 100,4) END) * (val.VenAten_Porcentagem / 100)),2)   AS TOTAL_LUM  FROM VendaProduto  INNER JOIN   produtos AS produtosl ON VendaProduto.Pro_codnosso = produtosl.Pro_codnosso INNER JOIN  venda AS vendap ON VendaProduto.ven_codigopre = vendap.ven_codigopre INNER JOIN   VendaAtendente AS val ON vendap.ven_codigopre = val.VenAten_NDocPre   WHERE vendap.ven_situacao='A' AND (val.VenAten_TpDoc = 'PRO') AND vendap.ven_tipo='P' AND   (vendap.ven_dataemissao = VendaAtendente.VenAten_DtVigencia) AND (vendap.ven_codigopre = venda.ven_codigopre) AND   (val.fun_codigo=VendaAtendente.fun_codigo ) and   (produtosl.GrupoProduto_codigo IN   (SELECT     GrupoProduto_Codigo   FROM MetaVendaGrupProd AS MetaVendaGrupProdl   WHERE  MetaVendaGrupProdl.metavenda_codigo = metavenda.metavenda_codigo))) as total_lum   FROM   venda INNER JOIN   dbo.VendaAtendente ON venda.ven_codigopre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN   dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF CROSS JOIN   dbo.MetaVenda INNER JOIN  dbo.MetaVendaDet ON dbo.MetaVenda.MetaVenda_Codigo = dbo.MetaVendaDet.MetaVenda_Codigo   WHERE (Funcionario.Fun_GrupoComissao = MetaVendaDet.CatRem_Codigo OR Funcionario.Fun_GrupoPremiacao = dbo.MetaVendaDet.CatRem_Codigo)   and (MetaVenda.MetaVenda_Situacao = 'A') and (MetaVenda.MetaVenda_Tipo = 'F') and (MetaVendaDet.MetaVendaDet_dataV <= venda.ven_dataemissao)   and (MetaVendaDet.MetaVendaDet_dataVfim >= venda.ven_dataemissao) AND (venda.ven_situacao = 'A') and venda.ven_tipo = 'P'   and venda.ven_dataemissao >=:DataIni AND venda.ven_dataemissao <=:DataFim AND (VendaAtendente.VenAten_DtVigencia = venda.ven_dataemissao)    AND (dbo.VendaAtendente.VenAten_TpDoc = 'PRO')     and venda.CatVen_Codigo in (select MetaVendaTpVenda.CatVen_Codigo from MetaVendaTpVenda where MetaVendaTpVenda.MetaVenda_Codigo = MetaVenda.MetaVenda_Codigo )   GROUP BY Funcionario.Fun_Nome, Funcionario.Fun_CPF, MetaVenda.MetaVenda_descricao, MetaVenda.MetaVenda_Codigo,    MetaVenda.MetaVenda_valor, MetaVendaDet.MetaVendaDet_Valor, MetaVendaDet.CatRem_Codigo,    VendaAtendente.VenAten_DtVigencia,venda.ven_codigo,VendaAtendente.fun_codigo, venda.ven_codigopre
SELECT MetaVenda.MetaVenda_descricao, MetaVenda.MetaVenda_Codigo,MetaVenda.MetaVenda_valor, venda.ven_codigo , (SELECT ROUND(SUM((dbo.VendaProduto.VenPro_VlItem - CASE WHEN Vendap.Ven_DescontoPorcProd IS NULL OR(VendaProduto.VenPro_VlDescontoProc > 0) THEN 0 ELSE round((VendaProduto.VenPro_VlItem * Vendap.Ven_DescontoPorcProd) / 100, 4) END)  ), 2) AS TOTAL_LUM FROM VendaProduto INNER JOIN produtos AS produtosl ON VendaProduto.Pro_codnosso = produtosl.Pro_codnosso INNER JOIN Venda AS vendap ON VendaProduto.Ven_CodigoPre = vendap.Ven_CodigoPre WHERE (vendap.Ven_Situacao = 'A') AND(vendap.Ven_Tipo = 'P') AND (vendap.Ven_CodigoPre = venda.ven_codigopre) AND (produtosl.GrupoProduto_codigo IN (SELECT     GrupoProduto_Codigo FROM MetaVendaGrupProd AS MetaVendaGrupProdl WHERE (MetaVenda_Codigo = dbo.MetaVenda.MetaVenda_Codigo)))) AS total_lum FROM  venda CROSS JOIN  dbo.MetaVenda   WHERE (MetaVenda.MetaVenda_Situacao = 'A') and (dbo.MetaVenda.MetaVenda_Tipo = 'E') and (MetaVenda.MetaVenda_dataVigencia <= venda.Ven_DataEmissao) and (MetaVenda.MetaVenda_dataVigenciafim >= venda.Ven_DataEmissao) AND (venda.ven_situacao = 'A') and venda.ven_tipo='P' and (venda.Ven_DataEmissao BETWEEN :DataIni AND :DatafIM)   and VENDA.CatVen_Codigo in (select MetaVendaTpVenda.CatVen_Codigo from MetaVendaTpVenda where MetaVendaTpVenda.MetaVenda_Codigo = MetaVenda.MetaVenda_Codigo )   GROUP BY MetaVenda.MetaVenda_descricao, MetaVenda.MetaVenda_Codigo,    MetaVenda.MetaVenda_valor,VENDA.ven_codigo, VENDA.ven_codigopre
SELECT Funcionario.Fun_Nome,Funcionario.Fun_GrupoComissao,
SELECT dbo.MetaVenda.MetaVenda_descricao from    dbo.MetaVenda
SELECT CatRem_Descricao FROM CategoriaRemuneracao WHERE(CatRem_Codigo = :Pcategoria)
select Par_RHDiasFechMeta from dbo.Paramentros
select FechMeta_MesAno from FechamentoMeta where FechMeta_MesAno=:PFechMeta_MesAno
SELECT     dbo.Funcionario.Fun_Nome,dbo.Funcionario.Fun_CPF, VendaAtendente.fun_codigo, dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo, dbo.MetaVenda.MetaVenda_valor, dbo.MetaVendaDet.MetaVendaDet_Valor, dbo.MetaVendaDet.CatRem_Codigo, dbo.Factura.Fact_Codigo,  (SELECT     round(SUM((FacturaProdutoFCT.FactProd_Vltotal - CASE WHEN FacturaFCT.Fact_PorcDesconto IS NULL  THEN 0 ELSE round((FacturaProdutoFCT.FactProd_Vltotal * FacturaFCT.Fact_PorcDesconto) / 100, 4) END) * (vam.VenAten_Porcentagem / 100)), 2) AS TotalFCT  FROM          FacturaProduto AS FacturaProdutoFCT INNER JOIN  produtos AS produtosFCT ON FacturaProdutoFCT.Pro_codnosso = produtosFCT.Pro_codnosso INNER JOIN    Factura AS FacturaFCT ON FacturaProdutoFCT.Fact_Codigo = FacturaFCT.Fact_codigo AND FacturaFCT.Fact_Tipo = 'FCT' INNER JOIN  VendaAtendente AS vam ON FacturaFCT.Fact_codigo = vam.VenAten_NDocPre AND vam.venAten_tpdoc = 'FCT'  WHERE      (FacturaProdutoFCT.Fact_Tipo = 'FCT') AND (FacturaFCT.Fact_DtEmissao = VendaAtendente.VenAten_DtVigencia) AND (FacturaFCT.Fact_codigo = Factura.Fact_Codigo) AND (vam.fun_codigo=VendaAtendente.fun_codigo) and(produtosFCT.GrupoProduto_codigo IN  (SELECT     GrupoProduto_Codigo   FROM          MetaVendaGrupProd AS MetaVendaGrupProdm  WHERE      MetaVendaGrupProdm.metavenda_codigo = metavenda.metavenda_codigo)))  AS totalFCT FROM         dbo.Factura INNER JOIN   dbo.VendaAtendente ON dbo.Factura.Fact_Codigo = dbo.VendaAtendente.VenAten_NDocPre AND    dbo.Factura.Fact_Tipo = dbo.VendaAtendente.VenAten_TpDoc AND dbo.Factura.Fact_DtEmissao = dbo.VendaAtendente.VenAten_DtVigencia INNER JOIN   dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF LEFT OUTER JOIN    dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo CROSS JOIN   dbo.MetaVenda INNER JOIN    dbo.MetaVendaDet ON dbo.MetaVenda.MetaVenda_Codigo = dbo.MetaVendaDet.MetaVenda_Codigo   WHERE     (dbo.Funcionario.Fun_GrupoComissao = dbo.MetaVendaDet.CatRem_Codigo or dbo.Funcionario.Fun_GrupoPremiacao = dbo.MetaVendaDet.CatRem_Codigo)  AND (dbo.MetaVenda.MetaVenda_Situacao = 'A') AND (dbo.MetaVenda.MetaVenda_Tipo = 'F') AND    (dbo.MetaVendaDet.MetaVendaDet_dataV <= dbo.Factura.Fact_DtEmissao) and (dbo.MetaVendaDet.MetaVendaDet_dataVfim >= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A')  and  (Factura.Fact_tipo = 'FCT') AND (dbo.Factura.Fact_DtEmissao BETWEEN   :DataIni AND :DataFim) AND (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR   dbo.FacturaImport.FactImp_TipoImportado IS NULL)  and Factura.CatVen_Codigo in (select MetaVendaTpVenda.CatVen_Codigo from MetaVendaTpVenda where MetaVendaTpVenda.MetaVenda_Codigo = MetaVenda.MetaVenda_Codigo ) GROUP BY dbo.Funcionario.Fun_Nome,dbo.Funcionario.Fun_CPF, VendaAtendente.fun_codigo, dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo,  dbo.MetaVenda.MetaVenda_valor, dbo.MetaVendaDet.MetaVendaDet_Valor, dbo.MetaVendaDet.CatRem_Codigo, dbo.Factura.Fact_Codigo,  dbo.VendaAtendente.VenAten_DtVigencia
SELECT     dbo.Funcionario.Fun_Nome,dbo.Funcionario.Fun_CPF, VendaAtendente.fun_codigo, dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo, dbo.MetaVenda.MetaVenda_valor, dbo.MetaVendaDet.MetaVendaDet_Valor, dbo.MetaVendaDet.CatRem_Codigo, dbo.Factura.Fact_Codigo,  (SELECT     round(SUM((FacturaProdutoVDI.FactProd_Vltotal - CASE WHEN FacturaVDI.Fact_PorcDesconto IS NULL  THEN 0 ELSE round((FacturaProdutoVDI.FactProd_Vltotal * FacturaVDI.Fact_PorcDesconto) / 100, 4) END)  * (val.VenAten_Porcentagem / 100)), 2) AS TotalVDI  FROM          FacturaProduto AS FacturaProdutoVDI INNER JOIN   produtos AS produtosl ON FacturaProdutoVDI.Pro_codnosso = produtosl.Pro_codnosso INNER JOIN  Factura AS FacturaVDI ON FacturaProdutoVDI.Fact_codigo = FacturaVDI.Fact_codigo AND FacturaVDI.Fact_Tipo = 'VDI' INNER JOIN  VendaAtendente AS val ON FacturaVDI.Fact_codigo = val.VenAten_NDocPre AND val.venAten_tpdoc = 'VDI'  WHERE      (FacturaProdutoVDI.Fact_tipo = 'VDI') AND (FacturaVDI.Fact_DtEmissao = VendaAtendente.VenAten_DtVigencia) AND   (FacturaVDI.Fact_codigo = FacturaVDI.Fact_Codigo) AND (val.fun_codigo=VendaAtendente.fun_codigo) and (produtosl.GrupoProduto_codigo IN   (SELECT     GrupoProduto_Codigo    FROM          MetaVendaGrupProd AS MetaVendaGrupProdl   WHERE      MetaVendaGrupProdl.metavenda_codigo = metavenda.metavenda_codigo))) AS TotalVDI  FROM         dbo.Factura INNER JOIN  dbo.VendaAtendente ON dbo.Factura.Fact_Codigo = dbo.VendaAtendente.VenAten_NDocPre AND    dbo.Factura.Fact_Tipo = dbo.VendaAtendente.VenAten_TpDoc AND dbo.Factura.Fact_DtEmissao = dbo.VendaAtendente.VenAten_DtVigencia INNER JOIN   dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF LEFT OUTER JOIN    dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo CROSS JOIN   dbo.MetaVenda INNER JOIN    dbo.MetaVendaDet ON dbo.MetaVenda.MetaVenda_Codigo = dbo.MetaVendaDet.MetaVenda_Codigo   WHERE     (dbo.Funcionario.Fun_GrupoComissao = dbo.MetaVendaDet.CatRem_Codigo or dbo.Funcionario.Fun_GrupoPremiacao = dbo.MetaVendaDet.CatRem_Codigo)  AND (dbo.MetaVenda.MetaVenda_Situacao = 'A') AND (dbo.MetaVenda.MetaVenda_Tipo = 'F') AND   (dbo.MetaVendaDet.MetaVendaDet_dataV <= dbo.Factura.Fact_DtEmissao) and (dbo.MetaVendaDet.MetaVendaDet_dataVfim >= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A') and (Factura.Fact_tipo= 'VDI') AND (dbo.Factura.Fact_DtEmissao BETWEEN   :DataIni AND :DataFim) AND (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR   dbo.FacturaImport.FactImp_TipoImportado IS NULL)  and Factura.CatVen_Codigo in (select MetaVendaTpVenda.CatVen_Codigo from MetaVendaTpVenda where MetaVendaTpVenda.MetaVenda_Codigo = MetaVenda.MetaVenda_Codigo ) GROUP BY dbo.Funcionario.Fun_Nome,dbo.Funcionario.Fun_CPF, VendaAtendente.fun_codigo, dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo,  dbo.MetaVenda.MetaVenda_valor, dbo.MetaVendaDet.MetaVendaDet_Valor, dbo.MetaVendaDet.CatRem_Codigo, dbo.Factura.Fact_Codigo,  dbo.VendaAtendente.VenAten_DtVigencia
SELECT     dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo, dbo.MetaVenda.MetaVenda_valor,   (SELECT     SUM(FacturaProdutoFCT.FactProd_Vltotal - CASE WHEN FacturaFCT.Fact_PorcDesconto IS NULL   THEN 0 ELSE (FacturaProdutoFCT.FactProd_Vltotal * FacturaFCT.Fact_PorcDesconto) / 100 END)   FROM          dbo.FacturaProduto AS FacturaProdutoFCT INNER JOIN   dbo.produtos AS produtosFCT ON FacturaProdutoFCT.Pro_codnosso = produtosFCT.Pro_codnosso INNER JOIN  dbo.Factura AS FacturaFCT ON FacturaProdutoFCT.Fact_Codigo = FacturaFCT.Fact_Codigo AND FacturaFCT.Fact_Tipo = 'FCT'  WHERE      (FacturaProdutoFCT.Fact_Tipo = 'FCT') AND (produtosFCT.GrupoProduto_codigo IN (SELECT     GrupoProduto_Codigo    FROM          dbo.MetaVendaGrupProd AS MetaVendaGrupProdm    WHERE      (MetaVenda_Codigo = dbo.MetaVenda.MetaVenda_Codigo)))) AS TotalFCT,  (SELECT     SUM(FacturaProdutoVDI.FactProd_Vltotal - CASE WHEN FacturaVDI.Fact_PorcDesconto IS NULL    THEN 0 ELSE (FacturaProdutoVDI.FactProd_Vltotal * FacturaVDI.Fact_PorcDesconto) / 100 END)   FROM          dbo.FacturaProduto AS FacturaProdutoVDI INNER JOIN    dbo.produtos AS produtosVDI ON FacturaProdutoVDI.Pro_codnosso = produtosVDI.Pro_codnosso INNER JOIN    dbo.Factura AS FacturaVDI ON FacturaProdutoVDI.Fact_Codigo = FacturaVDI.Fact_Codigo AND FacturaVDI.Fact_Tipo = 'VDI'  WHERE      (FacturaProdutoVDI.Fact_Tipo = 'VDI') AND (produtosVDI.GrupoProduto_codigo IN   (SELECT     GrupoProduto_Codigo  FROM          dbo.MetaVendaGrupProd AS MetaVendaGrupProdm      WHERE      (MetaVenda_Codigo = dbo.MetaVenda.MetaVenda_Codigo)))) AS TotalVDI  FROM         dbo.Factura LEFT OUTER JOIN   dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo CROSS JOIN   dbo.MetaVenda  WHERE     (dbo.MetaVenda.MetaVenda_Situacao = 'A') AND (dbo.MetaVenda.MetaVenda_tipo = 'E') AND (dbo.MetaVenda.MetaVenda_dataVigencia <= dbo.Factura.Fact_DtEmissao)   and (dbo.MetaVenda.MetaVenda_dataVigenciafim >= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A') AND (dbo.Factura.Fact_DtEmissao BETWEEN :DataIni AND :DataFim) AND  (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR   dbo.FacturaImport.FactImp_TipoImportado IS NULL)  GROUP BY dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo, dbo.MetaVenda.MetaVenda_valor
SELECT FechamentoMeta.FechMeta_Codigo,FechamentoMeta.FechMeta_MesAno,FechamentoMeta.FechMeta_data FROM FechamentoMeta with(nolock)
select min(contas_apagar_det.Ctp_dt_vencimento) as Ctp_dt_vencimento, sum(contas_apagar_det.Ctp_valor_vencimento) as Ctp_valor_vencimento
select min(Ctp_dt_vencimento) as Ctp_dt_vencimento FROM contas_apagar_det INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo where Ctp_cod_documento=:PCtp_cod_documento
select fun_cpf from funcionario where Fun_atendimento='SIM'
SELECT FechComis_dataInicial from FechamentoComissao where  FechComis_Situacao ='A' order by FechComis_dataInicial
select top 1 DtGV_Data from DataGanhoVend
SELECT dbo.Venda.Ven_CodigoPre FROM dbo.Devolucao INNER JOIN  dbo.Venda ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre  where dev_codigo =:pcodigo
SELECT pedido.ped_codigo_pre FROM Saida_complementacao INNER JOIN pedido ON Saida_complementacao.ped_codigo = pedido.ped_codigo  where Scp_codigo=:Pcodigo
SELECT Ven_CodigoPre FROM venda where ven_situacao = 'A' and Ven_Tipo ='P' and ven_codigo =:Pcodigo and ParSV_serie =:pParSV_serie
SELECT avu_codigo_pre FROM avulso where avu_codigo =:Pcodigo
SELECT Saida_complementacao.scp_tl_geral_saida, pedido.ped_desc_por_orcamento, CASE WHEN pedido.ped_desc_por_orcamento > 0 THEN Saida_complementacao.scp_tl_geral_saida - (Saida_complementacao.scp_tl_geral_saida * (ROUND(pedido.ped_desc_por_orcamento,  2) / 100)) ELSE Saida_complementacao.scp_tl_geral_saida END * (dbo.VendaAtendente.VenAten_Porcentagem / 100) AS total, Saida_complementacao.Scp_codigo, (SELECT  COUNT(*) AS Expr1 FROM ControleRH WHERE  (ControleRH.CtrlRH_TpDocOri = 1018) AND (ControleRH.CtrlRH_CodDocOri = Saida_complementacao.Scp_codigo)) AS PARCELA, VendaAtendente.VenAten_Porcentagem FROM VendaAtendente INNER JOIN pedido ON VendaAtendente.VenAten_NDocPre = pedido.ped_codigo_pre INNER JOIN Saida_complementacao ON pedido.ped_codigo = dbo.Saida_complementacao.ped_codigo  WHERE (VendaAtendente.VenAten_TpDoc = 'PRO') AND pedido.ped_status ='A' AND VendaAtendente.FUN_CODIGO=:Pfun_codigo and Saida_complementacao.Scp_codigo =:pScp_codigo GROUP BY pedido.ped_tipo, pedido.ped_status, Saida_complementacao.scp_tl_geral_saida, pedido.ped_desc_por_orcamento, Saida_complementacao.Scp_codigo, VendaAtendente.VenAten_Porcentagem
SELECT Ent_devolucao.edv_tl_geral_entrada, pedido.ped_desc_por_orcamento, CASE WHEN pedido.ped_desc_por_orcamento > 0 THEN Ent_devolucao.edv_tl_geral_entrada - (Ent_devolucao.edv_tl_geral_entrada * (ROUND(pedido.ped_desc_por_orcamento, 2) / 100)) ELSE Ent_devolucao.edv_tl_geral_entrada END * (dbo.VendaAtendente.VenAten_Porcentagem / 100) AS total, Ent_devolucao.edv_codigo, (SELECT  COUNT(*) AS Expr1 FROM ControleRH WHERE  (ControleRH.CtrlRH_TpDocOri = 1017) AND (ControleRH.CtrlRH_CodDocOri = Ent_devolucao.edv_codigo)) AS PARCELA, VendaAtendente.VenAten_Porcentagem FROM VendaAtendente INNER JOIN pedido ON VendaAtendente.VenAten_NDocPre = pedido.ped_codigo_pre INNER JOIN Ent_devolucao ON pedido.ped_codigo = Ent_devolucao.ped_codigo WHERE (VendaAtendente.VenAten_TpDoc = 'PRO') AND pedido.ped_status ='A' AND VendaAtendente.FUN_CODIGO=:PFUN_CODIGO and Ent_devolucao.edv_codigo =:Pedv_codigo GROUP BY pedido.ped_tipo, pedido.ped_status, Ent_devolucao.edv_tl_geral_entrada, pedido.ped_desc_por_orcamento,  Ent_devolucao.edv_codigo, VendaAtendente.VenAten_Porcentagem
SELECT ControleRH.Tpd_codigo, ControleRH.CtrlRH_CodDocOri, ControleRH.CtrlRH_TpDocOri, ControleRH.CtrlRH_Valor, contas_Receber_det.Ctr_valor_vencimento, contas_Receber_det.Ctr_duplicata, contas_Receber_det.Ctr_recibo, contas_Receber_det.Ctr_dt_vencimento, Funcionario.Fun_CPF,   (SELECT     TOP (1) Crp_data_pagamento FROM Contas_receber_pag  WHERE  (ctr_codigo_det = contas_Receber_det.ctr_codigo_det)) AS DataPag, CASE WHEN ctrlrh_tpdocori = 1001 THEN (SELECT  Clientes.Cli_Nome  FROM  pedido INNER JOIN  Clientes ON pedido.cli_codigo = Clientes.Cli_Codigo  WHERE  pedido.ped_codigo = controlerh.ctrlrh_coddocori AND pedido.ped_status = 'A') ELSE CASE WHEN ctrlrh_tpdocori = 1002 THEN (SELECT Clientes.Cli_Nome  FROM  avulso INNER JOIN  Clientes ON avulso.cli_codigo = Clientes.Cli_Codigo  WHERE  avulso.avu_codigo = controlerh.ctrlrh_coddocori) ELSE CASE WHEN ctrlrh_tpdocori = 1017 THEN (SELECT  Clientes.Cli_Nome  FROM Ent_devolucao INNER JOIN  Clientes ON Ent_devolucao.cli_codigo = Clientes.Cli_Codigo  WHERE Ent_devolucao.EDV_codigo = controlerh.ctrlrh_coddocori) ELSE CASE WHEN ctrlrh_tpdocori = 1018 THEN  (SELECT  Clientes.Cli_Nome FROM  Saida_complementacao INNER JOIN  Clientes ON Saida_complementacao.cli_codigo = Clientes.Cli_Codigo  WHERE  Saida_complementacao.SCP_codigo = controlerh.ctrlrh_coddocori) END END END END AS nome, dbo.Funcionario.Fun_Nome FROM  ControleRH INNER JOIN contas_Receber_det ON ControleRH.CtrlRH_ContaRefVincDet = contas_Receber_det.ctr_codigo_det INNER JOIN Funcionario ON ControleRH.Fun_Codigo = Funcionario.Fun_CPF WHERE (dbo.ControleRH.FechComis_Codigo =:pFechComis_Codigo) AND (ControleRH.CtrlRH_VendaExcluida IS NULL OR ControleRH.CtrlRH_VendaExcluida = 'N') and (ControleRH.CtrlRH_ContaRefVincDet is not null AND ControleRH.CtrlRH_Pendente ='S' )
select fun_cpf, fun_nome from funcionario where Fun_atendimento='SIM' order by fun_nome
select FechComis_Codigo, FechComis_MesAno from FechamentoComissao  order by FechComis_dataInicial desc
SELECT  CASE WHEN dbo.FechamentoComissao.FechComis_Situacao = 'A' THEN 'ABERTO' ELSE 'FECHADO' END AS situacao, CASE WHEN ControleRH.CtrlRH_TpDocOri = 1002 THEN (SELECT avu_dt_emissao FROM Avulso wHERE avu_codigo = ControleRH.CtrlRH_codDocOri) ELSE CASE WHEN ControleRH.CtrlRH_TpDocOri = 1001 THEN (SELECT top 1 Ven_DataEmissao FROM Venda WHERE  ven_situacao = 'A' AND ven_codigo = ControleRH.CtrlRH_codDocOri AND venda.ParSV_serie = ControleRH.ParSV_serie AND ven_tipo = 'P') ELSE CASE WHEN ControleRH.CtrlRH_TpDocOri = 1017 THEN (SELECT top 1 Dev_Dtemissao  FROM Devolucao WHERE  Dev_situacao = 1 AND Dev_codigo = ControleRH.CtrlRH_codDocOri)  ELSE CASE WHEN ControleRH.CtrlRH_TpDocOri = 1018 THEN (SELECT Scp_data FROM Saida_complementacao WHERE Scp_STATUS ='A' and Scp_codigo = ControleRH.CtrlRH_codDocOri) ELSE CASE WHEN ControleRH.CtrlRH_TpDocOri = 1009 THEN (SELECT Fact_DtEmissao FROM Factura WHERE Fact_Situacao='A' and Fact_Codigo = ControleRH.CtrlRH_codDocOri AND Fact_Tipo = 'FCT') ELSE CASE WHEN ControleRH.CtrlRH_TpDocOri = 1012 THEN (SELECT Fact_DtEmissao FROM Factura WHERE Fact_Codigo = ControleRH.CtrlRH_codDocOri AND Fact_Tipo = 'VDI') END END END END END END AS datavend, Funcionario.Fun_Nome, ControleRH.CtrlRH_Valor, dbo.ControleRH.CtrlRH_Operacao, CASE WHEN ControleRH.Tpd_codigo = 1014 THEN 'COMISS
select FechComis_dataInicial, FechComis_dataFinal from FechamentoComissao where FechComis_Codigo=
SELECT venda.ven_codigopre FROM devolucao INNER JOIN venda ON devolucao.ven_codigopre = venda.ven_codigopre where dev_codigo=:Pcodigo
SELECT ven_codigopre FROM venda where ven_codigo =:Pcodigo and ParSV_serie=:pParSV_serie and ven_tipo='P'
select top 1 DtGV_Data from DataGanhoVend where DtGV_mesano=:PDtGV_mesano order by DtGV_Data desc
select * from DataGanhoVend
select  top 1 FechComis_Codigo, FechComis_MesAno from FechamentoComissao where  FechComis_Situacao = 'A'  order by FechComis_dataInicial
SELECT VendaAtendente.VenAten_TpDoc, venda.ven_codigo, VendaAtendente.Fun_Codigo, VendaAtendente.VenAten_Porcentagem, VendaAtendente.VenAten_DtVigencia, venda.CatVen_Codigo, venda.Par_ComissaoVincParc, case when Ven_formaPagHist is null then Ven_formaPag else Ven_formaPagHist end as Ven_formaPag, venda.ven_dataemissao, venda.ParSV_serie FROM  venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre WHERE (VendaAtendente.VenAten_TpDoc = 'PRO') and venda.ven_dataemissao >=:Pdata1 and venda.ven_dataemissao <=:Pdata2 and venda.ven_situacao='A' and venda.ven_tipo ='P'
SELECT VendaAtendente.VenAten_TpDoc, venda.ven_codigo, VendaAtendente.Fun_Codigo, VendaAtendente.VenAten_Porcentagem, VendaAtendente.VenAten_DtVigencia, venda.CatVen_Codigo, venda.Par_ComissaoVincParc, venda.Ven_formaPag, venda.ven_dataemissao, venda.ParSV_serie FROM  venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre WHERE (VendaAtendente.VenAten_TpDoc = 'PRO') and venda.ven_dataemissao >=:Pdata1 and venda.ven_dataemissao <=:Pdata2 and venda.ven_situacao='A' and venda.ven_tipo ='P'
SELECT VendaAtendente.VenAten_TpDoc, venda.ven_codigo, VendaAtendente.Fun_Codigo, VendaAtendente.VenAten_Porcentagem, VendaAtendente.VenAten_DtVigencia,venda.CatVen_Codigo, venda.Par_ComissaoVincParc, case when Ven_formaPagHist is null then Ven_formaPag else Ven_formaPagHist end as Ven_formaPag, venda.ven_dataemissao, contas_Receber_det.Ctr_dt_vencimento, venda.ParSV_serie FROM pedido INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre INNER JOIN contas_receber ON venda.ven_codigo = contas_receber.Ctr_cod_documento and venda.ParSV_serie = contas_receber.ParSV_serie  INNER JOIN contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo LEFT OUTER JOIN Contas_receber_pag ON contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det WHERE  (Contas_receber_pag.Crp_cod_pag IS NULL) and (contas_receber.Tpd_codigo = 1001) and (VendaAtendente.VenAten_TpDoc = 'PRO') and contas_Receber_det.Ctr_dt_vencimento >=:Pdata1 and contas_Receber_det.Ctr_dt_vencimento <=:Pdata2 and venda.ven_situacao='A' and venda.ven_tipo='P'
SELECT VendaAtendente.VenAten_TpDoc, VENDA.ven_codigo, VendaAtendente.Fun_Codigo, VendaAtendente.VenAten_Porcentagem, VendaAtendente.VenAten_DtVigencia, venda.CatVen_Codigo, venda.Par_ComissaoVincParc, case when Ven_formaPagHist is null then Ven_formaPag else Ven_formaPagHist end as Ven_formaPag, venda.ven_dataemissao, contas_Receber_det.Ctr_dt_vencimento,Contas_receber_pag.Crp_data_pagamento FROM venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre INNER JOIN contas_receber ON venda.ven_codigo = contas_receber.Ctr_cod_documento and venda.ParSV_serie = contas_receber.ParSV_serie INNER JOIN contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN Contas_receber_pag ON contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det WHERE (contas_receber.Tpd_codigo = 1001) and (VendaAtendente.VenAten_TpDoc = 'PRO') and Contas_receber_pag.Crp_data_pagamento >=:Pdata1 and Contas_receber_pag.Crp_data_pagamento <=:Pdata2 and venda.ven_situacao='A' and venda.ven_tipo='P'
SELECT VendaAtendente.VenAten_TpDoc, VendaAtendente.Fun_Codigo, VendaAtendente.VenAten_Porcentagem, VendaAtendente.VenAten_DtVigencia, venda.CatVen_Codigo, venda.Par_ComissaoVincParc, case when Ven_formaPagHist is null then Ven_formaPag else Ven_formaPagHist end as Ven_formaPag, devolucao.dev_codigo, devolucao.Dev_Dtemissao,venda.ParSV_serie FROM venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre INNER JOIN devolucao ON venda.ven_codigopre = devolucao.ven_codigopre WHERE (VendaAtendente.VenAten_TpDoc = 'PRO') and devolucao.Dev_Dtemissao >=:Pdata1 and devolucao.Dev_Dtemissao <=:Pdata2 and devolucao.dev_situacao=1
SELECT  VendaAtendente.VenAten_TpDoc, VendaAtendente.Fun_Codigo, VendaAtendente.VenAten_Porcentagem,  VendaAtendente.VenAten_DtVigencia, Factura.Fact_Codigo, Factura.Fact_DtEmissao, Factura.Fact_FormaPagamento, Factura.CatVen_Codigo, Factura.Par_ComissaoVincParc, Factura.Fact_Tipo FROM VendaAtendente INNER JOIN Factura ON VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo WHERE (VendaAtendente.VenAten_TpDoc = 'FCT') AND (Factura.Fact_Tipo = 'FCT') and Factura.Fact_DtEmissao >=:Pdata1 and Factura.Fact_DtEmissao <=:Pdata2 AND Factura.Fact_Situacao='A'
SELECT  VendaAtendente.VenAten_TpDoc, VendaAtendente.Fun_Codigo, VendaAtendente.VenAten_Porcentagem,  VendaAtendente.VenAten_DtVigencia, Factura.Fact_Codigo, Factura.Fact_DtEmissao, Factura.Fact_FormaPagamento, Factura.CatVen_Codigo, Factura.Par_ComissaoVincParc, Factura.Fact_Tipo FROM VendaAtendente INNER JOIN Factura ON VendaAtendente.VenAten_NDocPre = Factura.Fact_Codigo WHERE (VendaAtendente.VenAten_TpDoc = 'VDI') AND (.Factura.Fact_Tipo = 'VDI') and Factura.Fact_DtEmissao >=:Pdata1 and Factura.Fact_DtEmissao <=:Pdata2 AND Factura.Fact_Situacao='A'
select FechComis_dataInicial,FechComis_dataFinal from FechamentoComissao WHERE FechComis_Codigo=:PFechComis_Codigo
select CtrlRH_CodDocOri,CtrlRH_TpDocOri, ParSV_serie  from ControleRH WHERE FechComis_Codigo=:PFechComis_Codigo
select  FechComis_Codigo, FechComis_MesAno from FechamentoComissao where  FechComis_Situacao = 'A'  order by FechComis_dataInicial
SELECT CreditoIndicacao.CredInd_Codigo, CreditoIndicacao.CredInd_DtProcessar, CreditoIndicacao.CredInd_DtInclusao,
SELECT * FROM Produtos ORDER BY Pro_codNosso
select * from Preco_Produto ORDER BY Pre_CodNosso
select * from Acabamento ORDER BY CodAcabamento
select * from Produto_Relacionados ORDER BY Pre_Cod_Prod_Pai
select * from Indice_preco
select * from GrupoProduto
select * from FornecFatMinimo
SELECT CodAcabamento, DescAcabamento FROM acabamento
SELECT TpPeca_Codigo, TpPeca_Situacao FROM TipoPeca
SELECT GrupoProduto_Codigo, GrupoProduto_Descricao, GrupoProduto_Ativo
SELECT Prod.Pro_codnosso, Prod.Pro_descricao, Prod.For_codigo, Forn.For_Nome
SELECT Prod.*, Forn.For_Nome
SELECT Pr_Prod.Pre_Codnosso, Pr_Prod.Pre_Acabamento, Acab.DescAcabamento, Pr_Prod.Pre_Codindice,
SELECT pro_codnosso FROM produtos
SELECT * FROM Produto_Relacionados WHERE  pre_codigofor_pai=:fornecedor
SELECT * FROM Preco_Produto WHERE Pre_CodNosso =:codigo AND Pre_Acabamento=:acabamento
SELECT * FROM Produto_Relacionados WHERE Pre_Cod_Prod_Pai=:codigo1 AND Pre_Cod_Prod_filho =:codigo2
SELECT Ctr_nome AS nome, '' AS rg, '' AS documento, '' AS endereco, '' AS numero, '' AS cidade, '' AS estado, '' AS cep, '' AS bairro, '' AS fone1, '' AS fone2 FROM contas_receber where Ctr_codigo =:Pcodigo
SELECT Clientes.Cli_Nome, dbo.Obras.Obr_Descricao, dbo.Venda.Ven_CodigoPre AS precodigo
SELECT Clientes.Cli_Nome, Obras.Obr_Descricao, Avulso.avu_tl_geral_luminaria AS luminaria, Avulso.avu_tl_geral_materiais AS materiais,
SELECT Clientes.Cli_cnpj_cpf AS documento, Clientes.Cli_Endereco AS endereco, Clientes.Cli_numero AS numero,  Clientes.Cli_Nome AS nome, Clientes.Cli_Bairro AS bairro, Municipio.mun_nome AS cidade, Municipio.mun_uf AS estado, Clientes.Cli_IE_rg AS rg, Clientes.Cli_CEP AS cep, Clientes.Cli_Fcomercial as fone2, Clientes.Cli_Fresidencial as fone1  FROM Clientes INNER JOIN Municipio ON Clientes.Cli_codcidade = Municipio.mun_codigo where clientes.cli_codigo =:Pcodigo
SELECT  case when ctr_vinculo = 'CLIENTE' then (select cli_nome from clientes where clientes.cli_codigo = contas_receber.Ctr_codigo_vinculo) else
SELECT CASE WHEN ctr_vinculo = 'CLIENTE' THEN  (SELECT cli_nome FROM  clientes
SELECT CASE WHEN ctp_vinculo = 'CLIENTE' THEN
SELECT For_codigo,For_Nome from fornecedor where For_Nome is not null and for_classificacao = 'F'order by for_nome
SELECT CatVen_Codigo,CatVen_Descricao from CategoriaVenda where CatVen_Descricao is not null order by CatVen_Descricao
SELECT GrupoProduto_Codigo,GrupoProduto_Descricao from GrupoProduto where GrupoProduto_Codigo < 1000 order by GrupoProduto_Descricao
SELECT TpPeca_Codigo from TipoPeca
SELECT GrupoProduto.GrupoProduto_Descricao, TipoPeca.TpPeca_Codigo, produtos.Pro_codnosso, ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_descricao, ProdFor_DescricaoProduto as Pro_descricao_for, fornecedor.For_Nome, VendaProduto.CodAcabamento AS acabamento, SUM(VendaProduto.VenPro_VlUnitario) AS vl_unitario, Indicacoes.Ind_Nome, SUM((VendaProduto.VenPro_VlItem - CASE WHEN venda.Ven_TipoDesc ='G' then CASE WHEN venda.Ven_DescontoPorcProd IS NULL THEN 0 ELSE round((VendaProduto.VenPro_VlItem * venda.Ven_DescontoPorcProd)/100,4) END else 0 END) * CASE WHEN VendaIndicacao.venind_porcentagem IS NULL THEN 0 ELSE (VendaIndicacao.venind_porcentagem / 100) END ) AS vl_item, SUM(VendaProduto.VenPro_Quantidade * CASE WHEN VendaIndicacao.venind_porcentagem IS NULL THEN 0 ELSE (VendaIndicacao.venind_porcentagem / 100) END) AS quantidade FROM Venda INNER JOIN VendaProduto ON Venda.Ven_CodigoPre = VendaProduto.Ven_CodigoPre INNER JOIN produtos ON VendaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso INNER JOIN GrupoProduto ON produtos.GrupoProduto_codigo = GrupoProduto.GrupoProduto_Codigo INNER JOIN TipoPeca ON dbo.produtos.Pro_tp_peca = dbo.TipoPeca.TpPeca_Codigo AND produtos.GrupoProduto_codigo = TipoPeca.GrupoProduto_codigo INNER JOIN VendaIndicacao ON Venda.Ven_CodigoPre = VendaIndicacao.VenInd_NDocPre INNER JOIN Indicacoes ON VendaIndicacao.Ind_Codigo = Indicacoes.Ind_codigo INNER JOIN fornecedor ON ProdutosFornecedores.For_codigo = fornecedor.For_codigo WHERE VendaProduto.VenPro_Quantidade > 0 and (VendaIndicacao.VenInd_TpDoc = 'PRO') AND venda.Ven_DataEmissao >=:DATA1 AND venda.Ven_DataEmissao <=:DATA2 and venda.ven_tipo='P' and venda.ven_situacao='A'
SELECT * FROM OrdemCompraExt
SELECT CASE WHEN (SELECT TOP (1) PreLog_compra FROM Preco_Produto_Log WHERE (PreLog_Codnosso = produtos.Pro_codnosso) AND (PreLog_Acabamento = VendaProduto.CodAcabamento) AND (usr_dt_hr_criacao >= max(venda.Ven_DataEmissao))  ORDER BY usr_dt_hr_criacao) > 0 THEN  (SELECT TOP (1) PreLog_compra FROM Preco_Produto_Log  WHERE (PreLog_Codnosso = produtos.Pro_codnosso) AND (PreLog_Acabamento = VendaProduto.CodAcabamento) AND  (usr_dt_hr_criacao >= max(venda.Ven_DataEmissao))  ORDER BY usr_dt_hr_criacao) ELSE (SELECT TOP (1) Pre_VlNFor  FROM Preco_Produto WHERE pre_Codnosso = produtos.Pro_codnosso AND Pre_Acabamento = VendaProduto.CodAcabamento)   END * SUM(VendaProduto.VenPro_Quantidade) AS ValorCompra, GrupoProduto.GrupoProduto_Descricao, TipoPeca.TpPeca_Codigo,produtos.Pro_codnosso, ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_descricao,  ProdFor_DescricaoProduto as Pro_descricao_for , fornecedor.For_Nome, VendaProduto.CodAcabamento AS acabamento, SUM(VendaProduto.VenPro_VlUnitario) AS vl_unitario, SUM((VendaProduto.VenPro_VlItem - CASE WHEN venda.Ven_TipoDesc ='G' then CASE WHEN venda.Ven_DescontoPorcProd IS NULL THEN 0 ELSE round((VendaProduto.VenPro_VlItem * venda.Ven_DescontoPorcProd)/100,4) END else 0 END)) AS vl_item, SUM(VendaProduto.VenPro_Quantidade) AS quantidade FROM Venda INNER JOIN VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso INNER JOIN GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN TipoPeca ON dbo.produtos.Pro_tp_peca = dbo.TipoPeca.TpPeca_Codigo AND produtos.GrupoProduto_codigo = TipoPeca.GrupoProduto_codigo INNER JOIN fornecedor ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo WHERE VendaProduto.VenPro_Quantidade > 0  AND venda.Ven_DataEmissao >=:DATA1 AND venda.Ven_DataEmissao <=:DATA2 and venda.ven_tipo='P' and venda.ven_situacao ='A'
SELECT (SELECT  CASE WHEN SUM(CASE WHEN credito.mba_operacao = 'CR
SELECT (SELECT  CASE WHEN SUM(CASE WHEN credito.Mvt_Credito_debito ='CR
SELECT SUM(Contas_apagar_pag.Cpp_valor_pago) AS saldo
SELECT SUM(Contas_receber_pag.Crp_valor_pago) AS saldo
SELECT Contas_apagar_pag.Cpp_cod_pag AS codigo, Contas_apagar_pag.Cpp_valor_pago AS valor, Contas_apagar_pag.Cpp_data_pagamento AS data, Bancos_Caixas.Bcx_tipo AS TipoCT, Modo.Mdo_nome AS modo, Contas_apagar_pag.Cpp_numero_cheque AS cheque, contas_apagar.Ctp_cod_documento AS NumeroDoc, Tipo_documento.Tpd_descricao AS tipodoc, contas_apagar.Ctp_historico AS historico, CASE WHEN ctp_vinculo = 'CLIENTE' THEN (SELECT cli_nome FROM clientes WHERE clientes.cli_codigo = contas_apagar.Ctp_codigo_vinculo) ELSE CASE WHEN ctp_vinculo = 'FORNECEDOR' THEN (SELECT for_nome FROM fornecedor WHERE fornecedor.for_codigo = contas_apagar.Ctp_codigo_vinculo) ELSE CASE WHEN ctp_vinculo = 'PESSOAL' THEN (SELECT FUN_nome FROM funcionario WHERE funcionario.fun_cpf = contas_apagar.Ctp_codigo_vinculo) ELSE CASE WHEN ctp_vinculo = 'PROFISSIONAL EXTERNO' THEN (SELECT IND_nome FROM Indicacoes WHERE Indicacoes.ind_codigo = contas_apagar.Ctp_codigo_vinculo) else CASE WHEN ctp_vinculo = 'TRANSPORTADORA' THEN (SELECT Tra_Nome FROM Transportadora WHERE Transportadora.Tra_codigo = contas_apagar.Ctp_codigo_vinculo) ELSE CASE WHEN ctp_vinculo = 'OUTROS' THEN contas_apagar.Ctp_nome END END END END END END AS nome, CASE WHEN Bancos_Caixas.Bcx_tipo = 'B' THEN 'Banco: ' + dbo.Bancos_Caixas.Bcx_Nome + ' - AG: ' + dbo.Bancos_Caixas.Bcx_agencia + ' CT: ' + dbo.Contas_Bancarias.Cba_numero ELSE 'Caixa: ' + Contas_Bancarias.Cba_numero + ' - ' + dbo.Bancos_Caixas.Bcx_Nome END AS bancocaixa ,'CP' AS VIA, 'D' AS operacao,CASE WHEN Bancos_Caixas.Bcx_tipo = 'B' THEN (SELECT top (1) Movimento_bancario.Mba_efetivado FROM Movimento_bancario WHERE Movimento_bancario.Cpp_cod_pag = Contas_apagar_pag.Cpp_cod_pag order by Movimento_bancario.Cpp_cod_pag) ELSE 'S' END AS efetivado,Contas_apagar_pag.cba_codigo,Contas_apagar_pag.Cpp_cpf_cnpj_emitente AS cpfcnpjemitente, Contas_apagar_pag.Cpp_agencia AS agencia,Contas_apagar_pag.Cpp_conta_corrente AS contacorrente, Contas_apagar_pag.Cpp_emitente AS emitente,Contas_apagar_pag.Cpp_nome_banco AS banco, Contas_apagar_pag.Cpp_numero_banco AS numerobanco FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det INNER JOIN Contas_Bancarias ON Contas_apagar_pag.cba_codigo = Contas_Bancarias.Cba_codigo   INNER JOIN Bancos_Caixas ON Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo = Bancos_Caixas.Bcx_codigo  INNER JOIN Modo ON Contas_apagar_pag.mdo_codigo = Modo.Mdo_codigo INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo LEFT OUTER JOIN Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo WHERE (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento >=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2 and Contas_apagar.tcf_codigo < 1000  and  Contas_Bancarias.Cba_codigo in (
SELECT Contas_receber_pag.Crp_cod_pag AS codigo, Contas_receber_pag.Crp_valor_pago AS valor,
SELECT 0 AS codigo, Movimento_bancario.Mba_valor AS valor, Movimento_bancario.Mba_data_emissao AS data, 'B' AS tipoct,
SELECT  0 AS codigo, Movimentos.Mvt_valor AS valor, Movimentos.Mvt_data AS data, 'C' AS tipoct, Movimentos.mvt_din_che_tran AS modo,
SELECT     dbo.Bancos_Caixas.Bcx_situacao, dbo.Contas_Bancarias.Cba_codigo, dbo.Contas_Bancarias.Bcx_codigo,
SELECT Contas_apagar_pag.Cpp_cod_pag AS codigo, contas_apagar_det.Ctp_valor_vencimento AS valor, contas_apagar_det.Ctp_dt_vencimento AS data, Modo.Mdo_nome AS modo, contas_apagar.Ctp_cod_documento AS NumeroDoc, Tipo_documento.Tpd_descricao AS tipodoc, contas_apagar.Ctp_historico AS historico, CASE WHEN ctp_vinculo = 'CLIENTE' THEN (SELECT cli_nome FROM clientes  WHERE clientes.cli_codigo = contas_apagar.Ctp_codigo_vinculo) ELSE CASE WHEN ctp_vinculo = 'FORNECEDOR' THEN (SELECT for_nome FROM fornecedor WHERE fornecedor.for_codigo = contas_apagar.Ctp_codigo_vinculo) ELSE CASE WHEN ctp_vinculo = 'PESSOAL' THEN (SELECT FUN_nome FROM funcionario WHERE funcionario.fun_cpf = contas_apagar.Ctp_codigo_vinculo) ELSE CASE WHEN ctp_vinculo = 'INDICA
SELECT Contas_receber_pag.Crp_cod_pag AS codigo, contas_Receber_det.Ctr_valor_vencimento AS valor, contas_Receber_det.Ctr_dt_vencimento AS data,
SELECT case WHEN Bancos_Caixas.Bcx_tipo = 'B' THEN 'Banco: ' + Bancos_Caixas.Bcx_Nome + ' - AG: ' + Bancos_Caixas.Bcx_agencia
SELECT     CASE WHEN Bancos_Caixas.Bcx_tipo = 'B' THEN 'Banco: ' + dbo.Bancos_Caixas.Bcx_Nome + ' - AG: ' + dbo.Bancos_Caixas.Bcx_agencia +
SELECT SisPermissaoEspecial.SisOpEsp_Codigo, SisUsuarios.Senha, SisUsuarios.Nome
select For_codigo,For_Nome  from fornecedor  where for_classificacao='F'
SELECT Nota_entrada.Nen_numero_nota, fornecedor.For_Nome, Nota_Entrada_Dif.NenDf_DifProd, Nota_Entrada_Dif.NenDf_DifFinc, Nota_Entrada_Dif.NenDf_DesbUsuario, Nota_Entrada_Dif.NenDf_DesbData, Nota_Entrada_Dif.NenDf_Data, Motivo_devolucao.Mod_descricao AS motivoProd, Motivo_devolucao_1.Mod_descricao AS motivoFin, SisUsuarios.Nome, Nota_entrada.Nen_dt_nota  FROM Nota_entrada INNER JOIN Nota_Entrada_Dif ON Nota_entrada.Nen_codigo = Nota_Entrada_Dif.Nen_codigo INNER JOIN fornecedor ON Nota_entrada.Nen_fornecedor = fornecedor.For_codigo LEFT OUTER JOIN SisUsuarios ON Nota_Entrada_Dif.NenDf_DesbUsuario = SisUsuarios.Id LEFT OUTER JOIN Motivo_devolucao ON Nota_entrada.Mod_codigo = Motivo_devolucao.Mod_codigo LEFT OUTER JOIN Motivo_devolucao AS Motivo_devolucao_1 ON Nota_entrada.nen_Mod_codigo_fin = Motivo_devolucao_1.Mod_codigo where Nota_entrada.Nen_dt_nota >=:pNen_dt_nota1 and Nota_entrada.Nen_dt_nota <=:pNen_dt_nota2
select * from NFeObservacao
SELECT Clientes.Cli_Codigo, Clientes.Cli_Nome, venda.ven_situacao
SELECT  venda.ven_codigo, dbo.Clientes.Cli_Nome, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,
SELECT venda.ven_codigo, dbo.Clientes.Cli_Nome, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,  ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, dbo.produtos.Pro_CodEspecial, SUM(VendaProduto.VenPro_Quantidade) AS quantidade, dbo.Acabamento.DescAcabamento,  dbo.produtos.Pro_unidade, venda.Ven_DataEmissao, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.produtos.Pro_tp_peca, venda.ParSV_serie ,VendaAmbiente.VenAmb_Descricao,  ProdutosFornecedores.ProdFor_CodigoBarra,(SELECT TOP (1) Pre_CodBarra FROM Preco_Produto WHERE (dbo.VendaProduto.Pro_codnosso = Pre_Codnosso) AND (dbo.VendaProduto.CodAcabamento = Pre_Acabamento)) AS pre_codbarra FROM venda INNER JOIN  VendaProduto ON venda.ven_codigopre = VendaProduto.ven_codigopre INNER JOIN  dbo.Clientes ON venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo INNER JOIN  dbo.produtos ON VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN  dbo.Acabamento ON VendaProduto.CodAcabamento = dbo.Acabamento.CodAcabamento INNER JOIN  dbo.GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN dbo.VendaAmbiente ON dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso where VendaProduto.Pro_codnosso in (
select * from EtiquetaPronta where EtqPront_codigo=2
SELECT venda.ven_codigo, dbo.Clientes.Cli_Nome, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_descricao,  dbo.Acabamento.DescAcabamento, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.produtos.Pro_tp_peca, venda.ParSV_serie,  VendaAmbiente.VenAmb_Descricao, fornecedor.for_nome, VendaProduto.VenPro_circuito, unidades.uni_comprimento,  VendaProduto.CodAcabamento  ,SUM(VendaProduto.VenPro_Quantidade) - (SELECT CASE WHEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) > 0 THEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) ELSE 0 END AS Expr1 FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE (dbo.Devolucao.Dev_migrado IS NULL) AND (dbo.Devolucao.Dev_situacao = 1) AND DEVOLUCAO.ven_codigopre = vendaproduto.ven_codigopre and vendaproduto.pro_codnosso = devolucaoproduto.pro_codnosso and vendaproduto.CodAcabamento = devolucaoproduto.CodAcabamento and VendaProduto.CodAmbiente =   DevolucaoProduto.CodAmbiente) AS quantidade FROM dbo.ProdutosFornecedores INNER JOIN dbo.fornecedor ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo INNER JOIN dbo.Venda INNER JOIN dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN dbo.Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Acabamento ON dbo.VendaProduto.CodAcabamento = dbo.Acabamento.CodAcabamento INNER JOIN dbo.GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN dbo.VendaAmbiente ON dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.unidades ON dbo.produtos.Pro_unidade = dbo.unidades.uni_codigo ON dbo.ProdutosFornecedores.Pro_codnosso = dbo.produtos.Pro_codnosso where VendaProduto.Pro_codnosso in (
select * from EtiquetaPronta where EtqPront_codigo=3
SELECT produtos.Pro_CodEspecial, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for,venda.ven_codigo, dbo.Clientes.Cli_Nome, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_descricao,  VendaProduto.Pro_codnosso, dbo.Acabamento.DescAcabamento, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.produtos.Pro_tp_peca, venda.ParSV_serie,  VendaAmbiente.VenAmb_Descricao, fornecedor.for_nome, VendaProduto.VenPro_circuito, unidades.uni_comprimento  ,SUM(VendaProduto.VenPro_Quantidade) - (SELECT CASE WHEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) > 0 THEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) ELSE 0 END AS Expr1 FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE (dbo.Devolucao.Dev_migrado IS NULL) AND (dbo.Devolucao.Dev_situacao = 1) AND DEVOLUCAO.ven_codigopre = vendaproduto.ven_codigopre and vendaproduto.pro_codnosso = devolucaoproduto.pro_codnosso and vendaproduto.CodAcabamento = devolucaoproduto.CodAcabamento and VendaProduto.CodAmbiente =   DevolucaoProduto.CodAmbiente) AS quantidade FROM dbo.ProdutosFornecedores INNER JOIN dbo.fornecedor ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo INNER JOIN dbo.Venda INNER JOIN dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN dbo.Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Acabamento ON dbo.VendaProduto.CodAcabamento = dbo.Acabamento.CodAcabamento INNER JOIN dbo.GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN dbo.VendaAmbiente ON dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.unidades ON dbo.produtos.Pro_unidade = dbo.unidades.uni_codigo ON dbo.ProdutosFornecedores.Pro_codnosso = dbo.produtos.Pro_codnosso where VendaProduto.Pro_codnosso in (
select * from EtiquetaPronta where EtqPront_codigo=6
SELECT venda.ven_codigo, dbo.Clientes.Cli_Nome, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, ProdutosFornecedores.ProdFor_DescricaoProduto ,dbo.produtos.Pro_descricao,  dbo.Acabamento.DescAcabamento, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.produtos.Pro_tp_peca, venda.ParSV_serie,  VendaAmbiente.VenAmb_Descricao, fornecedor.for_nome, VendaProduto.VenPro_circuito, unidades.uni_comprimento  ,SUM(VendaProduto.VenPro_Quantidade) - (SELECT CASE WHEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) > 0 THEN SUM(dbo.DevolucaoProduto.DevPro_Quantidade) ELSE 0 END AS Expr1 FROM dbo.Devolucao INNER JOIN dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre WHERE (dbo.Devolucao.Dev_migrado IS NULL) AND (dbo.Devolucao.Dev_situacao = 1) AND DEVOLUCAO.ven_codigopre = vendaproduto.ven_codigopre and vendaproduto.pro_codnosso = devolucaoproduto.pro_codnosso and vendaproduto.CodAcabamento = devolucaoproduto.CodAcabamento and VendaProduto.CodAmbiente =   DevolucaoProduto.CodAmbiente) AS quantidade FROM dbo.ProdutosFornecedores INNER JOIN dbo.fornecedor ON dbo.ProdutosFornecedores.For_codigo = dbo.fornecedor.For_codigo INNER JOIN dbo.Venda INNER JOIN dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN dbo.Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Acabamento ON dbo.VendaProduto.CodAcabamento = dbo.Acabamento.CodAcabamento INNER JOIN dbo.GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN dbo.VendaAmbiente ON dbo.VendaProduto.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.unidades ON dbo.produtos.Pro_unidade = dbo.unidades.uni_codigo ON dbo.ProdutosFornecedores.Pro_codnosso = dbo.produtos.Pro_codnosso where VendaProduto.Pro_codnosso in (
select * from EtiquetaPronta where EtqPront_codigo=14
SELECT CAST(ven_codigo AS VARCHAR(10)) + ' - ' + ParSV_serie as numero, ven_codigo, ven_codigopre from venda where Ven_CodVinculo=:pVen_CodVinculo and ven_situacao='A' and ven_tipo ='P' order by ven_codigo desc
SELECT  venda.ven_codigo, dbo.Clientes.Cli_Nome, ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,
SELECT venda.ven_codigo, Clientes.Cli_Nome, ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_codnosso, produtos.Pro_descricao, ProdFor_DescricaoProduto as Pro_descricao_for, produtos.Pro_CodEspecial, SUM(VendaProduto.VenPro_Quantidade) AS quantidade, Acabamento.DescAcabamento, produtos.Pro_unidade, venda.Ven_DataEmissao, GrupoProduto.GrupoProduto_Descricao, produtos.Pro_tp_peca, venda.ven_codigopre,venda.ParSV_serie FROM venda INNER JOIN VendaProduto ON venda.ven_codigopre = VendaProduto.ven_codigopre INNER JOIN clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo INNER JOIN produtos ON VendaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso INNER JOIN Acabamento ON VendaProduto.CodAcabamento  = Acabamento.CodAcabamento INNER JOIN GrupoProduto ON produtos.GrupoProduto_codigo = GrupoProduto.GrupoProduto_Codigo where VendaProduto.Pro_codnosso in (
select * from EtiquetaPronta where EtqPront_codigo=1
SELECT venda.ven_codigo, Clientes.Cli_Nome, ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_codnosso, produtos.Pro_descricao, ProdFor_DescricaoProduto as Pro_descricao_for, produtos.Pro_CodEspecial, SUM(VendaProduto.VenPro_Quantidade) AS quantidade, Acabamento.DescAcabamento, produtos.Pro_unidade, venda.Ven_DataEmissao, GrupoProduto.GrupoProduto_Descricao, produtos.Pro_tp_peca, venda.ven_codigopre,venda.ParSV_serie,Acabamento.CodAcabamento FROM venda INNER JOIN VendaProduto ON venda.ven_codigopre = VendaProduto.ven_codigopre INNER JOIN clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo INNER JOIN produtos ON VendaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso INNER JOIN Acabamento ON VendaProduto.CodAcabamento  = Acabamento.CodAcabamento INNER JOIN GrupoProduto ON produtos.GrupoProduto_codigo = GrupoProduto.GrupoProduto_Codigo where VendaProduto.Pro_codnosso in (
select * from EtiquetaPronta where EtqPront_codigo=11
SELECT produtos.Pro_codnosso,ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for,
SELECT produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto,produtos.Pro_codnosso
select Pro_CodEspecial from produtos where Pro_codnosso =:pPro_codnosso
select Pro_codnosso from produtos where Pro_CodEspecial =:pPro_CodEspecial
select * from TransferenciaEstoqueProduto where TransfEst_codigo=:pTransfEst_codigo
select * from TransferenciaEstoque where TransfEst_codigo=:pTransfEst_codigo
select * from EstoqueTipo where EstTp_Codigo =:pEstTp_Codigo
SELECT Estoque_produto.EstTp_Codigo, Estoque_produto.Epr_estoque, produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_descricao,
SELECT Estoque_produto.EstTp_Codigo, Estoque_produto.Epr_estoque, produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, produtos.Pro_descricao,
SELECT pedido_compra.Pcp_codigo, pedido_compra.Pcp_pedido_venda, pedido_compra.Pcp_modo, pedido_compra.Pcp_ped_av_fan,Pedido_compra_det.Pro_codnosso, Pedido_compra_det.Pcd_acabamento, Pedido_compra_det.Pcd_quantidade_solicit,Pedido_compra_det.Pcd_saida, Pedido_compra_det.Pcd_destino, Pedido_compra_det.Pcd_recebimento, fornecedor.For_Nome,ProdFor_CodigoProduto as Pro_Codbase, produtos.Pro_descricao, ProdFor_DescricaoProduto as Pro_descricao_for, produtos.Pro_CodEspecial, CASE WHEN pedido_compra.Pcp_modo = 'P' THEN (SELECT Clientes.Cli_Nome FROM venda INNER JOIN Clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo AND pedido_compra.Pcp_pedido_venda = venda.Ven_CodigoPre WHERE (venda.Ven_Situacao = 'A')) ELSE Pedido_compra_det.Pcd_destino END AS nome, CASE WHEN pedido_compra.Pcp_modo = 'P' THEN (SELECT Clientes.Cli_codigo FROM venda INNER JOIN Clientes ON venda.Ven_CodVinculo = Clientes.Cli_Codigo AND pedido_compra.Pcp_pedido_venda = venda.Ven_CodigoPre WHERE (venda.Ven_Situacao = 'A'))  end AS Cli_codigo, CASE WHEN pedido_compra.Pcp_modo = 'P' THEN 'PED VENDA' ELSE 'LANC. DIRETO' END   AS tpdoc, GrupoProduto.GrupoProduto_Descricao, produtos.Pro_tp_peca, produtos.Pro_unidade, pedido_compra.Pcp_dt_pedido ,(SELECT TOP (1) Ocp_codigo FROM  ordem_compra_det WHERE ordem_compra_det.Pro_codnosso =Pedido_compra_det.Pro_codnosso AND ordem_compra_det.Ocd_acabamento =Pedido_compra_det.Pcd_acabamento AND ordem_compra_det.Ocd_item_ped =Pedido_compra_det.Pcd_item AND Ocd_cod_pedido =Pedido_compra_det.Pcp_codigo) as ordemcodigo FROM pedido_compra INNER JOIN Pedido_compra_det ON pedido_compra.Pcp_codigo = Pedido_compra_det.Pcp_codigo INNER JOIN produtos ON Pedido_compra_det.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor ON ProdutosFornecedores.For_codigo = fornecedor.For_codigo INNER JOIN GrupoProduto ON produtos.GrupoProduto_codigo = GrupoProduto.GrupoProduto_Codigo WHERE  (pedido_compra.Pcp_status = 'A') and pedido_compra.Pcp_dt_pedido >=:data1 and pedido_compra.Pcp_dt_pedido <=:data2 and (Pedido_compra_det.Pcd_recebimento = 'PARCIAL' or Pedido_compra_det.Pcd_recebimento is null)
SELECT For_codigo, For_Nome FROM fornecedor
SELECT Cli_Codigo, Cli_Nome
SELECT CAST(ven_codigo as varchar(10)) + ' S
SELECT  ordem_compra.Ocp_codigo, ordem_compra.Ocp_modo, ordem_compra_det.ocd_ped_av_fan, ordem_compra_det.Pro_codnosso, ordem_compra_det.Ocd_acabamento, ordem_compra_det.Ocd_quantidade_solicit, ordem_compra_det.Ocd_destino, ordem_compra_det.Ocd_recebimento, fornecedor.For_Nome, ProdFor_CodigoProduto, produtos.Pro_descricao, ProdFor_DescricaoProduto, produtos.Pro_CodEspecial, CASE WHEN ordem_compra_det.ocd_ped_modo = 'P' THEN (SELECT Clientes.Cli_Nome FROM pedido INNER JOIN  Clientes ON pedido.cli_codigo = Clientes.Cli_Codigo AND ordem_compra_det.ocd_ped_av_fan = pedido.ped_codigo  WHERE (pedido.ped_status = 'A')) ELSE CASE WHEN ordem_compra_det.ocd_ped_modo = 'A' THEN (SELECT  Clientes.Cli_Nome FROM Avulso INNER JOIN Clientes ON Avulso.cli_codigo = Clientes.Cli_Codigo AND ordem_compra_det.ocd_ped_av_fan = avulso.avu_codigo) ELSE ordem_compra_det.ocd_destino END END AS nome, CASE WHEN ordem_compra_det.ocd_ped_modo = 'P' THEN (SELECT  Clientes.Cli_codigo FROM pedido INNER JOIN Clientes ON pedido.cli_codigo = Clientes.Cli_Codigo AND ordem_compra_det.ocd_ped_av_fan = pedido.ped_codigo WHERE  (pedido.ped_status = 'A')) ELSE CASE WHEN ordem_compra_det.ocd_ped_modo = 'A' THEN (SELECT  Clientes.Cli_codigo  FROM  Avulso INNER JOIN   Clientes ON Avulso.cli_codigo = Clientes.Cli_Codigo AND ordem_compra_det.ocd_ped_av_fan = avulso.avu_codigo) END END AS cli_codigo, CASE WHEN ordem_compra_det.ocd_ped_modo = 'P' THEN 'PROJETO' ELSE CASE WHEN ordem_compra_det.ocd_ped_modo = 'A' THEN 'VENDA AVULSA' ELSE 'LANC. DIRETO' END END AS tpdoc, GrupoProduto.GrupoProduto_Descricao, produtos.Pro_tp_peca, produtos.Pro_unidade, ordem_compra.Ocp_dt_limite, ordem_compra.Ocp_dt_ordem, ordem_compra.Ocp_dt_envio, ordem_compra.Ocp_status, ordem_compra.Ocp_Reagendamento, ordem_compra.Ocp_dt_prevista, ordem_compra.Ocp_Total, ordem_compra.Ocp_Desconto, ordem_compra.Ocp_Acrescimo, ordem_compra.Ocp_SubTotal, ordem_compra_det.Ocd_quantidade_pedido, ordem_compra_det.Ocd_nota, ordem_compra_det.Ocd_cod_pedido,(SELECT SUM(dbo.nota_entrada_det.Ned_quantidade_recebida) FROM dbo.nota_entrada_det INNER JOIN dbo.Nota_entrada ON dbo.nota_entrada_det.Nen_codigo = dbo.Nota_entrada.Nen_codigo where  dbo.nota_entrada_det.Ned_item_ordem = dbo.ordem_compra_det.Ocd_item AND dbo.nota_entrada_det.Pro_codnosso = dbo.ordem_compra_det.Pro_codnosso AND dbo.nota_entrada_det.Ned_acabamento = dbo.ordem_compra_det.Ocd_acabamento AND dbo.nota_entrada_det.Ned_cod_ordem = dbo.ordem_compra_det.Ocp_codigo and Nota_entrada.Nen_status='A' ) as Ned_quantidade_recebida, ordem_compra_det.Ocd_vl_compra FROM ordem_compra INNER JOIN ordem_compra_det ON ordem_compra.Ocp_codigo = ordem_compra_det.Ocp_codigo INNER JOIN produtos ON ordem_compra_det.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso INNER JOIN fornecedor ON ProdutosFornecedores.For_codigo = fornecedor.For_codigo INNER JOIN GrupoProduto ON produtos.GrupoProduto_codigo = GrupoProduto.GrupoProduto_Codigo WHERE  (ordem_compra.Ocp_status = 'A') and ordem_compra.Ocp_dt_ordem >=:data1 and ordem_compra.Ocp_dt_ordem <=:data2
SELECT 'PEDIDO DE VENDA: ' + CAST(Ven_codigo AS VARCHAR(10)) + ' S
SELECT  dbo.ordem_compra.Ocp_codigo, dbo.ordem_compra.Ocp_modo, dbo.ordem_compra_det.ocd_ped_av_fan, dbo.ordem_compra_det.Pro_codnosso, dbo.ordem_compra_det.Ocd_acabamento,
select GrupoProduto_Descricao from GrupoProduto where GrupoProduto_Descricao=:PGrupoProduto_Descricao
select GrupoProduto_Codigo from GrupoProduto where GrupoProduto_Codigo <>:PGrupoProduto_Codigo
SELECT * FROM GrupoProduto order by
select count(GrupoProduto_Codigo) as total from produtos where GrupoProduto_Codigo=:PGrupoProduto_Codigo
SELECT dbo.Pasta.Pasta_Descricao, dbo.Obras.Obr_Descricao, dbo.Clientes.Cli_Nome,Venda.ParSV_serie,   dbo.Venda.Ven_codigo, dbo.Pasta.Pasta_codigo,Venda.Ven_CodigoPre FROM dbo.Pasta INNER JOIN dbo.Clientes ON dbo.Pasta.cli_codigo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.Obras ON dbo.Pasta.Obr_codigo = dbo.Obras.Obr_Codigo INNER JOIN dbo.Venda ON dbo.Pasta.Pasta_codigo = dbo.Venda.Pasta_codigo AND dbo.Obras.Obr_Codigo = dbo.Venda.Obr_codigo AND dbo.Pasta.Pasta_CodPreVendaPai = dbo.Venda.Ven_CodigoPre  WHERE  Pasta_Situacao ='A'
SELECT  dbo.Pasta.Pasta_Descricao, dbo.Obras.Obr_Descricao, dbo.Clientes.Cli_Nome, dbo.Venda.ParSV_serie, dbo.Venda.Ven_codigo, dbo.Pasta.Pasta_codigo, dbo.Venda.Ven_CodigoPre fROM dbo.Pasta INNER JOIN dbo.Clientes ON dbo.Pasta.cli_codigo = dbo.Clientes.Cli_Codigo INNER JOIN dbo.Obras ON dbo.Pasta.Obr_codigo = dbo.Obras.Obr_Codigo INNER JOIN dbo.Venda ON dbo.Pasta.Pasta_codigo = dbo.Venda.Pasta_codigo AND dbo.Obras.Obr_Codigo = dbo.Venda.Obr_codigo WHERE  (dbo.Pasta.Pasta_Situacao = 'A') and venda.ven_tipo='P' and venda.ven_situacao='A'
SELECT 1 as tipo,DevolucaoProduto.DevPro_Simbolo as simbolo, DevolucaoProduto.DevPro_aplicacao as aplicacao, Devolucao.dev_codigo,  dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.VendaAmbiente.VenAmb_TpDoc, dbo.VendaAmbiente.VenAmb_Descricao, GrupoProduto.GrupoProduto_ordem, dbo.produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto  as Pro_Codbase, dbo.produtos.Pro_descricao,  ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for , produtos.Pro_CodEspecial, dbo.DevolucaoProduto.CodAcabamento AS acabamento, dbo.DevolucaoProduto.DevPro_Seq AS seq, DevolucaoProduto.DevPro_Quantidade AS quantidade, dbo.DevolucaoProduto.DevPro_VlUnitario AS vlunit, dbo.DevolucaoProduto.DevPro_VlItem AS vlitem, DevolucaoProduto.DevPro_Vldesconto AS vldesconto, dbo.VendaAmbiente.CodAmbiente FROM Devolucao INNER JOIN Venda INNER JOIN Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo INNER JOIN VendaAmbiente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre AND VendaAmbiente.CodAmbiente = dbo.DevolucaoProduto.CodAmbiente INNER JOIN GrupoProduto INNER JOIN produtos ON GrupoProduto.GrupoProduto_Codigo = produtos.GrupoProduto_codigo ON DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON dbo.produtos.Pro_codnosso = dbo.ProdutosFornecedores.Pro_codnosso  wHERE (Venda.Ven_Situacao = 'A') AND (dbo.VendaAmbiente.VenAmb_TpDoc = 'PRO') AND (dbo.Devolucao.Dev_situacao = 1) and venda.ven_codigopre =:pven_codigopre1 and devolucao.Dev_migrado is null and (dbo.Venda.Ven_Situacao = 'A')  and Venda.ven_tipo ='P'
SELECT 1 AS tipo, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Servicos.Serv_Desc, dbo.DevolucaoServico.DevSer_quantidade AS quantidade, DevolucaoServico.DevSer_vlunitario AS vlunit, dbo.DevolucaoServico.DevSer_vlitem AS vlitem FROM  dbo.Devolucao INNER JOIN dbo.Venda INNER JOIN dbo.Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo  ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN dbo.DevolucaoServico ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoServico.Dev_codigopre INNER JOIN dbo.Servicos ON dbo.DevolucaoServico.Sev_cod = dbo.Servicos.sev_cod WHERE (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Devolucao.Dev_situacao = 1)  and devolucao.Dev_migrado is null and Venda.ven_tipo ='P' and venda.ven_codigopre =:pven_codigopre1
SELECT SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) AS valor, CASE WHEN Ven_TipoDesc = 'P' THEN SUM(devpro_vlitem)  ELSE SUM(devpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (devpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END AS valorcomdesc,  SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(devpro_vlitem)  ELSE SUM(devpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (devpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END AS valordesc,  CASE WHEN SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(devpro_vlitem)  ELSE SUM(devpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (devpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END)  END > 0 THEN (SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(devpro_vlitem)  ELSE SUM(devpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (devpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END)  * 100 / SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) ELSE 0 END AS desconto, dbo.produtos.GrupoProduto_codigo  FROM dbo.DevolucaoProduto INNER JOIN dbo.produtos ON dbo.DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN  dbo.Pasta INNER JOIN dbo.Venda ON dbo.Pasta.Pasta_codigo = dbo.Venda.Pasta_codigo  INNER JOIN  dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre ON dbo.DevolucaoProduto.Dev_CodigoPre = dbo.Devolucao.Dev_CodigoPre WHERE (dbo.produtos.GrupoProduto_codigo =:pGrupoProduto_codigo) AND venda.ven_codigopre =:pven_codigopre and Venda.Ven_Situacao = 'A' and Devolucao.dev_situacao = 1 and devolucao.Dev_migrado is null and (Venda.Ven_Situacao = 'A') and Venda.ven_tipo ='P' GROUP BY dbo.produtos.GrupoProduto_codigo,  dbo.Venda.Ven_DescontoProd, dbo.Venda.Ven_TipoDesc
SELECT  SUM(dbo.DevolucaoServico.DevSer_vlitem) AS valor FROM Pasta INNER JOIN Venda ON pasta.Pasta_codigo = Venda.Pasta_codigo INNER JOIN Devolucao ON Venda.Ven_CodigoPre = Devolucao.ven_codigopre INNER JOIN DevolucaoServico ON Devolucao.Dev_CodigoPre = DevolucaoServico.Dev_codigopre WHERE venda.ven_codigopre =:pven_codigopre AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Devolucao.Dev_situacao = 1) AND (Devolucao.Dev_migrado IS NULL)
SELECT  SUM(dbo.DevolucaoDesagio.DevDes_valorComDesc) AS VALOR, dbo.DevolucaoDesagio.DevDes_porcentagem, dbo.DevolucaoDesagio.GrupoProduto_Codigo FROM dbo.Devolucao INNER JOIN dbo.Venda INNER JOIN  dbo.Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN  dbo.DevolucaoDesagio ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoDesagio.Dev_codigopre WHERE     (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Devolucao.Dev_situacao = 1) and  venda.ven_codigopre =:pven_codigopre  and DevolucaoDesagio.GrupoProduto_Codigo =:pGrupoProduto_Codigo and devolucao.Dev_migrado is null and Venda.ven_tipo ='P' GROUP BY dbo.DevolucaoDesagio.DevDes_porcentagem, dbo.DevolucaoDesagio.GrupoProduto_Codigo
SELECT 1 as tipo, DevolucaoProduto.DevPro_Simbolo as simbolo, DevolucaoProduto.DevPro_aplicacao as aplicacao, Devolucao.dev_codigo,  dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.VendaAmbiente.VenAmb_TpDoc, dbo.VendaAmbiente.VenAmb_Descricao, GrupoProduto.GrupoProduto_ordem, dbo.produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, produtos.Pro_CodEspecial, dbo.DevolucaoProduto.CodAcabamento AS acabamento, dbo.DevolucaoProduto.DevPro_Seq AS seq, DevolucaoProduto.DevPro_Quantidade AS quantidade, dbo.DevolucaoProduto.DevPro_VlUnitario AS vlunit, dbo.DevolucaoProduto.DevPro_VlItem AS vlitem, DevolucaoProduto.DevPro_Vldesconto AS vldesconto, dbo.VendaAmbiente.CodAmbiente FROM Devolucao INNER JOIN Venda INNER JOIN Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo INNER JOIN VendaAmbiente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre AND VendaAmbiente.CodAmbiente = dbo.DevolucaoProduto.CodAmbiente INNER JOIN GrupoProduto INNER JOIN produtos ON GrupoProduto.GrupoProduto_Codigo = produtos.GrupoProduto_codigo ON DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso wHERE (Venda.Ven_Situacao = 'A') AND (dbo.VendaAmbiente.VenAmb_TpDoc = 'PRO') AND (dbo.Devolucao.Dev_situacao = 1) and pasta.pasta_codigo =:ppasta_codigo1 and devolucao.Dev_migrado is null and (dbo.Venda.Ven_Situacao = 'A')  and Venda.ven_tipo ='P' union all SELECT   2 as tipo, VendaProduto.VenPro_simbolo as simbolo, VendaProduto.VenPro_aplicacao as aplicacao, 0 as dev_codigo,  dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.VendaAmbiente.VenAmb_TpDoc, dbo.VendaAmbiente.VenAmb_Descricao, dbo.GrupoProduto.GrupoProduto_ordem, dbo.produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, dbo.produtos.Pro_CodEspecial, dbo.VendaProduto.CodAcabamento AS acabamento, dbo.VendaProduto.VenPro_Seq AS seq, dbo.VendaProduto.VenPro_Quantidade AS quantidade, dbo.VendaProduto.VenPro_VlUnitario AS VlUnit, dbo.VendaProduto.VenPro_VlItem AS vlitem, dbo.VendaProduto.VenPro_Vldesconto AS vldesconto, dbo.VendaAmbiente.CodAmbiente FROM dbo.Venda INNER JOIN  dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo AND dbo.Venda.Ven_CodigoPre <> dbo.Pasta.Pasta_CodPreVendaPai INNER JOIN dbo.VendaAmbiente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAmbiente.VenAmb_NDocPre AND dbo.VendaProduto.CodAmbiente = dbo.VendaAmbiente.CodAmbiente INNER JOIN dbo.GrupoProduto ON dbo.produtos.GrupoProduto_codigo = dbo.GrupoProduto.GrupoProduto_Codigo INNER JOIN produtosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso WHERE (dbo.Venda.Ven_Situacao = 'A') AND (dbo.VendaAmbiente.VenAmb_TpDoc = 'PRO') and pasta.pasta_codigo =:ppasta_codigo2 and Venda.ven_tipo ='P'
SELECT 1 AS tipo, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Servicos.Serv_Desc, dbo.DevolucaoServico.DevSer_quantidade AS quantidade, DevolucaoServico.DevSer_vlunitario AS vlunit, dbo.DevolucaoServico.DevSer_vlitem AS vlitem FROM  dbo.Devolucao INNER JOIN dbo.Venda INNER JOIN dbo.Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo  ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN dbo.DevolucaoServico ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoServico.Dev_codigopre INNER JOIN dbo.Servicos ON dbo.DevolucaoServico.Sev_cod = dbo.Servicos.sev_cod WHERE (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Devolucao.Dev_situacao = 1) and pasta.pasta_codigo =:ppasta_codigo1 and devolucao.Dev_migrado is null and Venda.ven_tipo ='P'  union all SELECT 2 AS tipo, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Servicos.Serv_Desc, dbo.VendaServico.VenSer_quantidade AS quantidade, dbo.VendaServico.VenSer_vlunitario AS vlunit, dbo.VendaServico.VenSer_vlitem AS vlitem FROM dbo.Venda INNER JOIN dbo.Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo AND dbo.Venda.Ven_CodigoPre <> dbo.Pasta.Pasta_CodPreVendaPai INNER JOIN dbo.VendaServico ON dbo.Venda.Ven_CodigoPre = dbo.VendaServico.Ven_codigopre INNER JOIN dbo.Servicos ON dbo.VendaServico.Sev_cod = dbo.Servicos.sev_cod WHERE (dbo.Venda.Ven_Situacao = 'A') and pasta.pasta_codigo =:ppasta_codigo2 and Venda.ven_tipo ='P'
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) AS valor, CASE WHEN Ven_TipoDesc = 'P' THEN SUM(venpro_vlitem) ELSE SUM(venpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (venpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END AS valorcomdesc, SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(venpro_vlitem) ELSE SUM(venpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (venpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END AS valordesc, CASE WHEN SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(venpro_vlitem)  ELSE SUM(venpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (venpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END > 0 THEN (SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(venpro_vlitem) ELSE SUM(venpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (venpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END) * 100 / SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) ELSE 0 END AS desconto, dbo.produtos.GrupoProduto_codigo, dbo.VendaProduto.Ven_CodigoPre, SUM(dbo.VendaProduto.VenPro_Quantidade) AS quant  FROM dbo.VendaProduto INNER JOIN dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN dbo.Venda ON dbo.VendaProduto.Ven_CodigoPre = dbo.Venda.Ven_CodigoPre INNER JOIN dbo.Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo AND dbo.Venda.Ven_CodigoPre <> dbo.Pasta.Pasta_CodPreVendaPai where  produtos.GrupoProduto_codigo =:pGrupoProduto_codigo and pasta.pasta_codigo =:ppasta_codigo and Venda.Ven_Situacao = 'A' and Venda.ven_tipo ='P' GROUP BY dbo.produtos.GrupoProduto_codigo, dbo.VendaProduto.Ven_CodigoPre, dbo.Venda.Ven_DescontoProd, dbo.Venda.Ven_TipoDesc
SELECT SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) AS valor, CASE WHEN Ven_TipoDesc = 'P' THEN SUM(devpro_vlitem)  ELSE SUM(devpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (devpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END AS valorcomdesc,  SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(devpro_vlitem)  ELSE SUM(devpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (devpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END AS valordesc,  CASE WHEN SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(devpro_vlitem)  ELSE SUM(devpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (devpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END)  END > 0 THEN (SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) - CASE WHEN Ven_TipoDesc = 'P' THEN SUM(devpro_vlitem)  ELSE SUM(devpro_vlitem - CASE WHEN ven_descontoporcprod > 0 THEN (devpro_vlitem * (ven_descontoporcprod / 100)) ELSE 0 END) END)  * 100 / SUM(devolucaoProduto.devPro_Quantidade * devolucaoProduto.devPro_VlUnitario) ELSE 0 END AS desconto, dbo.produtos.GrupoProduto_codigo  FROM dbo.DevolucaoProduto INNER JOIN dbo.produtos ON dbo.DevolucaoProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN  dbo.Pasta INNER JOIN dbo.Venda ON dbo.Pasta.Pasta_codigo = dbo.Venda.Pasta_codigo  INNER JOIN  dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre ON dbo.DevolucaoProduto.Dev_CodigoPre = dbo.Devolucao.Dev_CodigoPre WHERE (dbo.produtos.GrupoProduto_codigo =:pGrupoProduto_codigo) AND (dbo.Pasta.Pasta_codigo =:pPasta_codigo) and Venda.Ven_Situacao = 'A' and Devolucao.dev_situacao = 1 and devolucao.Dev_migrado is null and (Venda.Ven_Situacao = 'A') and Venda.ven_tipo ='P' GROUP BY dbo.produtos.GrupoProduto_codigo,  dbo.Venda.Ven_DescontoProd, dbo.Venda.Ven_TipoDesc
SELECT SUM(dbo.VendaServico.VenSer_vlitem) AS valor FROM dbo.Pasta INNER JOIN dbo.Venda ON dbo.Pasta.Pasta_codigo = dbo.Venda.Pasta_codigo AND dbo.Pasta.Pasta_CodPreVendaPai <> dbo.Venda.Ven_CodigoPre AND dbo.Pasta.Pasta_CodPreVendaPai <> dbo.Venda.Ven_CodigoPre INNER JOIN dbo.VendaServico ON dbo.Venda.Ven_CodigoPre = dbo.VendaServico.Ven_codigopre WHERE (dbo.Pasta.Pasta_codigo =:pPasta_codigo) AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P')
SELECT  SUM(dbo.DevolucaoServico.DevSer_vlitem) AS valor FROM Pasta INNER JOIN Venda ON pasta.Pasta_codigo = Venda.Pasta_codigo INNER JOIN Devolucao ON Venda.Ven_CodigoPre = Devolucao.ven_codigopre INNER JOIN DevolucaoServico ON Devolucao.Dev_CodigoPre = DevolucaoServico.Dev_codigopre WHERE (Pasta.Pasta_codigo =:pPasta_codigo) AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Devolucao.Dev_situacao = 1) AND (Devolucao.Dev_migrado IS NULL)
SELECT  SUM(dbo.DevolucaoDesagio.DevDes_valorComDesc) AS VALOR,  dbo.DevolucaoDesagio.GrupoProduto_Codigo FROM dbo.Devolucao INNER JOIN dbo.Venda INNER JOIN  dbo.Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN  dbo.DevolucaoDesagio ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoDesagio.Dev_codigopre WHERE     (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Devolucao.Dev_situacao = 1) and pasta.pasta_codigo =:ppasta_codigo and DevolucaoDesagio.GrupoProduto_Codigo =:pGrupoProduto_Codigo and devolucao.Dev_migrado is null and Venda.ven_tipo ='P' GROUP BY  dbo.DevolucaoDesagio.GrupoProduto_Codigo
SELECT  Epd_estoque FROM  estoque_produto_dia
SELECT  Elg_codigo, Elg_acao, Elg_tipo, Pro_codnosso, CodAcabamento, ParSV_serie, CAST(CONVERT(CHAR(8),elg_data,112) AS DATETIME) AS  elg_data FROM  estoque_log where EstTp_Codigo = 1 and Elg_data >=:pElg_data  and Pro_codnosso=:codigo and CodAcabamento=:acabamento GROUP BY CAST(CONVERT(CHAR(8),elg_data,112) AS DATETIME),Elg_codigo, Elg_acao, Elg_tipo, Pro_codnosso, CodAcabamento,ParSV_serie ORDER BY elg_data, Elg_codigo, ParSV_serie,Elg_acao, Elg_tipo, Pro_codnosso
SELECT fornecedor.For_Nome, produtos.Pro_codnosso  FROM produtos INNER JOIN fornecedor ON produtos.For_codigo = fornecedor.For_codigo WHERE produtos.Pro_codnosso=:produto
SELECT  dbo.produtos.Pro_codnosso, dbo.estoque_produto_dia.Epd_Acabamento, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_descricao,
SELECT  Contas_apagar.*, Tipo_documento.Tpd_descricao AS desc_doc,
SELECT  SUM(Ctp_valor_vencimento) AS Valor_Total
SELECT  SUM(Ctp_valor_vencimento) AS Valor_Recebido
SELECT  SUM(Ctp_valor_vencimento) AS Valor_NaoRecebido
SELECT  contas_receber.*, Tipo_documento.Tpd_descricao AS desc_doc,
SELECT  SUM(Ctr_valor_vencimento) AS Valor_Total
SELECT  SUM(Ctr_valor_vencimento) AS Valor_Recebido
SELECT  SUM(Ctr_valor_vencimento) AS Valor_NaoRecebido
select Cli_codigo,Cli_Nome  from clientes  where cli_situacao='A' order by Cli_nome
select case when  NTF_Modelo = '55' then 'NFe' else 'NFCe' end as modelo, NTF_numero, NTF_DtEmissao,  NotaFiscal.Cli_codigo,NotaFiscal.NTF_Nome, clientes.cli_nome, NTF_cnpjcpf, NTF_ProtocoloNFE, NTF_VlNota, NTF_chaveNFE  , NotaFiscal.CFOP_codigo + ' - ' +NotaFiscal.NTF_NatOperacao as NatOperacao, case when NTF_situacao = 'A' then 'ATIVA' else 'CANCELADA' end as NTF_situacao from Notafiscal LEFT OUTER JOIN clientes ON notafiscal.cli_codigo = clientes.cli_codigo  where NTF_DtEmissao >=CONVERT(DATETIME,
select SUM(NTF_vlnota) as Valor_Total, COUNT(ntf_numero) as Qtde  from Notafiscal LEFT OUTER JOIN clientes ON notafiscal.cli_codigo = clientes.cli_codigo  where NTF_DtEmissao >=CONVERT(DATETIME,
SELECT NTF_Numero, NTF_Serie, NTF_Tipo, NTF_Modelo, CFOP_codigo, NTF_DtEmissao,  NTF_DtSaidaEntrada, NTF_HoraSaida, NTF_BaseICMS, NTF_VlICMS, NTF_BaseSubstICMS, NTF_VlSubstICMS,  NTF_VLProdutos, NTF_VlFrete, NTF_VlSeguro, NTF_DespAcessoria, NTF_VlIPI, NTF_VlNota, Emp_Codigo, NTF_Desconto, NTF_VlPIS, NTF_VlCOFINS,NTF_ProtocoloNFE FROM NotaFiscal where NTF_DtEmissao >=CONVERT(DATETIME,
SELECT SUM(NTF_BaseICMS) AS NTF_BaseICMS, SUM(NTF_VlICMS) AS NTF_VlICMS,  SUM(NTF_BaseSubstICMS) AS NTF_BaseSubstICMS, SUM(NTF_VlSubstICMS) AS NTF_VlSubstICMS, SUM(NTF_VLProdutos) AS NTF_VLProdutos, SUM(NTF_VlFrete) AS NTF_VlFrete, SUM(NTF_VlSeguro) AS NTF_VlSeguro, SUM(NTF_DespAcessoria) AS NTF_DespAcessoria, SUM(NTF_VlIPI) AS NTF_VlIPI, SUM(NTF_VlNota) AS NTF_VlNota, SUM(NTF_VlPIS) AS NTF_VlPIS, SUM(NTF_VlCOFINS) AS NTF_VlCOFINS ,SUM(NTF_Desconto) AS NTF_Desconto, SUM(NTF_VlII) AS NTF_VIII FROM NotaFiscal where NTF_DtEmissao >=CONVERT(DATETIME,
SELECT YEAR(NTF_DtEmissao) AS ano, MONTH(NTF_DtEmissao) AS mes, NTF_Numero, NTF_Serie,  NTF_Tipo, NTF_Modelo, CFOP_codigo, NTF_DtEmissao, Emp_Codigo, NTF_ProtocoloNFE, NTF_ProtocoloNFECanc,  NTF_DescMotivoCanc FROM NotaFiscal where NTF_DtEmissao >=CONVERT(DATETIME,
SELECT dbo.NotaFiscal.CFOP_codigo, SUM(dbo.NotaFiscal.NTF_DespAcessoria) AS despesa, SUM(dbo.NotaFiscal.NTF_VlNota) AS TOTAL, SUM(dbo.NotaFiscal.NTF_VlIPI) AS ipi, SUM(dbo.NotaFiscal.NTF_BaseSubstICMS) AS basest,  SUM(dbo.NotaFiscal.NTF_VlSubstICMS) AS vl_st, SUM(dbo.NotaFiscal.NTF_VlICMS) AS vl_icms, SUM(dbo.NotaFiscal.NTF_BaseICMS) AS base_icms, SUM(dbo.NotaFiscal.NTF_VLProdutos) AS vl_produtos,  SUM(dbo.NotaFiscal.NTF_Desconto) AS desconto, dbo.CFOP.CFOP_Descricao FROM     dbo.NotaFiscal INNER JOIN dbo.CFOP ON dbo.NotaFiscal.CFOP_codigo = dbo.CFOP.CFOP_codigo where NTF_DtEmissao >=CONVERT(DATETIME,
SELECT SUM(NTF_DespAcessoria) AS despesa, SUM(NTF_VlNota) AS TOTAL, SUM(NTF_VlIPI) AS ipi, SUM(NTF_BaseSubstICMS) AS basest, SUM(NTF_VlSubstICMS) AS vl_st, SUM(NTF_VlICMS) AS vl_icms, SUM(NTF_BaseICMS) AS base_icms, SUM(NTF_VLProdutos) AS vl_produtos, SUM(NTF_Desconto) AS desconto FROM     dbo.NotaFiscal INNER JOIN dbo.CFOP ON dbo.NotaFiscal.CFOP_codigo = dbo.CFOP.CFOP_codigo where NTF_DtEmissao >=CONVERT(DATETIME,
SELECT Cntbt_codigo FROM contabilista WHERE cntbt_CPF =
SELECT * FROM Contabilista
select SUM(ctr_valor_vencimento) as ContasaReceber
select SUM(ctr_valor_vencimento) as ContasVencidas
select SUM(ctr_valor_vencimento) as Outrasareceber
select SUM(ctr_valor_vencimento) as OutrasVencidas
select epd_data from estoque_produto_dia where Epd_data >=:Data group by epd_data order by epd_data
SELECT produtos.Pro_codnosso, max(Preco_Produto.Pre_VlNFor) as Pre_Compra, Estoque_produto.Epr_Acabamento, Estoque_produto_dia.Epd_estoque as Epr_estoque
SELECT SUM(ctp_valor_vencimento) as FornecedoraPagar
select SUM(ctp_valor_vencimento) AS Saldo_Imposto
select SUM(ctp_valor_vencimento) AS Saldo_Emprestimo
select SUM(ctp_valor_vencimento) AS Saldo_OutrasaPagar
SELECT sum(Contas_apagar_pag.Cpp_valor_pago) as Cpp_valor_pago  FROM contas_apagar_det INNER JOIN Contas_apagar_pag ON  contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.Ctp_codigo_det = Contas_apagar_pag.Ctp_codigo_det INNER JOIN Contas_Bancarias ON  contas_apagar_det.Emp_codigo =  Contas_Bancarias.Emp_codigo AND Contas_apagar_pag.cba_codigo =  Contas_Bancarias.Cba_codigo INNER JOIN Bancos_Caixas ON  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND Contas_Bancarias.Bcx_codigo =  Bancos_Caixas.Bcx_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND  Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo AND Contas_Bancarias.Emp_codigo =  Bancos_Caixas.Emp_codigo  INNER JOIN contas_apagar ON contas_apagar_det.Ctp_codigo = contas_apagar.Ctp_codigo WHERE (Bancos_Caixas.Bcx_tipo = 'C') AND (contas_apagar_det.Ctp_situacao = 'S') and Contas_apagar_pag.Cpp_data_pagamento>=:data1 and Contas_apagar_pag.Cpp_data_pagamento <=:data2 and Contas_apagar.tcf_codigo < '1000'
select SUM(nen_vl_total_nota) as Saldo_Compras
select SUM(ctr_valor_vencimento) as Recebimentos
select SUM(ctr_valor_vencimento) AS Emprestimos
select SUM(ctr_valor_vencimento) AS OutrosReceb
SELECT SUM(cpp_valor_pago) as Fornecedores
SELECT SUM(cpp_valor_pago) AS ContasFixas
Select SUM(cpp_valor_pago) AS Impostos
Select SUM(cpp_valor_pago) AS Comissoes
SELECT   SUM(cpp_valor_pago) AS RT
SELECT   SUM(cpp_valor_pago) AS Emprestimos
Select SUM(cpp_valor_pago) AS Outras
select Sum(Ven_total) as Vendas
select Sum(Dev_total) as Devolucao
Select SUM(ctp_valor_vencimento) AS Impostos
Select SUM(ctp_valor_vencimento) as Comissoes
Select SUM(ctp_valor_vencimento) as RT
SELECT SUM(VendaProduto.VenPro_Quantidade * dbo.ValorCompra (VendaProduto.Pro_codnosso,VendaProduto.CodAcabamento, DATEADD(DAY, -30 ,Venda.Ven_DataEmissao) ,Venda.Ven_DataEmissao)) AS Saldo_Compras FROM Venda INNER JOIN VendaProduto ON Venda.Ven_CodigoPre = VendaProduto.Ven_CodigoPre INNER JOIN Preco_Produto ON VendaProduto.Pro_codnosso = Preco_Produto.Pre_Codnosso AND VendaProduto.CodAcabamento = Preco_Produto.Pre_Acabamento WHERE (Venda.Ven_Tipo = 'P') AND (Venda.Ven_Situacao = 'A') AND Venda.Ven_DataEmissao>=:DATA1  AND Venda.Ven_DataEmissao <=:DATA2
SELECT SUM(Ven_TotalProd) AS Ven_TotalProd, SUM(Ven_TotalServ) AS Ven_TotalServ FROM dbo.Venda WHERE (Ven_Situacao = 'A') AND (Ven_Tipo = 'P') AND (Ven_DataEmissao >=:data1) AND (Ven_DataEmissao <=:data2)
SELECT SUM(cpp_valor_pago) AS CustoFixo
Select Par_CreditaICMS from Paramentros
sELECT produtos.pro_ncm,dbo.estoque_produto_dia.EstTp_Codigo, produtos.Pro_CodEspecial ,dbo.produtos.Pro_codnosso, dbo.estoque_produto_dia.Epd_Acabamento, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase,
SELECT produtos.pro_ncm, dbo.estoque_produto_dia.EstTp_Codigo, produtos.Pro_CodEspecial ,dbo.produtos.Pro_codnosso, dbo.estoque_produto_dia.Epd_Acabamento, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase,
select top 1 CFOP_codigo from nota_entrada_det
select for_codigo, for_nome
SELECT produtos.Pro_codnosso, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_CodigoProduto, ProdutosFornecedores.ProdFor_DescricaoProduto, ProdutosFornecedores.For_codigo, produtos.Pro_tp_peca,
SELECT dbo.produtos.Pro_codnosso, produtos.pro_descricao, ProdFor_CodigoProduto, ProdFor_DescricaoProduto, ProdutosFornecedores.For_codigo, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_unidade,
select * from EtiquetaPronta where EtqPront_codigo=4
select * from EtiquetaPronta where EtqPront_codigo=7
select * from EtiquetaPronta where EtqPront_codigo=20
select * from EtiquetaPronta where EtqPront_codigo=9
select * from EtiquetaPronta where EtqPront_codigo=10
select * from EtiquetaPronta where EtqPront_codigo=12
select * from EtiquetaPronta where EtqPront_codigo=21
select Nen_codigo, Nen_numero_nota from Nota_entrada where Nen_fornecedor =
select * from Porcentagem_Tributos where ptrib_versao =:pversao order by PTrib_tipo, PTrib_ncm
SELECT Clientes.Cli_Nome, Venda.Ven_codigo, Venda.Ven_Situacao, Venda.ParSV_serie, Venda.Ven_Orcamento, Venda.Ven_DataEmissao,
SELECT * fROM venda WHERE ven_situacao = 'A' and ven_tipo ='P' and Ven_CodVinculo =:pVen_CodVinculo ORDER BY VEN_CODIGO desc
SELECT Clientes.Cli_Codigo, Clientes.Cli_Nome,  produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for,
select Nome from SisUsuarios where id=:pid
SELECT top 1 dbo.unidades.uni_descricao, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_descricao, ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for,
SELECT * FROM BalancoEstoque
SELECT ForaDoBalanco.ForBal_codigo, ForaDoBalanco.ForBal_descricao, ForaDoBalanco.usr_cod_criacao, fornecedor.For_Nome,
SELECT * FROM movimento_bancario where Cpp_cod_pag is null
SELECT CFOP_codigo + '-' + CFOP_DescricaoCurta AS descricao, CFOP_codigo FROM  dbo.CFOP WHERE  (CFOP_DescricaoCurta IS NOT NULL)
select codlanc, empresa from empresa order by empresa
SELECT Nota_entrada.Nen_numero_nota, Nota_entrada.Nen_dt_emissao, Nota_entrada.Nen_dt_nota, Nota_entrada.Nen_cfop, fornecedor.For_Nome,
select TribServ_codigo from TributacaoServico where TribServ_codigo=:PTribServ_codigo
SELECT *, CASE WHEN TribServ_situacao = 0 THEN 'DESATIVADO' ELSE 'ATIVO' END AS situacao FROM   dbo.TributacaoServico WITH (NOLOCK)
SELECT  *, CASE WHEN TribServ_situacao = 0 THEN 'DESATIVADO' ELSE 'ATIVO' END AS situacao FROM TributacaoServico
select TribServ_codigo from nfse where TribServ_codigo =:pTribServ_codigo
SELECT Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_DataEmissao, Clientes.Cli_Nome, vendaProduto.Pro_codnosso, VendaProduto.CodAcabamento, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase,
SELECT Cli_tp_pessoa as pessoa, Clientes.Cli_Nome AS nome, Clientes.Cli_Endereco AS endereco, Clientes.Cli_numero AS numero, Clientes.Cli_complemento AS complemento,
SELECT 'N' as selecionar, case when ctr_vinculo = 'CLIENTE' then (select cli_nome from clientes where clientes.cli_codigo = contas_receber.Ctr_codigo_vinculo) else case when ctr_vinculo ='FORNECEDOR' THEN (select for_nome from fornecedor where fornecedor.for_codigo = contas_receber.Ctr_codigo_vinculo) else case when ctr_vinculo ='PESSOAL' THEN (select FUN_nome from funcionario where funcionario.fun_cpf = contas_receber.Ctr_codigo_vinculo) else case when ctr_vinculo ='INDICA
select CODLANC, empresa from empresa
SELECT 0 as qtde,    venda.ven_codigo, venda.ven_codigopre, dbo.Clientes.Cli_Nome, dbo.VendaAmbiente.CodAmbiente, dbo.Ambiente.DescAmbiente, venda.ParSV_serie
select * from EtiquetaPronta where EtqPront_codigo=8
SELECT  MONTH(dbo.Venda.Ven_DataEmissao) AS mes, YEAR(dbo.Venda.Ven_DataEmissao) AS ano, SUM(dbo.Venda.Ven_Total) AS total
select * from HistoricoVersoesSistema
select * from HistoricoVersoes order by HistVer_Codigo desc
SELECT HistoricoVersoesLancamento.HistVerLanc_Descricao, HistoricoVersoesSistema.HistVerSis_Descricao, HistoricoVersoes.HistVer_Versao
select tam_codigo from Preco_Produto where tam_codigo =:ptam_codigo
SELECT * FROM Caracteristicas
select tam_codigo from ProdutosCaracteristicas where Caract_Codigo =:pCaract_Codigo
select * from Plano_Contas where Pco_pai =:pPco_pai
SELECT SUM(CtR_valor_total_original) AS total
SELECT SUM(Ctp_valor_total_original) AS total
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.Preco_Produto.Pre_Custo) AS total
SELECT SUM(contas_Receber_det.Ctr_valor_vencimento) AS total
SELECT SUM(contas_apagar_det.Ctp_valor_vencimento) AS total
Select * from Plano_Contas where pco_pai=:vPai and Pco_DRE =:pPco_DRE
Select * from Plano_Contas where Pco_DRE =
SELECT Ctp_codigo, COUNT(*) AS parcela
SELECT Ctr_codigo, COUNT(*) AS parcela
SELECT dbo.contas_apagar.Ctp_vinculo AS VINCULO, dbo.contas_apagar.Ctp_codigo_vinculo AS CODIGO_VINCULO, dbo.contas_apagar.Ctp_nome AS NOME, CASE WHEN contas_apagar.Ctp_vinculo = 'FORNECEDOR' THEN
SELECT dbo.contas_receber.Ctr_vinculo AS VINCULO, dbo.contas_receber.Ctr_codigo_vinculo AS CODIGO_VINCULO, dbo.contas_receber.Ctr_nome AS NOME, CASE WHEN contas_receber.Ctr_vinculo = 'FORNECEDOR' THEN
SELECT CenAs_Entregou FROM dbo.Controle_entrega_Assinaturas where CenAs_Entregou is not null  GROUP BY CenAs_Entregou ORDER BY CenAs_Entregou
SELECT CenAs_Recebeu FROM dbo.Controle_entrega_Assinaturas where CenAs_Recebeu is not null GROUP BY CenAs_Recebeu ORDER BY CenAs_Recebeu
select * from EtiquetaPronta where EtqPront_codigo=13
SELECT Ctp_vinculo, Ctp_nome,sum(contas_apagar_det.Ctp_valor_vencimento) as valor FROM contas_apagar INNER JOIN  contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo LEFT OUTER JOIN Contas_apagar_pag ON contas_apagar_det.Ctp_codigo = Contas_apagar_pag.Ctp_codigo AND contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det LEFT OUTER JOIN Plano_Contas ON contas_apagar.Pco_codigo = Plano_Contas.Pco_codigo
SELECT dbo.Clientes.Cli_Codigo, dbo.Clientes.Cli_Nome
SELECT Funcionario.Fun_CPF, dbo.Funcionario.Fun_Nome FROM dbo.Funcionario INNER JOIN
SELECT dbo.Venda.Ven_Tipo, dbo.Venda.Ven_Situacao, dbo.Venda.Ven_codigo, dbo.Venda.Ven_DataEmissao, dbo.Clientes.Cli_Nome, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento,
SELECT dbo.VendaAtendente.Fun_Codigo, SUM(dbo.NotaFiscal.NTF_VLProdutos) AS NTF_VLProdutos, SUM(dbo.NotaFiscal.NTF_VlNota) AS NTF_VlNota,
SELECT SUM(dbo.NotaFiscalContas.NTFC_valor) AS troca
SELECT Clientes.cli_nome, Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_CodigoPre, Venda.Ven_Tipo, Venda.Ven_DataEmissao,
SELECT venda.ven_codigopre,  venda.ven_codigo, venda.Ven_CodVinculo, venda.ParSV_serie FROM venda INNER JOIN
SELECT NotaFiscal.NTF_Numero, NotaFiscal.NTF_Serie, Case when dbo.NotaFiscal.NTF_Modelo = '55' Then 'NFe' else 'NFCe' end as NTF_Modelo, 'E' AS NTF_Tipo,
SELECT NotaFiscal.NTF_Numero, NotaFiscal.NTF_Serie, Case when NotaFiscal.NTF_Modelo = '55' Then 'NFe' else 'NFCe' end as NTF_Modelo, dbo.NotaFiscal.NTF_Tipo, dbo.NotaFiscalProdutos.Pro_codnosso,
SELECT Nota_entrada.Nen_numero_nota AS NTF_Numero, 'NE' AS ASNTF_Serie, 'NE' AS NTF_Modelo, 'E' AS NTF_Tipo, dbo.nota_entrada_det.Pro_codnosso,
SELECT Lancamento_estoque.les_codigo AS NTF_Numero, 'LA' AS ASNTF_Serie,'LA' AS NTF_Modelo, lancamento_estoque_det.lesd_tp_mov AS NTF_Tipo,
SELECT NotaFiscal.NTF_Codigo FROM NotaFiscalImportaDoc INNER JOIN
select * from Preco_Produto where Pre_CodBarra is null
select * from ProdutosFornecedores where ProdFor_CodigoBarra is null
SELECT *, case when EFDR150_Situacao = 1 then 'ATIVO' ELSE 'DESATIVADO' END AS SITUACAO FROM EFD_REGISTRO_150
select EFDR150_Codigo from modo where EFDR150_Codigo =:pcodigo
SELECT produtos.pro_NCM, TabelaImposto.PIS_codigo, TabelaImposto.COFINS_codigo, produtos.Pro_codnosso,ProdutosFornecedores.ProdFor_CodigoProduto,
SELECT  CASE WHEN NTF_Modelo = '55' THEN 'NFe' ELSE 'NFCe' END AS modelo, dbo.NotaFiscal.NTF_Numero, dbo.NotaFiscal.NTF_DtEmissao, dbo.NotaFiscal.NTF_Situacao, dbo.NotaFiscal.Cli_Codigo, dbo.NotaFiscal.NTF_Nome, dbo.Clientes.Cli_Nome, NotaFiscal.NTF_CNPJCPF, dbo.NotaFiscal.NTF_ProtocoloNFE, dbo.NotaFiscal.NTF_VlNota, dbo.NotaFiscal.NTF_ChaveNFE, dbo.NotaFiscal.CFOP_codigo + ' - ' + dbo.NotaFiscal.NTF_NatOperacao AS NatOperacao, dbo.NotaFiscal.CFOP_codigo, NotaFiscalImportaDoc.NTFImp_DocCodigo,NotaFiscalImportaDoc.NTFImp_DocTipo,NotaFiscalImportaDoc.ParSV_serie FROM NotaFiscal INNER JOIN NotaFiscalImportaDoc ON dbo.NotaFiscal.NTF_Codigo = dbo.NotaFiscalImportaDoc.NTF_Codigo LEFT OUTER JOIN Clientes ON dbo.NotaFiscal.Cli_Codigo = dbo.Clientes.Cli_Codigo WHERE     dbo.NotaFiscal.NTF_DtEmissao >= CONVERT(DATETIME,
select SUM(NTF_vlnota) as Valor_Total, COUNT(ntf_numero) as Qtde  FROM   dbo.NotaFiscal  INNER JOIN NotaFiscalImportaDoc ON NotaFiscal.NTF_Codigo = NotaFiscalImportaDoc.NTF_Codigo LEFT OUTER JOIN Clientes ON NotaFiscal.Cli_Codigo = Clientes.Cli_Codigo WHERE dbo.NotaFiscal.NTF_DtEmissao >= CONVERT(DATETIME,
SELECT   dbo.Estoque_produto.Epr_Codnosso, ' ' AS epr_acabamento,
SELECT dbo.Estoque_produto.Epr_Codnosso, dbo.Estoque_produto.Epr_Acabamento,
select CatProfExt_Descricao from categoriaprofissionaisexterno where CatProfExt_Descricao=:PCatProfExt_Descricao
SELECT *, case when catprofext_situacao =1 then 'ATIVO' else 'DESATIVADO' end as situacao FROM CategoriaProfissionaisExterno
select Catprofext_Codigo from Indicacoes_Detalhe where Catprofext =:pCatprofext_Codigo
select * from ParamentrosNFe where ParNFe_Codigo =
SELECT contas_receber.emp_codigo,contas_receber.TPD_CODIGO, dbo.contas_receber.Ctr_nome AS nome, dbo.Tipo_documento.Tpd_descricao AS tipo, dbo.contas_Receber_det.Ctr_parcela AS parcela, dbo.Contas_receber_pag.Crp_data_pagamento AS data,
SELECT contas_apagar.emp_codigo,contas_apagar.TPD_CODIGO,contas_apagar.Ctp_nome AS nome, Tipo_documento.Tpd_descricao AS tipo, contas_apagar_det.Ctp_parcela AS parcela,Contas_apagar_pag.Cpp_data_pagamento AS data,
SELECT contas_receber.emp_codigo,contas_receber.TPD_CODIGO,contas_receber.Ctr_nome AS nome, dbo.Tipo_documento.Tpd_descricao AS tipo, dbo.contas_Receber_det.Ctr_parcela AS parcela, '' AS id, dbo.contas_receber.Ctr_historico AS historico,
SELECT contas_apagar.emp_codigo,contas_apagar.TPD_CODIGO,contas_apagar.Ctp_nome AS nome, Tipo_documento.Tpd_descricao AS tipo, contas_apagar_det.Ctp_parcela AS parcela, contas_apagar.Ctp_historico AS historico, contas_apagar.Ctp_codigo AS codigoconta,
SELECT dbo.VendaProduto.Pro_codnosso, dbo.produtos.Pro_descricao, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_tp_produto, dbo.ProdutosFornecedores.ProdFor_CodigoProduto,
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) AS total
SELECT     O.NomeMenu, P.Inserir , P.Alterar , P.Excluir, P.Consultar, P.Imprimir
select p.idpai,p.id from sispermissao as p, sisopcoes as s
SELECT fornecedor.For_prazo_entrega , fornecedor.For_prazo_medio_pag, fornecedor.For_Nome, dbo.ordem_compra.Ocp_codigo_pre,
SELECT fornecedor.For_EmpresaCompradora,fornecedor.For_prazo_entrega, fornecedor.For_prazo_medio_pag, dbo.fornecedor.For_Nome, dbo.ordem_compra.Ocp_codigo_pre, dbo.ordem_compra.Ocp_codigo, dbo.ordem_compra.Ocp_SubTotal,
SELECT SUM(dbo.nota_entrada_det.Ned_vl_item) AS valor FROM dbo.nota_entrada_det INNER JOIN
select Ctp_codigo,Ctp_valor_total_original from contas_apagar where Tpd_codigo = 1023 and Ctp_cod_documento=:pCtp_cod_documento
SELECT EstoqueExterno.EstExt_endereco, dbo.EstoqueExterno.EstExt_usuario, dbo.EstoqueExterno.EstExt_senha
select mun_codigo from Municipio where mun_nome=:pmun_nome and mun_uf =:pmun_uf
SELECT Estoque_produto.Epr_estoque - VendaEstoque.VenEst_Quantidade AS resultado, EstoqueTipo.EstTp_Descricao, Estoque_produto.Epr_Codnosso, Estoque_produto.Epr_Acabamento,
SELECT Pro_PrazoEntrega fROM produtos
SELECT Credito_Codigo FROM dbo.Credito WHERE (Credito_TipoVinculo = 'C') AND (Credito_CodigoVinculo =:PCredito_CodigoVinculo) AND (Credito_Operacao = 'D') AND (Credito_CodigoDoc =:PCredito_CodigoDoc) AND (Credito_Situacao = 'A') AND  (ParSV_serie =:pParSV_serie) AND (Credito_TpdcodigoOrigem = 1001) and Credito_Valor =:pCredito_Valor
select top 1 Pre_Venda from Preco_Produto where Pre_Codnosso =:pPre_Codnosso and Pre_Acabamento =:pPre_Acabamento and Pre_Ativo ='S'
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade) AS quantidade, dbo.produtos.GrupoProduto_codigo,
SELECT SUM(dbo.VendaServico.VenSer_quantidade) AS quantidade, SUM(dbo.VendaServico.VenSer_vlunitario * dbo.VendaServico.VenSer_quantidade) AS ValorSemDesc,
SELECT SUM(dbo.DevolucaoProduto.DevPro_Quantidade) AS quantidade, dbo.produtos.GrupoProduto_codigo,
SELECT SUM(dbo.DevolucaoServico.DevSer_quantidade) AS quantidade, SUM(dbo.DevolucaoServico.DevSer_vlunitario * dbo.DevolucaoServico.DevSer_quantidade)
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade * (dbo.VendaAtendente.VenAten_Porcentagem / 100)) AS quantidade, dbo.produtos.GrupoProduto_codigo,
SELECT SUM(dbo.VendaServico.VenSer_quantidade * (dbo.VendaAtendente.VenAten_Porcentagem / 100)) AS quantidade,
SELECT SUM(dbo.DevolucaoProduto.DevPro_Quantidade * (dbo.VendaAtendente.VenAten_Porcentagem / 100)) AS quantidade, dbo.produtos.GrupoProduto_codigo,
SELECT SUM(dbo.DevolucaoServico.DevSer_quantidade * (dbo.VendaAtendente.VenAten_Porcentagem / 100)) AS quantidade,
SELECT TOP (1) Ven_CodigoPre
SELECT For_codigo FROM produtos where Pro_codnosso =:pPro_codnosso
SELECT produtos.For_codigo FROM VendaProduto INNER JOIN
SELECT produtos.For_codigo FROM avulso_luminaria_det INNER JOIN
SELECT produtos.For_codigo FROM avulso_materiais_det INNER JOIN
SELECT Nen_codigo from Nota_Entrada_Dif where Nen_codigo=:pCtp_cod_externo and NenDf_DesbData is null
SELECT Clientes.*, Municipio.mun_nome, Municipio.mun_uf
SELECT Texto_Substituicao.Tsu_campo, ParamentrosCliente.ParCli_fisica, ParamentrosCliente.ParCli_juridica, Texto_Substituicao.Tsu_descricao
SELECT obras.* from Obras where Obr_Codigo=:pObr_Codigo
SELECT Indicacoes_Detalhe.*, Municipio.mun_nome,Municipio.mun_uf
SELECT Texto_Substituicao.Tsu_campo, Paramentrosprofissional.Parprof_fisica, Paramentrosprofissional.Parprof_juridica, Texto_Substituicao.Tsu_descricao
SELECT Pro_AliqICMS from produtos
SELECT Funcionario.Fun_Nome FROM Funcionario INNER JOIN
SELECT empresa_resumo ,EMPRESA, CGCCPF from empresa where Emp_ImprimirNome = 1
SELECT mun_uf from Municipio where mun_codigo=:Pmun_codigo
SELECT * FROM credito where Credito_TpdcodigoOrigem=:PCredito_TpdcodigoOrigem and Credito_CodigoDoc=:PCredito_CodigoDoc AND Credito_Situacao='A' and credito_operacao=:Pcredito_operacao
SELECT Ctp_codigo FROM contas_apagar where tpd_codigo=1006 and Ctp_cod_documento =
SELECT Ctr_codigo FROM contas_receber where tpd_codigo=1007 and Ctr_cod_documento =
select Epd_data from estoque_produto_dia where Epd_data=:data
SELECT cen_modo,cen_codigo,cen_codigo_pre from Controle_entrega WITH (NOLOCK) where cen_tipo='P' AND cen_pedido_avulso=:codigo
SELECT 'LUMINARIAS' AS tipo, dbo.pedido_luminaria_det.ped_codigo_pre, dbo.pedido_luminaria_det.Pro_codnosso AS codnosso, produtos.Pro_descricao AS produto, pedido_luminaria_det.pld_acabamento AS acabamento, SUM(pedido_luminaria_det.pld_quantidade) AS quantidade, MAX(controle_entrega_prod.cep_quantidade) AS cep_quantidade, dbo.controle_entrega_prod.cen_codigo_pre, MAX(controle_entrega_prod.cep_quantidade_entregue) AS cep_quantidade_entregue, MAX(controle_entrega_prod.cep_quantidade_separadaRet) AS cep_quantidade_separadaRet, MAX(controle_entrega_prod.cep_quantidade_entregueRET) AS cep_quantidade_entregueRET, MAX(dbo.controle_entrega_prod.cep_quantidade_separada) AS cep_quantidade_separada FROM pedido_luminaria_det WITH (NOLOCK) INNER JOIN controle_entrega_prod WITH (NOLOCK) ON pedido_luminaria_det.Pro_codnosso = controle_entrega_prod.Pro_codnosso AND pedido_luminaria_det.pld_acabamento = controle_entrega_prod.cep_acabamento INNER JOIN produtos ON pedido_luminaria_det.Pro_codnosso = produtos.Pro_codnosso GROUP BY pedido_luminaria_det.ped_codigo_pre, pedido_luminaria_det.Pro_codnosso, produtos.Pro_descricao, pedido_luminaria_det.pld_acabamento, controle_entrega_prod.cen_codigo_pre HAVING (pedido_luminaria_det.ped_codigo_pre =:Pped_codigo_pre1) AND (controle_entrega_prod.cen_codigo_pre =:pcen_codigo_pre1) UNION ALL SELECT 'MATERIAIS' AS tipo, pedido_materiais_det.ped_codigo_pre, pedido_materiais_det.Pro_codnosso AS codnosso, produtos.Pro_descricao AS produto, pedido_materiais_det.pma_acabamento AS acabamento, SUM(pedido_materiais_det.pma_quantidade) AS quantidade, MAX(controle_entrega_prod_1.cep_quantidade) AS cep_quantidade, controle_entrega_prod_1.cen_codigo_pre, MAX(controle_entrega_prod_1.cep_quantidade_entregue) AS cep_quantidade_entregue, MAX(controle_entrega_prod_1.cep_quantidade_separadaRet) AS cep_quantidade_separadaRet, MAX(controle_entrega_prod_1.cep_quantidade_entregueRET) AS cep_quantidade_entregueRET, MAX(controle_entrega_prod_1.cep_quantidade_separada) AS cep_quantidade_separada FROM pedido_materiais_det WITH (NOLOCK) INNER JOIN controle_entrega_prod AS controle_entrega_prod_1 WITH (NOLOCK) ON pedido_materiais_det.Pro_codnosso = controle_entrega_prod_1.Pro_codnosso AND pedido_materiais_det.pma_acabamento = controle_entrega_prod_1.cep_acabamento INNER JOIN produtos ON dbo.pedido_materiais_det.Pro_codnosso = produtos.Pro_codnosso GROUP BY pedido_materiais_det.ped_codigo_pre, pedido_materiais_det.Pro_codnosso, produtos.Pro_descricao, pedido_materiais_det.pma_acabamento, controle_entrega_prod_1.cen_codigo_pre HAVING  (controle_entrega_prod_1.cen_codigo_pre =:Pcen_codigo_pre2) AND (dbo.pedido_materiais_det.ped_codigo_pre=:Pped_codigo_pre2)
select * from controle_entrega_data where cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1000 and Ced_CodMovAlt=:PCed_CodMovAlt
select * from controle_entrega_data where cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1000 and Ced_CodMovAlt=:PCed_CodMovAlt and cep_tipo='S'
select * from controle_entrega_data where cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1000 and Ced_CodMovAlt=:PCed_CodMovAlt and cep_tipo='E'
select * from controle_entrega_data where cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1001 and Ced_CodMovAlt=:PCed_CodMovAlt AND cep_tipo ='S'
select * from controle_entrega_data where cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1001 and Ced_CodMovAlt=:PCed_CodMovAlt and cep_tipo='E'
SELECT (select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data  WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='S' AND cep_operacao='R' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento ) as QtdSepRet, (select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end  from controle_entrega_data  WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='S' AND cep_operacao='R' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento ) as QtdEtgRet, ((select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='S' AND cep_operacao='E' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento)  -  (select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data  WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='S' AND cep_operacao='R' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento ) )as CalcSep, ((select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='E' AND cep_operacao='E' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento )  - (select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data  WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='E' AND cep_operacao='R' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento ) )as CalcEnt from controle_entrega_prod WITH (NOLOCK) where cen_codigo_pre =:Pcen_codigo_pre AND Pro_codnosso=:PPro_codnosso AND cep_acabamento=:Pcep_acabamento
select * from controle_entrega_prod where cen_codigo_pre =:Pcen_codigo_pre AND Pro_codnosso=:PPro_codnosso AND cep_acabamento=:Pcep_acabamento
SELECT 'L' AS tipo, dbo.pedido_luminaria_det.Pro_codnosso AS codnosso, dbo.pedido_luminaria_det.pld_acabamento AS acabamento, SUM(dbo.pedido_luminaria_det.pld_quantidade) AS quantidade FROM dbo.Controle_entrega WITH (NOLOCK) INNER JOIN pedido_luminaria_det WITH (NOLOCK) INNER JOIN pedido WITH (NOLOCK) ON dbo.pedido_luminaria_det.ped_codigo_pre = dbo.pedido.ped_codigo_pre ON Controle_entrega.cen_pedido_avulso = dbo.pedido.ped_codigo LEFT OUTER JOIN controle_entrega_prod WITH (NOLOCK) ON dbo.pedido_luminaria_det.Pro_codnosso = dbo.controle_entrega_prod.Pro_codnosso AND pedido_luminaria_det.pld_acabamento = dbo.controle_entrega_prod.cep_acabamento AND Controle_entrega.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre WHERE (dbo.controle_entrega_prod.cen_codigo_pre IS NULL) AND (dbo.Controle_entrega.cen_tipo = 'P') AND (dbo.pedido_luminaria_det.ped_codigo_pre =:Pped_codigo_pre1) GROUP BY dbo.pedido_luminaria_det.Pro_codnosso, dbo.pedido_luminaria_det.pld_acabamento union all SELECT 'M' as tipo, dbo.pedido_materiais_det.Pro_codnosso AS codnosso, dbo.pedido_materiais_det.pma_acabamento AS acabamento, SUM(dbo.pedido_materiais_det.pma_quantidade) AS quantidade FROM Controle_entrega WITH (NOLOCK) INNER JOIN pedido_materiais_det WITH (NOLOCK) INNER JOIN pedido WITH (NOLOCK) ON dbo.pedido_materiais_det.ped_codigo_pre = dbo.pedido.ped_codigo_pre ON Controle_entrega.cen_pedido_avulso = dbo.pedido.ped_codigo LEFT OUTER JOIN controle_entrega_prod WITH (NOLOCK) ON dbo.pedido_materiais_det.Pro_codnosso = dbo.controle_entrega_prod.Pro_codnosso AND pedido_materiais_det.pma_acabamento = dbo.controle_entrega_prod.cep_acabamento AND Controle_entrega.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre WHERE (pedido_materiais_det.ped_codigo_pre =:Pped_codigo_pre2) AND (dbo.controle_entrega_prod.cen_codigo_pre IS NULL) AND (Controle_entrega.cen_tipo = 'P') GROUP BY dbo.pedido_materiais_det.Pro_codnosso, dbo.pedido_materiais_det.pma_acabamento
select * from controle_entrega_prod
SELECT dbo.controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento FROM  dbo.Controle_entrega WITH (NOLOCK) INNER JOIN dbo.controle_entrega_prod WITH (NOLOCK) ON dbo.Controle_entrega.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre LEFT OUTER JOIN dbo.pedido_luminaria_det WITH (NOLOCK) INNER JOIN  dbo.pedido WITH (NOLOCK) ON dbo.pedido_luminaria_det.ped_codigo_pre = dbo.pedido.ped_codigo_pre ON dbo.Controle_entrega.cen_pedido_avulso = dbo.pedido.ped_codigo AND dbo.controle_entrega_prod.Pro_codnosso = dbo.pedido_luminaria_det.Pro_codnosso AND dbo.controle_entrega_prod.cep_acabamento = dbo.pedido_luminaria_det.pld_acabamento WHERE (dbo.controle_entrega_prod.cep_tipo = 'L') AND (dbo.controle_entrega_prod.cen_codigo_pre =:Pcen_codigo_pre1) AND (dbo.pedido_luminaria_det.Pro_codnosso IS NULL) GROUP BY dbo.controle_entrega_prod.cen_codigo_pre, dbo.controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento UNION ALL SELECT controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento FROM Controle_entrega WITH (NOLOCK) INNER JOIN controle_entrega_prod WITH (NOLOCK) ON dbo.Controle_entrega.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre LEFT OUTER JOIN pedido_materiais_det WITH (NOLOCK) INNER JOIN pedido WITH (NOLOCK) ON dbo.pedido_materiais_det.ped_codigo_pre = dbo.pedido.ped_codigo_pre ON Controle_entrega.cen_pedido_avulso = dbo.pedido.ped_codigo AND controle_entrega_prod.Pro_codnosso = dbo.pedido_materiais_det.Pro_codnosso AND controle_entrega_prod.cep_acabamento = dbo.pedido_materiais_det.pma_acabamento WHERE (pedido_materiais_det.Pro_codnosso IS NULL) AND (dbo.controle_entrega_prod.cep_tipo = 'M') AND (controle_entrega_prod.cen_codigo_pre =:Pcen_codigo_pre2) GROUP BY dbo.controle_entrega_prod.cen_codigo_pre, dbo.controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento
SELECT  cen_codigo_pre, Pro_codnosso, cep_acabamento  FROM controle_entrega_prod WHERE (cen_codigo_pre =:Pcen_codigo_pre) AND cep_quantidade<=0
SELECT 'LUMINARIAS' AS tipo, dbo.pedido_luminaria_det.ped_codigo_pre, dbo.pedido_luminaria_det.Pro_codnosso AS codnosso, produtos.Pro_descricao AS produto, pedido_luminaria_det.pld_acabamento AS acabamento, SUM(pedido_luminaria_det.pld_quantidade) AS quantidade, MAX(controle_entrega_prod.cep_quantidade) AS cep_quantidade, controle_entrega_prod.cen_codigo_pre, MAX(controle_entrega_prod.cep_quantidade_entregue) AS cep_quantidade_entregue, MAX(controle_entrega_prod.cep_quantidade_separadaRet) AS cep_quantidade_separadaRet, MAX(controle_entrega_prod.cep_quantidade_entregueRET) AS cep_quantidade_entregueRET, MAX(controle_entrega_prod.cep_quantidade_separada) AS cep_quantidade_separada, pedido_luminaria_det.pld_ambiente AS ambiente FROM pedido_luminaria_det WITH (NOLOCK) INNER JOIN controle_entrega_prod WITH (NOLOCK) ON pedido_luminaria_det.Pro_codnosso = controle_entrega_prod.Pro_codnosso AND pedido_luminaria_det.pld_acabamento = controle_entrega_prod.cep_acabamento AND pedido_luminaria_det.pld_ambiente = controle_entrega_prod.CodAmbiente INNER JOIN produtos ON dbo.pedido_luminaria_det.Pro_codnosso = produtos.Pro_codnosso GROUP BY pedido_luminaria_det.ped_codigo_pre, pedido_luminaria_det.Pro_codnosso, produtos.Pro_descricao, pedido_luminaria_det.pld_acabamento, controle_entrega_prod.cen_codigo_pre, pedido_luminaria_det.pld_ambiente HAVING (pedido_luminaria_det.ped_codigo_pre =:Pped_codigo_pre1) AND (controle_entrega_prod.cen_codigo_pre =:Pcen_codigo_pre1) union all SELECT 'MATERIAIS' AS tipo, pedido_materiais_det.ped_codigo_pre, pedido_materiais_det.Pro_codnosso AS codnosso, produtos.Pro_descricao AS produto, pedido_materiais_det.pma_acabamento AS acabamento, SUM(pedido_materiais_det.pma_quantidade) AS quantidade, MAX(controle_entrega_prod_1.cep_quantidade) AS cep_quantidade, controle_entrega_prod_1.cen_codigo_pre, MAX(controle_entrega_prod_1.cep_quantidade_entregue) AS cep_quantidade_entregue, MAX(controle_entrega_prod_1.cep_quantidade_separadaRet) AS cep_quantidade_separadaRet, MAX(controle_entrega_prod_1.cep_quantidade_entregueRET) AS cep_quantidade_entregueRET, MAX(controle_entrega_prod_1.cep_quantidade_separada) AS cep_quantidade_separada, dbo.pedido_materiais_det.pma_ambiente AS ambiente FROM pedido_materiais_det WITH (NOLOCK) INNER JOIN controle_entrega_prod AS controle_entrega_prod_1 WITH (NOLOCK) ON pedido_materiais_det.Pro_codnosso = controle_entrega_prod_1.Pro_codnosso AND pedido_materiais_det.pma_acabamento = controle_entrega_prod_1.cep_acabamento AND pedido_materiais_det.pma_ambiente = controle_entrega_prod_1.CodAmbiente INNER JOIN produtos ON pedido_materiais_det.Pro_codnosso = produtos.Pro_codnosso GROUP BY pedido_materiais_det.ped_codigo_pre, pedido_materiais_det.Pro_codnosso, produtos.Pro_descricao, pedido_materiais_det.pma_acabamento, controle_entrega_prod_1.cen_codigo_pre, pedido_materiais_det.pma_ambiente HAVING (pedido_materiais_det.ped_codigo_pre =:Pped_codigo_pre2) AND (controle_entrega_prod_1.cen_codigo_pre =:Pcen_codigo_pre2)
select * from controle_entrega_data where codambiente=:Pcodambiente and cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1000 and Ced_CodMovAlt=:PCed_CodMovAlt
select * from controle_entrega_data where codambiente=:Pcodambiente and cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1000 and Ced_CodMovAlt=:PCed_CodMovAlt and cep_tipo='S'
select * from controle_entrega_data where codambiente=:Pcodambiente and cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1000 and Ced_CodMovAlt=:PCed_CodMovAlt and cep_tipo='E'
select * from controle_entrega_data where codambiente=:Pcodambiente and cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1001 and Ced_CodMovAlt=:PCed_CodMovAlt AND cep_tipo ='S'
select * from controle_entrega_data where codambiente=:Pcodambiente and cen_codigo_pre=:Pcen_codigo_pre and  Pro_codnosso=:pPro_codnosso and cep_acabamento=:Pcep_acabamento  AND mod_codigo = 1001 and Ced_CodMovAlt=:PCed_CodMovAlt and cep_tipo='E'
SELECT (select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data  WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='S' AND cep_operacao='R' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento and codambiente = controle_entrega_prod.codambiente ) as QtdSepRet, (select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end  from controle_entrega_data  WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='S' AND cep_operacao='R' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento and codambiente = controle_entrega_prod.codambiente) as QtdEtgRet, ((select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='S' AND cep_operacao='E' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento and codambiente = controle_entrega_prod.codambiente )  -  (select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data  WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='S' AND cep_operacao='R' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento and codambiente = controle_entrega_prod.codambiente) )as CalcSep, ((select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='E' AND cep_operacao='E' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento and codambiente = controle_entrega_prod.codambiente)  - (select case when  sum(ced_quantidade) > 0 then sum(ced_quantidade) else 0 end from controle_entrega_data  WITH (NOLOCK) where cen_codigo_pre=controle_entrega_prod.cen_codigo_pre and cep_tipo='E' AND cep_operacao='R' and Pro_codnosso=controle_entrega_prod.Pro_codnosso and cep_acabamento = controle_entrega_prod.cep_acabamento and codambiente = controle_entrega_prod.codambiente) )as CalcEnt from controle_entrega_prod WITH (NOLOCK) where cen_codigo_pre =:Pcen_codigo_pre AND Pro_codnosso=:PPro_codnosso AND cep_acabamento=:Pcep_acabamento AND codambiente=:Pcodambiente
select * from controle_entrega_prod where cen_codigo_pre =:Pcen_codigo_pre AND Pro_codnosso=:PPro_codnosso AND cep_acabamento=:Pcep_acabamento AND codambiente=:Pcodambiente
SELECT 'L' AS tipo, pedido_luminaria_det.Pro_codnosso AS codnosso, pedido_luminaria_det.pld_acabamento AS acabamento, SUM(pedido_luminaria_det.pld_quantidade) AS quantidade, pedido_luminaria_det.pld_ambiente AS ambiente FROM Controle_entrega WITH (NOLOCK) INNER JOIN pedido_luminaria_det WITH (NOLOCK) INNER JOIN pedido WITH (NOLOCK) ON pedido_luminaria_det.ped_codigo_pre = pedido.ped_codigo_pre ON Controle_entrega.cen_pedido_avulso = pedido.ped_codigo LEFT OUTER JOIN controle_entrega_prod WITH (NOLOCK) ON pedido_luminaria_det.pld_ambiente = controle_entrega_prod.CodAmbiente AND pedido_luminaria_det.Pro_codnosso = controle_entrega_prod.Pro_codnosso AND pedido_luminaria_det.pld_acabamento = controle_entrega_prod.cep_acabamento AND Controle_entrega.cen_codigo_pre = controle_entrega_prod.cen_codigo_pre WHERE (controle_entrega_prod.cen_codigo_pre IS NULL) AND (Controle_entrega.cen_tipo = 'P') AND (pedido_luminaria_det.ped_codigo_pre =:pped_codigo_pre1) GROUP BY pedido_luminaria_det.Pro_codnosso, pedido_luminaria_det.pld_acabamento, pedido_luminaria_det.pld_ambiente union all SELECT 'M' AS tipo, pedido_materiais_det.Pro_codnosso AS codnosso, pedido_materiais_det.pma_acabamento AS acabamento, SUM(pedido_materiais_det.pma_quantidade) AS quantidade, pedido_materiais_det.pma_ambiente AS ambiente FROM Controle_entrega WITH (NOLOCK) INNER JOIN pedido_materiais_det WITH (NOLOCK) INNER JOIN pedido WITH (NOLOCK) ON pedido_materiais_det.ped_codigo_pre = pedido.ped_codigo_pre ON Controle_entrega.cen_pedido_avulso = pedido.ped_codigo LEFT OUTER JOIN controle_entrega_prod WITH (NOLOCK) ON pedido_materiais_det.pma_ambiente = controle_entrega_prod.CodAmbiente AND pedido_materiais_det.Pro_codnosso = controle_entrega_prod.Pro_codnosso AND pedido_materiais_det.pma_acabamento = controle_entrega_prod.cep_acabamento AND Controle_entrega.cen_codigo_pre = controle_entrega_prod.cen_codigo_pre WHERE (controle_entrega_prod.cen_codigo_pre IS NULL) AND (Controle_entrega.cen_tipo = 'P') AND (pedido_materiais_det.ped_codigo_pre =:pped_codigo_pre2) GROUP BY pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_acabamento, pedido_materiais_det.pma_ambiente
SELECT controle_entrega_prod.Pro_codnosso, controle_entrega_prod.cep_acabamento, controle_entrega_prod.CodAmbiente AS ambiente FROM Controle_entrega WITH (NOLOCK) INNER JOIN controle_entrega_prod WITH (NOLOCK) ON Controle_entrega.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre LEFT OUTER JOIN pedido_luminaria_det WITH (NOLOCK) INNER JOIN pedido WITH (NOLOCK) ON pedido_luminaria_det.ped_codigo_pre = dbo.pedido.ped_codigo_pre ON controle_entrega_prod.CodAmbiente = pedido_luminaria_det.pld_ambiente AND Controle_entrega.cen_pedido_avulso = pedido.ped_codigo AND controle_entrega_prod.Pro_codnosso = pedido_luminaria_det.Pro_codnosso AND controle_entrega_prod.cep_acabamento = pedido_luminaria_det.pld_acabamento wHERE (controle_entrega_prod.cen_codigo_pre =:Pcen_codigo_pre1) AND (controle_entrega_prod.cep_tipo = 'L') AND (pedido_luminaria_det.Pro_codnosso IS NULL) GROUP BY controle_entrega_prod.cen_codigo_pre, controle_entrega_prod.Pro_codnosso, controle_entrega_prod.cep_acabamento, controle_entrega_prod.CodAmbiente union all SELECT controle_entrega_prod.Pro_codnosso, controle_entrega_prod.cep_acabamento, controle_entrega_prod.CodAmbiente AS ambiente FROM Controle_entrega WITH (NOLOCK) INNER JOIN controle_entrega_prod WITH (NOLOCK) ON Controle_entrega.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre LEFT OUTER JOIN pedido_materiais_det WITH (NOLOCK) INNER JOIN pedido WITH (NOLOCK) ON pedido_materiais_det.ped_codigo_pre = pedido.ped_codigo_pre ON controle_entrega_prod.CodAmbiente = pedido_materiais_det.pma_ambiente AND Controle_entrega.cen_pedido_avulso = pedido.ped_codigo AND controle_entrega_prod.Pro_codnosso = pedido_materiais_det.Pro_codnosso AND Controle_entrega_prod.cep_acabamento = pedido_materiais_det.pma_acabamento WHERE  (controle_entrega_prod.cen_codigo_pre =:pcen_codigo_pre2) AND (controle_entrega_prod.cep_tipo = 'M') AND (pedido_materiais_det.Pro_codnosso IS NULL) GROUP BY controle_entrega_prod.cen_codigo_pre, controle_entrega_prod.Pro_codnosso, controle_entrega_prod.cep_acabamento, controle_entrega_prod.CodAmbiente
SELECT  cen_codigo_pre, Pro_codnosso, cep_acabamento, codambiente  FROM controle_entrega_prod WHERE (cen_codigo_pre =:Pcen_codigo_pre) AND cep_quantidade<=0
SELECT RateioDet.RateioDet_Porcentagem, RateioDet.CatRem_Codigo, Funcionario.Fun_CPF,Funcionario.Cdc_codigo,
select * from ControleRH where Fun_Codigo=:PFun_Codigo AND Rateio_Codigo=:PRateio_Codigo
SELECT FechComis_Situacao from FechamentoComissao where FechComis_ContaUnica=:PFechComis_ContaUnica
SELECT Funcionario.Cdc_codigo,Funcionario.Fun_Nome, Funcionario.Fun_CPF, ComissaoPremiacao.*
SELECT * from ComissaoPremiacao where ComPre_codigo=:PComPre_codigo
SELECT (SELECT SUM(DevolucaoProduto.DevPro_VlItem * CASE WHEN FornecedorGrupProd.ForGruProd_Porc IS NULL THEN 0 ELSE (dbo.FornecedorGrupProd.ForGruProd_Porc / 100) END) AS Totalm FROM DevolucaoProduto INNER JOIN produtos ON DevolucaoProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN fornecedor ON produtos.For_codigo = fornecedor.For_codigo LEFT OUTER JOIN FornecedorGrupProd ON fornecedor.For_codigo = FornecedorGrupProd.for_codigo AND produtos.GrupoProduto_codigo = FornecedorGrupProd.GrupoProduto_Codigo WHERE (DevolucaoProduto.Dev_CodigoPre = devolucao.Dev_Codigopre)) AS Totalproduto, venda.Ven_DescGanhoVenda AS Descluminaria, venda.ven_codigopre as precodigo FROM Devolucao INNER JOIN venda ON Devolucao.ven_codigopre = venda.ven_codigopre WHERE (Devolucao.dev_codigo =:Pcodigo) AND devolucao.dev_situacao = 1
SELECT (SELECT SUM(VendaProduto.VenPro_Quantidade * VendaProduto.VenPro_VlUnitario * CASE WHEN FornecedorGrupProd.ForGruProd_Porc  IS NULL THEN 0 ELSE (FornecedorGrupProd.ForGruProd_Porc / 100) END) AS TotalM FROM VendaProduto INNER JOIN produtos ON VendaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN fornecedor ON produtos.For_codigo = fornecedor.For_codigo LEFT OUTER JOIN FornecedorGrupProd ON dbo.fornecedor.For_codigo = dbo.FornecedorGrupProd.for_codigo AND produtos.GrupoProduto_codigo = dbo.FornecedorGrupProd.GrupoProduto_Codigo WHERE  (VendaProduto.ven_codigopre = venda.ven_codigopre)) AS Totalproduto, venda.Ven_DescGanhoVenda AS Descluminaria, venda.ven_codigopre as precodigo FROM VENDA WHERE venda.ven_codigo =:Pcodigo AND venda.ven_situacao ='A' and venda.ven_tipo ='P' and venda.ParSV_serie =:pParSV_serie
SELECT (SELECT SUM(dbo.FacturaProduto.FactProd_Vltotal * CASE WHEN FornecedorGrupProd.ForGruProd_Porc IS NULL THEN 0 ELSE (dbo.FornecedorGrupProd.ForGruProd_Porc / 100) END) AS TotalM FROM FacturaProduto INNER JOIN produtos ON FacturaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN fornecedor ON produtos.For_codigo = Fornecedor.For_codigo LEFT OUTER JOIN FacturaImport ON FacturaProduto.Fact_Tipo = FacturaImport.Fact_Tipo AND FacturaProduto.Fact_Codigo = FacturaImport.Fact_Codigo LEFT OUTER JOIN FornecedorGrupProd ON fornecedor.For_codigo = FornecedorGrupProd.for_codigo AND produtos.GrupoProduto_codigo = FornecedorGrupProd.GrupoProduto_Codigo WHERE (FacturaProduto.Fact_Codigo = Factura.Fact_Codigo) AND (FacturaProduto.Fact_Tipo = Factura.Fact_Tipo) AND (FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR FacturaImport.FactImp_TipoImportado IS NULL)) AS total, Fact_PorcDesconto,Fact_VlTotDesconto,Fact_VlDesconto,Fact_SubTotal  FROM Factura WHERE Factura.Fact_Codigo=:Pcodigo AND Factura.Fact_situacao='A'
SELECT (SELECT SUM(DevolucaoProduto.DevPro_VlItem * CASE WHEN ComissaoPremiacaoGrup.GrupoProduto_Codigo IS NULL  THEN 1 ELSE (ComissaoPremiacaoGrup.ComPreGrup_Porcentegem/ 100) END) AS TotalM FROM DevolucaoProduto INNER JOIN produtos ON DevolucaoProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ComissaoPremiacaoGrup ON produtos.GrupoProduto_codigo = ComissaoPremiacaoGrup.GrupoProduto_Codigo WHERE (DevolucaoProduto.dev_codigopre = devolucao.dev_codigopre AND ComissaoPremiacaoGrup.ComPre_codigo=
SELECT (SELECT SUM(dbo.FacturaProduto.FactProd_Vltotal * CASE WHEN ComissaoPremiacaoGrup.ComPreGrup_Porcentegem IS NULL THEN 1 ELSE (ComissaoPremiacaoGrup.ComPreGrup_Porcentegem / 100) END) AS Total FROM FacturaProduto INNER JOIN produtos ON FacturaProduto.Pro_codnosso = produtos.Pro_codnosso INNER JOIN ComissaoPremiacaoGrup ON produtos.GrupoProduto_codigo = ComissaoPremiacaoGrup.GrupoProduto_Codigo LEFT OUTER JOIN FacturaImport ON FacturaProduto.Fact_Tipo = FacturaImport.Fact_Tipo AND FacturaProduto.Fact_Codigo = FacturaImport.Fact_Codigo WHERE (FacturaProduto.Fact_Codigo = Factura.Fact_Codigo) AND (FacturaProduto.Fact_Tipo = Factura.Fact_Tipo) AND (FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR FacturaImport.FactImp_TipoImportado IS NULL) AND ComissaoPremiacaoGrup.ComPre_codigo=:PComPre_codigo) AS total, Factura.Fact_PorcDesconto ,Factura.Fact_VlTotDesconto,Factura.Fact_VlDesconto,Factura.Fact_SubTotal FROM Factura WHERE Factura.Fact_Codigo=:Pcodigo AND Factura.Fact_situacao='A'
SELECT (SELECT SUM(DevolucaoProduto.DevPro_VlItem) AS TotalM FROM DevolucaoProduto INNER JOIN produtos AS produtos1 ON DevolucaoProduto.Pro_codnosso = produtos1.Pro_codnosso WHERE (DevolucaoProduto.dev_codigopre = devolucao.dev_codigopre)) AS Totalproduto,venda.Ven_DescGanhoVenda AS Descluminaria, venda.ven_codigopre as precodigo ,(SELECT SUM(DevolucaoServico.DevSer_vlitem) AS TotalS FROM DevolucaoServico INNER JOIN Servicos ON DevolucaoServico.Sev_cod = Servicos.sev_cod WHERE DevolucaoServico.dev_codigopre = devolucao.dev_codigopre
SELECT (SELECT SUM(VendaProduto.VenPro_Quantidade * VendaProduto.VenPro_VlUnitario) AS TotalM FROM VendaProduto INNER JOIN produtos AS produtos1 ON VendaProduto.Pro_codnosso = produtos1.Pro_codnosso WHERE  (VendaProduto.ven_codigopre = venda.ven_codigopre)) AS Totalproduto, venda.Ven_DescGanhoVenda AS Descluminaria, venda.ven_codigopre as precodigo,  (SELECT SUM(VendaServico.VenSer_quantidade * VendaServico.VenSer_vlunitario) AS TotalM FROM  VendaServico INNER JOIN Servicos ON VendaServico.Sev_cod = Servicos.sev_cod WHERE  (VendaServico.ven_codigopre = venda.ven_codigopre)
SELECT (SELECT SUM(dbo.FacturaProduto.FactProd_Vltotal) AS TotalM FROM FacturaProduto INNER JOIN produtos ON FacturaProduto.Pro_codnosso = produtos.Pro_codnosso LEFT OUTER JOIN FacturaImport ON FacturaProduto.Fact_Tipo = FacturaImport.Fact_Tipo AND FacturaProduto.Fact_Codigo = FacturaImport.Fact_Codigo WHERE (FacturaProduto.Fact_Codigo = Factura.Fact_Codigo) AND (FacturaProduto.Fact_Tipo = Factura.Fact_Tipo) AND (FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR FacturaImport.FactImp_TipoImportado IS NULL)) AS total, Factura.Fact_PorcDesconto,Fact_VlTotDesconto,Fact_VlDesconto,Fact_SubTotal FROM Factura WHERE Factura.Fact_Codigo=:Pcodigo AND Factura.Fact_situacao='A'
select CatRem_Codigo from ComissaoPremiacaoVlVCatRem where ComPre_codigo =:PComPre_codigo
select ComPreVlV_Porcentagem from ComissaoPremiacaoVlVenda where ComPre_codigo =:PComPre_codigo and ComPreVlV_VlInicial <=:PValor1  and  ComPreVlV_VlFinal >=:PValor2
SELECT * from ComissaoPremiacaoCond where ComPre_codigo=:PComPre_codigo order by ComPreCond_PorcCom DESC
SELECT * from ComissaoPremiacaoCond where ComPre_codigo=:PComPre_codigo order by ComPreCond_PorcCom
SELECT ped_codigo from Ent_devolucao where edv_codigo=:Pcodigo
SELECT ped_codigo from Saida_complementacao where Scp_codigo=:Pcodigo
SELECT contas_Receber_det.Ctr_situacao AS SITUACAO, contas_Receber_det.ctr_codigo_det AS contadetalhe, contas_Receber_det.Ctr_dt_vencimento AS data, contas_receber.Ctr_codigo AS conta,
SELECT contas_Receber_det.Ctr_situacao AS SITUACAO, contas_Receber_det.ctr_codigo_det as contadetalhe, contas_Receber_det.Ctr_dt_vencimento as data,
SELECT COUNT(*) AS total FROM contas_receber AS contas_receber1 INNER JOIN
select * from ControleRH where Fun_Codigo=:PFun_Codigo
SELECT top 1 Crp_data_pagamento FROM Contas_receber_pag where ctr_codigo_det=:Pctr_codigo_det
SELECT Venda.Ven_codigo, Venda.ParSV_serie FROM Devolucao INNER JOIN
SELECT contas_Receber_det.ctr_codigo_det as contadetalhe, contas_Receber_det.Ctr_dt_vencimento as data,dbo.contas_receber.Ctr_codigo as conta, contas_Receber_det.Ctr_situacao as situacao  FROM contas_receber INNER JOIN contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo WHERE contas_receber.Ctr_cod_documento=:PCtr_cod_documento  and contas_receber.Tpd_codigo=:PTpd_codigo and contas_receber.ParSV_serie=:pParSV_serie  order by contas_Receber_det.ctr_codigo_det
SELECT COUNT(*) AS total FROM contas_receber AS contas_receber1 INNER JOIN contas_Receber_det AS contas_Receber_det1 ON contas_receber1.Ctr_codigo = contas_Receber_det1.Ctr_codigo WHERE (contas_receber1.Ctr_codigo =:pCtr_codigo) and (contas_Receber_det1.Ctr_situacao IS NULL OR  contas_Receber_det1.Ctr_situacao = 'N')
SELECT Funcionario.Fun_Nome, Funcionario.Fun_CPF, MetaVenda.MetaVenda_descricao, MetaVenda.MetaVenda_Codigo, MetaVenda.MetaVenda_valor, MetaVendaDet.MetaVendaDet_Valor, MetaVendaDet.CatRem_Codigo,venda.ven_codigo  , (SELECT   round( SUM((VendaProduto.VenPro_VlItem - CASE WHEN Vendap.Ven_DescontoPorcProd IS NULL OR (VendaProduto.VenPro_VlDescontoProc > 0) THEN 0 ELSE round((VendaProduto.VenPro_VlItem * Vendap.Ven_DescontoPorcProd) / 100,4) END) * (val.VenAten_Porcentagem / 100)),2) AS TOTAL_LUM  FROM VendaProduto  INNER JOIN produtos AS produtosl ON VendaProduto.Pro_codnosso = produtosl.Pro_codnosso INNER JOIN venda AS vendap ON VendaProduto.ven_codigopre = vendap.ven_codigopre INNER JOIN VendaAtendente AS val ON vendap.ven_codigopre = val.VenAten_NDocPre WHERE vendap.ven_situacao='A' AND (val.VenAten_TpDoc = 'PRO') AND vendap.ven_tipo='P' AND (vendap.ven_dataemissao = VendaAtendente.VenAten_DtVigencia) AND (vendap.ven_codigopre = venda.ven_codigopre) AND (val.fun_codigo=VendaAtendente.fun_codigo ) and   (produtosl.GrupoProduto_codigo IN (SELECT     GrupoProduto_Codigo   FROM MetaVendaGrupProd AS MetaVendaGrupProdl WHERE  MetaVendaGrupProdl.metavenda_codigo = metavenda.metavenda_codigo))) as total_lum FROM   venda INNER JOIN   dbo.VendaAtendente ON venda.ven_codigopre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF CROSS JOIN dbo.MetaVenda INNER JOIN  dbo.MetaVendaDet ON dbo.MetaVenda.MetaVenda_Codigo = dbo.MetaVendaDet.MetaVenda_Codigo WHERE (Funcionario.Fun_GrupoComissao = MetaVendaDet.CatRem_Codigo OR Funcionario.Fun_GrupoPremiacao = dbo.MetaVendaDet.CatRem_Codigo) and (MetaVenda.MetaVenda_Situacao = 'A') and (MetaVenda.MetaVenda_Tipo = 'F') and (MetaVendaDet.MetaVendaDet_dataV <= venda.ven_dataemissao) and (MetaVendaDet.MetaVendaDet_dataVfim >= venda.ven_dataemissao) AND (venda.ven_situacao = 'A') and venda.ven_tipo = 'P'  and venda.ven_dataemissao >=:DataIni AND venda.ven_dataemissao <=:DataFim AND (VendaAtendente.VenAten_DtVigencia = venda.ven_dataemissao)  AND (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') and (Funcionario.Fun_CPF =:Pfun_codigo)  and venda.CatVen_Codigo in (select MetaVendaTpVenda.CatVen_Codigo from MetaVendaTpVenda where MetaVendaTpVenda.MetaVenda_Codigo = MetaVenda.MetaVenda_Codigo ) GROUP BY Funcionario.Fun_Nome, Funcionario.Fun_CPF, MetaVenda.MetaVenda_descricao, MetaVenda.MetaVenda_Codigo,  MetaVenda.MetaVenda_valor, MetaVendaDet.MetaVendaDet_Valor, MetaVendaDet.CatRem_Codigo,  VendaAtendente.VenAten_DtVigencia,venda.ven_codigo,VendaAtendente.fun_codigo, venda.ven_codigopre
SELECT     dbo.Funcionario.Fun_Nome,dbo.Funcionario.Fun_CPF, VendaAtendente.fun_codigo, dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo, dbo.MetaVenda.MetaVenda_valor, dbo.MetaVendaDet.MetaVendaDet_Valor, dbo.MetaVendaDet.CatRem_Codigo, dbo.Factura.Fact_Codigo,  (SELECT     round(SUM((FacturaProdutoFCT.FactProd_Vltotal - CASE WHEN FacturaFCT.Fact_PorcDesconto IS NULL  THEN 0 ELSE round((FacturaProdutoFCT.FactProd_Vltotal * FacturaFCT.Fact_PorcDesconto) / 100, 4) END) * (vam.VenAten_Porcentagem / 100)), 2) AS TotalFCT  FROM          FacturaProduto AS FacturaProdutoFCT INNER JOIN  produtos AS produtosFCT ON FacturaProdutoFCT.Pro_codnosso = produtosFCT.Pro_codnosso INNER JOIN    Factura AS FacturaFCT ON FacturaProdutoFCT.Fact_Codigo = FacturaFCT.Fact_codigo AND FacturaFCT.Fact_Tipo = 'FCT' INNER JOIN  VendaAtendente AS vam ON FacturaFCT.Fact_codigo = vam.VenAten_NDocPre AND vam.venAten_tpdoc = 'FCT'  WHERE      (FacturaProdutoFCT.Fact_Tipo = 'FCT') AND (FacturaFCT.Fact_DtEmissao = VendaAtendente.VenAten_DtVigencia) AND (FacturaFCT.Fact_codigo = Factura.Fact_Codigo) AND vam.fun_codigo=VendaAtendente.fun_codigo and(produtosFCT.GrupoProduto_codigo IN  (SELECT     GrupoProduto_Codigo   FROM          MetaVendaGrupProd AS MetaVendaGrupProdm  WHERE      MetaVendaGrupProdm.metavenda_codigo = metavenda.metavenda_codigo)))  AS totalFCT FROM         dbo.Factura INNER JOIN   dbo.VendaAtendente ON dbo.Factura.Fact_Codigo = dbo.VendaAtendente.VenAten_NDocPre AND    dbo.Factura.Fact_Tipo = dbo.VendaAtendente.VenAten_TpDoc AND dbo.Factura.Fact_DtEmissao = dbo.VendaAtendente.VenAten_DtVigencia INNER JOIN   dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF LEFT OUTER JOIN    dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo CROSS JOIN   dbo.MetaVenda INNER JOIN    dbo.MetaVendaDet ON dbo.MetaVenda.MetaVenda_Codigo = dbo.MetaVendaDet.MetaVenda_Codigo   WHERE     (dbo.Funcionario.Fun_GrupoComissao = dbo.MetaVendaDet.CatRem_Codigo or dbo.Funcionario.Fun_GrupoPremiacao = dbo.MetaVendaDet.CatRem_Codigo)  AND (dbo.MetaVenda.MetaVenda_Situacao = 'A') AND (dbo.MetaVenda.MetaVenda_Tipo = 'F') AND   (dbo.MetaVendaDet.MetaVendaDet_dataV <= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A') and (dbo.Factura.Fact_tipo= 'FCT') AND (dbo.Factura.Fact_DtEmissao BETWEEN   :DataIni AND :DataFim) AND (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR   dbo.FacturaImport.FactImp_TipoImportado IS NULL) and (dbo.Funcionario.Fun_CPF =:Pfun_codigo)  and Factura.CatVen_Codigo in (select MetaVendaTpVenda.CatVen_Codigo from MetaVendaTpVenda where MetaVendaTpVenda.MetaVenda_Codigo = MetaVenda.MetaVenda_Codigo )GROUP BY dbo.Funcionario.Fun_Nome,dbo.Funcionario.Fun_CPF, VendaAtendente.fun_codigo, dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo,  dbo.MetaVenda.MetaVenda_valor, dbo.MetaVendaDet.MetaVendaDet_Valor, dbo.MetaVendaDet.CatRem_Codigo, dbo.Factura.Fact_Codigo,  dbo.VendaAtendente.VenAten_DtVigencia
SELECT     dbo.Funcionario.Fun_Nome,dbo.Funcionario.Fun_CPF, VendaAtendente.fun_codigo, dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo, dbo.MetaVenda.MetaVenda_valor, dbo.MetaVendaDet.MetaVendaDet_Valor, dbo.MetaVendaDet.CatRem_Codigo, dbo.Factura.Fact_Codigo,  (SELECT     round(SUM((FacturaProdutoVDI.FactProd_Vltotal - CASE WHEN FacturaVDI.Fact_PorcDesconto IS NULL  THEN 0 ELSE round((FacturaProdutoVDI.FactProd_Vltotal * FacturaVDI.Fact_PorcDesconto) / 100, 4) END)  * (val.VenAten_Porcentagem / 100)), 2) AS TotalVDI  FROM          FacturaProduto AS FacturaProdutoVDI INNER JOIN   produtos AS produtosl ON FacturaProdutoVDI.Pro_codnosso = produtosl.Pro_codnosso INNER JOIN  Factura AS FacturaVDI ON FacturaProdutoVDI.Fact_codigo = FacturaVDI.Fact_codigo AND FacturaVDI.Fact_Tipo = 'VDI' INNER JOIN  VendaAtendente AS val ON FacturaVDI.Fact_codigo = val.VenAten_NDocPre AND val.venAten_tpdoc = 'VDI'  WHERE      (FacturaProdutoVDI.Fact_tipo = 'VDI') AND (FacturaVDI.Fact_DtEmissao = VendaAtendente.VenAten_DtVigencia) AND   (FacturaVDI.Fact_codigo = FacturaVDI.Fact_Codigo) AND val.fun_codigo=VendaAtendente.fun_codigo and(produtosl.GrupoProduto_codigo IN   (SELECT     GrupoProduto_Codigo    FROM          MetaVendaGrupProd AS MetaVendaGrupProdl   WHERE      MetaVendaGrupProdl.metavenda_codigo = metavenda.metavenda_codigo))) AS TotalVDI  FROM         dbo.Factura INNER JOIN  dbo.VendaAtendente ON dbo.Factura.Fact_Codigo = dbo.VendaAtendente.VenAten_NDocPre AND    dbo.Factura.Fact_Tipo = dbo.VendaAtendente.VenAten_TpDoc AND dbo.Factura.Fact_DtEmissao = dbo.VendaAtendente.VenAten_DtVigencia INNER JOIN   dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF LEFT OUTER JOIN    dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo CROSS JOIN   dbo.MetaVenda INNER JOIN    dbo.MetaVendaDet ON dbo.MetaVenda.MetaVenda_Codigo = dbo.MetaVendaDet.MetaVenda_Codigo   WHERE     (dbo.Funcionario.Fun_GrupoComissao = dbo.MetaVendaDet.CatRem_Codigo or dbo.Funcionario.Fun_GrupoPremiacao = dbo.MetaVendaDet.CatRem_Codigo)  AND (dbo.MetaVenda.MetaVenda_Situacao = 'A') AND (dbo.MetaVenda.MetaVenda_Tipo = 'F') AND   (dbo.MetaVendaDet.MetaVendaDet_dataV <= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A') and (dbo.Factura.Fact_tipo= 'VDI') AND (dbo.Factura.Fact_DtEmissao BETWEEN   :DataIni AND :DataFim) AND (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR   dbo.FacturaImport.FactImp_TipoImportado IS NULL) and (dbo.Funcionario.Fun_CPF =:Pfun_codigo) and factura.CatVen_Codigo in (select MetaVendaTpVenda.CatVen_Codigo from MetaVendaTpVenda where MetaVendaTpVenda.MetaVenda_Codigo = MetaVenda.MetaVenda_Codigo )GROUP BY dbo.Funcionario.Fun_Nome,dbo.Funcionario.Fun_CPF, VendaAtendente.fun_codigo, dbo.MetaVenda.MetaVenda_descricao, dbo.MetaVenda.MetaVenda_Codigo,  dbo.MetaVenda.MetaVenda_valor, dbo.MetaVendaDet.MetaVendaDet_Valor, dbo.MetaVendaDet.CatRem_Codigo, dbo.Factura.Fact_Codigo,  dbo.VendaAtendente.VenAten_DtVigencia
SELECT max(casT(Ctp_cod_documento as float)) as maximo from contas_apagar where Tpd_codigo=1008
SELECT contas_apagar.Ctp_codigo as conta frOM contas_apagar INNER JOIN
select FechComis_Codigo from FechamentoComissao
select Fun_Nome from Funcionario where Fun_CPF =
select FechComis_Codigo from FechamentoComissaoConta where FechComis_Codigo =:pFechComis_Codigo  and FechComisCt_ContaUnica =:pFechComisCt_ContaUnica and emp_codigo=:pemp_codigo
select FechComis_Codigo from FechamentoComissaoConta where FechComis_Codigo =:pFechComis_Codigo  and FechComisCt_ContaUnica =:pFechComisCt_ContaUnica and emp_codigo=:pemp_codigo and fun_codigo=:pfun_codigo
SELECT SUM(ControleRH.CtrlRH_Valor) AS Valor
SELECT COUNT(ControleRH.CtrlRH_Valor) AS Valor
select ven_Codigopre as codigo from venda where ven_codigo=:Pcodigo and ParSV_serie=:pParSV_serie
select avu_Codigo_pre as codigo from avulso where avu_codigo=:Pcodigo
SELECT Venda.Ven_CodigoPre as codigo FROM Venda INNER JOIN
SELECT pedido.ped_codigo_pre as codigo FROM Saida_complementacao INNER JOIN pedido
select * from controleRH where CtrlRH_CodDocOri=:PCtrlRH_CodDocOri and CtrlRH_TpDocOri=:PCtrlRH_TpDocOri
SELECT sum(ControleRH1.CtrlRH_valor) as valor
SELECT contas_apagar_det.Ctp_dt_vencimento, contas_apagar.Ctp_codigo FROM contas_apagar INNER JOIN
SELECT FechComis_codigo from FechamentoComissao  where FechComis_dataInicial<=:PdataI AND FechComis_dataFinal >=:PDataF and FechComis_Situacao ='A'
SELECT Funcionario_1.Fun_CPF FROM funcionario LEFT OUTER JOIN Funcionario AS Funcionario_1 ON Funcionario.Fun_GrupoPremiacao = Funcionario_1.Fun_GrupoComissao OR Funcionario.Fun_GrupoComissao = Funcionario_1.Fun_GrupoPremiacao OR Funcionario.Fun_GrupoComissao = Funcionario_1.Fun_GrupoComissao OR Funcionario.Fun_GrupoPremiacao = Funcionario_1.Fun_GrupoPremiacao WHERE (NOT Funcionario.Fun_GrupoComissao IS NULL or NOT Funcionario.Fun_GrupoPremiacao IS NULL) AND Funcionario.Fun_CPF in (SELECT  Fun_Codigo FROM VendaAtendente WHERE VenAten_TpDoc =:pVenAten_TpDoc AND VenAten_NDocPre =:PVenAten_NDocPre)
SELECT Funcionario_1.Fun_CPF FROM funcionario LEFT OUTER JOIN Funcionario AS Funcionario_1 ON Funcionario.Fun_GrupoPremiacao = Funcionario_1.Fun_GrupoComissao OR Funcionario.Fun_GrupoComissao = Funcionario_1.Fun_GrupoPremiacao OR Funcionario.Fun_GrupoComissao = Funcionario_1.Fun_GrupoComissao OR Funcionario.Fun_GrupoPremiacao = Funcionario_1.Fun_GrupoPremiacao WHERE (NOT Funcionario.Fun_GrupoComissao IS NULL or NOT Funcionario.Fun_GrupoPremiacao IS NULL) AND Funcionario.Fun_CPF in (
SELECT ControleRH.Fun_Codigo, venda.ven_codigo AS codigo, 'PRO' AS TIPO, venda.ven_dataemissao AS data, venda.Par_ComissaoVincParc, venda.CatVen_Codigo, case when Ven_formaPagHist is null then Ven_formaPag else Ven_formaPagHist end as formapag, VendaAtendente.VenAten_Porcentagem, VendaAtendente.VenAten_DtVigencia, venda.ParSV_serie as serie FROM ControleRH INNER JOIN venda ON ControleRH.CtrlRH_CodDocOri = venda.ven_codigo and ControleRH.ParSV_serie = venda.ParSV_serie  INNER JOIN VendaAtendente ON ControleRH.Fun_Codigo = VendaAtendente.Fun_Codigo AND venda.ven_codigopre = VendaAtendente.VenAten_NDocPre WHERE (ControleRH.CtrlRH_TpDocOri = 1001) AND (VendaAtendente.VenAten_TpDoc = 'PRO') and  ControleRH.FechComis_codigo=:PFechComis_codigo1 and ControleRH.fun_codigo in (
SELECT  ControleRH.Fun_Codigo,devolucao.dev_codigo AS codigo, 'EPD' AS TIPO, devolucao.Dev_Dtemissao AS data,
SELECT controleRH.Fun_Codigo, Factura.Fact_Codigo AS codigo, 'FCT' AS TIPO, Factura.Fact_DtEmissao AS data,
SELECT ControleRH.Fun_Codigo, Factura.Fact_Codigo AS codigo, 'VDI' AS TIPO, Factura.Fact_DtEmissao AS data,
SELECT FechComis_dataFinal from FechamentoComissao
select fun_codigo from VendaAtendente where VenAten_TpDoc=:PVenAten_TpDoc and VenAten_NDocPre=:PVenAten_NDocPre
select * from FechamentoComissao where FechComis_Situacao='A'
select * from FechamentoMeta where FechMeta_Situacao='A'
select (SELECT ROUND(SUM((VendaProduto.VenPro_VlItem - CASE WHEN (Vendap.Ven_DescontoPorcProd IS NULL) OR (VendaProduto.VenPro_VlDescontoProc > 0) THEN 0 ELSE round((VendaProduto.VenPro_VlItem * Vendap.Ven_DescontoPorcProd) / 100, 4) END)  * (val.VenAten_Porcentagem / 100)), 2) AS TOTAL_L  FROM VendaProduto INNER JOIN dbo.produtos AS produtosl ON VendaProduto.Pro_codnosso = produtosl.Pro_codnosso INNER JOIN dbo.venda AS vendap ON VendaProduto.ven_codigopre = VENDAP.ven_codigopre INNER JOIN dbo.VendaAtendente AS val ON vendap.ven_codigopre = val.VenAten_NDocPre WHERE  (vendap.ven_situacao = 'A') AND (val.VenAten_TpDoc = 'PRO') AND (VENDAp.ven_dataemissao = dbo.VendaAtendente.VenAten_DtVigencia) AND (vendap.ven_codigopre = venda.ven_codigopre) AND (val.Fun_Codigo = dbo.VendaAtendente.Fun_Codigo) AND (produtosl.GrupoProduto_codigo IN (SELECT GrupoProduto_Codigo FROM  dbo.ComissaoPremiacaoVlGruPro AS ComissaoPremiacaoVlGruProm WHERE (ComPre_codigo = ComissaoPremiacao.ComPre_codigo )))) AS total FROM dbo.venda INNER JOIN VendaAtendente ON venda.ven_codigopre = dbo.VendaAtendente.VenAten_NDocPre AND venda.ven_dataemissao = dbo.VendaAtendente.VenAten_DtVigencia INNER JOIN Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF INNER JOIN ComissaoPremiacao ON venda.ven_dataemissao >= dbo.ComissaoPremiacao.ComPre_DtVigInicial and venda.ven_dataemissao <= dbo.ComissaoPremiacao.ComPre_DtVigfinal WHERE (ComissaoPremiacao.ComPre_Situacao = 'A')  AND (venda.ven_situacao = 'A') and venda.ven_tipo ='P' AND (VENDA.ven_dataemissao >=:PDataIni) AND (VENDA.ven_dataemissao <=:PDataFim) AND (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.Funcionario.Fun_CPF in (
SELECT (SELECT     round(SUM((FacturaProdutoFCT.FactProd_Vltotal - CASE WHEN FacturaFCT.Fact_PorcDesconto IS NULL THEN 0 ELSE round((FacturaProdutoFCT.FactProd_Vltotal * FacturaFCT.Fact_PorcDesconto) / 100, 4) END) * (vam.VenAten_Porcentagem / 100)), 2) AS TotalFCT FROM  FacturaProduto AS FacturaProdutoFCT INNER JOIN produtos AS produtosFCT ON FacturaProdutoFCT.Pro_codnosso = produtosFCT.Pro_codnosso INNER JOIN Factura AS FacturaFCT ON FacturaProdutoFCT.Fact_Codigo = FacturaFCT.Fact_codigo AND FacturaFCT.Fact_Tipo = 'FCT' INNER JOIN vendaAtendente AS vam ON FacturaFCT.Fact_codigo = vam.VenAten_NDocPre AND vam.venAten_tpdoc = 'FCT' WHERE (FacturaProdutoFCT.Fact_Tipo = 'FCT') AND (FacturaFCT.Fact_DtEmissao = VendaAtendente.VenAten_DtVigencia) AND (FacturaFCT.Fact_codigo = Factura.Fact_Codigo) AND vam.fun_codigo=VendaAtendente.fun_codigo and(produtosFCT.GrupoProduto_codigo IN (SELECT	GrupoProduto_Codigo	FROM dbo.ComissaoPremiacaoVlGruPro AS ComissaoPremiacaoVlGruProm WHERE ComPre_codigo = ComissaoPremiacao.ComPre_codigo)))  AS totalFCT FROM dbo.Factura INNER JOIN dbo.VendaAtendente ON dbo.Factura.Fact_Codigo = dbo.VendaAtendente.VenAten_NDocPre AND dbo.Factura.Fact_Tipo = dbo.VendaAtendente.VenAten_TpDoc AND dbo.Factura.Fact_DtEmissao = dbo.VendaAtendente.VenAten_DtVigencia INNER JOIN dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF INNER JOIN dbo.ComissaoPremiacao ON dbo.Factura.Fact_DtEmissao >= dbo.ComissaoPremiacao.ComPre_DtVigInicial and Factura.Fact_DtEmissao <= dbo.ComissaoPremiacao.ComPre_DtVigfinal LEFT OUTER JOIN dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo WHERE  (ComissaoPremiacao.ComPre_Situacao = 'A') AND (ComissaoPremiacao.ComPre_codigo =:pComPre_codigo) AND (dbo.ComissaoPremiacao.ComPre_DtValidade >= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A') and (dbo.Factura.Fact_tipo= 'FCT') AND (dbo.Factura.Fact_DtEmissao BETWEEN :PDataIni AND :PDataFim) AND (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR  dbo.FacturaImport.FactImp_TipoImportado IS NULL) and (dbo.Funcionario.Fun_CPF in (
SELECT (SELECT     round(SUM((FacturaProdutoFCT.FactProd_Vltotal - CASE WHEN FacturaFCT.Fact_PorcDesconto IS NULL THEN 0 ELSE round((FacturaProdutoFCT.FactProd_Vltotal * FacturaFCT.Fact_PorcDesconto) / 100, 4) END) * (vam.VenAten_Porcentagem / 100)), 2) AS TotalFCT FROM  FacturaProduto AS FacturaProdutoFCT INNER JOIN produtos AS produtosFCT ON FacturaProdutoFCT.Pro_codnosso = produtosFCT.Pro_codnosso INNER JOIN Factura AS FacturaFCT ON FacturaProdutoFCT.Fact_Codigo = FacturaFCT.Fact_codigo AND FacturaFCT.Fact_Tipo = 'VDI' INNER JOIN vendaAtendente AS vam ON FacturaFCT.Fact_codigo = vam.VenAten_NDocPre AND vam.venAten_tpdoc = 'VDI' WHERE (FacturaProdutoFCT.Fact_Tipo = 'VDI') AND (FacturaFCT.Fact_DtEmissao = VendaAtendente.VenAten_DtVigencia) AND (FacturaFCT.Fact_codigo = Factura.Fact_Codigo) AND vam.fun_codigo=VendaAtendente.fun_codigo and(produtosFCT.GrupoProduto_codigo IN (SELECT	GrupoProduto_Codigo	FROM dbo.ComissaoPremiacaoVlGruPro AS ComissaoPremiacaoVlGruProm WHERE ComPre_codigo = ComissaoPremiacao.ComPre_codigo)))  AS totalVDI FROM dbo.Factura INNER JOIN dbo.VendaAtendente ON dbo.Factura.Fact_Codigo = dbo.VendaAtendente.VenAten_NDocPre AND dbo.Factura.Fact_Tipo = dbo.VendaAtendente.VenAten_TpDoc AND dbo.Factura.Fact_DtEmissao = dbo.VendaAtendente.VenAten_DtVigencia INNER JOIN dbo.Funcionario ON dbo.VendaAtendente.Fun_Codigo = dbo.Funcionario.Fun_CPF INNER JOIN dbo.ComissaoPremiacao ON dbo.Factura.Fact_DtEmissao >= dbo.ComissaoPremiacao.ComPre_DtVigInicial and Factura.Fact_DtEmissao <= dbo.ComissaoPremiacao.ComPre_DtVigfinal LEFT OUTER JOIN dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo WHERE   (ComissaoPremiacao.ComPre_Situacao = 'A') AND (ComissaoPremiacao.ComPre_codigo =:pComPre_codigo) AND (dbo.ComissaoPremiacao.ComPre_DtValidade >= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A') and (dbo.Factura.Fact_tipo= 'FCT') AND (dbo.Factura.Fact_DtEmissao BETWEEN :PDataIni AND :PDataFim) AND (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR  dbo.FacturaImport.FactImp_TipoImportado IS NULL) and (dbo.Funcionario.Fun_CPF in (
select (SELECT ROUND(SUM((VendaProduto.VenPro_VlItem - CASE WHEN Vendap.Ven_DescontoPorcProd IS NULL OR (VendaProduto.VenPro_VlDescontoProc > 0)	THEN 0 ELSE round((VendaProduto.VenPro_VlItem * Vendap.Ven_DescontoPorcProd) / 100, 4) END) 	), 2) AS TOTAL_M	FROM VendaProduto  INNER JOIN  dbo.produtos AS produtosm ON VendaProduto.Pro_codnosso = produtosm.Pro_codnosso INNER JOIN  venda AS vendap ON VendaProduto.ven_codigopre = vendap.ven_codigopre	WHERE (vendap.ven_situacao = 'A') AND	(vendap.ven_codigopre = venda.ven_codigopre) AND (produtosm.GrupoProduto_codigo IN	(SELECT GrupoProduto_Codigo	FROM dbo.ComissaoPremiacaoVlGruPro AS ComissaoPremiacaoVlGruProm WHERE (ComPre_codigo = ComissaoPremiacao.ComPre_codigo)))) as total  FROM venda INNER JOIN  dbo.ComissaoPremiacao ON venda.ven_dataemissao >= ComissaoPremiacao.ComPre_DtVigInicial and venda.ven_dataemissao <= ComissaoPremiacao.ComPre_DtVigfinal WHERE  (dbo.ComissaoPremiacao.ComPre_Situacao = 'A')  AND (venda.ven_situacao = 'A') AND (venda.ven_dataemissao >=:PdataIni) AND (venda.ven_dataemissao <=:PDataFim) and ComissaoPremiacao.ComPre_codigo =:PComPre_codigo AND (venda.CatVen_Codigo IN (SELECT  CatVen_Codigo	FROM ComissaoPremiacaoTpVenda WHERE (ComissaoPremiacaoTpVenda.ComPre_codigo = ComissaoPremiacao.ComPre_codigo)))
SELECT (SELECT round(SUM(FacturaProdutoFCT.FactProd_Vltotal - CASE WHEN FacturaFCT.Fact_PorcDesconto IS NULL THEN 0 ELSE round((FacturaProdutoFCT.FactProd_Vltotal * FacturaFCT.Fact_PorcDesconto) / 100, 4) END), 2) AS TotalFCT FROM dbo.FacturaProduto AS FacturaProdutoFCT INNER JOIN dbo.produtos AS produtosFCT ON FacturaProdutoFCT.Pro_codnosso = produtosFCT.Pro_codnosso INNER JOIN dbo.Factura AS FacturaFCT ON FacturaProdutoFCT.Fact_Codigo = FacturaFCT.Fact_Codigo AND FacturaFCT.Fact_Tipo = 'FCT' WHERE (FacturaProdutoFCT.Fact_Tipo = 'FCT') AND (FacturaFCT.Fact_codigo = Factura.Fact_Codigo) and(produtosFCT.GrupoProduto_codigo IN (SELECT	GrupoProduto_Codigo	FROM dbo.ComissaoPremiacaoVlGruPro AS ComissaoPremiacaoVlGruProm WHERE ComPre_codigo = ComissaoPremiacao.ComPre_codigo)))  AS totalFCT FROM dbo.Factura INNER JOIN dbo.ComissaoPremiacao ON Factura.Fact_DtEmissao >= dbo.ComissaoPremiacao.ComPre_DtVigInicial and Factura.Fact_DtEmissao <= dbo.ComissaoPremiacao.ComPre_DtVigfinal LEFT OUTER JOIN dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo WHERE (ComissaoPremiacao.ComPre_Situacao = 'A') AND (ComissaoPremiacao.ComPre_codigo =PComPre_codigo) AND (dbo.ComissaoPremiacao.ComPre_DtValidade >= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A') and (dbo.Factura.Fact_tipo= 'FCT') AND (dbo.Factura.Fact_DtEmissao BETWEEN  :pdataini AND :PdataFim) AND (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR    dbo.FacturaImport.FactImp_TipoImportado IS NULL) and Factura.CatVen_Codigo in (SELECT  CatVen_Codigo   FROM ComissaoPremiacaoTpVenda wHERE ComissaoPremiacaoTpVenda.ComPre_codigo = ComissaoPremiacao.ComPre_codigo)
SELECT (SELECT round(SUM(FacturaProdutoFCT.FactProd_Vltotal - CASE WHEN FacturaFCT.Fact_PorcDesconto IS NULL THEN 0 ELSE round((FacturaProdutoFCT.FactProd_Vltotal * FacturaFCT.Fact_PorcDesconto) / 100, 4) END), 2) AS TotalFCT FROM dbo.FacturaProduto AS FacturaProdutoFCT INNER JOIN dbo.produtos AS produtosFCT ON FacturaProdutoFCT.Pro_codnosso = produtosFCT.Pro_codnosso INNER JOIN dbo.Factura AS FacturaFCT ON FacturaProdutoFCT.Fact_Codigo = FacturaFCT.Fact_Codigo AND FacturaFCT.Fact_Tipo = 'VDI' WHERE (FacturaProdutoFCT.Fact_Tipo = 'VDI') AND (FacturaFCT.Fact_codigo = Factura.Fact_Codigo) and(produtosFCT.GrupoProduto_codigo IN (SELECT	GrupoProduto_Codigo	FROM dbo.ComissaoPremiacaoVlGruPro AS ComissaoPremiacaoVlGruProm WHERE ComPre_codigo = ComissaoPremiacao.ComPre_codigo)))  AS totalvdi FROM dbo.Factura INNER JOIN dbo.ComissaoPremiacao ON Factura.Fact_DtEmissao >= dbo.ComissaoPremiacao.ComPre_DtVigInicial and Factura.Fact_DtEmissao <= dbo.ComissaoPremiacao.ComPre_DtVigFinal LEFT OUTER JOIN dbo.FacturaImport ON dbo.Factura.Fact_Tipo = dbo.FacturaImport.Fact_Tipo AND dbo.Factura.Fact_Codigo = dbo.FacturaImport.Fact_Codigo WHERE (ComissaoPremiacao.ComPre_Situacao = 'A') AND (ComissaoPremiacao.ComPre_codigo =PComPre_codigo) AND (dbo.ComissaoPremiacao.ComPre_DtValidade >= dbo.Factura.Fact_DtEmissao) AND (dbo.Factura.Fact_Situacao = 'A') and (dbo.Factura.Fact_tipo= 'VDI') AND (dbo.Factura.Fact_DtEmissao BETWEEN  :pdataini AND :PdataFim) AND (dbo.FacturaImport.FactImp_TipoImportado NOT IN ('PRO', 'AVU', 'SPC', 'EPD') OR dbo.FacturaImport.FactImp_TipoImportado IS NULL) and Factura.CatVen_Codigo in (SELECT  CatVen_Codigo  FROM ComissaoPremiacaoTpVenda wHERE ComissaoPremiacaoTpVenda.ComPre_codigo = ComissaoPremiacao.ComPre_codigo)
SELECT Fun_CPF FROM Funcionario WHERE (Fun_GrupoComissao =:PFun_GrupoComissao) OR (Fun_GrupoPremiacao =:PFun_GrupoPremiacao)
SELECT Indicacoes.Ind_Nome,Indicacoes.Ind_codigo
SELECT IndDet_fax, IndDet_celular, IndDet_comercial
SELECT Ctr_codigo_det,Ctr_duplicata,Ctr_parcela,Ctr_duplicataImp from contas_Receber_det where Ctr_codigo=:PCtr_codigo and Ctr_duplicata is null order by Ctr_dt_vencimento
SELECT ctr_codigo_det, Ctr_recibo FROM Contas_receber_det  where Ctr_codigo=:PCtr_codigo and Ctr_recibo is null ORDER by Ctr_valor_vencimento
SELECT ctp_codigo_det, Ctp_recibo FROM Contas_apagar_det  where Ctp_codigo=:PCtp_codigo and Ctp_recibo is null ORDER by Ctp_valor_vencimento
SELECT Ctr_codigo,Ctr_recibo from contas_Receber where Ctr_codigo=:PCtr_codigo
select case when SisPerEsp_permissao = 'true' then 'true' else 'false' end as permissao from SisPermissaoEspecial where SisOpEsp_Codigo=:PSisOpEsp_Codigo
SELECT (SELECT CASE WHEN SUM(contas_Receber_det.Ctr_valor_vencimento) > 0 THEN SUM(contas_Receber_det.Ctr_valor_vencimento) ELSE 0 END AS SOMA1 FROM contas_receber INNER JOIN contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo WHERE (contas_receber.Ctr_vinculo =:PTpVinc1) AND (contas_receber.Ctr_codigo_vinculo =:PCodVinc1) AND ((contas_Receber_det.Ctr_situacao <> 'S') OR (contas_Receber_det.Ctr_situacao IS NULL))) -  (SELECT CASE WHEN SUM(contas_apagar_det.Ctp_valor_vencimento) > 0 THEN SUM(contas_apagar_det.Ctp_valor_vencimento) ELSE 0 END AS SOMA2 FROM contas_apagar INNER JOIN contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo WHERE (contas_apagar.Ctp_vinculo =:PTpVinc2) AND (contas_apagar.Ctp_codigo_vinculo =:PCodVinc2) AND ((contas_apagar_det.Ctp_situacao <> 'S') OR (contas_apagar_det.Ctp_situacao IS NULL))) AS soma
SELECT  Contas_apagar_pag.Cpp_data_pagamento AS data FROM  Contas_apagar_pag INNER JOIN FechamentoContas ON Contas_apagar_pag.cba_codigo = FechamentoContas.Cba_codigo AND FechamentoContas.FechContas_data >= Contas_apagar_pag.Cpp_data_pagamento INNER JOIN contas_apagar_det ON Contas_apagar_pag.ctp_codigo_det = Contas_apagar_det.ctp_codigo_det WHERE (contas_apagar_det.Ctp_situacao = 'S')  AND Contas_apagar_pag.Cpp_cod_pag =:codigo
SELECT Contas_apagar_pag.Cpp_data_pagamento AS data FROM  Contas_apagar_pag INNER JOIN FechamentoContas ON Contas_apagar_pag.cba_codigo = FechamentoContas.Cba_codigo AND FechamentoContas.FechContas_data >= Contas_apagar_pag.Cpp_data_pagamento INNER JOIN contas_apagar ON Contas_apagar_pag.Ctp_codigo = contas_apagar.Ctp_codigo INNER JOIN contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo AND Contas_apagar_pag.ctp_codigo_det = contas_apagar_det.ctp_codigo_det WHERE (contas_apagar_det.Ctp_situacao = 'S')   AND (contas_apagar.Ctp_codigo =:codigo)
SELECT Contas_receber_pag.Crp_data_pagamento AS data FROM Contas_receber_pag INNER JOIN FechamentoContas ON Contas_receber_pag.cba_codigo = FechamentoContas.Cba_codigo AND FechamentoContas.FechContas_data >= Contas_receber_pag.Crp_data_pagamento INNER JOIN contas_Receber_det ON Contas_receber_pag.ctr_codigo_det = contas_Receber_det.ctr_codigo_det WHERE (contas_Receber_det.Ctr_situacao = 'S')   AND   Contas_receber_pag.Crp_cod_pag =:codigo
SELECT Contas_receber_pag.Crp_data_pagamento AS data FROM Contas_receber_pag INNER JOIN FechamentoContas ON Contas_receber_pag.cba_codigo = fechamentoContas.Cba_codigo AND FechamentoContas.FechContas_data >= Contas_receber_pag.Crp_data_pagamento INNER JOIN contas_receber ON Contas_receber_pag.Ctr_codigo = contas_receber.Ctr_codigo INNER JOIN contas_Receber_det ON Contas_receber_pag.ctr_codigo_det = contas_Receber_det.ctr_codigo_det WHERE (contas_Receber_det.Ctr_situacao = 'S') AND   Contas_receber.CTr_CODIGO =:codigo
select TpOriPro_codigo,TpTrib_codigo from produtos where Pro_codnosso=:pPro_codnosso
SELECT COUNT(*) AS TOTAL FROM Nota_entrada LEFT OUTER JOIN  Nota_Entrada_Dif ON Nota_entrada.Nen_codigo = Nota_Entrada_Dif.Nen_codigo WHERE (NOT (Nota_Entrada_Dif.NenDf_codigo IS NULL)) AND (Nota_Entrada_Dif.NenDf_DesbUsuario IS NULL) AND Nota_entrada.Nen_codigo =:PNen_codigo
select case when max(ped_codigo)> 0 then max(ped_codigo)+1 else 1 end as maximo from pedido
select case when max(orc_codigo)> 0 then max(orc_codigo)+1 else 1 end as maximo from orcamento
select case when max(avu_codigo)> 0 then max(avu_codigo)+1 else 1 end as maximo from avulso
select  dbo.Avulso_luminaria_det.avu_codigo_pre FROM Avulso_luminaria_det LEFT OUTER JOIN
select  Avulso_materiais_det.avu_codigo_pre
select case when max(edv_codigo)> 0 then max(edv_codigo)+1 else 1 end as maximo from Ent_devolucao
select  Ent_devolucao_luminaria_det.edv_codigo_pre FROM Ent_devolucao_luminaria_det LEFT OUTER JOIN
select  Ent_devolucao_materiais_det.edv_codigo_pre
SELECT Saida_complementacao.* FROM pedido INNER JOIN
SELECT Ent_devolucao.edv_codigo_pre
SELECT Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_CodigoPre, Pasta.Pasta_Descricao, Pasta.Pasta_codigo,Clientes.Cli_Nome, Obras.Obr_Descricao, dbo.VendaIndicacao.VenInd_TpDoc, dbo.Indicacoes.Ind_Nome, dbo.Venda.Ven_DataEmissao, Clientes.Cli_codigo, Venda.ven_total, Venda.ven_valorcredito  FROM Venda INNER JOIN Obras ON Venda.Obr_codigo = Obras.Obr_Codigo INNER JOIN Clientes ON dbo.Venda.Ven_CodVinculo = dbo.Clientes.Cli_Codigo INNER JOIN VendaIndicacao ON dbo.Venda.Ven_CodigoPre = dbo.VendaIndicacao.VenInd_NDocPre INNER JOIN Indicacoes ON dbo.VendaIndicacao.Ind_Codigo = dbo.Indicacoes.Ind_codigo LEFT OUTER JOIN Pasta ON dbo.Venda.Pasta_codigo = dbo.Pasta.Pasta_codigo WHERE VendaIndicacao.VenInd_TpDoc = 'PRO' and venda.ven_codigo=:codigo AND venda.ven_situacao = 'A' and VendaIndicacao.ind_codigo=:Pind_codigo and venda.ParSV_serie=:pParSV_serie AND  ven_tipo ='P'
SELECT REPLICATE('0', 2 - LEN(MONTH(Ven_DataEmissao))) + LTRIM(STR(MONTH(Ven_DataEmissao))) + '/' + LTRIM(STR(YEAR(Ven_DataEmissao))) AS data
SELECT * from controle_entrega where cen_codigo_pre=:codigo
SELECT controle_entrega_data.cen_codigo_pre, controle_entrega_data.Pro_codnosso,
select :data, :hora, Epr_Codnosso,Epr_Acabamento,Epr_estoque, estoque_produto.EstTp_Codigo from estoque_produto where Epr_estoque <> 0
SELECT  dbo.Municipio.mun_nome     , dbo.Municipio.mun_nome AS cidadecor, dbo.Obras.Cli_codigo, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero,
SELECT     dbo.Contas_Bancarias.Cba_codigo, dbo.Contas_Bancarias.Bcx_codigo, dbo.Contas_Bancarias.Emp_codigo, dbo.Bancos_Caixas.Bcx_Nome,
select sum(ced_quantidade) as quant from controle_entrega_data where cen_codigo_pre=:codigo and  Pro_codnosso=:produto and cep_acabamento=:acabamento
select SeqTab_Numero,SeqTab_Tabela,SeqTab_Campo, emp_codigo from SisSeqTabela where  SeqTab_Tabela=:pSeqTab_Tabela AND SeqTab_Campo=:pSeqTab_Campo
SELECT     COFINS_codigo, COFINS_descricao, COFINS_situacao, COFINS_TIPO, COFINS_codigo + ' - ' + COFINS_descricao AS CodigoDescricao
select * from Nacionalidade
SELECT ind_codigo, ind_nome
SELECT DISTINCT dbo.acerto_eletrecistas.ael_codigo, dbo.Venda.Ven_codigo, dbo.Venda.Ven_CodigoPre, dbo.Venda.Ven_CodVinculo, dbo.Venda.Ven_DataEmissao,
SELECT     TOP (100) PERCENT dbo.acerto_eletrecistas.ael_codigo, dbo.acerto_eletrecistas.ael_concluido, dbo.acerto_eletrecistas.ped_ped_codigo, dbo.Venda.Ven_CodigoPre,
SELECT     dbo.Venda.Ven_codigo, dbo.Funcionario.Fun_Nome, dbo.Venda.ParSV_serie, dbo.Clientes.Cli_Nome, dbo.Obras.Obr_Descricao
SELECT     VendaServico.ven_codigopre, VendaServico.VenSer_quantidade, VendaServico.VenSer_VlEletricista, VendaServico.VenSer_item,
SELECT     dbo.produtos.Pro_AliqICMS, dbo.produtos.Trib_Codigo, dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.For_codigo,
SELECT  produtos.Pro_codnosso, ProdutosFornecedores.ProdFor_CodigoProduto, ProdutosFornecedores.For_codigo, produtos.GrupoProduto_codigo, produtos.Pro_tp_peca,
SELECT        dbo.ProdutosRelacionadosDet.Pro_codnosso, dbo.ProdutosRelacionadosDet.CodAcabamento, dbo.ProdutosRelacionadosDet.ProdRelDet_Quantidade, dbo.ProdutosRelacionadosDet.ProdRelDet_padrao,
SELECT    Preco_Produto.Pre_Codindice, Preco_Produto.Pre_Tabela, produtos.Pro_codnosso, produtos.Pro_Codbase, produtos.For_codigo, produtos.Pro_tp_produto,
select * from AltValorTabela
SELECT dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.VendaProduto.VenPro_DataEntrega
select LTRIM(STR(Ven_codigo, 25, 0)) +'-'+ ParSV_serie as codigo, Ven_CodigoPre, emp_codigo   from venda where Ven_Situacao='A' and Ven_Tipo ='P' and  Ven_CodVinculo =:pcli_codigo
SELECT dbo.produtos.Pro_descricao, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.produtos.Pro_tp_peca,
SELECT CatVen_Codigo, CatVen_Descricao from CategoriaVenda where (CatVen_Tipo='A' or CatVen_Tipo='V' ) and (CatVen_Ativo='A' or CatVen_Codigo=:PCatVen_Codigo)
select * from VendaIndicacao
SELECT max(avulso_materiais_det.ama_codindice) as ama_codindice  , avulso_materiais_det.Pro_codnosso, avulso_materiais_det.ama_acabamento, Sum([avulso_materiais_det].[ama_quantidade]) AS total, avulso_materiais_det.avu_codigo_pre,Estoque_produto.Epr_estoque
SELECT     max(Avulso_luminaria_det.ald_codindice) as ald_codindice, dbo.Avulso_luminaria_det.avu_codigo_pre, dbo.Avulso_luminaria_det.Pro_codnosso,
SELECT pedido_luminaria_det.ped_codigo_pre, pedido_luminaria_det.Pro_codnosso, pedido_luminaria_det.pld_acabamento, ((Sum(pedido_luminaria_det.pld_quantidade))) AS total,Estoque_produto.Epr_estoque
SELECT pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_acabamento, (Sum([pedido_materiais_det].[pma_quantidade]))AS total, pedido_materiais_det.ped_codigo_pre,[Estoque_produto].[Epr_estoque]
SELECT     dbo.Contas_Bancarias.Cba_numero, dbo.Contas_Bancarias.Cba_tipo_conta, dbo.Bancos_Caixas.Bcx_tipo, dbo.Bancos_Caixas.Bcx_Nome,
select top 1 Preco_Produto.*
SELECT 'N' as selecionar ,  case when ctr_vinculo = 'CLIENTE' then (select cli_nome from clientes where clientes.cli_codigo = contas_receber.Ctr_codigo_vinculo) else
SELECT dbo.Contas_Bancarias.Cba_codigo, dbo.Contas_Bancarias.Bcx_codigo, dbo.Contas_Bancarias.Emp_codigo, dbo.Contas_Bancarias.Cba_numero, dbo.Contas_BancariasCobranca.CbaCob_codigo,
SELECT   Cli_tp_pessoa as pessoa,     dbo.Clientes.Cli_Nome AS nome, dbo.Clientes.Cli_Endereco AS endereco, dbo.Clientes.Cli_numero AS numero, dbo.Clientes.Cli_complemento AS complemento, dbo.Clientes.Cli_Bairro AS Bairro,
SELECT TOP (100) PERCENT dbo.Clientes.Cli_Codigo, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Assistencia_Tecnica.ASTEC_Codigo, dbo.Assistencia_Tecnica.ASTEC_Data,
SELECT dbo.Assistencia_Tecnica.Ven_CodigoPre, dbo.Assistencia_Tecnica.ASTEC_Codigo, dbo.Assistencia_TecnicaProdutos.ASTECProd_Codigo, dbo.Assistencia_TecnicaProdutos.Pro_codnosso,
SELECT         dbo.Contas_Bancarias.Cba_codigo, dbo.Contas_Bancarias.Bcx_codigo, dbo.Contas_Bancarias.Emp_codigo, dbo.Contas_Bancarias.Cba_numero,
select * from cob_projetos
SELECT        dbo.unidades.uni_descricao, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.produtos.Pro_descricao,
SELECT     dbo.produtos.For_codigo, dbo.Preco_Produto.Pre_Acabamento, dbo.Estoque_produto.Epr_estoque, dbo.produtos.Pro_codnosso,
sELECT     dbo.Credito.Credito_Situacao, dbo.Credito.Credito_Codigo, dbo.Credito.Credito_TipoVinculo, dbo.Clientes.Cli_Nome, dbo.Credito.Credito_Operacao,
SELECT     dbo.Venda.Ven_codigo
SELECT Devolucao.Dev_descricao
SELECT        dbo.Credito.Credito_Situacao, dbo.Credito.Credito_Codigo, dbo.Credito.Credito_TipoVinculo, dbo.Credito.Credito_Operacao, dbo.Credito.Credito_Valor, dbo.Credito.Credito_Data, dbo.Credito.Credito_CodigoDoc,
SELECT     dbo.Estoque_produto.*, produtos.Pro_Codbase, produtos.Pro_descricao_for, produtos.pro_foto,dbo.produtos.For_codigo AS For_codigo, dbo.produtos.Pro_descricao AS Pro_descricao,
SELECT       dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento, dbo.Preco_Produto.Pre_Codindice, dbo.Preco_Produto.Pre_EstMinCalcular, dbo.Preco_Produto.pre_codigo,
SELECT dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_CodigoPre, dbo.Venda.Pasta_codigo, dbo.Venda.Ven_DataEmissao, dbo.Venda.Ven_DataConclusao, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_Total,
SELECT dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, dbo.produtos.Pro_tp_peca, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto,
SELECT       dbo.Preco_Produto.Pre_Acabamento, MAX(dbo.Estoque_produto.Epr_estoque) AS Epr_estoque, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,
SELECT dbo.Estoque_produto.Epr_estoque, dbo.Estoque_produto.EstTp_Codigo, dbo.produtos.Pro_CodEspecial, dbo.produtos.Pro_unidade, dbo.produtos.Pro_Codbase, dbo.produtos.Pro_descricao_for, dbo.produtos.Pro_foto,
SELECT     dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_CodigoPre, dbo.Pasta.Pasta_Descricao, dbo.Pasta.Pasta_codigo, dbo.Clientes.Cli_Nome,
SELECT     dbo.VendaServico.Ven_codigopre, dbo.VendaServico.VenSer_item, dbo.VendaServico.Sev_cod, dbo.VendaServico.CodAmbiente,
SELECT '' as tipo, Venda.ParSV_serie as serie, Clientes.Cli_Nome as nome, Venda.Ven_codigo as codigo, Venda.Pasta_codigo as pasta
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_CreditoDebito ='D') or (Pco_CreditoDebito ='A')) ORDER BY Pco_descricao
select * from Plano_Contas WHERE Pco_tipo='A' and ((Pco_CreditoDebito ='C' )  OR (Pco_CreditoDebito ='A' )) ORDER BY Pco_descricao
select * from ControleChequeDev
SELECT     CASE WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'OUTROS' THEN ControleChequeDet.ControlChequeDet_emitente WHEN ControleChequeDet.ControlChequeDet_Vinculo
select EmpFact_Codigo, EmpFact_Nome, cba_codigo  from empresafactoring  where ((EmpFact_situacao='A') or (EmpFact_codigo=:PEmpFact_codigo))   ORDER BY EmpFact_Nome
SELECT     CASE WHEN contas_receber.ctr_vinculo = 'OUTROS ' THEN contas_receber.ctr_nome WHEN contas_receber.ctr_vinculo = 'CLIENTE' THEN
SELECT        dbo.controle_entrega_prod.cen_codigo_pre, dbo.controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento, dbo.controle_entrega_prod.cep_tipo,
select  VenPro_Obs from VendaProduto where Ven_CodigoPre  =:pVen_CodigoPre and Pro_codnosso  =:pPro_codnosso and CodAcabamento =:pCodAcabamento
SELECT dbo.controle_entrega_prod.cen_codigo_pre, dbo.controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento, dbo.controle_entrega_prod.cep_tipo, dbo.controle_entrega_prod.cep_quantidade_entregue,
SELECT 0 as selecionar , * FROM Ambiente where amb_situacao='A'  AND DescAmbiente <> '' AND DescAmbiente IS NOT NULL order by DescAmbiente
SELECT        dbo.Municipio.mun_nome, dbo.Obras.Cli_codigo, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento,
SELECT        dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.For_codigo, dbo.produtos.GrupoProduto_codigo, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao,
SELECT dbo.produtos.Pro_AliqICMS, dbo.produtos.Trib_Codigo, dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.For_codigo, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao,
SELECT        dbo.ProdutosRelacionadosDet.ProdRelDet_padrao, dbo.ProdutosRelacionadosDet.Pro_codnosso, dbo.ProdutosRelacionadosDet.CodAcabamento, dbo.ProdutosRelacionadosDet.ProdRelDet_Quantidade,
sELECT        dbo.produtos.Pro_AliqICMS, dbo.produtos.Trib_Codigo, dbo.produtos.Pro_codnosso, dbo.produtos.For_codigo, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao,
SELECT        dbo.produtos.Pro_codnosso, dbo.produtos.Pro_Codbase, dbo.produtos.For_codigo, dbo.produtos.GrupoProduto_codigo, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao, dbo.produtos.Pro_quant_minima,
SELECT     dbo.produtos.Pro_AliqICMS, dbo.produtos.Trib_Codigo, dbo.Preco_Produto.Pre_Codindice, dbo.Produto_Relacionados.pre_nao_relacionado,
SELECT        dbo.ProdutosRelacionadosCadProdutos.Pro_codnosso, dbo.ProdutosRelacionadosDet.Pro_codnosso AS Pro_codnossoFilho, dbo.ProdutosRelacionadosDet.CodAcabamento,
SELECT   produtos.*,     dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento, dbo.Preco_Produto.Pre_Codindice, dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_compra, dbo.Preco_Produto.Pre_Custo,
SELECT produtos.Pro_codnosso, produtos.Pro_descricao, Preco_Produto.Pre_Codindice, produtos.Pro_comissao, Indice_preco.Ipr_vl_com_inter, fornecedor.For_Nome
select * from VendaDataEntrega
select * from VendaDataRetorno
select DevolucaoProduto.*,  dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.produtos.Pro_tp_peca, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.produtos.Pro_descricao, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto,
SELECT   dbo.Venda.emp_codigo,   dbo.Venda.Ven_codigo, dbo.venda.ven_codigopre, dbo.Venda.ParSV_serie, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_DataConclusao, dbo.Venda.Pasta_codigo, dbo.Venda.Ven_TipoDesc
SELECT     ordem_compra_det.ocd_item_ped, ordem_compra_det.ocd_cod_pedido, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.pedido_compra_det.pcp_codigo, dbo.pedido_compra_det.pro_codnosso, dbo.pedido_compra_det.pcd_acabamento,
SELECT * FROM EFD_REGISTRO_150
select * from CartoesBandeiras
SELECT     dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Clientes.Cli_Nome, dbo.Devolucao.Dev_codigo, dbo.Devolucao.Dev_situacao, dbo.Venda.Ven_CodigoPre, Devolucao.Dev_codigopre, Devolucao.dev_descricao
SELECT dbo.controle_entrega_data.Pro_codnosso, dbo.controle_entrega_data.cep_acabamento, SUM(dbo.controle_entrega_data.ced_quantidade) AS ced_quantidade2, dbo.controle_entrega_data.cep_tipo, dbo.produtos.Pro_descricao,
SELECT pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_acabamento, Sum([pedido_materiais_det].[pma_quantidade])-[Preco_Produto].[Pre_estoque] AS total, pedido_materiais_det.ped_codigo_pre,pma_saida_comp
SELECT pedido_luminaria_det.ped_codigo_pre, pedido_luminaria_det.Pro_codnosso, pedido_luminaria_det.pld_acabamento, Sum(pedido_luminaria_det.pld_quantidade)-Preco_Produto.Pre_estoque AS total, pedido_luminaria_det.usr_dt_hr_criacao, Preco_Produto.Pre_estoque, pedido_luminaria_det.pld_quantidade,pedido_luminaria_det.pld_saida_comp
SELECT dbo.ProdutosRelacionados.ProdRel_Descricao, dbo.ProdutosRelacionados.ProdRel_Situacao, dbo.ProdutosRelacionadosDet.Pro_codnosso, dbo.ProdutosRelacionadosDet.CodAcabamento,
SELECT     dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento, dbo.Preco_Produto.Pre_Codindice, dbo.Preco_Produto.Pre_EstMinCalcular,
select * from Texto_Substituicao
SELECT     dbo.pedido.ped_codigo, dbo.Clientes.Cli_Nome, dbo.produtos.Pro_Codbase, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,
SELECT     TOP (100) PERCENT dbo.produtos.Pro_codnosso, dbo.produtos.Pro_Codbase, dbo.produtos.Pro_descricao, dbo.produtos.Pro_descricao_for,
SELECT     NTFPro_Codigo, NTF_Codigo, Pro_codnosso, NTFPro_ProdDescr, CodAcabamento, NTFPro_StTrib, uni_codigo, NTFPro_Quant, NTFPro_Desconto,
SELECT * FROM produtos  where  Pro_exportado <> '''S''' and For_codigo =:forne and  Pro_tp_produto <>:produto   ORDER BY Pro_descricao
SELECT * FROM Produto_Relacionados where Pre_Cod_Prod_Pai=:Prodpai and Pre_Cod_Prod_filho=:Prodfilho and pre_codigofor_filho=:fornefilho and pre_codigofor_pai=:fornepai
SELECT TOP (100) PERCENT dbo.contas_apagar.Ctp_vinculo AS VINCULO, dbo.contas_apagar.Ctp_codigo_vinculo AS CODIGO_VINCULO, dbo.contas_apagar.Ctp_nome AS NOME,
SELECT        dbo.fornecedor.For_Sigla, dbo.ProdutosFornecedores.Pro_codnosso, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto,
SELECT  dbo.FacturaProduto.*,
SELECT     dbo.Clientes.Cli_cnpj_cpf AS cpf, dbo.Clientes.Cli_Nome AS nome, dbo.Clientes.Cli_Endereco AS endereco, dbo.Clientes.Cli_numero AS num,
select FechMeta_Codigo, Emp_Codigo, MetaVenda_Codigo, FechMetaEmp_VlAlcancado, FechMetaEmp_porcentagem
SELECT     dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_CodigoPre, dbo.Venda.Pasta_codigo, dbo.Venda.Ven_Orcamento, dbo.Venda.Ven_DataEmissao,
select for_nome, for_codigo
SELECT        TOP (100) PERCENT dbo.BalancoEstoqueProdutos.BalEst_Codigo, Produtos.Pro_Codnosso, dbo.Preco_Produto.Pre_Acabamento,
SELECT        SUM(dbo.ordem_compra_det.Ocd_quantidade_pedido - CASE WHEN nota_entrada_det.Ned_quantidade_recebida > 0 THEN nota_entrada_det.Ned_quantidade_recebida
select * from grauinstrucao
select * from estado order by uf
select * from CategoriaRemuneracao WITH (NOLOCK)  where (CatRem_Ativo='A' or CatRem_Codigo=:PCatRem_Codigo)  and (CatRem_Tipo='C' or CatRem_Tipo='A' )  order by CatRem_Descricao
select * from CategoriaRemuneracao WITH (NOLOCK)  where (CatRem_Ativo='A' or CatRem_Codigo=:PCatRem_Codigo)  and (CatRem_Tipo='P' or CatRem_Tipo='A' ) order by CatRem_Descricao
SELECT dbo.EntregaDetalhe.EntDet_codigo, dbo.EntregaDetalhe.Ent_CodigoIndividual, dbo.EntregaDetalhe.Ven_CodigoPre, CAST(dbo.Venda.Ven_codigo AS varchar(20)) + ' - ' + dbo.Venda.ParSV_serie AS pedido
SELECT        dbo.Preco_Produto.Pre_Codnosso, dbo.Preco_Produto.Pre_Acabamento, dbo.produtos.Pro_descricao, dbo.Preco_Produto.Tam_codigo
select * from sis_controle
SELECT     dbo.Assistencia_Tecnica.ASTEC_Codigo, dbo.Assistencia_Tecnica.ASTEC_Data, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Clientes.Cli_Nome, dbo.fornecedor.For_Nome
SELECT        TribServ_codigo, TribServ_descricao, TribServ_Aliquota, TribServ_Situacao, usr_cod_criacao, usr_dt_hr_criacao, usr_cod_alteracao, usr_dt_hr_alteracao,
SELECT dbo.PDVCaixa.PdvCaixa_codigo, dbo.PDVCaixa.PdvCaixa_Estacao, dbo.PDVCaixa.PdvCaixa_NomePC, dbo.PDVCaixa.PdvCaixa_fechamento, dbo.PDVCaixa.PdvCaixa_ValorAbertura,
SELECT     CASE WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'OUTROS ' THEN ControleChequeDet.ControlChequeDet_emitente WHEN ControleChequeDet.ControlChequeDet_Vinculo
SELECT     dbo.Credito.Credito_Situacao, dbo.Credito.Credito_Codigo, dbo.Credito.Credito_TipoVinculo, dbo.Fornecedor.For_Nome, dbo.Credito.Credito_Operacao,
SELECT     dbo.CreditoIndicacao.CredInd_Codigo, dbo.CreditoIndicacao.CredInd_DtProcessar, dbo.CreditoIndicacao.CredInd_DtInclusao,
SELECT     dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_DataConclusao, dbo.Venda.Pasta_codigo, dbo.Venda.Ven_TipoDesc
SELECT  dbo.ForaDoBalanco.ForBal_codigo, dbo.ForaDoBalanco.ForBal_descricao, dbo.ForaDoBalanco.usr_cod_criacao, dbo.fornecedor.For_Nome,
SELECT ProdRel_codigo, ProdRel_Descricao, ProdRel_Situacao, CASE WHEN ProdRel_Situacao = 1 THEN 'ATIVO' ELSE 'DESATIVADO' END AS situacao, Emp_codigo, usr_cod_criacao, usr_dt_hr_criacao, usr_cod_alteracao,
select * from QuadroCargas
SELECT     dbo.Clientes.Cli_Nome
SELECT * FROM TabelaImposto
SELECT        'PV : ' + CAST(dbo.Venda.Ven_codigo AS varchar(30)) + ' S
SELECT Clientes.Cli_CODIGO,    dbo.Clientes.Cli_Nome, dbo.Venda.Ven_codigo, dbo.Venda.Ven_Situacao, dbo.Venda.ParSV_serie, dbo.Venda.Ven_Orcamento, dbo.Venda.Ven_DataEmissao,
SELECT     'ORC' AS tipo, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.CodAmbiente, 1 AS empresa, CASE WHEN Ambiente.DescAmbiente IS NULL
SELECT  *  from  VendaProduto
SELECT     dbo.AutorizaInclusao.Ain_codigo, dbo.Clientes.Cli_Nome, dbo.AutorizaInclusao.Ain_dt_emissao,AutorizaInclusao.Ain_dt_fechamento,
SELECT Bancos_Caixas.Bcx_situacao,  dbo.Bancos.Ban_Nome, dbo.Bancos_Caixas.Bcx_codigo, dbo.Bancos_Caixas.Bcx_tipo, dbo.Bancos_Caixas.Bcx_agencia, dbo.Municipio.mun_nome,
SELECT     Bancos_Caixas.Bcx_situacao  ,dbo.Bancos_Caixas.Bcx_codigo, dbo.Bancos_Caixas.Emp_codigo, dbo.Bancos_Caixas.Bcx_tipo, dbo.Bancos_Caixas.Bcx_Nome,
SELECT     dbo.Bancos_Caixas.Bcx_codigo, dbo.Bancos_Caixas.Emp_codigo, dbo.Bancos_Caixas.Bcx_tipo, dbo.Bancos_Caixas.Bcx_Nome,
SELECT    Movimentos.*, Contas_Bancarias.Cba_Saldo_inicial AS Cba_Saldo_inicial, Bancos_Caixas.Bcx_tipo AS Bcx_tipo, Bancos_Caixas.Bcx_Nome AS Bcx_Nome
SELECT * , '' as categoria
SELECT * FROM contas_bancarias
SELECT Movimento_bancario.*, (Contas_Bancarias.Cba_numero + ' - ' +  Bancos_Caixas.Bcx_Nome) AS nome_conta FROM Contas_Bancarias INNER JOIN
SELECT top 1 CASE WHEN dbo.Funcionario.Fun_Nome IS NULL THEN '' ELSE Funcionario.Fun_Nome END AS Fun_Nome FROM dbo.SisUsuarios LEFT OUTER JOIN
SELECT  pos_venda.usr_dt_hr_criacao,   dbo.pos_venda.Pve_codigo, dbo.pos_venda.Pve_cliente, dbo.Clientes.Cli_Nome,pos_venda.Pve_data
SELECT Pro_Codbase, Pro_descricao_for, pro_codnosso, pro_codreduzido, pro_descricao, Pro_CodEspecial, Pro_ativo, pro_ncm, pro_cest FROM produtos
SELECT  TOP 1 dbo.produtos.Pro_codnosso, dbo.Avulso_luminaria_det.Pro_codnosso AS Expr1, dbo.Avulso_materiais_det.Pro_codnosso AS Expr2,
SELECT     dbo.TipoPeca.TpPeca_Codigo, dbo.TipoPeca.TpPeca_Situacao, dbo.TipoPeca.GrupoProduto_codigo, dbo.GrupoProduto.GrupoProduto_Descricao
select orc_tl_produto as tl_produto,orc_desc_produto as desc_produto, orc_tl_geral_produto as tl_geral_produto, orc_codigo as codigo,
SELECT * FROM Produto_Relacionados WHERE Pre_Cod_Prod_Pai=:codigo1 AND Pre_Cod_Prod_filho =:codigo2 AND pre_codigofor_pai=:fornecedor1  AND pre_codigofor_filho=:fornecedor2
SELECT * FROM TODOS WHERE (F2 <> '') AND (F2 <> 'C
SELECT * FROM acabamento WHERE F1 <> '' AND F1 <> 'NOSSO C
SELECT Preco_Produto.Pre_Acabamento, produtos.Pro_codnosso, produtos.Pro_descricao, produtos.Pro_unidade, Preco_Produto.Pre_compra, Preco_Produto.Pre_Tabela, Preco_Produto.Pre_Custo, unidades.uni_descricao
SELECT dbo.Venda.Ven_codigo, dbo.Venda.Ven_Tipo, dbo.Venda.usr_dt_hr_criacao, dbo.Funcionario.Fun_Nome, CONVERT(CHAR, dbo.Venda.usr_dt_hr_criacao, 103) AS DATA, FORMAT(dbo.Venda.usr_dt_hr_criacao, N'HH:mm:ss ') AS HORA,
SELECT    produtos.Pro_tp_produto AS Grupo,  dbo.produtos.Pro_tp_peca AS Peca, tabela.old_seq AS Seq, SUM(tabela.old_quantidade) as qtde ,SUM(tabela.old_vl_item)
SELECT   produtos.Pro_tp_produto AS Grupo ,dbo.produtos.Pro_tp_peca AS Peca, tabelaMA.oma_seq AS Seq,  SUM(tabelaMA.oma_quantidade) as qtde,
SELECT dbo.Bancos.Ban_Codigo + '-' + dbo.Bancos.Ban_Nome + ' - Ag
SELECT     dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_CodigoPre, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_DataEmissao, dbo.Venda.Ven_LiberaSeparacao, dbo.Venda.Ven_LiberaEntrega, dbo.Venda.Ven_EnviarEmailEstoque, dbo.Venda.Ven_Tipo, dbo.Venda.Ven_Situacao
SELECT     dbo.controle_entrega_prod.cep_quantidade_entregue, dbo.controle_entrega_prod.cep_quantidade, dbo.controle_entrega_prod.CEP_QuantidadeDevolvida, dbo.controle_entrega_prod.CEP_QuantidadeDevolvidaEst
SELECT        TOP (100) PERCENT dbo.VendaProduto.VenPro_Seq AS seq, dbo.VendaProduto.VenPro_SeqItem AS seq_item, dbo.produtos.Pro_unidade AS unidade, dbo.VendaProduto.CodAmbiente AS ambientes,
select * from metaVendaDet
SELECT        dbo.unidades.uni_descricao, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.produtos.Pro_Codbase, dbo.produtos.Pro_descricao, dbo.produtos.Pro_descricao_for,
SELECT nota_entrada_det.*, Preco_Produto.Pre_Acabamento, produtos.*, Preco_Produto.Pre_compra, Preco_Produto.Pre_Tabela, Preco_Produto.Pre_Custo, unidades.uni_descricao
sELECT        dbo.Preco_Produto.Pre_Acabamento, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_codnosso, dbo.produtos.Pro_descricao, dbo.produtos.Pro_unidade, dbo.Preco_Produto.Pre_compra,
SELECT Mod_codigo,Mod_descricao  FROM Motivo_devolucao WITH (NOLOCK) where  (MOD_tipo='N' or mod_tipo='A') and (mod_situacao='A'  or mod_codigo=:Pmod_codigo)
SELECT  *  from TipoModBaseICMS
SELECT  *  from TipoCofins
SELECT tamanho.Tam_descricao
SELECT * from  plano_contas where (pco_creditodebito = 'D' or pco_creditodebito = 'A') AND PCO_tipo = 'A' order by PCO_descricao
SELECT     dbo.Contas_Bancarias.Bcx_codigo, dbo.Contas_Bancarias.Cba_codigo, dbo.Bancos_Caixas.Bcx_Nome, dbo.Bancos_Caixas.Bcx_tipo,
SELECT  dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_descricao, dbo.Estoque_produto.Epr_estoque, dbo.VendaProduto.Pro_codnosso, dbo.produtos.Pro_unidade, dbo.VendaProduto.CodAcabamento,
SELECT dbo.Indicacoes.Ind_codigo, dbo.Indicacoes.Ind_Nome, dbo.Indicacoes_Detalhe.IndDet_profissao AS ind_profissao, dbo.Indicacoes_Detalhe.IndDet_comercial AS Ind_comercial,
SELECT     CASE WHEN SUM(CASE WHEN VenInd_Porcentagem > 0 THEN CASE WHEN (vdev.Ven_TipoDesc = 'G' AND Ven_DescontoPorcProd > 0)
SELECT        dbo.produtos.Pro_codnosso, dbo.produtos.Pro_Codbase, dbo.produtos.Pro_CodEspecial, dbo.produtos.Pro_descricao, dbo.produtos.Pro_descricao_for,
SELECT  dbo.Reserva_tecnica.Ret_codigo, dbo.Reserva_tecnica.Ret_tipo, dbo.Reserva_tecnica.Ret_projeto_avulsa, dbo.pedido.ped_dt_fechamento,
SELECT     dbo.pedido.ped_codigo, dbo.pedido.ped_codigo_pre, dbo.pedido.cli_codigo, dbo.pedido.ped_arquiteta, dbo.pedido.ped_dt_emissao,
SELECT     dbo.orcamento.orc_tl_produto AS tl_produto, dbo.orcamento.orc_desc_produto AS desc_produto, dbo.orcamento.orc_tl_geral_produto AS tl_geral_produto,
SELECT     dbo.produtos.Pro_descricao AS descricao, dbo.Orcamento_luminaria_det.Pro_codnosso AS codigo, dbo.Orcamento_luminaria_det.old_acabamento AS acabamento,
SELECT     dbo.produtos.Pro_descricao AS descricao, dbo.orcamento_materiais_det.Pro_codnosso AS codigo, dbo.orcamento_materiais_det.oma_acabamento AS acabamento,
SELECT dbo.Clientes.Cli_Nome, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento, dbo.Obras.Obr_Bairro, dbo.Obras.Obr_CEP, dbo.Municipio.mun_nome, dbo.Municipio.mun_uf
SELECT dbo.produtos.Pro_descricao, dbo.produtos.Pro_CodEspecial, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_unidade
SELECT produtos.Pro_codnosso
SELECT dbo.ordem_compra_det.Ocp_codigo, dbo.ordem_compra_det.Pro_codnosso, dbo.ordem_compra_det.Ocd_acabamento, dbo.VendaProduto.VenPro_Obs
SELECT     ParamentrosCliente.Tsu_codigo, ParamentrosCliente.ParCli_fisica, ParamentrosCliente.ParCli_juridica, Texto_Substituicao.Tsu_descricao
select * from ParametrosRTDiaPag
SELECT     Paramentrosprofissional.Tsu_codigo, Paramentrosprofissional.Parprof_fisica, Paramentrosprofissional.Parprof_juridica, Texto_Substituicao.Tsu_descricao
SELECT     dbo.Devolucao.Dev_codigo, dbo.Devolucao.Dev_Dtemissao, dbo.Devolucao.Dev_Total, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie
SELECT  CAST(venda.ven_codigo as varchar(12) )+    '   S
SELECT max(pedido_materiais_det.pma_codindice) as pma_codindice,pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_acabamento, (Sum([pedido_materiais_det].[pma_quantidade]))AS total, pedido_materiais_det.ped_codigo_pre,[Estoque_produto].[Epr_estoque]
SELECT max(pedido_luminaria_det.pld_codindice) as pld_codindice  , pedido_luminaria_det.ped_codigo_pre, pedido_luminaria_det.Pro_codnosso, pedido_luminaria_det.pld_acabamento, ((Sum(pedido_luminaria_det.pld_quantidade))) AS total,Estoque_produto.Epr_estoque
SELECT dbo.Preco_Produto.Pre_Acabamento, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao, dbo.produtos.Pro_unidade, dbo.Preco_Produto.Pre_compra, dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_Custo,
SELECT pedido_compra.Pcp_codigo, pedido_compra.Pcp_pedido_venda, pedido_compra.Pcp_dt_pedido, Pedido_compra_det.Pro_codnosso, Pedido_compra_det.Pcd_item, Pedido_compra_det.Pcd_acabamento, Pedido_compra_det.Pcd_quantidade_solicit
select * from ImportacaoProduto where Pro_Codnosso =:PPro_Codnosso and  ImpProd_CodigoFor =:pImpProd_CodigoFor and  ImpProd_SiglaFor =:pImpProd_SiglaFor
SELECT        Ptrib_versao
SELECT     TOP (100) PERCENT dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Pasta.Pasta_codigo, dbo.Pasta.Pasta_Descricao, dbo.Obras.Obr_Descricao,
SELECT     dbo.produtos.Pro_codnosso, dbo.Preco_Produto.Pre_Acabamento, dbo.Preco_Produto.Pre_Venda, dbo.produtos.Pro_unidade, dbo.fornecedor.For_Nome, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.ProdutosFornecedores.ProdFor_CodigoProduto,
SELECT      dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_CodigoPre, dbo.Venda.Ven_DataEmissao, dbo.Venda.Ven_Total, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_Tipo, dbo.VendaAtendente.VenAten_TpDoc, dbo.Funcionario.Fun_Nome
SELECT        TOP (100) PERCENT MAX(dbo.VendaProduto.VenPro_Vlimposto) AS cod_vlimposto, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.CodAcabamento,
SELECT pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_produto, pedido_materiais_det.pma_unidade, Sum(pedido_materiais_det.pma_vl_item) AS tl_vl_item,
SELECT pedido_luminaria_det.Pro_codnosso, pedido_luminaria_det.pld_seq, pedido_luminaria_det.pld_produto, pedido_luminaria_det.ped_codigo_pre, pedido_luminaria_det.pld_ambiente, VendaAmbiente.VenAmb_Descricao, pedido_luminaria_det.pld_acabamento, Sum(pedido_luminaria_det.pld_quantidade) AS tl_quantidade, Max(pedido_luminaria_det.pld_vl_unitario) AS vl_unitario, Sum(pedido_luminaria_det.pld_vl_item) AS tl_vl_item, produtos.Pro_tp_peca, produtos.Pro_tp_produto, pedido_luminaria_det.pld_seq_item
SELECT pedido_materiais_det.pma_acabamento,pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_produto, pedido_materiais_det.pma_unidade, Sum(pedido_materiais_det.pma_vl_item) AS tl_vl_item, Sum(pedido_materiais_det.pma_quantidade) AS tl_quantidade, Max(pedido_materiais_det.pma_vl_unitario) AS vl_unitario, produtos.Pro_tp_produto, pedido_materiais_det.ped_codigo_pre
SELECT pedido_luminaria_det.pld_acabamento,pedido_luminaria_det.Pro_codnosso, pedido_luminaria_det.pld_produto, pedido_luminaria_det.pld_unidade, Sum(pedido_luminaria_det.pld_vl_item) AS tl_vl_item, Sum(pedido_luminaria_det.pld_quantidade) AS tl_quantidade, Max(pedido_luminaria_det.pld_vl_unitario) AS vl_unitario, produtos.Pro_tp_produto, pedido_luminaria_det.ped_codigo_pre
SELECT        TOP (100) PERCENT dbo.VendaProduto.VenPro_Vlimposto AS cod_vlimposto, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.VenPro_Seq, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.CodAmbiente,
SELECT        dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,
SELECT * from ordem_compra_det WITH (NOLOCK) where Ocp_codigo=:codigo and pro_codnosso=:produto and ocd_acabamento=:acabamento
SELECT produtos.Pro_tp_produto, orcamento_materiais_det.orc_codigo_pre, orcamento_materiais_det.Pro_codnosso, orcamento_materiais_det.oma_seq_item, orcamento_materiais_det.oma_seq, orcamento_materiais_det.oma_produto, orcamento_materiais_det.oma_ambiente, Sum(orcamento_materiais_det.oma_quantidade) AS tl_quantidade, orcamento_materiais_det.oma_vl_unitario AS vl_unitario, Sum(orcamento_materiais_det.oma_vl_item) AS tl_vl_item, orcamento_materiais_det.oma_acabamento
SELECT orcamento_luminaria_det.Pro_codnosso, orcamento_luminaria_det.old_seq, orcamento_luminaria_det.old_produto, orcamento_luminaria_det.orc_codigo_pre, orcamento_luminaria_det.old_ambiente, VendaAmbiente.VenAmb_Descricao, orcamento_luminaria_det.old_acabamento, Sum(orcamento_luminaria_det.old_quantidade) AS tl_quantidade, Max(orcamento_luminaria_det.old_vl_unitario) AS vl_unitario, Sum(orcamento_luminaria_det.old_vl_item) AS tl_vl_item, produtos.Pro_tp_peca, produtos.Pro_tp_produto, orcamento_luminaria_det.old_seq_item
SELECT produtos.Pro_tp_produto, orcamento_materiais_det.orc_codigo_pre, orcamento_materiais_det.Pro_codnosso, orcamento_materiais_det.oma_seq_item, orcamento_materiais_det.oma_seq, orcamento_materiais_det.oma_produto, orcamento_materiais_det.oma_ambiente, Sum(orcamento_materiais_det.oma_quantidade) AS tl_quantidade, Sum(orcamento_materiais_det.oma_vl_unitario) AS vl_unitario, Sum(orcamento_materiais_det.oma_vl_item) AS tl_vl_item, orcamento_materiais_det.oma_acabamento, Ambiente.DescAmbiente
SELECT produtos.Pro_tp_produto, orcamento_materiais_det.orc_codigo_pre, orcamento_materiais_det.Pro_codnosso, orcamento_materiais_det.oma_seq_item, orcamento_materiais_det.oma_seq, orcamento_materiais_det.oma_produto, orcamento_materiais_det.oma_ambiente, Sum(orcamento_materiais_det.oma_quantidade) AS tl_quantidade, Sum(orcamento_materiais_det.oma_vl_unitario) AS vl_unitario, Sum(orcamento_materiais_det.oma_vl_item) AS tl_vl_item, orcamento_materiais_det.oma_acabamento, Orcamento_luminaria_det.old_item
SELECT produtos.Pro_tp_produto, pedido_materiais_det.ped_codigo_pre, pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_seq_item, pedido_materiais_det.pma_seq, pedido_materiais_det.pma_produto, pedido_materiais_det.pma_ambiente, Sum(pedido_materiais_det.pma_quantidade) AS tl_quantidade, Sum(pedido_materiais_det.pma_vl_unitario) AS vl_unitario, Sum(pedido_materiais_det.pma_vl_item) AS tl_vl_item, pedido_materiais_det.pma_acabamento, Ambiente.DescAmbiente
SELECT produtos.Pro_tp_produto, pedido_materiais_det.ped_codigo_pre, pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_seq_item, pedido_materiais_det.pma_seq, pedido_materiais_det.pma_produto, pedido_materiais_det.pma_ambiente, Sum(pedido_materiais_det.pma_quantidade) AS tl_quantidade, pedido_materiais_det.pma_vl_unitario AS vl_unitario, Sum(pedido_materiais_det.pma_vl_item) AS tl_vl_item, pedido_materiais_det.pma_acabamento
SELECT produtos.Pro_tp_produto, pedido_materiais_det.ped_codigo_pre, pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_seq_item, pedido_materiais_det.pma_seq, pedido_materiais_det.pma_produto, pedido_materiais_det.pma_ambiente, Sum(pedido_materiais_det.pma_quantidade) AS tl_quantidade, Sum(pedido_materiais_det.pma_vl_unitario) AS vl_unitario, Sum(pedido_materiais_det.pma_vl_item) AS tl_vl_item, pedido_materiais_det.pma_acabamento, pedido_luminaria_det.pld_item
SELECT GrupoProduto.GrupoProduto_ordem, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.Forma_PagamentoGrupProd.GrupoProduto_Codigo,
select * from Whatsapp_Enviado
select ProdutosRelacionadosDet.*, Pro_Descricao, Pro_CodEspecial, ProdFor_CodigoProduto as ProdFor_Codigo, ProdFor_DescricaoProduto as ProdFor_Descricao
select ProdutosRelacionadosDet.*, ProdutosRelacionados.ProdRel_Descricao as Grupo, Pro_descricao, Pro_CodEspecial, ProdFor_CodigoProduto, ProdFor_DescricaoProduto
SELECT        dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_descricao, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto AS Pro_descricao_for,
SELECT * FROM tipopeca where ((TpPeca_situacao='A' ) OR  (TpPeca_codigo=:pTpPeca_codigo))and GrupoProduto_codigo=:PGrupo order by TpPeca_codigo
SELECT * FROM TipoOrigemProduto
SELECT * FROM TipoTributadaICMS
SELECT        dbo.PromocaoProdutos.*, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.fornecedor.For_Nome, dbo.produtos.Pro_descricao, dbo.produtos.Pro_CodEspecial,
SELECT        dbo.contas_apagar.Ctp_codigo AS CodigoConta, dbo.contas_apagar_det.ctp_codigo_det AS CodigoContaParcela, dbo.contas_apagar.Ctp_nome AS nome,
SELECT     acerto_eletrecistas_servicos.aes_codigo, acerto_eletrecistas_servicos.pse_quantidade, acerto_eletrecistas_servicos.pse_descricao, acerto_eletrecistas_servicos.aes_vl_unitario,
SELECT        dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_DataEmissao, dbo.Clientes.Cli_Nome, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, dbo.produtos.Pro_Codbase,
SELECT        dbo.ordem_compra_det.Pro_codnosso, dbo.ordem_compra_det.Ocd_acabamento, dbo.ordem_compra_det.Ocd_quantidade_pedido, dbo.ordem_compra_det.Ocd_quantidade_solicit,
SELECT DEV.ven_codigopre, PE.Ven_DataEmissao, DET.Pro_codnosso, P.Pro_descricao AS CodProduto, F.For_codigo, F.For_Razao, DET.CodAcabamento, P.Pro_descricao,
SELECT     TOP 100 PERCENT 'D
SELECT  dbo.PlanoContaValor (:PvlPeriodo, :PAno, :PTipo, :PPeriodo, :Pplano,:Pcontapaga,:Pcategoria,:pfixovariavel,:pcontasfora)
SELECT dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_CodEspecial, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,
SELECT   pedido.ped_codigo_pre , dbo.pedido.ped_codigo, dbo.Clientes.Cli_Nome, dbo.Funcionario.Fun_Nome, dbo.pedido.ped_Descricao, dbo.pedido.ped_desc_por_luminaria,
SELECT     SUM(dbo.Ent_devolucao_luminaria_det.eld_vl_item) AS valor, dbo.produtos.GrupoProduto_codigo, dbo.GrupoProduto.GrupoProduto_Descricao,
SELECT     SUM(dbo.Ent_devolucao_materiais_det.ema_vl_item) AS valor, dbo.produtos.GrupoProduto_codigo, dbo.GrupoProduto.GrupoProduto_Descricao,
SELECT     SUM(Ent_devolucaoDesagio.EdvDes_valorComDesc) AS valor, dbo.Ent_devolucaoDesagio.EdvDes_porcentagem, dbo.Ent_devolucaoDesagio.GrupoProduto_Codigo
SELECT     SUM(dbo.DevolucaoDesagio.DevDes_valorComDesc) AS valor, dbo.DevolucaoDesagio.DevDes_porcentagem AS EdvDes_porcentagem,
SELECT     dbo.AutorizaInclusao.Ain_codigo, dbo.Indicacoes.Ind_Nome, dbo.Clientes.Cli_Nome, dbo.Funcionario.Fun_Nome, dbo.AutorizaInclusao.Ain_Descricao,
SELECT     dbo.contas_apagar_det.usr_dt_hr_criacao AS usr_dt_hr_criacao, dbo.contas_apagar.Tpd_codigo AS Tpd_codigo, dbo.Modo.Mdo_nome AS mdo_nome,
SELECT     dbo.Clientes.Cli_Fcomercial, dbo.Clientes.Cli_Fresidencial, dbo.Clientes.Cli_fax, dbo.Clientes.Cli_celular, dbo.Indicacoes.Ind_comercial,
SELECT     dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, SUM(dbo.VendaProduto.VenPro_Quantidade) AS VenPro_Quantidade,
SELECT     dbo.Transferencia.Tra_codigo, dbo.Transferencia.Tra_tipo, dbo.Transferencia.Tra_situacao, dbo.Transferencia.Tra_operacao_origem,
SELECT     dbo.produtos.Pro_codnosso, dbo.produtos.For_codigo, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_descricao,
SELECT     dbo.produtos.Pro_codnosso, dbo.produtos.For_codigo, dbo.fornecedor.For_Nome, dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_VlNFor,
SELECT     dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao, dbo.produtos.Pro_CodEspecial, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.Preco_Produto.Pre_Tabela, dbo.Preco_Produto.Pre_Custo,
SELECT     dbo.Movimento_bancario.*, dbo.Plano_Contas.Pco_descricao AS Pco_descricao, dbo.Centro_de_custo.Cdc_descricao AS Cdc_descricao
SELECT        dbo.produtos.Pro_descricao, dbo.fornecedor.For_Nome, dbo.nota_entrada_det.Pro_codnosso, dbo.nota_entrada_det.Ned_acabamento, dbo.nota_entrada_det.Ned_quantidade_recebida,
SELECT     dbo.produtos.Pro_descricao, dbo.fornecedor.For_Nome, dbo.nota_entrada_det.Pro_codnosso, dbo.nota_entrada_det.Ned_acabamento,
SELECT * from ordem_compra_det where Ocp_codigo=:codigo and pro_codnosso=:produto and ocd_acabamento=:acabamento and ocd_item=:item
SELECT     TOP (100) PERCENT dbo.contas_receber.Ctr_codigo, dbo.contas_Receber_det.ctr_codigo_det, dbo.contas_Receber_det.Ctr_dt_vencimento,
SELECT SUM(VendaProduto.VenPro_Quantidade * dbo.Valorcusto (VendaProduto.Pro_codnosso,VendaProduto.CodAcabamento, DATEADD(DAY, -30 ,Venda.Ven_DataEmissao) ,Venda.Ven_DataEmissao)) AS Saldo_custo
SELECT     Venda.Ven_codigopre, Venda.Ven_codigo, Venda.Ven_DataEmissao, Venda.Ven_DataValidade, Clientes.Cli_Nome, Venda.usr_dt_hr_criacao,
SELECT     Venda.Ven_CodigoPre,
SELECT produtos.Pro_unidade,produtos.Pro_descricao, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_tp_produto, dbo.Pedido_compra_det.Pro_codnosso, dbo.Pedido_compra_det.Pcd_acabamento, dbo.Pedido_compra_det.Pcd_quantidade_solicit,
select ProdRelDet_Codigo, ProdRel_codigo, ProdutosRelacionadosDet.Pro_codnosso, CodAcabamento, ProdRelDet_Quantidade, ProdutosFornecedores.ProdFor_CodigoProduto,
SELECT  Venda.Ven_ValorCredito,  dbo.Venda.Ven_codigopre   ,  dbo.VendaIndicacao.VenInd_TpDoc, dbo.Indicacoes.Ind_Nome, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_DataEmissao,
SELECT dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_DataEmissao, dbo.Clientes.Cli_Nome, dbo.clientes.cli_cnpj_cpf, dbo.clientes.cli_tp_pessoa, dbo.Municipio.mun_nome,
SELECT dbo.venda.ven_total AS Total_venda, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Venda.Ven_DataEmissao, dbo.Clientes.Cli_Nome, dbo.clientes.cli_cnpj_cpf, dbo.clientes.cli_tp_pessoa, dbo.Municipio.mun_nome,
SELECT TOP (100) PERCENT dbo.VendaAmbiente.VenAmb_Descricao, dbo.produtos.Pro_descricao, dbo.VendaProduto.CodAcabamento, dbo.VendaProduto.Pro_codnosso, dbo.Marca.Marca_Descricao,
SELECT     TipoPeca.TpPeca_sigla,TipoPeca.TpPeca_Codigo, TipoPeca.TpPeca_Situacao, TipoPeca.GrupoProduto_codigo, GrupoProduto.GrupoProduto_Descricao
SELECT     dbo.Transferencia_filiais.Tfi_data, dbo.Filiais.Fil_fantasia, dbo.Filiais.Fil_numero, dbo.Transferencia_filiais.Tfi_codigo,
SELECT     TOP (100) PERCENT dbo.fornecedor.For_Nome, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao,
SELECT contas_receber.Ctr_codigo,contas_Receber_det.ctr_codigo_det , contas_Receber_det.Ctr_dt_vencimento, contas_Receber_det.Ctr_valor_vencimento,
select * from RequisicaoEstoq
SELECT     dbo.Clientes.Cli_Nome, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento, dbo.Obras.Obr_Bairro,
SELECT  mdo_nome, mdo_codigo
SELECT     SUM(dbo.DevolucaoDesagio.DevDes_valorComDesc) AS VALOR, dbo.DevolucaoDesagio.DevDes_porcentagem, dbo.DevolucaoDesagio.GrupoProduto_Codigo
SELECT     dbo.Pasta.Pasta_Descricao, dbo.Obras.Obr_Descricao, dbo.Clientes.Cli_Nome, dbo.Venda.ParSV_serie, dbo.Venda.Ven_codigo
SELECT     dbo.estoque_produto_dia.EstTp_Codigo, dbo.produtos.Pro_codnosso, dbo.estoque_produto_dia.Epd_Acabamento, dbo.produtos.Pro_Codbase,
SELECT     VenInd_Porcentagem
SELECT        SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.VendaProduto.VenPro_VlUnitario) AS totalitem, dbo.FornecedorRTGrupProd.GrupoProduto_Codigo,
SELECT        dbo.DevolucaoProduto.DevPro_Quantidade * (dbo.DevolucaoProduto.DevPro_VlUnitario - CASE WHEN (dbo.Devolucao.Dev_DescontoPorcProd)
SELECT pedido_materiais_det.Pro_codnosso, pedido_materiais_det.pma_acabamento, Sum([pedido_materiais_det].[pma_quantidade])-Estoque_produto.Epr_estoque AS total, pedido_materiais_det.ped_codigo_pre, pedido_materiais_det.pma_saida_comp
SELECT pedido_luminaria_det.ped_codigo_pre, pedido_luminaria_det.Pro_codnosso, pedido_luminaria_det.pld_acabamento, Sum(pedido_luminaria_det.pld_quantidade)-Estoque_produto.Epr_estoque AS total, pedido_luminaria_det.pld_saida_comp
SELECT     dbo.Pasta.Pasta_Descricao, dbo.Obras.Obr_Descricao, dbo.Clientes.Cli_Nome, dbo.Venda.ParSV_serie, dbo.Venda.Ven_codigo, dbo.Pasta.Pasta_codigo
SELECT dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, dbo.produtos.Pro_descricao, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto,
SELECT    venda.ven_codigo, venda.ven_codigopre, dbo.Clientes.Cli_Nome, dbo.VendaAmbiente.CodAmbiente, dbo.Ambiente.DescAmbiente, venda.ParSV_serie
SELECT     dbo.produtos.Pro_codnosso, produtos.pro_descricao, ProdFor_CodigoProduto, ProdFor_DescricaoProduto, ProdutosFornecedores.For_codigo,
SELECT dbo.controle_entrega_data.cep_tipo, dbo.controle_entrega_data.cep_operacao, SUM(dbo.controle_entrega_data.ced_quantidade) AS ced_quantidade, dbo.controle_entrega_data.cep_acabamento,
SELECT    venda.ven_codigo, dbo.Clientes.Cli_Nome, dbo.produtos.Pro_Codbase, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,
SELECT dbo.VendaProduto.Pro_codnosso, dbo.produtos.Pro_descricao, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_tp_produto, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto,
SELECT     dbo.Clientes.Cli_Nome, dbo.Venda.Ven_codigo, dbo.Venda.Ven_Situacao, dbo.Venda.ParSV_serie, dbo.Venda.Ven_Orcamento, dbo.Venda.Ven_DataEmissao,
SELECT     dbo.Devolucao.Dev_codigo, dbo.Devolucao.Dev_CodigoPre, dbo.Devolucao.ven_codigopre, dbo.Devolucao.Dev_Dtemissao, dbo.VendaAmbiente.VenAmb_Descricao,
SELECT Venda.Ven_codigo, Venda.ParSV_serie, Venda.Ven_DataEmissao, Venda.Ven_DataFechaVenda, Venda.Ven_Situacao, Clientes.Cli_Nome, Venda.Ven_CodigoPre
SELECT     sev_cod, Serv_Desc
SELECT DISTINCT dbo.Devolucao.ven_codigopre, dbo.Venda.Ven_DataEmissao, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.Clientes.Cli_Nome
SELECT     pedido.ped_codigo, pedido.ped_dt_fechamento, Saida_complementacao.scp_cliente, Ambiente.DescAmbiente, Funcionario.Fun_Nome,
SELECT top 1 dbo.Beneficio.Benf_Codigo, dbo.Beneficio.Benf_UF, dbo.Beneficio_CST.BenfCST_Codigo, dbo.Beneficio.Benf_Codigo + '  -  ' + CONVERT(varchar(300), dbo.Beneficio.Benf_Descricao) AS descricao
SELECT        dbo.Estoque_produto.EstTp_Codigo, dbo.Estoque_produto.Epr_estoque, dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, dbo.produtos.Pro_descricao,
SELECT    dbo.Clientes.Cli_Nome, dbo.pedido.cli_codigo, dbo.pedido.ped_codigo, dbo.pedido.ped_dt_fechamento, dbo.VendaIndicacao.VenInd_TpDoc,
SELECT   Transferencia_filiais_produtos.*, produtos.Pro_tp_produto AS Pro_tp_produto, produtos.Pro_tp_peca AS Pro_tp_peca, produtos.Pro_descricao AS Pro_descricao, produtos.Pro_unidade
SELECT     MAX(dbo.VendaProduto.pld_codindice) AS pld_codindice, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, SUM(dbo.VendaProduto.VenPro_Quantidade) AS total, dbo.Estoque_produto.Epr_estoque,
SELECT     (dbo.VendaProduto.pld_codindice) AS pld_codindice, dbo.VendaProduto.Ven_CodigoPre, dbo.VendaProduto.Pro_codnosso, dbo.VendaProduto.CodAcabamento, dbo.VendaProduto.VenPro_Quantidade AS total, dbo.Estoque_produto.Epr_estoque,
SELECT     TOP (100) PERCENT dbo.Acabamento.DescAcabamento, dbo.Acabamento.CodAcabamento, dbo.Preco_Produto.Pre_Venda, dbo.Preco_Produto.Pre_Ativo,
SELECT        dbo.Promocao.Prom_Descricao, dbo.PromocaoProdutos.PromProd_VlNormal, dbo.PromocaoProdutos.PromProd_Vlpromocional, dbo.PromocaoProdutos.PromProd_desconto
SELECT dbo.VendaAtendente.Fun_Codigo, SUM(dbo.NotaFiscal.NTF_VLProdutos) AS NTF_VLProdutos, SUM(dbo.NotaFiscal.NTF_VlNota) AS NTF_VlNota, SUM(dbo.NotaFiscal.NTF_Desconto) AS NTF_Desconto, dbo.Funcionario.Fun_Nome
SELECT     dbo.fornecedor.For_Nome AS For_Nome, dbo.AltValorTabela.*, dbo.SisUsuarios.Nome AS Usuario, dbo.produtos.Pro_descricao AS Pro_descricao,
SELECT     Mba_operacao, Mba_historico, Mba_valor, Mba_din_che_tra, Mba_data_emissao, Mba_data_efetivacao, Mba_efetivado, Cba_codigo,
SELECT dbo.Venda.Ven_Tipo, dbo.RequisicaoEstoq.ReqEst_TipoDoc, dbo.RequisicaoEstoq.ReqEst_Codigo, dbo.RequisicaoEstoq.ReqEst_NumDoc, dbo.RequisicaoEstoq.ReqEst_Data, dbo.RequisicaoEstoq.ReqEst_Situacao,
SELECT dbo.RequisicaoEstoqProd.CodAcabamento, dbo.RequisicaoEstoqProd.ReqEstProd_Quant, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto
SELECT dbo.BalancoEstoque.BalEst_Codigo, dbo.BalancoEstoque.BalEst_Descricao, dbo.BalancoEstoque.BalEst_DataProc, dbo.BalancoEstoqueProdutos.Pro_Codnosso, dbo.BalancoEstoqueProdutos.CodAcabamento,
SELECT  'A RECEBER' AS tipoconta,  CASE WHEN ControleChequeDet.ControlChequeDet_Vinculo = 'OUTROS ' THEN ControleChequeDet.ControlChequeDet_emitente WHEN ControleChequeDet.ControlChequeDet_Vinculo
SELECT dbo.Bancos.ban_codigo, dbo.Contas_Bancarias.Cba_numero, dbo.Contas_Bancarias.Cba_dt_abertura, dbo.Contas_Bancarias.Cba_gerente,
SELECT Ctp_vinculo, Ctp_nome,
SELECT dbo.Controle_entrega.cen_codigo_pre, dbo.Controle_entrega.cen_codigo, dbo.Controle_entrega.cen_pedido_avulso, dbo.Controle_entrega.cen_tipo, dbo.Controle_entrega.cen_data_conclusao, dbo.Controle_entrega.cen_cliente,
SELECT dbo.controle_entrega_prod.CEP_QuantidadeDevolvida, dbo.controle_entrega_prod.cen_codigo_pre, dbo.controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento, dbo.controle_entrega_prod.cep_tipo,
SELECT   dbo.Venda.Ven_Tipo, dbo.Clientes.Cli_Nome, dbo.Venda.Ven_codigo, dbo.Venda.ParSV_serie, dbo.controle_entrega_prod.Pro_codnosso, dbo.controle_entrega_prod.cep_acabamento,
SELECT     dbo.contas_Receber_det.Ctr_duplicata, dbo.contas_Receber_det.Ctr_duplicataImp, dbo.contas_Receber_det.Ctr_duplicataImpData,
SELECT     dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, dbo.EmpresaFactoring.EmpFact_CNPJ, dbo.EmpresaFactoring.EmpFact_Nome,
SELECT dbo.DevolucaoProduto.Pro_codnosso, dbo.DevolucaoProduto.CodAcabamento, dbo.produtos.Pro_unidade, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto,
SELECT     dbo.DevolucaoServico.DevSer_item, dbo.DevolucaoServico.Sev_cod, dbo.DevolucaoServico.CodAmbiente, dbo.DevolucaoServico.DevSer_quantidade,
SELECT     dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento,
SELECT dbo.fornecedor.For_Nome, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao, dbo.Preco_Produto.Pre_Acabamento,
SELECT     TOP (100) PERCENT
SELECT venda.ven_codigo, dbo.Clientes.Cli_Nome, ProdutosFornecedores.ProdFor_CodigoProduto as Pro_Codbase, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_descricao,  ProdutosFornecedores.ProdFor_DescricaoProduto as Pro_descricao_for, dbo.produtos.Pro_CodEspecial, SUM(VendaProduto.VenPro_Quantidade) AS quantidade, dbo.Acabamento.DescAcabamento,  dbo.produtos.Pro_unidade, venda.Ven_DataEmissao, dbo.GrupoProduto.GrupoProduto_Descricao, dbo.produtos.Pro_tp_peca, venda.ParSV_serie ,VendaAmbiente.VenAmb_Descricao, Preco_Produto.Pre_CodBarra, ProdutosFornecedores.ProdFor_CodigoBarra
SELECT     0 AS codigo, dbo.Movimento_bancario.Mba_valor AS valor, dbo.Movimento_bancario.Mba_data_emissao AS data, 'B' AS tipoct,
SELECT     0 AS codigo, dbo.Movimentos.Mvt_valor AS valor, dbo.Movimentos.Mvt_data AS data, 'B' AS tipoct, dbo.Movimentos.mvt_din_che_tran AS modo,
sELECT     dbo.contas_Receber_det.ctr_codigo_det AS codigo, dbo.contas_Receber_det.Ctr_valor_pagamento AS valor, dbo.contas_Receber_det.Ctr_dt_vencimento AS data,
SELECT     dbo.contas_apagar_det.ctp_codigo_det AS codigo, dbo.contas_apagar_det.Ctp_valor_vencimento AS valor, dbo.contas_apagar_det.Ctp_dt_vencimento AS data,
SELECT        dbo.Clientes.Cli_Codigo, dbo.Clientes.Cli_cnpj_cpf, dbo.Clientes.Cli_IE_RG, dbo.Clientes.Cli_tp_pessoa, dbo.Clientes.Cli_rg_org, dbo.Clientes.Cli_rg_org_uf,
SELECT TOP (100) PERCENT dbo.produtos.pro_NCM, dbo.TabelaImposto.PIS_codigo, dbo.TabelaImposto.COFINS_codigo, dbo.produtos.Pro_codnosso, dbo.ProdutosFornecedores.ProdFor_CodigoProduto,
SELECT  fornecedor.For_situacao,   dbo.Bancos.Ban_Nome, dbo.fornecedor.For_codigo, dbo.fornecedor.For_Sigla, dbo.fornecedor.For_cnpj_cpf, dbo.fornecedor.For_IE,
SELECT        dbo.produtos.Pro_codnosso, dbo.produtos.Pro_Codbase, dbo.produtos.For_codigo, dbo.produtos.Pro_tp_produto, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao, dbo.produtos.Pro_descricao_for,
SELECT        dbo.produtos.Pro_codnosso, dbo.ProdutosRelacionados.ProdRel_Descricao, dbo.ProdutosRelacionadosDet.CodAcabamento, dbo.ProdutosRelacionadosDet.ProdRelDet_Quantidade,
SELECT        dbo.fornecedor.For_Nome, dbo.ProdutosFornecedores.ProdFor_CodigoProduto, dbo.ProdutosFornecedores.ProdFor_DescricaoProduto, dbo.ProdutosFornecedores.ProdFor_CodigoBarra,
SELECT dbo.contas_Receber_det.Ctr_parcela, dbo.contas_Receber_det.Ctr_dt_vencimento, dbo.contas_Receber_det.Ctr_valor_vencimento,
SELECT     dbo.Modo.Mdo_nome, dbo.Contas_receber_pag.Crp_valor_pago, dbo.Contas_receber_pag.Crp_data_pagamento, dbo.Contas_receber_pag.Crp_numero_banco,
select Fpg_codigo, Fpg_descricao, Fpg_quantidade, fpg_orcamento, Fpg_acrescimo_lu, Fpg_acrescimo_ma, Fpg_acrescimo_se
SELECT     dbo.ControleRH.Tpd_codigo, dbo.ControleRH.CtrlRH_CodDocOri, dbo.ControleRH.CtrlRH_TpDocOri, dbo.ControleRH.CtrlRH_Valor,
SELECT dbo.Clientes.Cli_Nome, dbo.Entrega.Ent_endereco + ', ' + case when  dbo.Entrega.Ent_numero is not null then Entrega.Ent_numero else '' end  + '  ' + case when Entrega.Ent_Complemento is not null then Entrega.Ent_Complemento else '' end AS endereco, dbo.Entrega.Ent_Bairro, dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, dbo.Entrega.Ent_CEP
SELECT Indice_preco.Ipr_situacao,Indice_preco.Ipr_custo,Indice_preco.Ipr_vl_Tabela,Indice_preco.Ipr_Lucro,Indice_preco.Ipr_vl_venda,Indice_preco.Ipr_vl_Custo,Indice_preco.Ipr_descricao,Indice_preco.Ipr_produto,Indice_preco.for_codigo, Indice_preco.Ipr_Indice,
SELECT dbo.Modo.Mdo_codigo, dbo.Modo.Mdo_nome, dbo.Modo.Mdo_tipo, dbo.Modo.Mdo_situacao, dbo.SPEDFormaPagamento.SPEDFormaPag_Descricao, dbo.EFD_REGISTRO_150.EFDR150_NOME
SELECT dbo.NotaFiscal.NTF_Numero, dbo.NotaFiscal.NTF_Serie, dbo.NotaFiscal.NTF_Modelo, 'E' AS NTF_Tipo, dbo.NotaFiscalTroca.Pro_codnosso, dbo.NotaFiscalTroca.CodAcabamento, dbo.produtos.Pro_descricao,
SELECT dbo.NotaFiscal.CFOP_codigo, SUM(dbo.NotaFiscal.NTF_DespAcessoria) AS despesa, SUM(dbo.NotaFiscal.NTF_VlNota) AS TOTAL, SUM(dbo.NotaFiscal.NTF_VlIPI) AS ipi, SUM(dbo.NotaFiscal.NTF_BaseSubstICMS) AS basest,
SELECT SUM(NTF_DespAcessoria) AS despesa, SUM(NTF_VlNota) AS TOTAL, SUM(NTF_VlIPI) AS ipi, SUM(NTF_BaseSubstICMS) AS basest, SUM(NTF_VlSubstICMS) AS vl_st, SUM(NTF_VlICMS) AS vl_icms, SUM(NTF_BaseICMS) AS base_icms,
SELECT     NTF_Numero, NTF_Serie, NTF_Tipo, NTF_Modelo, CFOP_codigo, NTF_DtEmissao, NTF_DtSaidaEntrada, NTF_HoraSaida, NTF_BaseICMS, NTF_VlICMS, NTF_BaseSubstICMS, NTF_VlSubstICMS, NTF_VLProdutos, NTF_VlFrete, NTF_VlSeguro, NTF_DespAcessoria, NTF_VlIPI, NTF_VlNota,
SELECT     SUM(NTF_BaseICMS) AS NTF_BaseICMS, SUM(NTF_VlICMS) AS NTF_VlICMS, SUM(NTF_BaseSubstICMS) AS NTF_BaseSubstICMS, SUM(NTF_VlSubstICMS) AS NTF_VlSubstICMS, SUM(NTF_VLProdutos) AS NTF_VLProdutos, SUM(NTF_VlFrete) AS NTF_VlFrete, SUM(NTF_VlSeguro)
SELECT     YEAR(NTF_DtEmissao) AS ano, MONTH(NTF_DtEmissao) AS mes, NTF_Numero, NTF_Serie, NTF_Tipo, NTF_Modelo, CFOP_codigo, NTF_DtEmissao, Emp_Codigo, NTF_ProtocoloNFE, NTF_ProtocoloNFECanc, NTF_DescMotivoCanc
SELECT     TOP (100) PERCENT dbo.Nota_entrada.Nen_numero_nota, dbo.fornecedor.For_Nome, dbo.Nota_Entrada_Dif.NenDf_DifProd, dbo.Nota_Entrada_Dif.NenDf_DifFinc,
SELECT  '1' AS ordem,   dbo.VendaAmbiente.VenAmb_Descricao, dbo.Orcamento_luminaria_det.old_seq AS SEQ, dbo.Orcamento_luminaria_det.old_seq_item AS seq_item,
SELECT '2' AS ordem, dbo.VendaAmbiente.VenAmb_Descricao, dbo.Orcamento_materiais_det.oma_seq AS SEQ, dbo.Orcamento_materiais_det.oma_seq_item AS seq_item,
SELECT     venda.Ven_ValorFrete,dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento,
SELECT   dbo.produtos.Pro_unidade AS unidade, dbo.VendaProduto.CodAcabamento AS acabamento, SUM(dbo.VendaProduto.VenPro_Quantidade) AS quantidade, dbo.VendaProduto.Pro_codnosso,
SELECT     dbo.Modo.Mdo_nome AS mdo_nome, dbo.contas_Receber_det.Ctr_dt_vencimento, dbo.contas_Receber_det.Ctr_valor_vencimento,
SELECT Municipio_1.mun_nome, Municipio_1.mun_uf, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento, dbo.Obras.Obr_Bairro, dbo.Obras.Obr_CEP, dbo.Obras.obr_transf,
SELECT dbo.Venda.Ven_ValorFrete, Municipio_1.mun_nome, Municipio_1.mun_uf, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento, dbo.Obras.Obr_Bairro, dbo.Obras.Obr_CEP,
SELECT TOP (100) PERCENT SUM(dbo.VendaProduto.VenPro_VlItem) AS valor, dbo.VendaProduto.CodAmbiente, dbo.VendaProduto.VenPro_Seq, dbo.VendaAmbiente.VenAmb_Descricao, dbo.Venda.Ven_CodigoPre
SELECT  Venda.Ven_ValorFrete,    dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento,
SELECT produtos.Pro_CodReduzido , dbo.produtos.Pro_unidade AS unidade, dbo.VendaProduto.CodAcabamento AS acabamento, SUM(dbo.VendaProduto.VenPro_Quantidade) AS quantidade, dbo.VendaProduto.Pro_codnosso,
SELECT     dbo.fornecedor.For_Nome, dbo.ordem_compra.Ocp_codigo, dbo.ordem_compra.Ocp_dt_envio, dbo.ordem_compra.Ocp_dt_ordem,
SELECT     dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, dbo.fornecedor.For_Nome, dbo.fornecedor.For_Endereco, dbo.fornecedor.For_numero, dbo.fornecedor.For_fone1,
SELECT    ordem_compra_det.Pro_codnosso,     dbo.ordem_compra_det.Ocd_acabamento, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase,
SELECT    ordem_compra_det.Pro_codnosso,ordem_compra_det.Ocd_acabamento, dbo.ProdutosFornecedores.ProdFor_CodigoProduto AS Pro_Codbase, CASE WHEN ProdutosFornecedores.ProdFor_DescricaoCompl IS NULL
SELECT     Municipio_1.mun_nome AS MunCobranca, Municipio_1.mun_uf AS UFCobranca, dbo.Municipio.mun_nome AS MunEntrega, dbo.Municipio.mun_uf AS UFEntrega,
SELECT     TOP (100) PERCENT dbo.ordem_compra.Ocp_codigo, dbo.ordem_compra.Ocp_modo, dbo.ordem_compra_det.ocd_ped_av_fan, dbo.ordem_compra_det.Pro_codnosso,
SELECT dbo.Obras.Obr_Descricao, dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento, dbo.Obras.Obr_Bairro, dbo.Obras.Obr_CEP, dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, dbo.Clientes.Cli_Nome,
SELECT dbo.OrdemServicoProduto.Pro_codnosso, dbo.OrdemServicoProduto.CodAcabamento, dbo.OrdemServicoProduto.OrdServProd_Quantidade, dbo.OrdemServicoProduto.OrdServProd_VlUnitario,
SELECT  dbo.pedido_compra.Pcp_codigo, dbo.pedido_compra.Pcp_pedido_venda, dbo.pedido_compra.Pcp_modo, dbo.pedido_compra.Pcp_ped_av_fan,
SELECT dbo.PromocaoProdutos.Pro_codnosso, dbo.PromocaoProdutos.CodAcabamento, dbo.produtos.Pro_tp_peca, dbo.produtos.Pro_descricao, dbo.ProdutosFornecedores.ProdFor_CodigoProduto,
SELECT     dbo.VendaAmbiente.VenAmb_TpDoc, dbo.produtos.Pro_codnosso, dbo.produtos.Pro_Codbase, dbo.VendaAmbiente.VenAmb_Descricao,
SELECT     dbo.produtos.Pro_Consumo, dbo.produtos.Pro_Tensao, SUM(dbo.VendaProduto.VenPro_Quantidade * dbo.produtos.Pro_Consumo) AS total,
SELECT     dbo.contas_Receber_det.Ctr_parcela, dbo.contas_receber.Ctr_cod_documento, dbo.Tipo_documento.Tpd_descricao, dbo.Tipo_documento.Tpd_codigo,
SELECT        dbo.contas_apagar_det.Ctp_dt_vencimento, dbo.contas_apagar_det.Ctp_valor_vencimento, dbo.contas_apagar_det.Ctp_parcela, dbo.contas_apagar_det.Ctp_recibo,
SELECT     dbo.Clientes.Cli_Nome, dbo.Obras.Obr_Descricao, dbo.pedido.ped_tl_geral_luminaria AS luminaria, dbo.pedido.ped_tl_geral_materiais AS materiais,
SELECT     dbo.contas_apagar_det.Ctp_dt_vencimento, dbo.contas_apagar_det.Ctp_valor_vencimento, dbo.contas_apagar_det.Ctp_parcela, dbo.Reserva_tecnica.Ret_tipo,
SELECT     dbo.VendaServico.VenSer_vlunitario, dbo.VendaServico.VenSer_vlitem, dbo.VendaServico.VenSer_quantidade, dbo.Servicos.Serv_Desc, dbo.Venda.Ven_codigo,
SELECT     SUM(dbo.VendaServico.VenSer_vlunitario) AS VenSer_vlunitario, SUM(dbo.VendaServico.VenSer_vlitem) AS VenSer_vlitem,
SELECT     TOP (100) PERCENT CASE WHEN NTF_Modelo = '55' THEN 'NFe' ELSE 'NFCe' END AS modelo, dbo.NotaFiscal.NTF_Numero, dbo.NotaFiscal.NTF_DtEmissao, dbo.NotaFiscal.NTF_Situacao, dbo.NotaFiscal.Cli_Codigo, dbo.NotaFiscal.NTF_Nome, dbo.Clientes.Cli_Nome,
SELECT     dbo.controle_entrega_data.cen_codigo_pre, dbo.controle_entrega_data.Pro_codnosso, dbo.controle_entrega_data.cep_acabamento,
SELECT dbo.Obras.Obr_Endereco, dbo.Obras.Obr_numero, dbo.Obras.Obr_complemento, dbo.Obras.Obr_Bairro, dbo.Venda.Ven_CodigoPre, dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, Obras.Obr_Descricao
SELECT     dbo.Municipio.mun_codigo, dbo.Municipio.mun_nome, dbo.Municipio.mun_uf, dbo.Municipio.mun_situacao, dbo.Paises.Paises_Descricao,
select COD_ATIVID, NOME_ATIVI, prof_situacao from Profiss
SELECT dbo.controle_entrega_data.Pro_codnosso, dbo.controle_entrega_data.cep_acabamento, SUM(dbo.controle_entrega_data.ced_quantidade) AS ced_quantidade, dbo.controle_entrega_data.cep_tipo, dbo.produtos.Pro_descricao,
