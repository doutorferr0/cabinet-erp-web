/* ===== SQL_SCALAR_FUNCTION :: CompraEstoque ===== */
CREATE FUNCTION [dbo].[CompraEstoque] (@produto varchar(21), @acabamento varchar(10), @tipo varchar(1))
RETURNS  FLOAT
AS
BEGIN
DECLARE @quantidade_solicit float , @QUANT_UTILIZADA float ,@Quant_Nota float, @soma float, @resultado float
if @tipo ='E'
BEGIN
DECLARE compra_cursor CURSOR FOR
SELECT ordem_compra_det.Ocd_quantidade_solicit,
(SELECT SUM(Res_Quantidade) AS TOTAL
 FROM Reserva_Estoque AS ER
 WHERE (Res_Ordem = ordem_compra_det.Ocp_codigo) AND (Res_OrdemItem = ordem_compra_det.Ocd_item) AND
(Res_CodigoProduto = ordem_compra_det.Pro_codnosso) AND (Res_Acabamento = ordem_compra_det.Ocd_acabamento))
 AS QUANT_UTILIZADA,
 (SELECT  SUM(nota_entrada_det.Ned_quantidade_recebida) AS TotalNota
 FROM nota_entrada_det INNER JOIN Nota_entrada ON nota_entrada_det.Nen_codigo = Nota_entrada.Nen_codigo
 WHERE (Nota_entrada.Nen_status <> 'C') AND (nota_entrada_det.Ned_cod_ordem = dbo.ordem_compra_det.Ocp_codigo) AND
 (nota_entrada_det.Ned_item_ordem = ordem_compra_det.Ocd_item)) AS Quant_Nota
 FROM ordem_compra_det INNER JOIN ordem_compra ON ordem_compra_det.Ocp_codigo = ordem_compra.Ocp_codigo INNER JOIN
 produtos ON ordem_compra_det.Pro_codnosso = produtos.Pro_codnosso
 WHERE  (ordem_compra.Ocp_status = 'A') AND (ordem_compra_det.Ocd_destino = 'ESTOQUE') AND
 (ordem_compra_det.Pro_codnosso = @produto) AND (dbo.ordem_compra_det.Ocd_acabamento = @acabamento) AND
 (ordem_compra_det.Ocd_recebimento IS NULL OR
 ordem_compra_det.Ocd_recebimento <> 'INTEGRAL')
ORDER BY ordem_compra.Ocp_dt_prevista
END
ELSE
BEGIN
DECLARE compra_cursor CURSOR FOR
SELECT ordem_compra_det.Ocd_quantidade_solicit,
(SELECT SUM(Res_Quantidade) AS TOTAL
 FROM Reserva_Estoque AS ER
 WHERE (Res_Ordem = ordem_compra_det.Ocp_codigo) AND (Res_OrdemItem = ordem_compra_det.Ocd_item) AND
(Res_CodigoProduto = ordem_compra_det.Pro_codnosso) AND (Res_Acabamento = ordem_compra_det.Ocd_acabamento))
 AS QUANT_UTILIZADA,
 (SELECT  SUM(nota_entrada_det.Ned_quantidade_recebida) AS TotalNota
 FROM nota_entrada_det INNER JOIN Nota_entrada ON nota_entrada_det.Nen_codigo = Nota_entrada.Nen_codigo
 WHERE (Nota_entrada.Nen_status <> 'C') AND (nota_entrada_det.Ned_cod_ordem = dbo.ordem_compra_det.Ocp_codigo) AND
 (nota_entrada_det.Ned_item_ordem = ordem_compra_det.Ocd_item)) AS Quant_Nota
 FROM ordem_compra_det INNER JOIN ordem_compra ON ordem_compra_det.Ocp_codigo = ordem_compra.Ocp_codigo INNER JOIN
 produtos ON ordem_compra_det.Pro_codnosso = produtos.Pro_codnosso
 WHERE  (ordem_compra.Ocp_status = 'A')  AND
 (ordem_compra_det.Pro_codnosso = @produto) AND (dbo.ordem_compra_det.Ocd_acabamento = @acabamento) AND
 (ordem_compra_det.Ocd_recebimento IS NULL OR
 ordem_compra_det.Ocd_recebimento <> 'INTEGRAL')
ORDER BY ordem_compra.Ocp_dt_prevista
END
OPEN compra_cursor
FETCH NEXT FROM compra_cursor
INTO @quantidade_solicit, @QUANT_UTILIZADA,@Quant_Nota
set @resultado = 0
WHILE @@FETCH_STATUS = 0
BEGIN
set @soma = 0
if @QUANT_UTILIZADA is not null  set @soma = @QUANT_UTILIZADA;
if @Quant_Nota is not null
begin
if @Quant_Nota > @soma  set @soma = @Quant_Nota
end;
set @resultado = @resultado + (@quantidade_solicit - @soma)
 FETCH NEXT FROM compra_cursor
INTO @quantidade_solicit, @QUANT_UTILIZADA,@Quant_Nota
END
CLOSE compra_cursor
DEALLOCATE compra_cursor
	RETURN @resultado
END

GO

/* ===== SQL_SCALAR_FUNCTION :: estoquefisico ===== */
CREATE FUNCTION [dbo].[estoquefisico]
( 	@produto varchar(21), @acabamento varchar(5)  )
RETURNS float
AS
BEGIN
Declare @QuantEst float ,@QuantSepNaoEnt float ,@QuantNaoSep float, @resultado float, @OutrosEst bit, @quantOutrosEst float
DECLARE estoque_cursor CURSOR FOR
SELECT sum(Estoque_produto.Epr_estoque) as Epr_estoque
, case when (SELECT
sum(case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else  controle_entrega_prod.cep_quantidade_separada end -
case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_entregue AND controle_entrega_prod.cep_quantidade_entregue >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else   controle_entrega_prod.cep_quantidade_entregue end )
FROM controle_entrega_prod  where controle_entrega_prod.Pro_codnosso =Estoque_produto.Epr_Codnosso  and controle_entrega_prod.cep_acabamento=Estoque_produto.Epr_Acabamento) is null then '0'
else (SELECT
sum(case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else  controle_entrega_prod.cep_quantidade_separada end -
case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_entregue AND controle_entrega_prod.cep_quantidade_entregue >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else   controle_entrega_prod.cep_quantidade_entregue end )
FROM controle_entrega_prod  where controle_entrega_prod.Pro_codnosso =Estoque_produto.Epr_Codnosso  and controle_entrega_prod.cep_acabamento=Estoque_produto.Epr_Acabamento) end as sepnent
, case when (SELECT
sum( case when controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
- case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else controle_entrega_prod.cep_quantidade_separada end )
FROM controle_entrega_prod  where controle_entrega_prod.Pro_codnosso =Estoque_produto.Epr_Codnosso  and controle_entrega_prod.cep_acabamento=Estoque_produto.Epr_Acabamento) is null then '0'
else (SELECT sum( case when controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
- case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else controle_entrega_prod.cep_quantidade_separada end )
FROM controle_entrega_prod  where controle_entrega_prod.Pro_codnosso =Estoque_produto.Epr_Codnosso  and controle_entrega_prod.cep_acabamento=Estoque_produto.Epr_Acabamento)  end as naosep
FROM Estoque_produto
WHERE Estoque_produto.Epr_Codnosso =@produto AND Estoque_produto.Epr_Acabamento =@acabamento and Estoque_produto.EstTp_Codigo = 1
group by Estoque_produto.Epr_Codnosso,Estoque_produto.Epr_Acabamento
 OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @QuantEst,@QuantSepNaoEnt ,@QuantNaoSep
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
if (@QuantSepNaoEnt IS NULL)  set  @QuantSepNaoEnt=0
if (@QuantNaoSep IS NULL)  set  @QuantNaoSep=0
set @resultado = (@QuantEst + @QuantNaoSep) + @QuantSepNaoEnt
if @resultado < 0  set @resultado = 0
--- Buscar o campo para somar outros estoque true/false
DECLARE estoque_cursor CURSOR FOR
SELECT  Par_EstFisicoOutrosEst from Paramentros
OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @OutrosEst
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
if @OutrosEst = 1
begin
---- produtos de outros estoques
DECLARE estoque_cursor CURSOR FOR
SELECT SUM(Epr_estoque) AS estoque
FROM dbo.Estoque_produto
WHERE (EstTp_Codigo > 1) AND (Epr_estoque > 0) AND Epr_Codnosso =@produto and   Epr_Acabamento=@acabamento
OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @quantOutrosEst
if (not @quantOutrosEst> 0) OR (@quantOutrosEst IS NULL)  set  @quantOutrosEst=0
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
set @resultado = @resultado + @quantOutrosEst
end
 RETURN @resultado
 END

GO

/* ===== SQL_SCALAR_FUNCTION :: estoquefisicoData ===== */
CREATE FUNCTION [dbo].[estoquefisicoData]
( 	@produto varchar(21), @acabamento varchar(10), @data datetime  )
 RETURNS float
 AS
 BEGIN
 Declare @QuantEst float ,@QuantSepNaoEnt float ,@QuantNaoSep float, @resultado float, @OutrosEst bit,  @quantOutrosEst float
 DECLARE estoque_cursor CURSOR FOR
SELECT SUM(CASE WHEN dbo.estoque_produto_dia.Epd_estoque > 0 THEN dbo.estoque_produto_dia.Epd_estoque ELSE 0 END) AS Epr_estoque
, case when (SELECT
sum(case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else  controle_entrega_prod.cep_quantidade_separada end -
case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_entregue AND controle_entrega_prod.cep_quantidade_entregue >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
 case when controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
  then controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else   controle_entrega_prod.cep_quantidade_entregue end )
FROM   dbo.Controle_entrega AS Controle_entrega1 INNER JOIN
 dbo.controle_entrega_prod ON Controle_entrega1.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre  where controle_entrega_prod.Pro_codnosso =produtos.Pro_codnosso
 and controle_entrega_prod.cep_acabamento=Preco_Produto.Pre_Acabamento and Controle_entrega1.usr_dt_hr_criacao < @data
) is null then '0'
else (SELECT
sum(case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else  controle_entrega_prod.cep_quantidade_separada end -
case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_entregue AND controle_entrega_prod.cep_quantidade_entregue >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
 case when controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
  then controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else   controle_entrega_prod.cep_quantidade_entregue end )
FROM         dbo.Controle_entrega AS Controle_entrega2 INNER JOIN
  dbo.controle_entrega_prod ON Controle_entrega2.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre  where controle_entrega_prod.Pro_codnosso =produtos.Pro_codnosso
and controle_entrega_prod.cep_acabamento=Preco_Produto.Pre_Acabamento and Controle_entrega2.usr_dt_hr_criacao < @data
) end as sepnent
  , case when (SELECT
sum( case when controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
- case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
 (controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else controle_entrega_prod.cep_quantidade_separada end )
FROM  dbo.Controle_entrega AS Controle_entrega3 INNER JOIN
      dbo.controle_entrega_prod ON Controle_entrega3.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre  where controle_entrega_prod.Pro_codnosso =produtos.Pro_codnosso
 and controle_entrega_prod.cep_acabamento=Preco_Produto.Pre_Acabamento and Controle_entrega3.usr_dt_hr_criacao < @data
) is null then '0'
   else (SELECT
sum( case when controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
- case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
 (controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else controle_entrega_prod.cep_quantidade_separada end )
FROM  dbo.Controle_entrega AS Controle_entrega4 INNER JOIN
 dbo.controle_entrega_prod ON Controle_entrega4.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre  where controle_entrega_prod.Pro_codnosso =produtos.Pro_codnosso
and controle_entrega_prod.cep_acabamento=Preco_Produto.Pre_Acabamento and Controle_entrega4.usr_dt_hr_criacao < @data
)  end as naosep
  FROM         dbo.produtos INNER JOIN
  dbo.Preco_Produto ON dbo.produtos.Pro_codnosso = dbo.Preco_Produto.Pre_Codnosso   INNER JOIN
  dbo.estoque_produto_dia ON dbo.Preco_Produto.Pre_Codnosso = dbo.estoque_produto_dia.Epd_Codnosso AND
  dbo.Preco_Produto.Pre_Acabamento = dbo.estoque_produto_dia.Epd_Acabamento
where  produtos.Pro_codnosso =@produto AND Preco_Produto.Pre_Acabamento=@acabamento
AND EstTp_Codigo=1 and Epd_data = @data
group by produtos.Pro_codnosso,Preco_Produto.Pre_Acabamento
 OPEN estoque_cursor
 FETCH NEXT FROM estoque_cursor
 INTO @QuantEst,@QuantSepNaoEnt ,@QuantNaoSep
 CLOSE estoque_cursor
 DEALLOCATE estoque_cursor
 if (@QuantSepNaoEnt IS NULL)  set  @QuantSepNaoEnt=0
 if (@QuantNaoSep IS NULL)  set  @QuantNaoSep=0
 set @resultado = (@QuantEst + @QuantNaoSep) + @QuantSepNaoEnt
 if @resultado < 0  OR (@resultado IS NULL) set @resultado = 0
--- Buscar o campo para somar outros estoque true/false
DECLARE estoque_cursor CURSOR FOR
SELECT  Par_EstFisicoOutrosEst from Paramentros
OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @OutrosEst
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
if @OutrosEst = 1
begin
 ---- produtos de outros estoque
 DECLARE estoque_cursor CURSOR FOR
 SELECT sum(Epd_estoque) as total
 FROM estoque_produto_dia
 WHERE  (Epd_Codnosso =@produto) AND (Epd_Acabamento =@acabamento)
  AND EstTp_Codigo > 1 and Epd_data = @data
 OPEN estoque_cursor
 FETCH NEXT FROM estoque_cursor
 INTO @QuantOutrosEst
 if (@QuantOutrosEst < 0) OR (@QuantOutrosEst IS NULL)  set  @QuantOutrosEst=0
 CLOSE estoque_cursor
 DEALLOCATE estoque_cursor
 set @resultado = @resultado + @quantOutrosEst
end
RETURN @resultado
 END

GO

/* ===== SQL_SCALAR_FUNCTION :: estoquefisicoDataEmp ===== */
CREATE FUNCTION [dbo].[estoquefisicoDataEmp]
( 	@produto varchar(21), @acabamento varchar(10), @data datetime, @empresa int  )
 RETURNS float
 AS
 BEGIN
 Declare @QuantEst float ,@QuantSepNaoEnt float ,@QuantNaoSep float, @resultado float, @OutrosEst bit,  @quantOutrosEst float
 DECLARE estoque_cursor CURSOR FOR
SELECT SUM(CASE WHEN dbo.estoque_produto_dia.Epd_estoque > 0 THEN dbo.estoque_produto_dia.Epd_estoque ELSE 0 END) AS Epr_estoque
, case when (SELECT
sum(case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else  controle_entrega_prod.cep_quantidade_separada end -
case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_entregue AND controle_entrega_prod.cep_quantidade_entregue >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
 case when controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else   controle_entrega_prod.cep_quantidade_entregue end )
FROM  dbo.Controle_entrega as Controle_entrega1 INNER JOIN
dbo.Venda ON Controle_entrega1.ParSV_serie = dbo.Venda.ParSV_serie AND Controle_entrega1.cen_pedido_avulso = dbo.Venda.Ven_codigo INNER JOIN
dbo.controle_entrega_prod  ON Controle_entrega1.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre
WHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A')
 and controle_entrega_prod.Pro_codnosso =produtos.Pro_codnosso and Venda.emp_codigo = @empresa
and controle_entrega_prod.cep_acabamento=Preco_Produto.Pre_Acabamento and Controle_entrega1.usr_dt_hr_criacao < @data
) is null then '0'
else (SELECT
sum(case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else  controle_entrega_prod.cep_quantidade_separada end -
case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_entregue AND controle_entrega_prod.cep_quantidade_entregue >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else   controle_entrega_prod.cep_quantidade_entregue end )
FROM  dbo.Controle_entrega as Controle_entrega2 INNER JOIN
dbo.Venda ON Controle_entrega2.ParSV_serie = dbo.Venda.ParSV_serie AND Controle_entrega2.cen_pedido_avulso = dbo.Venda.Ven_codigo INNER JOIN
dbo.controle_entrega_prod  ON Controle_entrega2.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre
wHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') and Venda.emp_codigo = @empresa
 and controle_entrega_prod.Pro_codnosso =produtos.Pro_codnosso
and controle_entrega_prod.cep_acabamento=Preco_Produto.Pre_Acabamento and Controle_entrega2.usr_dt_hr_criacao < @data
) end as sepnent
, case when (SELECT
sum( case when controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
- case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else controle_entrega_prod.cep_quantidade_separada end )
FROM  dbo.Controle_entrega as Controle_entrega3 INNER JOIN
 dbo.Venda ON Controle_entrega3.ParSV_serie = dbo.Venda.ParSV_serie AND Controle_entrega3.cen_pedido_avulso = dbo.Venda.Ven_codigo INNER JOIN
dbo.controle_entrega_prod  ON Controle_entrega3.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre
WHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') and Venda.emp_codigo = @empresa
and controle_entrega_prod.Pro_codnosso =produtos.Pro_codnosso
and controle_entrega_prod.cep_acabamento=Preco_Produto.Pre_Acabamento and Controle_entrega3.usr_dt_hr_criacao < @data
) is null then '0'
else (SELECT
sum( case when controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
- case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else controle_entrega_prod.cep_quantidade_separada end )
FROM  dbo.Controle_entrega as Controle_entrega4 INNER JOIN
dbo.Venda ON Controle_entrega4.ParSV_serie = dbo.Venda.ParSV_serie AND Controle_entrega4.cen_pedido_avulso = dbo.Venda.Ven_codigo INNER JOIN
dbo.controle_entrega_prod  ON Controle_entrega4.cen_codigo_pre = dbo.controle_entrega_prod.cen_codigo_pre
WHERE  (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') and Venda.emp_codigo = @empresa
and controle_entrega_prod.Pro_codnosso =produtos.Pro_codnosso
and controle_entrega_prod.cep_acabamento=Preco_Produto.Pre_Acabamento and Controle_entrega4.usr_dt_hr_criacao < @data
)  end as naosep
FROM         dbo.produtos INNER JOIN
dbo.Preco_Produto ON dbo.produtos.Pro_codnosso = dbo.Preco_Produto.Pre_Codnosso   INNER JOIN
dbo.estoque_produto_dia ON dbo.Preco_Produto.Pre_Codnosso = dbo.estoque_produto_dia.Epd_Codnosso AND
dbo.Preco_Produto.Pre_Acabamento = dbo.estoque_produto_dia.Epd_Acabamento
where
produtos.Pro_codnosso =@produto AND Preco_Produto.Pre_Acabamento=@acabamento
AND EstTp_Codigo=1 and Epd_data = @data and estoque_produto_dia.Emp_codigo = @empresa
group by produtos.Pro_codnosso,Preco_Produto.Pre_Acabamento
OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @QuantEst,@QuantSepNaoEnt ,@QuantNaoSep
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
if (@QuantSepNaoEnt IS NULL)  set  @QuantSepNaoEnt=0
if (@QuantNaoSep IS NULL)  set  @QuantNaoSep=0
set @resultado = (@QuantEst + @QuantNaoSep) + @QuantSepNaoEnt
if @resultado < 0 OR (@resultado IS NULL) set @resultado = 0
--- Buscar o campo para somar outros estoque true/false
DECLARE estoque_cursor CURSOR FOR
SELECT  Par_EstFisicoOutrosEst from Paramentros
OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @OutrosEst
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
if @OutrosEst = 1
begin
---- produtos de outros estoque
DECLARE estoque_cursor CURSOR FOR
SELECT sum(Epd_estoque) as total
FROM estoque_produto_dia
WHERE  (Epd_Codnosso =@produto) AND (Epd_Acabamento =@acabamento) and Emp_codigo = @empresa
AND EstTp_Codigo > 1 and Epd_data = @data
OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @QuantOutrosEst
if (@QuantOutrosEst < 0) OR (@QuantOutrosEst IS NULL)  set  @QuantOutrosEst=0
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
set @resultado = @resultado + @quantOutrosEst
end
RETURN @resultado
END

GO

/* ===== SQL_SCALAR_FUNCTION :: estoquefisicoempresa ===== */
CREATE FUNCTION [dbo].[estoquefisicoempresa]
( 	@produto varchar(21), @acabamento varchar(10), @empresa int  )
 RETURNS float
 AS
 BEGIN
  Declare @QuantEst float ,@QuantSepNaoEnt float ,@QuantNaoSep float, @resultado float, @OutrosEst bit, @quantOutrosEst float
 DECLARE estoque_cursor CURSOR FOR
SELECT sum(Estoque_produto.Epr_estoque) as Epr_estoque
, case when (SELECT
sum(case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else  controle_entrega_prod.cep_quantidade_separada end -
case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_entregue AND controle_entrega_prod.cep_quantidade_entregue >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
 case when controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
 then controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else   controle_entrega_prod.cep_quantidade_entregue end )
FROM controle_entrega_prod INNER JOIN
Controle_entrega ON controle_entrega_prod.cen_codigo_pre = Controle_entrega.cen_codigo_pre INNER JOIN
Venda ON Controle_entrega.cen_pedido_avulso = Venda.Ven_codigo AND dbo.Controle_entrega.ParSV_serie = Venda.ParSV_serie
WHERE  (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (Venda.EMP_CODIGO =@EMPRESA)
AND controle_entrega_prod.Pro_codnosso =Estoque_produto.Epr_Codnosso  and controle_entrega_prod.cep_acabamento=Estoque_produto.Epr_Acabamento) is null then '0'
else (SELECT
sum(case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else  controle_entrega_prod.cep_quantidade_separada end -
case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_entregue AND controle_entrega_prod.cep_quantidade_entregue >
(controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
 case when controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
  then controle_entrega_prod.cep_quantidade_entregue - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
 else   controle_entrega_prod.cep_quantidade_entregue end )
FROM controle_entrega_prod INNER JOIN
Controle_entrega ON controle_entrega_prod.cen_codigo_pre = Controle_entrega.cen_codigo_pre INNER JOIN
Venda ON Controle_entrega.cen_pedido_avulso = Venda.Ven_codigo AND dbo.Controle_entrega.ParSV_serie = Venda.ParSV_serie
WHERE  (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (Venda.EMP_CODIGO =@EMPRESA)
AND controle_entrega_prod.Pro_codnosso =Estoque_produto.Epr_Codnosso  and controle_entrega_prod.cep_acabamento=Estoque_produto.Epr_Acabamento) end as sepnent
 , case when (SELECT
sum( case when controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
- case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
 (controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else controle_entrega_prod.cep_quantidade_separada end )
FROM controle_entrega_prod INNER JOIN
Controle_entrega ON controle_entrega_prod.cen_codigo_pre = Controle_entrega.cen_codigo_pre INNER JOIN
Venda ON Controle_entrega.cen_pedido_avulso = Venda.Ven_codigo AND dbo.Controle_entrega.ParSV_serie = Venda.ParSV_serie
WHERE  (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (Venda.EMP_CODIGO =@EMPRESA)
 AND controle_entrega_prod.Pro_codnosso =Estoque_produto.Epr_Codnosso  and controle_entrega_prod.cep_acabamento=Estoque_produto.Epr_Acabamento) is null then '0'
 else (SELECT sum( case when controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
 then controle_entrega_prod.cep_quantidade - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
- case when CEP_QuantidadeDevolvidaEst >= controle_entrega_prod.cep_quantidade_separada AND controle_entrega_prod.cep_quantidade_separada >
 (controle_entrega_prod.cep_quantidade - CEP_QuantidadeDevolvidaEst) then
 case when controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end > 0
then controle_entrega_prod.cep_quantidade_separada - case when CEP_QuantidadeDevolvidaEst > 0 then CEP_QuantidadeDevolvidaEst else 0 end else 0 end
else controle_entrega_prod.cep_quantidade_separada end )
FROM controle_entrega_prod INNER JOIN
Controle_entrega ON controle_entrega_prod.cen_codigo_pre = Controle_entrega.cen_codigo_pre INNER JOIN
Venda ON Controle_entrega.cen_pedido_avulso = Venda.Ven_codigo AND dbo.Controle_entrega.ParSV_serie = Venda.ParSV_serie
WHERE  (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND (Venda.EMP_CODIGO =@EMPRESA)
AND controle_entrega_prod.Pro_codnosso =Estoque_produto.Epr_Codnosso  and controle_entrega_prod.cep_acabamento=Estoque_produto.Epr_Acabamento)  end as naosep
FROM Estoque_produto
WHERE Estoque_produto.Epr_Codnosso =@produto AND Estoque_produto.Epr_Acabamento =@acabamento and Estoque_produto.emp_codigo =@empresa and Estoque_produto.EstTp_Codigo = 1
group by Estoque_produto.Epr_Codnosso,Estoque_produto.Epr_Acabamento
 OPEN estoque_cursor
 FETCH NEXT FROM estoque_cursor
 INTO @QuantEst,@QuantSepNaoEnt ,@QuantNaoSep
 CLOSE estoque_cursor
 DEALLOCATE estoque_cursor
 if (@QuantSepNaoEnt IS NULL)  set  @QuantSepNaoEnt=0
 if (@QuantNaoSep IS NULL)  set  @QuantNaoSep=0
 set @resultado = (@QuantEst + @QuantNaoSep) + @QuantSepNaoEnt
 if @resultado < 0  set @resultado = 0
--- Buscar o campo para somar outros estoque true/false
DECLARE estoque_cursor CURSOR FOR
SELECT  Par_EstFisicoOutrosEst from Paramentros
OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @OutrosEst
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
if @OutrosEst = 1
begin
---- produtos de outros estoques
DECLARE estoque_cursor CURSOR FOR
SELECT SUM(Epr_estoque) AS estoque
FROM dbo.Estoque_produto
WHERE (EstTp_Codigo > 1) AND (Epr_estoque > 0) AND Epr_Codnosso =@produto and   Epr_Acabamento=@acabamento AND Estoque_produto.EMP_CODIGO = @EMPRESA
OPEN estoque_cursor
FETCH NEXT FROM estoque_cursor
INTO @quantOutrosEst
if (not @quantOutrosEst> 0) OR (@quantOutrosEst IS NULL)  set  @quantOutrosEst=0
CLOSE estoque_cursor
DEALLOCATE estoque_cursor
set @resultado = @resultado + @quantOutrosEst
end
 RETURN @resultado
 END

GO

/* ===== SQL_SCALAR_FUNCTION :: EstoqueMinimo ===== */
CREATE FUNCTION [dbo].[EstoqueMinimo] (@produto varchar(21), @acab varchar(10))
RETURNS  int
AS
BEGIN
declare @EstMin int
declare @quant int
declare @prazo int
declare @quantVenda int
declare @vendadias int
declare @vendaperiodo int
SET @vendadias = (SELECT case when Par_EstMinVendas  is null then 0 else Par_EstMinVendas end as dias from Paramentros)
SET @vendaperiodo = (SELECT case when Par_EstMinPerioVend is null then 0 else Par_EstMinPerioVend end as dias from Paramentros)
set @quantVenda = 0
set @prazo  = (SELECT  case when fornecedor.For_prazo_entrega is null then 0 else fornecedor.For_prazo_entrega end as prazo 
FROM produtos INNER JOIN ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso INNER JOIN
fornecedor ON ProdutosFornecedores.For_codigo = fornecedor.For_codigo
 where produtos.pro_codnosso = @produto and ProdutosFornecedores.ProdFor_Padrao = 1)
/* pedido de venda */
set @quant =(
SELECT CASE WHEN SUM(VendaProduto.venpro_quantidade) IS NULL THEN 0 ELSE SUM(VendaProduto.venpro_quantidade) end
AS Expr1 
FROM dbo.Venda INNER JOIN
dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
dbo.CategoriaVenda ON dbo.Venda.CatVen_Codigo = dbo.CategoriaVenda.CatVen_Codigo
WHERE (dbo.CategoriaVenda.CatVen_Estoque = 1) and (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') and VendaProduto.Pro_codnosso = @produto and VendaProduto.CodAcabamento = @acab
and venda.Ven_DataEmissao >= (SELECT CONVERT(datetime,CONVERT(VARCHAR, (getdate() - @vendadias), 102),102))
)
if @quant > 0 set @quantVenda = @quantVenda + @quant
/* devolucao */
set @quant =(
SELECT CASE WHEN SUM(DevolucaoProduto.Devpro_quantidade) IS NULL THEN 0 ELSE SUM(DevolucaoProduto.Devpro_quantidade) end
AS Expr1
FROM dbo.Devolucao INNER JOIN
 dbo.DevolucaoProduto ON dbo.Devolucao.Dev_CodigoPre = dbo.DevolucaoProduto.Dev_CodigoPre INNER JOIN
dbo.Venda ON dbo.Devolucao.ven_codigopre = dbo.Venda.Ven_CodigoPre INNER JOIN
dbo.CategoriaVenda ON dbo.Venda.CatVen_Codigo = dbo.CategoriaVenda.CatVen_Codigo
WHERE  (dbo.CategoriaVenda.CatVen_Estoque = 1) and (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado IS NULL)
and DevolucaoProduto.Pro_codnosso = @produto and DevolucaoProduto.CodAcabamento = @acab
and Devolucao.Dev_Dtemissao >= (SELECT CONVERT(datetime,CONVERT(VARCHAR, (getdate() - @vendadias), 102),102))
)
if @quant > 0 set @quantVenda = @quantVenda - @quant
/* factura, venda a dinheiro */
set @quant =(SELECT  CASE WHEN SUM(FacturaProduto.FactProd_Quant) IS NULL THEN 0 ELSE SUM(FacturaProduto.FactProd_Quant) END AS Expr1
FROM Factura INNER JOIN FacturaProduto ON Factura.Fact_Tipo = FacturaProduto.Fact_Tipo AND
Factura.Fact_Codigo = FacturaProduto.Fact_Codigo LEFT OUTER JOIN
FacturaImport ON Factura.Fact_Tipo = FacturaImport.Fact_Tipo AND Factura.Fact_Codigo = FacturaImport.Fact_Codigo
WHERE Factura.Fact_Tipo in ('FCT','VDI') AND (FacturaImport.FactImp_codigo IS NULL)
AND FacturaProduto.Pro_codnosso = @produto AND FacturaProduto.CodAcabamento = @acab
and Factura.Fact_DtEmissao >=(SELECT CONVERT(datetime,CONVERT(VARCHAR, (getdate() - @vendadias), 102),102)) )
if @quant > 0  set @quantVenda = @quantVenda + @quant
/* NOTA FISCAL */
set @quant =(SELECT CASE WHEN SUM(NotaFiscalProdutos.NTFPro_Quant) IS NULL THEN 0 ELSE SUM(NotaFiscalProdutos.NTFPro_Quant) END AS Expr1
FROM NotaFiscal INNER JOIN
NotaFiscalProdutos ON NotaFiscal.NTF_Codigo = NotaFiscalProdutos.NTF_Codigo LEFT OUTER JOIN
NotaFiscalImportaDoc ON NotaFiscal.NTF_Codigo = NotaFiscalImportaDoc.NTF_Codigo
WHERE NotaFiscal.NTF_DtEmissao >= (SELECT CONVERT(datetime, CONVERT(VARCHAR, (getdate() - @vendadias), 102), 102))
AND NotaFiscalProdutos.Pro_codnosso = @produto AND NotaFiscalProdutos.CodAcabamento = @acab
AND NotaFiscal.NTF_Situacao ='A' and NotaFiscalImportaDoc.NTFImp_DocCodigo IS NULL)
if @quant > 0 set @quantVenda = @quantVenda + @quant
if @quantVenda < 0 set @quantVenda = 0;
if @vendaperiodo > 0
set @EstMin = (@quantVenda* @prazo)/@vendaperiodo
else set @EstMin = 0;
RETURN (@EstMin)
END

GO

/* ===== SQL_SCALAR_FUNCTION :: fn_numero_por_extenso ===== */
CREATE FUNCTION [dbo].[fn_numero_por_extenso]
(
@valor DECIMAL(18,2)
)
RETURNS VARCHAR(8000)
AS
BEGIN
DECLARE @valorCentavos	TINYINT	 --Valor dos Centavos
DECLARE @valorInt	 BIGINT	 --Remove os centavos
DECLARE @valorStr	 VARCHAR(20)	 --Valor como string
DECLARE @pedacoStr1	 VARCHAR(20)	 --Pedaco da str
DECLARE @pedacoStr2	 VARCHAR(20)	 --Pedaco da str
DECLARE @pedacoStr3	 VARCHAR(20)	 --Pedaco da str
DECLARE @pedacoInt1	 INT	 --Pedaco da INT
DECLARE @pedacoInt2	 INT	 --Pedaco da INT
DECLARE @pedacoInt3	 INT	 --Pedaco da INT
DECLARE @menorN	 INT
DECLARE @retorno VARCHAR(8000)
DECLARE @paises INT
set @paises = (select SysPaises_codigo from Paramentros)
SET @retorno = '' 
SET @valorInt = Convert(bigint, @valor)
SET @valorStr = Convert(VARCHAR(20), @valorInt)
SET @valorCentavos = Convert(int, (@valor - convert(bigint, @valor)) * 100)
--Retorna Zero
IF (@valor = 0)
BEGIN
if  (@paises=1) 
SET @retorno = 'Zero Reais'
else
SET @retorno = 'Zero Euros'
RETURN @retorno
END
DECLARE @numeros TABLE (descricao varchar(50), menor int, maior int)
DECLARE @milhar TABLE (descricaoUm varchar(50), descricaoPl Varchar(50), menor int, maior int)
INSERT INTO @numeros VALUES('Um', 1, 1)
INSERT INTO @numeros VALUES('Dois', 2, 2)
INSERT INTO @numeros VALUES('Três', 3, 3)
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
INSERT INTO @milhar VALUES('Milhão', 'Milhões', 7, 9)
INSERT INTO @milhar VALUES('Bilhão', 'Bilhões', 10, 12)
INSERT INTO @milhar VALUES('Trilhão', 'Trilhões', 13, 15)
INSERT INTO @milhar VALUES('Quadrilhão', 'Quadrilhões', 16, 18)
--Busca o número de casas (sempre em 3)
SELECT TOP 1 @menorN = menor - 1 FROM @milhar WHERE menor > len(@valorStr)
--Adiciona casas a esquerda (tratando sempre de 3 em 3 casas)
SET @valorStr = replicate('0', @menorN - len(@valorStr)) + @valorStr
--Varre Convertendo os valores para valores por extenso
WHILE (len(@valorStr) > 0)
BEGIN
--Busca os 3 primeiros carac.
SET @pedacoStr1 = left(@valorStr, 3)
SET @pedacoStr2 = right(@pedacoStr1, 2)
SET @pedacoStr3 = right(@pedacoStr2, 1)
SET @pedacoInt1 = Convert(int, @pedacoStr1)
SET @pedacoInt2 = Convert(int, @pedacoStr2)
SET @pedacoInt3 = Convert(int, @pedacoStr3)
--Busca a centena
SELECT
@retorno = @retorno + descricao + ' '
FROM
@numeros
WHERE
((len(@pedacoInt1) = 3) AND @pedacoStr1 BETWEEN menor AND maior)
OR ((@pedacoInt2 <> 0 AND len(@pedacoInt2) = 2) AND @pedacoInt2 BETWEEN menor AND maior)
OR ((@pedacoInt3 <> 0 AND(@pedacoInt2 < 10 OR @pedacoInt2 > 20)) AND @pedacoInt3 BETWEEN menor AND maior) --Remove de 11 a 19
ORDER BY
maior DESC
--Define o milhar (se foi escrito algum valor para ele)
IF (@pedacoInt1 > 0)
SELECT @retorno = @retorno + CASE WHEN @pedacoInt1 > 1 THEN descricaoPL ELSE descricaoUm END + ' ' FROM @milhar WHERE (len(@valorStr) BETWEEN menor and maior)
--Remove os pedaços efetuados
SET @valorStr = right(@valorStr, len(@valorStr) - 3)
IF (convert(int, left(@valorStr, 3)) > 0)
SET @retorno = @retorno + 'e '
ELSE
IF (convert(int, @valorStr) = 0 AND len(@valorStr) = 6) /*Somente coloca na dezena*/
SET @retorno = @retorno + 'de '
END
--Somente coloca se tiver algum valor.
IF (len(@retorno) > 0)
begin
if  (@paises=1) 
SET @retorno = @retorno + CASE WHEN @valorInt > 1 THEN 'Reais ' ELSE 'Real ' END
else
SET @retorno = @retorno + CASE WHEN @valorInt > 1 THEN 'Euros ' ELSE 'Euro ' END
end
--Busca os centavos
SET @valorStr = Convert(varchar(2), @valorCentavos)
--Adiciona casas a esquerda
SET @valorStr = replicate('0', 2 - len(@valorStr)) + @valorStr
--Define os centavos
--Busca os 2 caracteres
SET @pedacoStr1 = @valorStr
SET @pedacoStr2 = right(@valorStr, 1)
SET @pedacoInt1 = Convert(int, @pedacoStr1)
SET @pedacoInt2 = Convert(int, @pedacoStr2)
--Define a descrição (Não coloca se não tiver reais)
IF (@pedacoInt1 > 0 AND (len(@retorno) > 0))
SET @retorno = @retorno + 'e '
--Busca a centena
SELECT
@retorno = @retorno + descricao + ' '
FROM
@numeros
WHERE
((@pedacoInt1 <> 0 AND len(@pedacoInt1) = 2) AND @pedacoInt1 BETWEEN menor AND maior)
OR ((@pedacoInt2 <> 0 AND (@pedacoInt1 < 10 OR @pedacoInt1 > 20)) AND @pedacoInt2 BETWEEN menor AND maior)
ORDER BY
maior DESC
--Define a descrição
IF (@pedacoInt1 > 0)
begin
if  (@paises=1) 
SELECT @retorno = @retorno + 'Centavo' + CASE WHEN @pedacoInt1 > 1 THEN 's' ELSE '' END
else
SELECT @retorno = @retorno + 'Cêntimo' + CASE WHEN @pedacoInt1 > 1 THEN 's' ELSE '' END
 end
RETURN @retorno
END

GO

/* ===== SQL_SCALAR_FUNCTION :: fncBase64_Decode ===== */
CREATE FUNCTION [dbo].[fncBase64_Decode] (
    @string VARCHAR(MAX)
)
RETURNS VARCHAR(MAX)
AS BEGIN
 
    DECLARE @decoded VARCHAR(MAX)
    SET @decoded = CAST('' AS XML).value('xs:base64Binary(sql:variable("@string"))', 'varbinary(max)')
 
    RETURN CONVERT(VARCHAR(MAX), @decoded)
    
END
GO

/* ===== SQL_SCALAR_FUNCTION :: fncBase64_Encode ===== */
CREATE FUNCTION [dbo].[fncBase64_Encode] (
    @string VARCHAR(MAX)
) 
RETURNS VARCHAR(MAX)
AS BEGIN
 
    DECLARE 
        @source VARBINARY(MAX), 
        @encoded VARCHAR(MAX)
        
    SET @source = CONVERT(VARBINARY(MAX), @string)
    SET @encoded = CAST('' AS XML).value('xs:base64Binary(sql:variable("@source"))', 'varchar(max)')
 
    RETURN @encoded
 
END
GO

/* ===== SQL_SCALAR_FUNCTION :: FormataData ===== */
CREATE FUNCTION dbo.FormataData (@data smalldateTime, @formato int)
/***************************************************************************
Esta função permite formatar uma data em um dos formatos abaixo.
Parâmetros:
@data - data a ser formatada
@formato - determina o formato de saída para a data
Opções de formato:
	1 - dia/mes/ano		->> 31/08/2005 (Default)
	2 - dia-mes-ano		->> 31-08-2005
	3 - Somente dia		->> 31
	4 - Somente Mês		->> 08
	5 - Somente Ano		->> 2005
	6 - mes/dia/ano		->> 08/31/2005
	7 - mes-dia-ano		->> 08-31-2005
	8 - Formato Longo 	->> 31 de Agosto de 2005
	9 - Formato Curto 	->> 31-Agosto-2005
	10 - Mês/Ano	 	->> Agosto/2005
	11 - Mês/Ano	 	->> 08/2005
	12 - Dia/Hora	 	->> 31-08-2005 13:14
Exemplo:SELECT dbo.fn_dateformat(getdate(),1) as [dia/mes/ano]
		SELECT dbo.fn_dateformat(getdate(),10) as [Mes/Ano]
		SELECT dbo.fn_dateformat(getdate(),12) as [Dia/Hora]
Autor: Nilton Pinheiro
Correções\Alterações: José Abílio
Website: http://www.mcdbabrasil.com.br
Baseado no Original: http://www.sqlservercentral.com/scripts/contributions/1568.asp
*******************************************************************************/
-- Retorna data como string
RETURNS nvarchar(30)
AS
BEGIN
	DECLARE @Datafmt nvarchar(30)
	-- Verifica se a data é válida
	IF @data Is Null SET @Datafmt = ''
	-- dia-mes-ano
	ELSE IF @formato = 2
		BEGIN
			IF Day(@data) < 10
				SET @Datafmt = '0' + Convert(varchar(2), Day(@data))
			ELSE
				SET @Datafmt = Convert(varchar(2),Day(@data))
			SET @Datafmt = @Datafmt + '-'
			-- concatena o mes
			IF Month(@data) < 10
				SET @Datafmt = (@Datafmt + '0' + Convert(varchar(2), Month(@data)))
			ELSE
				SET @Datafmt = (@Datafmt + Convert(varchar(2), Month(@data)))
			SET @Datafmt = @Datafmt + '-'
			-- concatena o ano
			SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
		END
	-- somente dia
	ELSE IF @formato = 3
		BEGIN
			IF Day(@data) < 10
				SET @Datafmt = ('0' + CONVERT(varchar(2), Day(@data)))
			ELSE
	SET @Datafmt = (Convert(varchar(2), Day(@data)))
		END
	-- somente mês
	ELSE IF @formato = 4
		BEGIN
			IF Month(@data) < 10
				SET @Datafmt = '0' + Convert(varchar(2), Month(@data))
			ELSE
				SET @Datafmt = Convert(varchar(2), Month(@data))
		END
	-- somente Ano
	ELSE IF @formato = 5
		BEGIN
			SET @Datafmt = (SELECT Convert(varchar(4), Year(@data)))
		END
	-- mes/dia/ano
	ELSE IF @formato = 6
		BEGIN
			IF Month(@data) < 10
				SET @Datafmt = '0' + Convert(varchar(2), Month(@data))
			ELSE
				SET @Datafmt = Convert(varchar(2), Month(@data))
			SET @Datafmt = @Datafmt + '/'
			-- concatena o dia
			IF Day(@data) < 10
				SET @Datafmt = (@Datafmt + '0' + Convert(varchar(2), Day(@data)))
			ELSE
				SET @Datafmt = (@Datafmt + Convert(varchar(2), Day(@data)))
			SET @Datafmt = @Datafmt + '/'
			-- concatena o ano
			SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
		END
	-- mes-dia-ano
	ELSE IF @formato = 7
		BEGIN
			IF Month(@data) < 10
				SET @Datafmt = '0' + Convert(varchar(2), Month(@data))
			ELSE
				SET @Datafmt = Convert(varchar(2), Month(@data))
			SET @Datafmt = @Datafmt + '-'
			-- concatena o dia
			IF Day(@data) < 10
				SET @Datafmt = (@Datafmt + '0' + Convert(varchar(2), Day(@data)))
			ELSE
				SET @Datafmt = (@Datafmt + Convert(varchar(2), Day(@data)))
			SET @Datafmt = @Datafmt + '-'
			-- concatena o ano
			SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
		END
	-- Formato Longo
	ELSE IF @formato = 8
		BEGIN
			IF Day(@data) < 10
				SET @Datafmt = ('0' + Convert(varchar(2), Day(@data)))
			ELSE
				SET @Datafmt =  Convert(varchar(2), Day(@data))
			SET @Datafmt = @Datafmt + ' de '
			-- concatena o mês
			SET @Datafmt = @Datafmt + CASE Month(@data)
				WHEN 1 THEN 'Janeiro'
				WHEN 2 THEN 'Fevereiro'
				WHEN 3 THEN 'Março'
				WHEN 4 THEN 'Abril'
				WHEN 5 THEN 'Maio'
				WHEN 6 THEN 'Junho'
				WHEN 7 THEN 'Julho'
				WHEN 8 THEN 'Agosto'
				WHEN 9 THEN 'Setembro'
				WHEN 10 THEN 'Outubro'
				WHEN 11 THEN 'Novembro'
				ELSE 'Dezembro'
				END
			SET @Datafmt = @Datafmt + ' de '
			-- concatena o ano
			SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
		END
	-- Formato Curto
	ELSE IF @formato = 9 
		BEGIN
			IF Day(@data) < 10
			SET @Datafmt = ('0' + Convert(varchar(2), Day(@data))) 
			ELSE
				SET @Datafmt =  Convert(varchar(2), Day(@data))
			SET @Datafmt = @Datafmt + '-'
			-- concatena o mês
			SET @Datafmt = @Datafmt + CASE Month(@data)
				WHEN 1 THEN 'Janeiro'
				WHEN 2 THEN 'Fevereiro'
				WHEN 3 THEN 'Março'
				WHEN 4 THEN 'Abril'
				WHEN 5 THEN 'Maio'
				WHEN 6 THEN 'Junho'
				WHEN 7 THEN 'Julho'
				WHEN 8 THEN 'Agosto'
				WHEN 9 THEN 'Setembro'
				WHEN 10 THEN 'Outubro'
				WHEN 11 THEN 'Novembro'
				ELSE 'Dezembro'
				END
			SET @Datafmt = @Datafmt + '-'
			-- concatena o ano
			SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
		END
		-- mês/ano
		ELSE IF @formato = 10
			BEGIN
				SET @Datafmt = CASE Month(@data)
					WHEN 1 THEN 'Janeiro'
					WHEN 2 THEN 'Fevereiro'
					WHEN 3 THEN 'Março'
					WHEN 4 THEN 'Abril'
					WHEN 5 THEN 'Maio'
					WHEN 6 THEN 'Junho'
					WHEN 7 THEN 'Julho'
					WHEN 8 THEN 'Agosto'
					WHEN 9 THEN 'Setembro'
					WHEN 10 THEN 'Outubro'
					WHEN 11 THEN 'Novembro'
					ELSE 'Dezembro'
					END
				SET @Datafmt = @Datafmt + '/'
				-- concatena o ano
				SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
			END
		-- mm/yyyy
		ELSE IF @formato = 11
				BEGIN
				IF Month(@data) < 10
					SET @Datafmt = '0' + Convert(varchar(2), Month(@data))
				ELSE
					SET @Datafmt = Convert(varchar(2), Month(@data))
				SET @Datafmt = @Datafmt + '/'
		-- concatena o ano
				SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
			END
		-- dd/mm/yyyy hh:mm (24h)
		ELSE IF @formato = 12
				BEGIN
				IF Day(@data) < 10
					SET @Datafmt = ('0' + Convert(varchar(2), Day(@data)))
				ELSE
					SET @Datafmt =  Convert(varchar(2), Day(@data))
				SET @Datafmt = @Datafmt + '/'
				-- concatena o mes
				IF Month(@data) < 10
					SET @Datafmt = (@Datafmt + '0' + Convert(varchar(2), Month(@data)))
				ELSE
					SET @Datafmt = (@Datafmt + Convert(varchar(2), Month(@data)))
				SET @Datafmt = @Datafmt + '/'
				-- concatena o ano
				SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
				-- concatena a hora
				SET @Datafmt = @Datafmt + ' ' + (SELECT Convert(varchar(5), @data,114))
			END
		-- dd/mm/yyyy (Default) = 1
		ELSE
			BEGIN
				IF Day(@data) < 10
					SET @Datafmt = ('0' + Convert(varchar(2), Day(@data)))
				ELSE
					SET @Datafmt =  Convert(varchar(2), Day(@data))
				SET @Datafmt = @Datafmt + '/'
				-- concatena o mes
				IF Month(@data) < 10
					SET @Datafmt = (@Datafmt + '0' + Convert(varchar(2), Month(@data)))
				ELSE
					SET @Datafmt = (@Datafmt + Convert(varchar(2), Month(@data)))
				SET @Datafmt = @Datafmt + '/'
				-- concatena o ano
				SET @Datafmt = @Datafmt + (SELECT Convert(varchar(4), Year(@data)))
			END
	RETURN(@Datafmt)
	END

GO

/* ===== SQL_SCALAR_FUNCTION :: FormataValor ===== */
create FUNCTION FormataValor(@Valor Numeric(18,4),@SepMilhar char(1),@SepDecimal Char(1))
Returns Varchar(50) AS
Begin
Declare @Inteiro int,
@Texto varchar(50),
@ValorDecimal varchar(04)
Set @Texto = RTrim(Cast(@Valor as varchar(50)))
Set @Inteiro = Cast(@Valor as Integer)
Set @ValorDecimal = SubString(@Texto,Len(@Texto)-3,2)
If Len(@Inteiro) = 1
Set @Texto = Cast(@Inteiro as varchar(10)) + Replace(@SepMilhar, '.',',') + @ValorDecimal
If Len(@Inteiro) = 2
Set @Texto = Cast(@Inteiro as varchar(10)) + Replace(@SepMilhar, '.',',') + @ValorDecimal
If Len(@Inteiro) = 3
Set @Texto = Cast(@Inteiro as varchar(10)) + Replace(@SepMilhar, '.',',') + @ValorDecimal
If Len(@Inteiro) = 4
Set @Texto = SubString(Cast(@Inteiro as varchar(10)),1,1) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),2,3) + @SepDecimal + @ValorDecimal
If Len(@Inteiro) = 5
Set @Texto = SubString(Cast(@Inteiro as varchar(10)),1,2) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),3,5) + @SepDecimal + @ValorDecimal
If Len(@Inteiro) = 6
Set @Texto = SubString(Cast(@Inteiro as varchar(10)),1,3) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),4,7) + @SepDecimal + @ValorDecimal
If Len(@Inteiro) = 7
Set @Texto = SubString(Cast(@Inteiro as varchar(10)),1,1) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),2,3) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),5,7) + @SepDecimal + @ValorDecimal
If Len(@Inteiro) = 8
Set @Texto = SubString(Cast(@Inteiro as varchar(10)),1,2) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),3,3) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),6,7) + @SepDecimal + @ValorDecimal
If Len(@Inteiro) = 9
Set @Texto = SubString(Cast(@Inteiro as varchar(10)),1,3) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),3,3) + @SepMilhar + SubString(Cast(@Inteiro as varchar(10)),7,7) + @SepDecimal + @ValorDecimal
Return @Texto
End

GO

/* ===== SQL_SCALAR_FUNCTION :: GiroEstoque ===== */
 CREATE FUNCTION [dbo].[GiroEstoque]
( 	@produto varchar(21), @acabamento varchar(10)  )
 RETURNS int
AS
BEGIN
DECLARE @BaixoGiro int, @MedioGiro int, @AltoGiro int, @Datacompra datetime, @Datavenda datetime, @estoque int, @diferenca int , @resultado int
 --- parametro de giro do estoque
 DECLARE Paramentros CURSOR FOR
 SELECT Par_PoucoGiro,Par_MedioGiro,Par_AltoGiro
 FROM Paramentros
 OPEN Paramentros
 FETCH NEXT FROM Paramentros
 INTO @BaixoGiro,@MedioGiro,@AltoGiro
 CLOSE Paramentros
 DEALLOCATE Paramentros
 --- DATAS E ESTOQUE
DECLARE DATASESTOQUE CURSOR FOR
SELECT   Epr_estoque,
DATEDIFF(day,  (SELECT     MAX(dbo.Nota_entrada.Nen_dt_nota) AS Expr1
FROM dbo.Nota_entrada INNER JOIN
 dbo.nota_entrada_det ON dbo.Nota_entrada.Nen_codigo = dbo.nota_entrada_det.Nen_codigo
 WHERE (dbo.Nota_entrada.Nen_status = 'A') AND (dbo.Estoque_produto.Epr_Codnosso = dbo.nota_entrada_det.Pro_codnosso) AND
 (dbo.Estoque_produto.Epr_Acabamento = dbo.nota_entrada_det.Ned_acabamento)),
(SELECT     MAX(dbo.Venda.Ven_DataEmissao) AS DATA_VENDA
 FROM  dbo.Venda INNER JOIN
 dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre
 WHERE (dbo.Venda.Ven_Tipo = 'P') AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Estoque_produto.Epr_Codnosso = dbo.VendaProduto.Pro_codnosso) AND
(dbo.Estoque_produto.Epr_Acabamento = dbo.VendaProduto.CodAcabamento))) as diferenca
 FROM dbo.Estoque_produto
where Estoque_produto.Epr_Acabamento =@Acabamento and Estoque_produto.Epr_Codnosso=@produto
OPEN DATASESTOQUE
FETCH NEXT FROM DATASESTOQUE
INTO @estoque, @diferenca
CLOSE DATASESTOQUE
DEALLOCATE DATASESTOQUE
set @resultado = 4
if @diferenca <= @altoGiro  set @resultado =  1
if @diferenca > @altoGiro and @diferenca <= @medioGiro  set @resultado = 2
if @diferenca > @medioGiro and @diferenca <= @baixoGiro  set @resultado = 3
if @resultado = 4 set @resultado=3
 RETURN @resultado
END

GO

/* ===== SQL_SCALAR_FUNCTION :: MostrarAtendentes ===== */
CREATE  FUNCTION [dbo].[MostrarAtendentes] (@codigopre float, @tipo varchar(5))
RETURNS varchar(200)
 AS begin
declare @retorno varchar(200)
declare @nomeatendente varchar(100)
DECLARE atendente CURSOR FOR
(SELECT  Funcionario.Fun_Nome FROM Funcionario INNER JOIN
 VendaAtendente ON Funcionario.Fun_CPF = VendaAtendente.Fun_Codigo
 WHERE (VendaAtendente.VenAten_Principal = 1) AND (VendaAtendente.VenAten_NDocPre = @codigopre) and VendaAtendente.VenAten_TpDoc = @tipo)
OPEN atendente
FETCH NEXT FROM atendente INTO @nomeatendente
 set @retorno = '' 
WHILE @@FETCH_STATUS = 0
BEGIN
if len(@retorno) > 0
  set @retorno = @retorno + ' / ' + @nomeatendente
else set @retorno =  @retorno + @nomeatendente
FETCH NEXT FROM atendente INTO
@nomeatendente
end
CLOSE atendente
DEALLOCATE atendente
RETURN @retorno
END

GO

/* ===== SQL_SCALAR_FUNCTION :: MostrarIndicacao ===== */
CREATE  FUNCTION [dbo].[MostrarIndicacao] (@codigopre float, @TIPO VARCHAR(5))
RETURNS varchar(200)
 AS begin
declare @retorno varchar(200)
declare @nomeatendente varchar(100)
DECLARE atendente CURSOR FOR
(SELECT Indicacoes.Ind_Nome FROM VendaIndicacao INNER JOIN
 Indicacoes ON VendaIndicacao.Ind_Codigo = Indicacoes.Ind_codigo
 WHERE (VendaIndicacao.VenInd_Principal = 1) AND (VendaIndicacao.VenInd_NDocPre =@codigopre) and VendaIndicacao.VenInd_TpDoc = @tipo )
OPEN atendente
FETCH NEXT FROM atendente INTO @nomeatendente
 set @retorno = ''
WHILE @@FETCH_STATUS = 0
BEGIN
if len(@retorno) > 0
  set @retorno = @retorno + ' / ' + @nomeatendente
else set @retorno =  @retorno + @nomeatendente
FETCH NEXT FROM atendente INTO
@nomeatendente
end
CLOSE atendente
DEALLOCATE atendente
RETURN @retorno
END

GO

/* ===== SQL_SCALAR_FUNCTION :: ordemNotas ===== */
CREATE  FUNCTION [dbo].[ordemNotas]  (@ordem int, @item int)
RETURNS varchar(100)
AS BEGIN
declare @retorno varchar(100)
declare @notanumero int
DECLARE Nota_entrada CURSOR FOR
(SELECT     dbo.Nota_entrada.Nen_numero_nota
FROM         dbo.nota_entrada_det INNER JOIN
 dbo.Nota_entrada ON dbo.nota_entrada_det.Nen_codigo = dbo.Nota_entrada.Nen_codigo
where nota_entrada_det.ned_cod_ordem=@ordem and nota_entrada_det.ned_item_ordem=@item
 and  Nota_entrada.nen_status <> 'C')
OPEN Nota_entrada
FETCH NEXT FROM Nota_entrada INTO
@notanumero
 set @retorno = ''
WHILE @@FETCH_STATUS = 0
BEGIN
if len(@retorno) > 0
  set @retorno = ' * ' + @retorno + STR(@notanumero)
else set @retorno =  @retorno + STR(@notanumero)
FETCH NEXT FROM Nota_entrada INTO
@notanumero
end
CLOSE Nota_entrada
DEALLOCATE Nota_entrada
RETURN @retorno
END

GO

/* ===== SQL_SCALAR_FUNCTION :: PlanoContaValor ===== */



CREATE FUNCTION [dbo].[PlanoContaValor] (@VlPeriodo int, @Ano int, @Tipo char(1), @periodo char(1), @plano int, @ContaPaga char(1), @CATEGORIA INT, @FIXOVARIAVEL CHAR(1), @contasfora varchar(100))
RETURNS float  AS
BEGIN
declare @mes1I int
declare @mes2I int
declare @Valor float
declare @soma float
declare @somac float
declare @Total float

declare @cat1 int 
declare @cat2 int 
declare @cat3 int
declare @cat4 int

DECLARE @ficoval1 char(1)
DECLARE @ficoval2 char(1)

DECLARE @sql varchar(500)

if @FIXOVARIAVEL ='F' 
begin
set @ficoval1 = 'F'
set @ficoval2 = ''
end

if @FIXOVARIAVEL ='V' 
begin
set @ficoval1 = 'V'
set @ficoval2 = ''
end

if @FIXOVARIAVEL ='T' 
begin
set @ficoval1 = 'F'
set @ficoval2 = 'V'
end



if @categoria = 0
begin
set @cat1 =1
set @cat2 =2
set @cat3 =3
set @cat4 =4
end
ELSE
begin
if @categoria =1 set @CAT1 = 1
if @categoria =2 set @CAT1 = 2
if @categoria =3 set @CAT1 = 3
if @categoria =4 set @CAT1 = 4
set @CAT2 =0
set @CAT3 =0
set @CAT4 =0
end

if @periodo='T'
 BEGIN
	if @VlPeriodo = 1
	begin
		set @mes1I=1
		set @mes2I=3
	end
	if @VlPeriodo = 2
	begin
		set @mes1I=4
		set @mes2I=6
	end
	if @VlPeriodo = 3
	begin
		set @mes1I=7
		set @mes2I=9
	end
	if @VlPeriodo = 4
	begin
		set @mes1I=10
		set @mes2I=12
	end
end
if @periodo='S'
 BEGIN
	if @VlPeriodo = 1
	begin
		set @mes1I=1
		set @mes2I=6
	end
	if @VlPeriodo = 2
	begin
		set @mes1I=7
		set @mes2I=12
	end
end
set @soma=0
set @somac=0



if @tipo = 'D'  /* Debito */
begin
if @ContaPaga ='N' /* Conta não paga */
begin
if @periodo = 'M'  /* mensal */
 begin
if @contasfora <> '' 
begin
set @valor = (SELECT SUM(contas_apagar_det.Ctp_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) AND
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_apagar_det.Ctp_situacao = 'N' OR contas_apagar_det.Ctp_situacao IS NULL)) and month(contas_apagar_det.Ctp_dt_vencimento) = @VlPeriodo and year(contas_apagar_det.Ctp_dt_vencimento) = @ano
 and Contas_apagar_pag.cba_codigo not in ( @contasfora ))
end
else
begin
set @valor = (SELECT SUM(contas_apagar_det.Ctp_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) AND
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_apagar_det.Ctp_situacao = 'N' OR contas_apagar_det.Ctp_situacao IS NULL)) and month(contas_apagar_det.Ctp_dt_vencimento) = @VlPeriodo and year(contas_apagar_det.Ctp_dt_vencimento) = @ano)
end

if @valor <> null  set @soma = @soma + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='DÉBITO'
AND Pco_codigo = @plano and month(Mba_data_emissao) = @VlPeriodo and year(Mba_data_emissao) = @ano)
if @valor <> null  set @soma = @soma + @valor
 end
if (@periodo = 'S') OR (@periodo = 'T')   /* Semestral ou Trimestral */
begin
if @contasfora <> ''
begin
set @valor = (SELECT SUM(contas_apagar_det.Ctp_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_apagar_det.Ctp_situacao = 'N' OR contas_apagar_det.Ctp_situacao IS NULL)) and  month(contas_apagar_det.Ctp_dt_vencimento) >= @mes1I and
month(contas_apagar_det.Ctp_dt_vencimento) <= @mes2I  and year(contas_apagar_det.Ctp_dt_vencimento) = @ano
 and Contas_apagar_pag.cba_codigo not in (  @contasfora ))
end
else
begin
set @valor = (SELECT SUM(contas_apagar_det.Ctp_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_apagar_det.Ctp_situacao = 'N' OR contas_apagar_det.Ctp_situacao IS NULL)) and  month(contas_apagar_det.Ctp_dt_vencimento) >= @mes1I and
month(contas_apagar_det.Ctp_dt_vencimento) <= @mes2I  and year(contas_apagar_det.Ctp_dt_vencimento) = @ano)
end

if @valor <> null  set @soma = @soma + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='DÉBITO'
AND Pco_codigo = @plano and month(Mba_data_emissao) >= @mes1I and
month(Mba_data_emissao) <= @mes2I  and year(Mba_data_emissao) = @ano)
if @valor <> null  set @soma = @soma + @valor
 end
if (@periodo = 'A')   /* Anual */
   begin

if @contasfora <> '' 
begin
set @valor = (SELECT SUM(contas_apagar_det.Ctp_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_apagar_det.Ctp_situacao = 'N' OR contas_apagar_det.Ctp_situacao IS NULL)) and  Year(contas_apagar_det.Ctp_dt_vencimento) = @ano
 and Contas_apagar_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_apagar_det.Ctp_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_apagar_det.Ctp_situacao = 'N' OR contas_apagar_det.Ctp_situacao IS NULL)) and  Year(contas_apagar_det.Ctp_dt_vencimento) = @ano)
end
if @valor <> null  set @soma = @soma + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='DÉBITO'
AND Pco_codigo = @plano and year(Mba_data_emissao) = @ano)

if @valor <> null  set @soma = @soma + @valor
end
end
if @ContaPaga ='S' /* Conta paga */
begin
if @periodo = 'M'  /* mensal */
   begin
if @contasfora <> ''  
   begin
set @valor = (SELECT SUM(contas_apagar_pag.Cpp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_apagar_det.Ctp_situacao = 'S') and month(contas_apagar_pag.Cpp_data_pagamento) = @VlPeriodo and year(contas_apagar_pag.Cpp_data_pagamento) = @ano
 and Contas_apagar_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_apagar_pag.Cpp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_apagar_det.Ctp_situacao = 'S') and month(contas_apagar_pag.Cpp_data_pagamento) = @VlPeriodo and year(contas_apagar_pag.Cpp_data_pagamento) = @ano)
end
if @valor <> null  set @soma = @soma + @valor
 /* caixa */
set @valor = (select sum(mvt_valor) from movimentos where mvt_credito_debito ='DÉBITO'
AND Cpp_cod_pag is null and Crp_cod_pag is null and pco_codigo =@plano and month(Mvt_data) = @VlPeriodo and year(Mvt_data) = @ano)
if @valor <> null  set @soma = @soma + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='DÉBITO'
AND Pco_codigo = @plano and month(Mba_data_efetivacao) = @VlPeriodo  and year(Mba_data_efetivacao) = @ano)
if @valor <> null  set @soma = @soma + @valor
 end
if (@periodo = 'S') OR (@periodo = 'T')   /* Semestral ou Trimestral */
begin
if @contasfora <> ''  
begin
set @valor = (SELECT SUM(contas_apagar_pag.Cpp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_apagar_det.Ctp_situacao = 'S')and month(contas_apagar_pag.Cpp_data_pagamento) >= @mes1I and   month(contas_apagar_pag.Cpp_data_pagamento) <= @mes2I  and year(contas_apagar_pag.Cpp_data_pagamento) = @ano
and Contas_apagar_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_apagar_pag.Cpp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_apagar_det.Ctp_situacao = 'S')and month(contas_apagar_pag.Cpp_data_pagamento) >= @mes1I and   month(contas_apagar_pag.Cpp_data_pagamento) <= @mes2I  and year(contas_apagar_pag.Cpp_data_pagamento) = @ano)
end
if @valor <> null  set @soma = @soma + @valor
 /* caixa */
set @valor = (select sum(mvt_valor) from movimentos where mvt_credito_debito ='DÉBITO'
AND Cpp_cod_pag is NULL and Crp_cod_pag is null and pco_codigo =@plano and month(Mvt_data) >= @mes1I and month(Mvt_data) <= @mes2I  and year(Mvt_data) = @ano)
if @valor <> null  set @soma = @soma + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='DÉBITO'
AND Pco_codigo = @plano and month(Mba_data_efetivacao) >=  @mes1I  and month(Mba_data_efetivacao) <= @mes2I and year(Mba_data_efetivacao) = @ano)
if @valor <> null  set @soma = @soma + @valor
 end
if (@periodo = 'A')   /* Anual */
begin
if @contasfora <> ''  
begin
set @valor = (SELECT SUM(contas_apagar_pag.Cpp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_apagar_det.Ctp_situacao = 'S') and Year(contas_apagar_pag.Cpp_data_pagamento) = @ano
and Contas_apagar_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_apagar_pag.Cpp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_apagar ON Plano_Contas_5.Pco_codigo = contas_apagar.Pco_codigo INNER JOIN
contas_apagar_det ON contas_apagar.Ctp_codigo = contas_apagar_det.Ctp_codigo INNER JOIN
Tipo_documento ON contas_apagar.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_apagar_pag ON contas_apagar_det.ctp_codigo = Contas_apagar_pag.ctp_codigo and contas_apagar_det.ctp_codigo_det = Contas_apagar_pag.ctp_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_apagar.Pco_codigo = @plano)) and 
(contas_apagar.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_apagar_det.Ctp_situacao = 'S') and Year(contas_apagar_pag.Cpp_data_pagamento) = @ano)
end
if @valor <> null  set @soma = @soma + @valor
 /* caixa */
set @valor = (select sum(mvt_valor) from movimentos where mvt_credito_debito ='DÉBITO'
AND Cpp_cod_pag is NULL and Crp_cod_pag is null and pco_codigo =@plano and year(Mvt_data) = @ano)
if @valor <> null  set @soma = @soma + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='DÉBITO'
AND Pco_codigo = @plano and year(Mba_data_efetivacao) = @ano)
if @valor <> null  set @soma = @soma + @valor
end
end
end /* fim debito */
if @tipo = 'C'  /* Credito */
begin
if @ContaPaga ='N' /* Conta não paga */
begin
if @periodo = 'M'  /* mensal */
begin
if @contasfora <> ''  
begin
set @valor = (SELECT SUM(contas_Receber_det.Ctr_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_receber.Pco_codigo = @plano))  and
(contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_Receber_det.Ctr_situacao = 'N' OR contas_Receber_det.Ctr_situacao IS NULL)) and month(contas_receber_det.Ctr_dt_vencimento) = @VlPeriodo and year(contas_receber_det.Ctr_dt_vencimento) = @ano
and Contas_receber_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_Receber_det.Ctr_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_receber.Pco_codigo = @plano))  and
(contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_Receber_det.Ctr_situacao = 'N' OR contas_Receber_det.Ctr_situacao IS NULL)) and month(contas_receber_det.Ctr_dt_vencimento) = @VlPeriodo and year(contas_receber_det.Ctr_dt_vencimento) = @ano)
end
if @valor <> null  set @somac = @somac + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='CRÉDITO'
AND Pco_codigo = @plano and month(Mba_data_emissao) = @VlPeriodo and year(Mba_data_emissao) = @ano)
if @valor <> null  set @somac = @somac + @valor
 end
if (@periodo = 'S') OR (@periodo = 'T')   /* Semestral ou Trimestral */
   begin
if @contasfora <> ''  
begin
set @valor = (SELECT SUM(contas_Receber_det.Ctr_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_receber.Pco_codigo = @plano))  and 
(contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_Receber_det.Ctr_situacao = 'N' OR contas_Receber_det.Ctr_situacao IS NULL)) and  month(contas_receber_det.Ctr_dt_vencimento) >= @mes1I and  month(contas_receber_det.Ctr_dt_vencimento) <= @mes2I
 and year(contas_receber_det.Ctr_dt_vencimento) = @ano
and Contas_receber_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_Receber_det.Ctr_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_receber.Pco_codigo = @plano))  and 
(contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
((contas_Receber_det.Ctr_situacao = 'N' OR contas_Receber_det.Ctr_situacao IS NULL)) and  month(contas_receber_det.Ctr_dt_vencimento) >= @mes1I and  month(contas_receber_det.Ctr_dt_vencimento) <= @mes2I
 and year(contas_receber_det.Ctr_dt_vencimento) = @ano)
end
if @valor <> null  set @somac = @somac + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='CRÉDITO'
and  month(Mba_data_emissao) >= @mes1I and  month(Mba_data_emissao) <= @mes2I
and year(Mba_data_emissao) = @ano)
if @valor <> null  set @somac = @somac + @valor
  end
if (@periodo = 'A')   /* Anual */
begin
if @contasfora <> ''  
begin
set @valor = (SELECT SUM(contas_Receber_det.Ctr_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
 (Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
 (contas_receber.Pco_codigo = @plano)) and 
 (contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
 (Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
 ((contas_Receber_det.Ctr_situacao = 'N' OR contas_Receber_det.Ctr_situacao IS NULL))  and  year(contas_receber_det.Ctr_dt_vencimento) = @ano
 and Contas_receber_pag.cba_codigo not in (@contasfora))
 end
ELSE
begin
set @valor = (SELECT SUM(contas_Receber_det.Ctr_valor_vencimento) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo LEFT OUTER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
 (Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
 (contas_receber.Pco_codigo = @plano)) and 
 (contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
 (Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
 ((contas_Receber_det.Ctr_situacao = 'N' OR contas_Receber_det.Ctr_situacao IS NULL))  and  year(contas_receber_det.Ctr_dt_vencimento) = @ano)
end
if @valor <> null  set @somac = @somac + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='CRÉDITO'
and year(Mba_data_emissao) = @ano)
if @valor <> null  set @somac = @somac + @valor
end

end
if @ContaPaga ='S' /* Conta paga */
begin
if @periodo = 'M'  /* mensal */
begin
if @contasfora <> ''
begin
set @valor = (SELECT SUM(contas_Receber_pag.Crp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON dbo.contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_receber.Pco_codigo = @plano))  and 
(contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_Receber_det.Ctr_situacao = 'S') and month(contas_receber_pag.Crp_data_pagamento) = @VlPeriodo and year(contas_receber_pag.Crp_data_pagamento) = @ano
 and Contas_receber_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_Receber_pag.Crp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON dbo.contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_receber.Pco_codigo = @plano))  and 
(contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_Receber_det.Ctr_situacao = 'S') and month(contas_receber_pag.Crp_data_pagamento) = @VlPeriodo and year(contas_receber_pag.Crp_data_pagamento) = @ano)
end
if @valor <> null  set @somac = @somac + @valor
/* caixa */
set @valor = (select sum(mvt_valor) from movimentos where mvt_credito_debito ='CRÉDITO'
AND Cpp_cod_pag is NULL and Crp_cod_pag is null and pco_codigo =@plano and month(Mvt_data) = @VlPeriodo AND year(Mvt_data) = @ano)
if @valor <> null  set @somac = @somac + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='CRÉDITO'
AND Pco_codigo = @plano and month(Mba_data_efetivacao) = @VlPeriodo  and year(Mba_data_efetivacao) = @ano)
if @valor <> null  set @somac = @somac + @valor
 end
if (@periodo = 'S') OR (@periodo = 'T')   /* Semestral ou Trimestral */
   begin
   if @contasfora <> ''  
   begin
set @valor = (SELECT SUM(contas_Receber_pag.Crp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON dbo.contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_receber.Pco_codigo = @plano))   and
(contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_Receber_det.Ctr_situacao = 'S') and  month(contas_receber_pag.Crp_data_pagamento) >= @mes1I
 and month(contas_receber_pag.Crp_data_pagamento) <= @mes2I  and year(contas_receber_pag.Crp_data_pagamento) = @ano
and Contas_receber_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_Receber_pag.Crp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON dbo.contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
(Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
(contas_receber.Pco_codigo = @plano))   and
(contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
(Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
(contas_Receber_det.Ctr_situacao = 'S') and  month(contas_receber_pag.Crp_data_pagamento) >= @mes1I
 and month(contas_receber_pag.Crp_data_pagamento) <= @mes2I  and year(contas_receber_pag.Crp_data_pagamento) = @ano)
end
if @valor <> null  set @somac = @somac + @valor
/* caixa */
set @valor = (select sum(mvt_valor) from movimentos where mvt_credito_debito ='CRÉDITO'
AND Cpp_cod_pag is NULL and Crp_cod_pag is null and pco_codigo =@plano and month(Mvt_data) >= @mes1I
 and month(Mvt_data) <= @mes2I  and year(Mvt_data) = @ano)
if @valor <> null  set @somac = @somac + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='CRÉDITO'
AND Pco_codigo = @plano and month(Mba_data_efetivacao) >=  @mes1I  and month(Mba_data_efetivacao) <= @mes2I and year(Mba_data_efetivacao) = @ano)
if @valor <> null  set @somac = @somac + @valor
end
if (@periodo = 'A')   /* Anual */
begin
if @contasfora <> ''  
begin
set @valor = (SELECT SUM(contas_Receber_pag.Crp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
 (Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
 (contas_receber.Pco_codigo = @plano))  and 
 (contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
 (Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
 (contas_Receber_det.Ctr_situacao = 'S') and  Year(contas_receber_pag.Crp_data_pagamento) = @ano
 and Contas_receber_pag.cba_codigo not in (@contasfora))
end
else
begin
set @valor = (SELECT SUM(contas_Receber_pag.Crp_valor_pago) AS Valor
FROM Plano_Contas AS Plano_Contas_1 RIGHT OUTER JOIN
Plano_Contas AS Plano_Contas_5 INNER JOIN
contas_receber ON Plano_Contas_5.Pco_codigo = contas_receber.Pco_codigo INNER JOIN
contas_Receber_det ON contas_receber.Ctr_codigo = contas_Receber_det.Ctr_codigo INNER JOIN
Tipo_documento ON contas_receber.Tpd_codigo = Tipo_documento.Tpd_codigo INNER JOIN
Contas_receber_pag ON contas_Receber_det.ctr_codigo = Contas_receber_pag.ctr_codigo and contas_Receber_det.ctr_codigo_det = Contas_receber_pag.ctr_codigo_det ON
Plano_Contas_1.Pco_codigo = Plano_Contas_5.Pco_pai LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_2 LEFT OUTER JOIN
Plano_Contas AS Plano_Contas_3 ON Plano_Contas_2.Pco_pai = Plano_Contas_3.Pco_codigo ON
Plano_Contas_1.Pco_pai = Plano_Contas_2.Pco_codigo
WHERE   ((Plano_Contas_3.Pco_codigo =@plano) OR
 (Plano_Contas_1.Pco_codigo = @plano) OR
(Plano_Contas_2.Pco_codigo = @plano) OR
 (contas_receber.Pco_codigo = @plano))  and 
 (contas_receber.Tcf_codigo in (@cat1,@cat2,@cat3,@cat4)) and
 (Plano_Contas_5.pco_fixavariavel IN (@ficoval1,@ficoval2 ) ) AND 
 (contas_Receber_det.Ctr_situacao = 'S') and  Year(contas_receber_pag.Crp_data_pagamento) = @ano)
end
if @valor <> null  set @somac = @somac + @valor
/* caixa */
set @valor = (select sum(mvt_valor) from movimentos where mvt_credito_debito ='CRÉDITO'
AND Cpp_cod_pag is NULL and Crp_cod_pag is null and  year(Mvt_data) = @ano and pco_codigo =@plano)
if @valor <> null  set @somac = @somac + @valor
/* movimento bancario sem efetivação */
set @valor = (select sum(mba_valor) from movimento_bancario
where cpp_cod_pag is null and crp_cod_pag is null and mba_operacao='CRÉDITO'
AND Pco_codigo = @plano and year(Mba_data_efetivacao) = @ano and pco_codigo =@plano)
if @valor <> null  set @somac = @somac + @valor
end 
end
end /* fim do credito  */
IF @somac=null set @somac=0
IF @soma=null  set @soma=0
if @tipo = 'C' set @total = @somac - @soma
if @tipo = 'D' set @total = @soma - @somac
RETURN @total
END

GO

/* ===== SQL_SCALAR_FUNCTION :: ProdutoUtilidado ===== */
 CREATE  FUNCTION [dbo].[ProdutoUtilidado]  (@produto varchar(21))
reTURNS char(1)
AS BEGIN
declare @total float
declare @subtotal float
declare @retorno char(1)
set @total=0
set @subtotal = (select count(pro_codnosso) as quant from VendaProduto where pro_codnosso = @produto)
if @subtotal > 0 set @total = @total + @subtotal
if @total = 0
begin
set @subtotal = (select count(pro_codnosso) as quant from nota_entrada_det where pro_codnosso = @produto)
if @subtotal > 0  set @total = @total + @subtotal
end
if @total = 0
begin
set @subtotal = (select count(pro_codnosso) as quant from NotaFiscalProdutos where pro_codnosso = @produto)
if @subtotal > 0 set @total = @total + @subtotal
end
SET @retorno ='N'
if @total > 0 SET @retorno ='S'
RETURN @retorno
END

GO

/* ===== SQL_SCALAR_FUNCTION :: Quitado ===== */
CREATE FUNCTION  [dbo].[Quitado] (@codigo float)
RETURNS  int
AS
BEGIN
declare @pago varchar(1), @resultado int
DECLARE CONTA_CURSOR CURSOR FOR
SELECT Ctp_situacao FROM contas_apagar_det WHERE Ctp_codigo = @codigo
OPEN CONTA_CURSOR
FETCH NEXT FROM CONTA_CURSOR
INTO @pago
set @resultado = 1
WHILE @@FETCH_STATUS = 0
BEGIN
if (@pago ='N' OR @PAGO IS NULL) SET @resultado = 0
FETCH NEXT FROM CONTA_CURSOR
INTO @pago
END
CLOSE CONTA_CURSOR
DEALLOCATE CONTA_CURSOR
RETURN @resultado
END

GO

/* ===== SQL_SCALAR_FUNCTION :: RequisicaoEstoque ===== */
 CREATE FUNCTION [dbo].[RequisicaoEstoque](
	@serie varchar(3), @codigo float )
RETURNS int AS BEGIN
DECLARE @QUANT FLOAT
DECLARE @QUANT2 FLOAT
DECLARE @RESULTADO BIT
SET @RESULTADO = 0
DECLARE REQ_cursor CURSOR FOR(
SELECT SUM(dbo.VendaProduto.VenPro_Quantidade) - SUM(dbo.RequisicaoEstoqProd.ReqEstProd_Quant) AS quantidade
FROM dbo.RequisicaoEstoqProd INNER JOIN
dbo.RequisicaoEstoq ON dbo.RequisicaoEstoqProd.ReqEst_Codigo = dbo.RequisicaoEstoq.ReqEst_Codigo INNER JOIN
dbo.Venda INNER JOIN dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre ON
dbo.RequisicaoEstoqProd.Pro_codnosso = dbo.VendaProduto.Pro_codnosso AND dbo.RequisicaoEstoqProd.CodAcabamento = dbo.VendaProduto.CodAcabamento AND
dbo.RequisicaoEstoq.ReqEst_NumDoc = dbo.Venda.Ven_codigo AND dbo.RequisicaoEstoq.ParSV_serie = dbo.Venda.ParSV_serie
WHERE (dbo.RequisicaoEstoq.ReqEst_Situacao = 'A') AND (dbo.Venda.Ven_Situacao = 'A') AND (dbo.Venda.Ven_Tipo = 'P') AND
(dbo.RequisicaoEstoq.ReqEst_TipoDoc = 'PRO') AND (dbo.Venda.Ven_Requisicao = 1)
AND venda.ven_codigo =@codigo and Venda.ParSV_serie = @serie )
OPEN REQ_cursor
FETCH NEXT FROM REQ_cursor
INTO @quant
if @QUANT is null
BEGIN
SET @RESULTADO = 1
END
ELSE
BEGIN
IF @QUANT > 0  SET @RESULTADO = 1 END
CLOSE REQ_cursor
DEALLOCATE REQ_cursor
	RETURN @RESULTADO END

GO

/* ===== SQL_SCALAR_FUNCTION :: TempoInstalacao ===== */
CREATE FUNCTION [dbo].[TempoInstalacao] (@codigo float, @tipo char(1))
RETURNS float AS BEGIN
declare @Valor float
set @valor=0
if @tipo ='P'
begin
set @valor =(SELECT (CASE WHEN (SELECT COUNT(*) FROM pedido_luminaria_det
WHERE pedido_luminaria_det.ped_codigo_pre = pedido.ped_codigo_pre) > 0 THEN
(SELECT  SUM(pedido_luminaria_det.pld_quantidade * CASE WHEN produtos.pro_tempoInstalacao IS NULL
THEN 0 ELSE produtos.pro_tempoInstalacao END) AS Expr1 FROM
pedido_luminaria_det INNER JOIN produtos ON pedido_luminaria_det.Pro_codnosso = dbo.produtos.Pro_codnosso
WHERE (pedido_luminaria_det.ped_codigo_pre = pedido.ped_codigo_pre)) ELSE 0 END)
+ (CASE WHEN (SELECT COUNT(*) FROM pedido_materiais_det  WHERE
pedido_materiais_det.ped_codigo_pre = pedido.ped_codigo_pre) > 0 THEN
(SELECT  SUM(pedido_materiais_det.pma_quantidade * CASE WHEN produtos_1.pro_tempoInstalacao IS NULL
THEN 0 ELSE produtos_1.pro_tempoInstalacao END) AS Expr1  FROM pedido_materiais_det
INNER JOIN produtos AS produtos_1 ON pedido_materiais_det.Pro_codnosso = produtos_1.Pro_codnosso WHERE
(pedido_materiais_det.ped_codigo_pre = pedido.ped_codigo_pre)) ELSE 0 END) + (CASE WHEN (SELECT COUNT(*)
FROM pedido_servico_det WHERE   pedido_servico_det.ped_codigo_pre = pedido.ped_codigo_pre) > 0 THEN
(SELECT SUM(pedido_servico_det.pse_quantidade * CASE WHEN servicos.serv_tempoInstalacao IS NULL THEN 0 ELSE
servicos.serv_tempoInstalacao END) AS Expr1  FROM pedido_servico_det INNER JOIN Servicos ON
pedido_servico_det.Sev_cod = dbo.Servicos.sev_cod WHERE (pedido_servico_det.ped_codigo_pre =
pedido.ped_codigo_pre)) ELSE 0 END) AS total FROM pedido WHERE (ped_codigo =@codigo) AND ped_status='A')
end
if @tipo ='0'
begin
 set @valor =(SELECT (CASE WHEN (SELECT COUNT(*) FROM Orcamento_luminaria_det
 WHERE Orcamento_luminaria_det.orc_codigo_pre = dbo.orcamento.orc_codigo_pre) > 0 THEN
 (SELECT SUM(Orcamento_luminaria_det.old_quantidade * CASE WHEN produtos.pro_tempoInstalacao IS NULL
 THEN 0 ELSE produtos.pro_tempoInstalacao END) AS Expr1
 FROM Orcamento_luminaria_det INNER JOIN
 produtos ON dbo.Orcamento_luminaria_det.Pro_codnosso = dbo.produtos.Pro_codnosso
 WHERE (Orcamento_luminaria_det.orc_codigo_pre = dbo.orcamento.orc_codigo_pre)) ELSE 0 END) + (CASE WHEN
 (SELECT COUNT(*) FROM orcamento_materiais_det
 WHERE  orcamento_materiais_det.orc_codigo_pre = dbo.orcamento.orc_codigo_pre) > 0 THEN
 (SELECT SUM(orcamento_materiais_det.oma_quantidade * CASE WHEN produtos_1.pro_tempoInstalacao IS NULL
 THEN 0 ELSE produtos_1.pro_tempoInstalacao END) AS Expr1
 FROM orcamento_materiais_det INNER JOIN
 produtos AS produtos_1 ON dbo.orcamento_materiais_det.Pro_codnosso = produtos_1.Pro_codnosso
 WHERE (orcamento_materiais_det.orc_codigo_pre = dbo.orcamento.orc_codigo_pre)) ELSE 0 END) + (CASE WHEN
 (SELECT COUNT(*) FROM Orcamento_servico_det WHERE Orcamento_servico_det.orc_codigo_pre = dbo.orcamento.orc_codigo_pre) > 0 THEN
 (SELECT SUM(Orcamento_servico_det.ose_quantidade * CASE WHEN servicos.serv_tempoInstalacao IS NULL
 THEN 0 ELSE servicos.serv_tempoInstalacao END) AS Expr1 FROM Orcamento_servico_det INNER JOIN
 Servicos ON dbo.Orcamento_servico_det.Sev_cod = dbo.Servicos.sev_cod
 WHERE (Orcamento_servico_det.orc_codigo_pre = dbo.orcamento.orc_codigo_pre)) ELSE 0 END) AS total
 FROM orcamento WHERE (orc_codigo =@codigo))
end
IF (@valor=null) OR (@valor <0 ) set @valor = 0
	RETURN @valor
END

GO

/* ===== SQL_SCALAR_FUNCTION :: ValorCompra ===== */
CREATE FUNCTION [dbo].[ValorCompra]
(	@produto varchar(21), @acabamento varchar(10), @data1 datetime, @data2 datetime )
RETURNS float
AS
BEGIN
Declare @Valor float
DECLARE valor_compra CURSOR FOR
 select  CASE WHEN
(SELECT     TOP 1 Preco_Produto_log.Prelog_VlNFor
 FROM Preco_Produto_Log
 WHERE  PP.Pre_Codnosso = dbo.Preco_Produto_Log.PreLog_Codnosso AND PP.Pre_Acabamento = dbo.Preco_Produto_Log.PreLog_Acabamento 
AND dbo.Preco_Produto_Log.usr_dt_hr_criacao >= @data1 AND dbo.Preco_Produto_Log.usr_dt_hr_criacao <= @data2 order by Preco_Produto_Log.usr_dt_hr_criacao desc
) > 0 THEN
(SELECT TOP 1 Preco_Produto_log.Prelog_VlNFor FROM Preco_Produto_Log
 WHERE  PP.Pre_Codnosso = dbo.Preco_Produto_Log.PreLog_Codnosso AND PP.Pre_Acabamento = dbo.Preco_Produto_Log.PreLog_Acabamento
 AND dbo.Preco_Produto_Log.usr_dt_hr_criacao >= @data1 AND dbo.Preco_Produto_Log.usr_dt_hr_criacao <= @data2 order by Preco_Produto_Log.usr_dt_hr_criacao desc
) ELSE pp.Pre_VlNFor END AS Expr1 FROM dbo.Preco_Produto AS PP
where  pp.Pre_Codnosso = @produto AND pp.Pre_Acabamento = @Acabamento
OPEN valor_compra
 FETCH NEXT FROM valor_compra
 INTO @valor
 CLOSE valor_compra
 DEALLOCATE valor_compra
 if (@valor IS NULL)  set  @valor=0
	RETURN @valor
END

GO

/* ===== SQL_SCALAR_FUNCTION :: ValorCusto ===== */
CREATE FUNCTION [dbo].[ValorCusto]
(	@produto varchar(21), @acabamento varchar(10), @data1 datetime, @data2 datetime )
RETURNS float
AS
BEGIN
Declare @Valor float
DECLARE valor_custo CURSOR FOR
 select  CASE WHEN
(SELECT     TOP 1 Preco_Produto_log.PreLog_Custo
 FROM Preco_Produto_Log
 WHERE  PP.Pre_Codnosso = dbo.Preco_Produto_Log.PreLog_Codnosso AND PP.Pre_Acabamento = dbo.Preco_Produto_Log.PreLog_Acabamento
AND dbo.Preco_Produto_Log.usr_dt_hr_criacao >= @data1 AND dbo.Preco_Produto_Log.usr_dt_hr_criacao <= @data2 order by Preco_Produto_Log.usr_dt_hr_criacao desc
) > 0 THEN
(SELECT TOP 1 Preco_Produto_log.PreLog_Custo FROM Preco_Produto_Log
 WHERE  PP.Pre_Codnosso = dbo.Preco_Produto_Log.PreLog_Codnosso AND PP.Pre_Acabamento = dbo.Preco_Produto_Log.PreLog_Acabamento
 AND dbo.Preco_Produto_Log.usr_dt_hr_criacao >= @data1 AND dbo.Preco_Produto_Log.usr_dt_hr_criacao <= @data2 order by Preco_Produto_Log.usr_dt_hr_criacao desc
) ELSE pp.Pre_Custo END AS Expr1 FROM dbo.Preco_Produto AS PP
where  pp.Pre_Codnosso = @produto AND pp.Pre_Acabamento = @Acabamento
OPEN valor_custo
 FETCH NEXT FROM valor_custo
 INTO @valor
 CLOSE valor_custo
 DEALLOCATE valor_custo
 if (@valor IS NULL)  set  @valor=0
	RETURN @valor
END

GO

/* ===== SQL_SCALAR_FUNCTION :: VendaAno ===== */
CREATE FUNCTION [dbo].[VendaAno]  (@ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS  FLOAT
 AS
 BEGIN
 declare @VLProjeto float
 declare @Vldevolucao float
 if (@tabela='P' ) or (@tabela='PA' )
 BEGIN
	if @ProjFechado ='S'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where  year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is not null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='N'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
				ELSE null
		END as valor   from venda where year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='A'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N' THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S' THEN sum(venda.Ven_Total)
		ELSE null
		END as valor  from venda where  year(venda.Ven_DataEmissao) = @ano
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
--- devoluções
	if @ProjFechado ='S'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
     dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and  year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is not null)
	END

    if @ProjFechado ='N'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE  (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is null)
	END

    if @ProjFechado ='A'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
end
END
IF  @VLProjeto=NULL  SET @VLProjeto=0
IF  @Vldevolucao=NULL  SET @Vldevolucao=0

RETURN (@VlProjeto - @Vldevolucao)
end

GO

/* ===== SQL_SCALAR_FUNCTION :: VendaAnoAtendente ===== */
CREATE FUNCTION [dbo].[VendaAnoAtendente]  (@atendente float,  @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS  FLOAT
AS
BEGIN
declare @VLProjeto float
declare @Vldevolucao float
if (@tabela='P' ) or (@tabela='PA' )
 BEGIN
	if @ProjFechado ='S'
	BEGIN
    set @VLProjeto  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
 from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
 where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
 and VendaAtendente.fun_codigo = @atendente and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is not null
  and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='N'
	BEGIN
 set @VLProjeto  = (select CASE
 WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
 WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
 eLSE null
	END as valor
from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
  where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
  and VendaAtendente.fun_codigo = @atendente and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is null
   and venda.ven_situacao= 'A'  AND venda.ven_tipo='P')
	END
	
    if @ProjFechado ='A'
	BEGIN
	set @VLProjeto  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
	WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
 from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
 where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
 and VendaAtendente.fun_codigo = @atendente and  year(venda.Ven_DataEmissao) = @ano
 and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END

--- devoluções
	if @ProjFechado ='S'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is not null)
	END

    if @ProjFechado ='N'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is null)
	END

    if @ProjFechado ='A'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
    END
END
IF  @VLProjeto=NULL  SET @VLProjeto=0
IF  @Vldevolucao=NULL  SET @Vldevolucao=0
RETURN @VlProjeto - @Vldevolucao 
 end

GO

/* ===== SQL_SCALAR_FUNCTION :: VendaMes ===== */
CREATE FUNCTION [dbo].[VendaMes]  (@mes int, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS  FLOAT
AS
BEGIN
declare @VLProjeto float
declare @Vldevolucao float
if (@tabela='P' ) or (@tabela='PA' )
 BEGIN
	if @ProjFechado ='S'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where month(venda.Ven_DataEmissao) = @mes
		and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is not null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='N'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where  month(venda.Ven_DataEmissao) = @mes
		and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='A'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor from venda where  month(venda.Ven_DataEmissao) = @mes
		and year(venda.Ven_DataEmissao) = @ano
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END

    --- devoluções
	if @ProjFechado ='S'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
     dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and  year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is not null and month(Devolucao.Dev_Dtemissao) = @mes)
	END

    if @ProjFechado ='N'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE  (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is null and month(Devolucao.Dev_Dtemissao) = @mes)
	END

    if @ProjFechado ='A'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and month(Devolucao.Dev_Dtemissao) = @mes)
    END
END
IF  @VLProjeto=NULL  SET @VLProjeto=0
IF  @Vldevolucao=NULL  SET @Vldevolucao=0
RETURN (@VlProjeto - @Vldevolucao)
end
GO

/* ===== SQL_SCALAR_FUNCTION :: VendaMesAtendente ===== */
CREATE FUNCTION [dbo].[VendaMesAtendente]  (@atendente float, @mes int, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS  FLOAT
AS
BEGIN
declare @VLProjeto float
declare @Vldevolucao float
if (@tabela='P' ) or (@tabela='PA' )
 BEGIN
	if @ProjFechado ='S'
	BEGIN
     set @VLProjeto  = (select CASE
     WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
     WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
     ELSE null
	END as valor
 from VENDA INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
 where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
 and VendaAtendente.fun_codigo = @atendente and month(venda.Ven_DataEmissao) = @mes
 and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is not null
 and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='N'
	BEGIN
	set @VLProjeto  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
	WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	eLSE null
	END as valor
    from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
    where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
    and VendaAtendente.fun_codigo = @atendente and month(venda.Ven_DataEmissao) = @mes
    and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is null
    and venda.ven_situacao = 'A' AND venda.ven_tipo='P')
	END
	
if @ProjFechado ='A'
	BEGIN
	set @VLProjeto  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
	WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
    ELSE null
	END as valor
    from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
    where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
    and VendaAtendente.fun_codigo = @atendente and month(venda.Ven_DataEmissao) = @mes
    and year(venda.Ven_DataEmissao) = @ano
    and venda.ven_situacao= 'A' and venda.ven_tipo='P')
	END

--- devoluções
	if @ProjFechado ='S'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and year(Devolucao.Dev_Dtemissao) = @ano and month(Devolucao.Dev_Dtemissao) = @mes and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is not null)
	END

    if @ProjFechado ='N'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and year(Devolucao.Dev_Dtemissao) = @ano and month(Devolucao.Dev_Dtemissao) = @mes and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is null)
	END

    if @ProjFechado ='A'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and year(Devolucao.Dev_Dtemissao) = @ano and month(Devolucao.Dev_Dtemissao) = @mes and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
    END

END


IF  @VLProjeto=NULL  SET @VLProjeto=0
IF  @Vldevolucao=NULL  SET @Vldevolucao=0
RETURN @VlProjeto - @Vldevolucao 

end

GO

/* ===== SQL_SCALAR_FUNCTION :: VendaSemestre ===== */
CREATE FUNCTION [dbo].[VendaSemestre]  (@Semestre int, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS  FLOAT
AS
BEGIN
declare @VLProjeto float
declare @Vldevolucao float
declare @mes1 int
declare @mes2 int
if @Semestre = 1
begin
	set @mes1=1
	set @mes2=6
end
if @Semestre = 2
begin
	set @mes1=7
	set @mes2=12
end
if (@tabela='P' ) or (@tabela='PA' )
 BEGIN
	if @ProjFechado ='S'
	BEGIN
set @VLProjeto  = (select CASE
        WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
		and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is not null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='N'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where  month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
		and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='A'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where  month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
		and year(venda.Ven_DataEmissao) = @ano
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END

--- devoluções
	if @ProjFechado ='S'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
     dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and  year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is not null and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2)
	END

    if @ProjFechado ='N'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE  (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is null and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2)
	END

    if @ProjFechado ='A'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2)
    END


END
IF  @VLProjeto=NULL  SET @VLProjeto=0

IF  @Vldevolucao=NULL  SET @Vldevolucao=0
RETURN (@VlProjeto - @Vldevolucao)
end

GO

/* ===== SQL_SCALAR_FUNCTION :: VendaSemestreAtendente ===== */
CREATE FUNCTION [dbo].[VendaSemestreAtendente]  (@Atendente float ,@Semestre int, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS  FLOAT
AS
BEGIN
declare @VLProjeto float
declare @Vldevolucao float
declare @mes1 int
declare @mes2 int
if @semestre = 1
begin
	set @mes1=1
	set @mes2=6
end
if @semestre = 2
begin
	set @mes1=7
	set @mes2=12
end
if (@tabela='P' ) or (@tabela='PA' )
 BEGIN
	if @ProjFechado ='S'
	BEGIN
   set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
   WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
			ELSE null
		END as valor
 from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
  where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
  and VendaAtendente.fun_codigo = @atendente and  month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
		and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is not null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='N'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
		WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	    ELSE null
		END as valor  from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
   where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
   and VendaAtendente.fun_codigo = @atendente  and month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
		and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='A'
	BEGIN
	set @VLProjeto  = (select CASE
 WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
 WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
ELSE null
	END as valor
 from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
 where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
  and VendaAtendente.fun_codigo = @atendente and month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
	and year(venda.Ven_DataEmissao) = @ano
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END

--- devoluções
	if @ProjFechado ='S'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2 and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is not null and year(Devolucao.Dev_Dtemissao) = @ano)
	END

    if @ProjFechado ='N'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2 and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is null and year(Devolucao.Dev_Dtemissao) = @ano)
	END

    if @ProjFechado ='A'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2 and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and year(Devolucao.Dev_Dtemissao) = @ano)
    END


END
IF  @VLProjeto=NULL  SET @VLProjeto=0
IF  @Vldevolucao=NULL  SET @Vldevolucao=0

RETURN (@VlProjeto - @Vldevolucao)
end
GO

/* ===== SQL_SCALAR_FUNCTION :: VendaTrimestre ===== */
CREATE FUNCTION [dbo].[VendaTrimestre]  (@Trimestre int, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS  FLOAT
AS
BEGIN
declare @VLProjeto float
declare @Vldevolucao float
declare @mes1 int
declare @mes2 int
if @trimestre = 1
begin
	set @mes1=1
	set @mes2=3
end
if @trimestre = 2
begin
	set @mes1=4
	set @mes2=6
end
if @trimestre = 3
begin
	set @mes1=7
	set @mes2=9
end
if @trimestre = 4
begin
	set @mes1=10
 set @mes2=12
end
if (@tabela='P' ) or (@tabela='PA' )
 BEGIN
	if @ProjFechado ='S'
	BEGIN
set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
		and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is not null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='N'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where  month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
		and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is null
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='A'
	BEGIN
		set @VLProjeto  = (select CASE
   WHEN @desconto ='S' AND @Servico ='N'   THEN sum(VENDA.Ven_TotalProd)
		WHEN @desconto ='S' AND @Servico ='S'   THEN sum(venda.Ven_Total)
		ELSE null
		END as valor   from venda where  month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
		and year(venda.Ven_DataEmissao) = @ano
   and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
    --- devoluções
	if @ProjFechado ='S'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
     dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and  year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is not null and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2)
	END

    if @ProjFechado ='N'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE  (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is null and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2)
	END

    if @ProjFechado ='A'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN sum(Devolucao.Dev_TotalProd)
    WHEN @desconto ='S' AND @Servico ='S'   THEN sum(Devolucao.Dev_Total)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and year(Devolucao.Dev_Dtemissao) = @ano and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2)
    END
END
IF  @VLProjeto=NULL  SET @VLProjeto=0
IF  @Vldevolucao=NULL  SET @Vldevolucao=0
RETURN (@VlProjeto - @Vldevolucao)
end

GO

/* ===== SQL_SCALAR_FUNCTION :: VendaTrimestreAtendente ===== */
CREATE FUNCTION [dbo].[VendaTrimestreAtendente]  (@Atendente float ,@Trimestre int, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS  FLOAT
AS
BEGIN
declare @VLProjeto float
declare @Vldevolucao float
declare @mes1 int
declare @mes2 int
if @trimestre = 1
begin
	set @mes1=1
	set @mes2=3
end
if @trimestre = 2
begin
	set @mes1=4
	set @mes2=6
end
if @trimestre = 3
begin
	set @mes1=7
	set @mes2=9
end
if @trimestre = 4
begin
	set @mes1=10
	set @mes2=12
end
if (@tabela='P' ) or (@tabela='PA' )
 BEGIN
	if @ProjFechado ='S'
	BEGIN
 set @VLProjeto  = (select CASE
 WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
 WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
 ELSE null
 	END as valor
  from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
  where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
  and VendaAtendente.fun_codigo = @atendente and  month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
  and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is not null
  and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='N'
	BEGIN
	set @VLProjeto  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
	WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
		ELSE null
		END as valor
  from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
  where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
  and VendaAtendente.fun_codigo = @atendente and month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
  and year(venda.Ven_DataEmissao) = @ano  and venda.Ven_DataConclusao is null
  and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
	END
	if @ProjFechado ='A'
BEGIN
	set @VLProjeto  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(VENDA.Ven_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
	WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(venda.Ven_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
 from venda INNER JOIN VendaAtendente ON venda.ven_codigopre = VendaAtendente.VenAten_NDocPre
 where (vendaAtendente.VenAten_TpDoc = 'PRO') AND (VendaAtendente.Emp_Codigo = 1) AND (VendaAtendente.VenAten_Porcentagem > 0)
  and VendaAtendente.fun_codigo = @atendente and month(venda.Ven_DataEmissao) >= @mes1 and  month(venda.Ven_DataEmissao) <= @Mes2
  and year(venda.Ven_DataEmissao) = @ano
  and venda.ven_situacao= 'A' AND venda.ven_tipo='P')
END

--- devoluções
	if @ProjFechado ='S'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2 and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is not null and year(Devolucao.Dev_Dtemissao) = @ano)
	END

    if @ProjFechado ='N'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND 
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2 and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and venda.Ven_DataConclusao is null and year(Devolucao.Dev_Dtemissao) = @ano)
	END

    if @ProjFechado ='A'
	BEGIN
    set @Vldevolucao  = (select CASE
    WHEN @desconto ='S' AND @Servico ='N'   THEN round(sum(Devolucao.Dev_TotalProd*(VendaAtendente.VenAten_Porcentagem/100)),2)
    WHEN @desconto ='S' AND @Servico ='S'   THEN round(sum(Devolucao.Dev_Total*(VendaAtendente.VenAten_Porcentagem/100)),2)
	ELSE null
	END as valor
    fROM dbo.Venda INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre INNER JOIN
    dbo.Devolucao ON dbo.Venda.Ven_CodigoPre = dbo.Devolucao.ven_codigopre
    WHERE (dbo.VendaAtendente.VenAten_TpDoc = 'PRO') AND (dbo.VendaAtendente.Emp_Codigo = 1) AND (dbo.VendaAtendente.VenAten_Porcentagem > 0) AND
    (dbo.Devolucao.Dev_situacao = 1) AND (dbo.Devolucao.Dev_migrado = 0 OR dbo.Devolucao.Dev_migrado IS NULL)
    and VendaAtendente.fun_codigo = @atendente and month(Devolucao.Dev_Dtemissao) >= @mes1 and month(Devolucao.Dev_Dtemissao) <= @mes2 and venda.ven_situacao= 'A' AND venda.ven_tipo='P'
    and year(Devolucao.Dev_Dtemissao) = @ano)
    END
END
IF  @VLProjeto=NULL  SET @VLProjeto=0
IF  @Vldevolucao=NULL  SET @Vldevolucao=0
RETURN (@VlProjeto - @Vldevolucao)
end
GO

/* ===== SQL_STORED_PROCEDURE :: CalcularPorProduto ===== */
CREATE PROCEDURE [dbo].[CalcularPorProduto]
@CodFor int, @Indice varchar(20), @banco int ,@Produto varchar(20), @acab varchar(5)
WITH
EXECUTE AS CALLER
AS
BEGIN
declare @VlDesc_F1 float
declare @VlDesc_F2 float
declare @VlDesc_F3 float
declare @VlDesc_F4 float
declare @vlembalagem float
declare @vlipi float
declare @vlfinanceiro float
declare @vlcompra float
declare @vlfrete float
declare @vloutros float
declare @vlvenda float
declare @vldesconto float
declare @vlsimples float
declare @vlcusto float
declare @vlcom_int float
declare @vlcom_ext float
declare @vllucro_vl float
declare @vllucro_por float
declare @vlicms float
declare @vl_ant_indice float
declare @vl_com_desc float
declare @venda_com_desc float
declare @vltabela float
declare @vlNFor float
declare @VlSemDesc float
declare @Pais int
declare @Ipr_Indice float
declare @Ipr_desconto float
declare @Ipr_vl_com_inter float
declare @Ipr_vl_com_exter float
declare @Cus_Nome varchar(30)
declare @Cus_desconto1 float
declare @Cus_desconto2 float
declare @Cus_desconto3 float
declare @Cus_desconto4 float
declare @Cus_IPI float
declare @Cus_Frete float
declare @Cus_Icms float
declare @Cus_Embalagens float
declare @Cus_Financeira float
declare @Cus_Simples float
declare @Cus_outros  float
declare @Cus_IcmsDESTINO float
declare @Cus_MargValAgreg float
declare @Cus_TributacaoICMS varchar(30)
declare @Cus_importacao float
declare @Cus_cambio float
declare @Cus_TpVlNFo char(1)
declare @Cus_NFoICMS bit
declare @Cus_NFoOutros bit
declare @Cus_NFoIPI bit
declare @Cus_NFoSimples bit
declare @Cus_NFoEmbalagem bit
declare @Cus_NFoFinanceiro bit
declare @Cus_NFoFrete bit
declare @Cus_NFoDesconto bit
declare @Cus_ICMSDifAlqIPI bit
declare @Cus_ICMSValorCompra bit
declare @Pre_Codnosso varchar(20)
declare @Pre_Acabamento varchar(10)
declare @Pre_Codindice varchar(20)
declare @Pre_Tabela float
declare @Pre_compra float
declare @Pre_Custo float
declare @Pre_Venda float
declare @Pre_Lucro float
declare @Pre_PorLucro float
declare @Pre_est_min float
declare @Pre_tp_vl varchar(20)
declare @Pre_VlNFor float
DEclare @aspas varchar(4)
declare @Cus_PorcCartao float
declare @VlCartao float
declare @Cus_FreteemCompra bit
declare @Cus_CreditoICMS float
declare @Cus_CreditoPIS float
declare @Cus_CreditoCOFINS float
declare @Cus_CustoFixo float
declare @Cus_Desconto float
declare @vlCredIcms float
declare @vlCredPIS float
declare @vlCredCOFINS float
declare @vlCustoFixo float
declare @vlDescontoCusto float
declare @Cus_STEmbalagem bit
set @aspas = ''''
set @VlDesc_F1 = 0
set @VlDesc_F2 = 0
set @VlDesc_F3 = 0
set @VlDesc_F4 = 0
set @vlembalagem = 0
set @vlipi = 0
set @vlfinanceiro = 0
set @vlcompra = 0
set @vlfrete = 0
set @vloutros = 0
set @vlvenda = 0
set @vldesconto = 0
set @vlsimples = 0
set @vlcusto = 0
set @vlcom_int = 0
set @vlcom_ext = 0
set @vllucro_vl = 0
set @vllucro_por = 0
set @vlicms = 0
set @vl_ant_indice = 0
set @vl_com_desc = 0
set @venda_com_desc = 0
set @vltabela = 0
set @vlNFor = 0
set @VlSemDesc= 0
set @VlCartao = 0
set @vlCredIcms = 0
set @vlCredPIS = 0
set @vlCredCOFINS = 0
set @vlCustoFixo = 0
set @vlDescontoCusto = 0
set @Pais = (select SysPaises_codigo from Paramentros)
DECLARE @sql nvarchar(1000)
DECLARE indices CURSOR FOR
 (SELECT Indice_preco.Ipr_Indice,Indice_preco.Ipr_desconto,Indice_preco.Ipr_vl_com_inter,Indice_preco.Ipr_vl_com_exter ,Custo.Cus_Nome,
 Custo.Cus_desconto1, Custo.Cus_desconto2, Custo.Cus_desconto3, Custo.Cus_desconto4, Custo.Cus_IPI, Custo.Cus_Frete, Custo.Cus_Icms, 
Custo.Cus_Embalagens, Custo.Cus_Financeira, Custo.Cus_Simples, Custo.Cus_outros
 ,Custo.Cus_IcmsDESTINO,Custo.Cus_MargValAgreg,Custo.Cus_TributacaoICMS, Custo.Cus_importacao, Custo.Cus_cambio
 ,Cus_TpVlNFo,Cus_NFoICMS,Cus_NFoOutros,Cus_NFoIPI,Cus_NFoSimples,Cus_NFoEmbalagem,Cus_NFoFinanceiro,Cus_NFoFrete ,Cus_NFoDesconto,Cus_ICMSDifAlqIPI,Cus_PorcCartao
, Cus_FreteemCompra,Cus_CreditoICMS,Cus_CreditoPIS,Cus_CreditoCOFINS,Cus_CustoFixo,Cus_Desconto,Cus_STEmbalagem,Cus_ICMSValorCompra
FROM Indice_preco INNER JOIN Custo ON Indice_preco.Ipr_custo = Custo.Cus_codigo
 where Indice_preco.for_codigo =@CodFor and Indice_preco.Ipr_descricao=@Indice)
OPEN indices
FETCH NEXT FROM indices  INTO
@Ipr_Indice,@Ipr_desconto,@Ipr_vl_com_inter, @Ipr_vl_com_exter, @Cus_Nome, @Cus_desconto1, @Cus_desconto2, @Cus_desconto3,
@Cus_desconto4,@Cus_IPI, @Cus_Frete,@Cus_Icms,@Cus_Embalagens,@Cus_Financeira,@Cus_Simples,@Cus_outros,@Cus_IcmsDESTINO 
,@Cus_MargValAgreg,@Cus_TributacaoICMS, @Cus_importacao, @Cus_cambio, @Cus_TpVlNFo,@Cus_NFoICMS,@Cus_NFoOutros,@Cus_NFoIPI,@Cus_NFoSimples,
@Cus_NFoEmbalagem,@Cus_NFoFinanceiro,@Cus_NFoFrete,@Cus_NFoDesconto,@Cus_ICMSDifAlqIPI, @Cus_PorcCartao
, @Cus_FreteemCompra, @Cus_CreditoICMS, @Cus_CreditoPIS, @Cus_CreditoCOFINS,@Cus_CustoFixo, @Cus_Desconto, @Cus_STEmbalagem, @Cus_ICMSValorCompra

if @banco = 1
begin
DECLARE produto CURSOR FOR
(SELECT Preco_Produto.pre_Codnosso,Preco_Produto.Pre_Acabamento,Preco_Produto.Pre_Codindice,Preco_Produto.Pre_Tabela,Preco_Produto.Pre_compra
,Preco_Produto.Pre_Custo,Preco_Produto.Pre_Venda,Preco_Produto.Pre_Lucro,Preco_Produto.Pre_PorLucro,Preco_Produto.Pre_est_min
,Preco_Produto.Pre_tp_vl,Preco_Produto.Pre_VlNFor
FROM produtos INNER JOIN Preco_Produto ON produtos.Pro_codnosso = Preco_Produto.Pre_Codnosso INNER JOIN
ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso
where  ProdutosFornecedores.For_codigo=@CodFor and  Preco_Produto.Pre_Codindice=@Indice and Preco_Produto.pre_Codnosso = @produto and Preco_Produto.Pre_Acabamento = @acab)
end
else
begin
DECLARE produto CURSOR FOR
(SELECT bdprodutos.dbo.Preco_Produto.pre_Codnosso,bdprodutos.dbo.Preco_Produto.Pre_Acabamento,bdprodutos.dbo.Preco_Produto.Pre_Codindice,bdprodutos.dbo.Preco_Produto.Pre_Tabela,bdprodutos.dbo.Preco_Produto.Pre_compra
,bdprodutos.dbo.Preco_Produto.Pre_Custo,bdprodutos.dbo.Preco_Produto.Pre_Venda,bdprodutos.dbo.Preco_Produto.Pre_Lucro,bdprodutos.dbo.Preco_Produto.Pre_PorLucro,bdprodutos.dbo.Preco_Produto.Pre_est_min
,bdprodutos.dbo.Preco_Produto.Pre_tp_vl,bdprodutos.dbo.Preco_Produto.Pre_VlNFor
FROM bdprodutos.dbo.produtos INNER JOIN bdprodutos.dbo.Preco_Produto ON bdprodutos.dbo.produtos.Pro_codnosso = bdprodutos.dbo.Preco_Produto.Pre_Codnosso
INNER JOIN bdprodutos.dbo.ProdutosFornecedores ON
 bdprodutos.dbo.produtos.Pro_codnosso = bdprodutos.dbo.ProdutosFornecedores.Pro_codnosso
 where  bdprodutos.dbo.ProdutosFornecedores.For_codigo=@CodFor and  bdprodutos.dbo.Preco_Produto.Pre_Codindice=@Indice and bdprodutos.dbo.Preco_Produto.pre_Codnosso = @produto and bdprodutos.dbo.Preco_Produto.Pre_Acabamento = @acab)
end
OPEN produto
FETCH NEXT FROM produto INTO
@Pre_Codnosso,@Pre_Acabamento,@Pre_Codindice,@Pre_Tabela,@Pre_compra,@Pre_Custo,@Pre_Venda,@Pre_Lucro,
@Pre_PorLucro,@Pre_est_min,@Pre_tp_vl,@Pre_VlNFor
WHILE @@FETCH_STATUS = 0
BEGIN
if @Pre_Tabela > 0
begin
 set @vltabela = @Pre_Tabela
 /* calcular importação */
 if @Cus_importacao > 0 set @vltabela =  @vltabela + (@Cus_importacao  * @vltabela) / 100
 if @Cus_cambio > 0 set @vltabela =  (@Cus_cambio * @vltabela)
 /* descontos */
 if @Cus_desconto1 > 0
 begin
  set @VlDesc_F1 = (@Cus_desconto1 * @VlTabela) / 100
 end
 else set @VlDesc_F1 = 0
 if @Cus_desconto2 > 0
 begin
  set @vlDesc_F2 = (@Cus_desconto2 * (@VlTabela - @vlDesc_F1)) / 100
 end
 else set @vlDesc_F2 = 0
 if @Cus_desconto3 > 0
 begin
  set @vlDesc_F3 = (@Cus_desconto3 * (@VlTabela - @vlDesc_F1 - @vlDesc_F2)) / 100
 end
 else set @vlDesc_F3 = 0
 if @Cus_desconto4 > 0
 begin
  set @vlDesc_F4 = (@Cus_desconto4 * (@VlTabela - @vlDesc_F1 - @vlDesc_F2 - @vlDesc_F3)) / 100
 end
 else set @vlDesc_F4 = 0
 set @vl_com_desc = ((((@VlTabela - @vlDesc_F1) -  @vlDesc_F2) - @vlDesc_F3) - @vlDesc_F4)
 /* creditos */
if @Cus_CreditoICMS > 0
 begin
set @vlCredIcms = (@vl_com_desc * @Cus_CreditoICMS) / 100
end
else set @vlCredIcms = 0
if @Cus_CreditoPIS > 0
begin
set @vlCredPIS = (@vl_com_desc * @Cus_CreditoPIS) / 100
end
else set @vlCredPIS = 0
if @Cus_CreditoCOFINS > 0
begin
set @vlCredCOFINS = (@vl_com_desc * @Cus_CreditoCOFINS) / 100
end
else set @vlCredCOFINS = 0
 /* ipi */
 if @Cus_IPI > 0
  begin
  set @vlipi = (@vl_com_desc * @Cus_IPI) / 100
  end
 else set @vlipi = 0
 /* embalagem */
 if @Cus_Embalagens > 0
 begin
   set @vlembalagem = (@vl_com_desc * @Cus_Embalagens) / 100
 end
else set @vlembalagem = 0
/* financeiro */
if @Cus_Financeira > 0
begin
 set @vlfinanceiro = ((@vl_com_desc + @vlembalagem + @vlipi) * @Cus_Financeira) / 100
end
else set @vlfinanceiro = 0
if @Cus_FreteemCompra = 1
begin
/* frete */
if @Cus_frete > 0
set @vlfrete = (@vl_com_desc) * (@Cus_frete / 100)
else set @vlfrete = 0
/* valor de compra */
set @vl_com_desc = @vl_com_desc - (@vlCredIcms+@vlCredPIS+@vlCredCOFINS)
set @vlcompra = (@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro+@vlfrete)
end
else
begin
/* valor de compra */
set @vl_com_desc = @vl_com_desc - (@vlCredIcms+@vlCredPIS+@vlCredCOFINS)
set @vlcompra = (@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro)
/* frete */
if @Cus_frete > 0
 set @vlfrete = (@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro) * (@Cus_frete / 100)
else set @vlfrete = 0
end
/* outros */
if @Cus_outros > 0
 set @vloutros = ((@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro) * @Cus_outros) / 100
else set @vloutros = 0
/* valor de venda */
if @Ipr_Indice > 0
BEGIN
 if  @Cus_cambio > 0
 set @vlvenda = round((@vl_com_desc * @Ipr_Indice),2)
 else set @vlvenda = round((@Pre_Tabela * @Ipr_Indice),2)
 end
 else set @vlvenda = 0
if @Ipr_desconto > 0
 set @vldesconto = (@vlvenda * @Ipr_desconto) / 100
else set @vldesconto = 0
set @venda_com_desc = (@vlvenda - @vldesconto)
/* icms e iva */
if @Pais = 1
 begin
  set  @vlicms = 0
 if @Cus_TributacaoICMS = 'SUBSTITUIÇÃO TRIBUTÁRIA'
 begin
if @Cus_STEmbalagem = 1
begin
 set @vlicms = ((((@vlipi + @vl_com_desc+@vlembalagem) * (@Cus_MargValAgreg / 100)) + (@vlipi + @vl_com_desc+@vlembalagem)) *
(@Cus_ICMSDESTINO / 100)) - ((@vl_com_desc + @vlembalagem )* (@Cus_ICMS / 100))
 end
 else
 begin
 set @vlicms = ((((@vlipi + @vl_com_desc) * (@Cus_MargValAgreg / 100)) + (@vlipi + @vl_com_desc)) *(@Cus_ICMSDESTINO / 100)) - (@vl_com_desc * (@Cus_ICMS / 100))
 end
  if @vlicms < 0  set @vlicms = @vlicms * -1
 end
if @Cus_TributacaoICMS = 'DIFERENCIAL DE ALÍQUOTAS'
 begin
if @Cus_ICMSDifAlqIPI = 1
 set @vlicms = ((@vlipi + @vl_com_desc) * ((@Cus_ICMS - @Cus_ICMSDESTINO) / 100))
 else set @vlicms = ((@vl_com_desc) * ((@Cus_ICMS - @Cus_ICMSDESTINO) / 100))
 if @vlicms < 0 set @vlicms = @vlicms * -1
 end;
 if (@Cus_TributacaoICMS = null) or (@Cus_TributacaoICMS = '')
 begin
 if @Cus_Icms > 0
 set @vlicms = ((@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro) * @Cus_Icmsdestino) / 100
 end;
 if @Cus_TributacaoICMS = 'ICMS NORMAL'
 begin
set @vlicms = (@venda_com_desc * (@Cus_ICMSDESTINO) / 100) - (@vl_com_desc * (@Cus_Icms / 100))
if @vlicms < 0 set @vlicms = @vlicms * -1
end
end
else
begin
set @vlicms = 0
if @Cus_TributacaoICMS = 'COM IVA'
begin
set @vlicms = (@venda_com_desc * (@Cus_icmsdestino) / 100) - (@vl_com_desc * (@Cus_icms / 100))
if @vlicms < 0 set @vlicms = @vlicms * -1
end
end
if @Cus_ICMSValorCompra = 1
begin
/* valor de compra */
set @vlcompra = (@vlcompra + @vlicms)
end
/* custo fixo */
if  @Cus_CustoFixo > 0
set @vlCustoFixo = (@venda_com_desc * @Cus_CustoFixo) / 100
else set @vlCustoFixo = 0
/* custo desconto */
if  @Cus_Desconto > 0
set @vlDescontoCusto = (@venda_com_desc * @Cus_Desconto) / 100
else set @vlDescontoCusto = 0
/* cartões  */
if @Cus_PorcCartao  > 0
set @vlcartao = (@venda_com_desc * @Cus_PorcCartao) / 100
else set @vlcartao = 0
/* simples  */
 if @Cus_Simples > 0
 set @vlsimples = (@venda_com_desc * @Cus_Simples) / 100
 else set @vlsimples = 0
/* valor de custo */
set @vlcusto = @vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro + @vlfrete + @vlicms + @vloutros + @vlsimples + @vlcartao+@vlCustoFixo+@vlDescontoCusto
/* comissão externa e interna */
if @Ipr_vl_com_inter > 0
  set @vlcom_int = (@Ipr_vl_com_inter * @venda_com_desc) / 100
else  set @vlcom_int = 0
if @Ipr_vl_com_exter > 0
 set @vlcom_ext = (@Ipr_vl_com_exter * @venda_com_desc) / 100
else set @vlcom_ext = 0
set @vllucro_vl = (@venda_com_desc - @vlcusto - @vlcom_int - @vlcom_ext)
if @venda_com_desc > 0 set @vllucro_por = (@vllucro_vl / @venda_com_desc) * 100
/* valor do produto na nota o fornecedor */
if @Cus_TpVlNFo =  '1' set @vlNFor = @vlcompra
if @Cus_TpVlNFo = '2' set @vlNFor = @vlcusto
if @Cus_TpVlNFo = '3'
begin
if @Cus_NFoDesconto = 1
 begin
set @vlNFor = @vl_com_desc
if @Cus_NFoICMS = 1 set @vlNFor = @vlNFor + @vlicms
if @Cus_NFoOutros = 1 set @vlNFor = @vlNFor + @Cus_outros
if @Cus_NFoIPI = 1 set @vlNFor = @vlNFor + @vlipi
if @Cus_NFoSimples = 1 set @vlNFor = @vlNFor + @vlsimples
if @Cus_NFoEmbalagem = 1 set @vlNFor = @vlNFor + @vlembalagem
if @Cus_NFoFinanceiro = 1 set @vlNFor = @vlNFor + @vlfinanceiro
if @Cus_NFoFrete = 1 set @vlNFor = @vlNFor + @vlfrete
end
else
begin
/* =========================== sem descontos ==========================*/
set @VlSemDesc = @VlTabela
 /* ipi */
 if @Cus_IPI > 0
  begin
set @vlipi = (@VlSemDesc * @Cus_IPI) / 100
 end
 else set @vlipi = 0
/* embalagem */
 if @Cus_Embalagens > 0
 begin
 set @vlembalagem = (@VlSemDesc * @Cus_Embalagens) / 100
 end
else set @vlembalagem = 0
/* financeiro */
if @Cus_Financeira > 0
begin
 set @vlfinanceiro = ((@VlSemDesc + @vlembalagem + @vlipi) * @Cus_Financeira) / 100
end
else set @vlfinanceiro = 0
 /* creditos */
if @Cus_CreditoICMS > 0
 begin
set @vlCredIcms = (@VlSemDesc * @Cus_CreditoICMS) / 100
end
else set @vlCredIcms = 0
if @Cus_CreditoPIS > 0
begin
set @vlCredPIS = (@VlSemDesc * @Cus_CreditoPIS) / 100
end
else set @vlCredPIS = 0
if @Cus_CreditoCOFINS > 0
begin
set @vlCredCOFINS = (@VlSemDesc * @Cus_CreditoCOFINS) / 100
end
else set @vlCredCOFINS = 0
if @Cus_FreteemCompra = 1
begin
/* frete */
if @Cus_frete > 0
set @vlfrete = (@VlSemDesc) * (@Cus_frete / 100)
else set @vlfrete = 0
/* valor de compra */
set @VlSemDesc = @VlSemDesc - (@vlCredIcms+@vlCredPIS+@vlCredCOFINS)
set @vlcompra = (@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro+@vlfrete)
end
else
begin
/* valor de compra */
set @vlcompra = (@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro)
/* frete */
if @Cus_frete > 0
 set @vlfrete = (@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro) * (@Cus_frete / 100)
else set @vlfrete = 0
end
/* outros */
if @Cus_outros > 0
set @vloutros = ((@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro) * @Cus_outros) / 100
else set @vloutros = 0
/* icms e iva */
if @Pais = 1
 begin
 set  @vlicms = 0
 if @Cus_TributacaoICMS = 'SUBSTITUIÇÃO TRIBUTÁRIA'
 begin
if @Cus_STEmbalagem = 1
begin
 set @vlicms = ((((@vlipi + @vl_com_desc+@vlembalagem) * (@Cus_MargValAgreg / 100)) + (@vlipi + @vl_com_desc+@vlembalagem)) *
(@Cus_ICMSDESTINO / 100)) - ((@vl_com_desc + @vlembalagem )* (@Cus_ICMS / 100))
 end
 else
 begin
 set @vlicms = ((((@vlipi + @vl_com_desc) * (@Cus_MargValAgreg / 100)) + (@vlipi + @vl_com_desc)) *(@Cus_ICMSDESTINO / 100)) - (@vl_com_desc * (@Cus_ICMS / 100))
 end
 if @vlicms < 0  set @vlicms = @vlicms * -1
 end
 if @Cus_TributacaoICMS = 'DIFERENCIAL DE ALÍQUOTAS'
 begin
if @Cus_ICMSDifAlqIPI = 1
 set @vlicms = ((@vlipi + @VlSemDesc) * ((@Cus_ICMS - @Cus_ICMSDESTINO) / 100))
 else set @vlicms = ((@VlSemDesc) * ((@Cus_ICMS - @Cus_ICMSDESTINO) / 100))
 if @vlicms < 0 set @vlicms = @vlicms * -1
 end;
 if (@Cus_TributacaoICMS = null) or (@Cus_TributacaoICMS = '')
 begin
 if @Cus_Icms > 0
 set @vlicms = ((@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro) * @Cus_Icmsdestino) / 100
 end;
 if @Cus_TributacaoICMS = 'ICMS NORMAL'
 begin
set @vlicms = (@venda_com_desc * (@Cus_ICMSDESTINO) / 100) - (@VlSemDesc * (@Cus_Icms / 100))
if @vlicms < 0 set @vlicms = @vlicms * -1
end
end
else
begin
set @vlicms = 0
if @Cus_TributacaoICMS = 'COM IVA'
begin
set @vlicms = (@venda_com_desc * (@Cus_icmsdestino) / 100) - (@VlSemDesc * (@Cus_icms / 100))
if @vlicms < 0 set @vlicms = @vlicms * -1
end
end
if @Cus_ICMSValorCompra = 1
begin
/* valor de compra */
set @vlcompra = (@vlcompra + @vlicms)
end
/* simples  */
if @Cus_Simples > 0
set @vlsimples = (@venda_com_desc * @Cus_Simples) / 100
 else set @vlsimples = 0
set @vlNFor = 0
set @vlNFor = @VlSemDesc
if @Cus_NFoICMS = 1 set @vlNFor = @vlNFor + @vlicms
if @Cus_NFoOutros = 1 set @vlNFor = @vlNFor + @Cus_outros
if @Cus_NFoIPI = 1 set @vlNFor = @vlNFor + @vlipi
if @Cus_NFoSimples = 1 set @vlNFor = @vlNFor + @vlsimples
if @Cus_NFoEmbalagem = 1 set @vlNFor = @vlNFor + @vlembalagem
if @Cus_NFoFinanceiro = 1 set @vlNFor = @vlNFor + @vlfinanceiro
if @Cus_NFoFrete = 1 set @vlNFor = @vlNFor + @vlfrete
end
end
if @banco = 1
begin
set @sql ='insert into Preco_Produto_Log  (PreLog_Codnosso,PreLog_Acabamento,PreLog_Codindice,PreLog_tp_vl,usr_dt_hr_criacao,usr_cod_criacao,PreLog_Ativo,PreLog_Tabela,'+
'PreLog_compra,PreLog_Custo,PreLog_Venda,PreLog_Lucro,PreLog_PorLucro,PreLog_est_min,Prelog_VlNFor)'+
' select Pre_Codnosso,Pre_Acabamento,Pre_Codindice,Pre_tp_vl,getdate(),1,Pre_Ativo,Pre_Tabela,Pre_compra,Pre_Custo,Pre_Venda,Pre_Lucro,Pre_PorLucro,Pre_est_min,Pre_VlNFor  from Preco_Produto'+
' where Preco_Produto.Pre_Codnosso  = '
+ @aspas +  @Pre_Codnosso + @aspas +' and Preco_Produto.Pre_Acabamento = '+ @aspas +  @Pre_Acabamento + @aspas +
' AND Preco_Produto.Pre_Codindice = '+ @aspas + @Indice + @aspas
EXEC sp_executesql @sql
set @sql  = 'update Preco_Produto set Preco_Produto.Pre_compra = '+ LTRIM(RTRIM(STR(round(@vlcompra,2),10,2)))
+ ', Preco_Produto.Pre_Custo = ' +  LTRIM(RTRIM(STR(round(@vlcusto,2),10,2)))
+', Preco_Produto.Pre_Venda = '+ LTRIM(RTRIM(STR(round(@venda_com_desc,2),10,2)))
+', Preco_Produto.Pre_Lucro = '+ LTRIM(RTRIM(STR(round(@vllucro_vl,2),10,2)))
+ ', Preco_Produto.Pre_PorLucro = '+ LTRIM(RTRIM(STR(round(@vllucro_por,2),10,2)))
+ ', Preco_Produto.Pre_VlNFor = '+ LTRIM(RTRIM(STR(round(@vlNFor,2),10,2)))
+ '  where Preco_Produto.Pre_Codnosso  = ' + @aspas + @Pre_Codnosso + @aspas +' and Preco_Produto.Pre_Acabamento =  ' + @aspas + @Pre_Acabamento + @aspas  + 
' AND Preco_Produto.Pre_Codindice = '+ @aspas + @Indice + @aspas 
EXEC sp_executesql @sql
end
else
begin
set @sql  = 'update bdprodutos.dbo.Preco_Produto set bdprodutos.dbo.Preco_Produto.Pre_compra = ' + LTRIM(RTRIM(STR(round(@vlcompra,2),10,2)))
+ ', bdprodutos.dbo.Preco_Produto.Pre_Custo = ' + LTRIM(RTRIM(STR(round(@vlcusto,2),10,2))) 
+ ', bdprodutos.dbo.Preco_Produto.Pre_Venda = ' + LTRIM(RTRIM(STR(round(@venda_com_desc,2),10,2))) 
+ ', bdprodutos.dbo.Preco_Produto.Pre_Lucro = ' + LTRIM(RTRIM(STR(round(@vllucro_vl,2),10,2))) 
+ ', bdprodutos.dbo.Preco_Produto.Pre_PorLucro = ' + LTRIM(RTRIM(STR(round(@vllucro_por,2),10,2)))
+ ', bdprodutos.dbo.Preco_Produto.Pre_VlNFor = ' + LTRIM(RTRIM(STR(round(@vlNFor,2),10,2)))
+ '  where bdprodutos.dbo.Preco_Produto.Pre_Codnosso  = ' + @aspas + @Pre_Codnosso + @aspas +  ' and bdprodutos.dbo.Preco_Produto.Pre_Acabamento =  ' + @aspas + @Pre_Acabamento +  @aspas +  
' AND bdprodutos.dbo.Preco_Produto.Pre_Codindice = ' + @aspas + @Indice + @aspas  
EXEC sp_executesql @sql
end
end
FETCH NEXT FROM produto INTO
@Pre_Codnosso,@Pre_Acabamento,@Pre_Codindice,@Pre_Tabela,@Pre_compra,@Pre_Custo,@Pre_Venda,@Pre_Lucro,
@Pre_PorLucro,@Pre_est_min,@Pre_tp_vl,@Pre_VlNFor
end
CLOSE produto
DEALLOCATE produto
CLOSE indices
DEALLOCATE indices
end

GO

/* ===== SQL_STORED_PROCEDURE :: CalcularProduto ===== */
CREATE PROCEDURE [dbo].[CalcularProduto]
@CodFor int, @Indice varchar(20), @banco int
WITH
EXECUTE AS CALLER
AS
BEGIN
declare @VlDesc_F1 float
declare @VlDesc_F2 float
declare @VlDesc_F3 float
declare @VlDesc_F4 float
declare @vlembalagem float
declare @vlipi float
declare @vlfinanceiro float
declare @vlcompra float
declare @vlfrete float
declare @vloutros float
declare @vlvenda float
declare @vldesconto float
declare @vlsimples float
declare @vlcusto float
declare @vlcom_int float
declare @vlcom_ext float
declare @vllucro_vl float
declare @vllucro_por float
declare @vlicms float
declare @vl_ant_indice float
declare @vl_com_desc float
declare @venda_com_desc float
declare @vltabela float
declare @vlNFor float
declare @VlSemDesc float
declare @Pais int
declare @Ipr_Indice float
declare @Ipr_desconto float
declare @Ipr_vl_com_inter float
declare @Ipr_vl_com_exter float
declare @Cus_Nome varchar(30)
declare @Cus_desconto1 float
declare @Cus_desconto2 float
declare @Cus_desconto3 float
declare @Cus_desconto4 float
declare @Cus_IPI float
declare @Cus_Frete float
declare @Cus_Icms float
declare @Cus_Embalagens float
declare @Cus_Financeira float
declare @Cus_Simples float
declare @Cus_outros  float
declare @Cus_IcmsDESTINO float
declare @Cus_MargValAgreg float
declare @Cus_TributacaoICMS varchar(30)
declare @Cus_importacao float
declare @Cus_cambio float
declare @Cus_TpVlNFo char(1)
declare @Cus_NFoICMS bit
declare @Cus_NFoOutros bit
declare @Cus_NFoIPI bit
declare @Cus_NFoSimples bit
declare @Cus_NFoEmbalagem bit
declare @Cus_NFoFinanceiro bit
declare @Cus_NFoFrete bit
declare @Cus_NFoDesconto bit
declare @Cus_ICMSDifAlqIPI bit
declare @Cus_ICMSValorCompra bit
declare @Pre_Codnosso varchar(20)
declare @Pre_Acabamento varchar(10)
declare @Pre_Codindice varchar(20)
declare @Pre_Tabela float
declare @Pre_compra float
declare @Pre_Custo float
declare @Pre_Venda float
declare @Pre_Lucro float
declare @Pre_PorLucro float
declare @Pre_est_min float
declare @Pre_tp_vl varchar(20)
declare @Pre_VlNFor float
DEclare @aspas varchar(4)
declare @Cus_PorcCartao float
declare @VlCartao float
declare @Cus_FreteemCompra bit
declare @Cus_CreditoICMS float
declare @Cus_CreditoPIS float
declare @Cus_CreditoCOFINS float
declare @Cus_CustoFixo float
declare @Cus_Desconto float
declare @vlCredIcms float
declare @vlCredPIS float
declare @vlCredCOFINS float
declare @vlCustoFixo float
declare @vlDescontoCusto float
declare @Cus_STEmbalagem bit
set @aspas = ''''
set @VlDesc_F1 = 0
set @VlDesc_F2 = 0
set @VlDesc_F3 = 0
set @VlDesc_F4 = 0
set @vlembalagem = 0
set @vlipi = 0
set @vlfinanceiro = 0
set @vlcompra = 0
set @vlfrete = 0
set @vloutros = 0
set @vlvenda = 0
set @vldesconto = 0
set @vlsimples = 0
set @vlcusto = 0
set @vlcom_int = 0
set @vlcom_ext = 0
set @vllucro_vl = 0
set @vllucro_por = 0
set @vlicms = 0
set @vl_ant_indice = 0
set @vl_com_desc = 0
set @venda_com_desc = 0
set @vltabela = 0
set @vlNFor = 0
set @VlSemDesc= 0
set @VlCartao = 0
set @vlCredIcms = 0
set @vlCredPIS = 0
set @vlCredCOFINS = 0
set @vlCustoFixo = 0
set @vlDescontoCusto = 0
set @Pais = (select SysPaises_codigo from Paramentros)
DECLARE @sql nvarchar(1000)
DECLARE indices CURSOR FOR
 (SELECT Indice_preco.Ipr_Indice,Indice_preco.Ipr_desconto,Indice_preco.Ipr_vl_com_inter,Indice_preco.Ipr_vl_com_exter ,Custo.Cus_Nome,
 Custo.Cus_desconto1, Custo.Cus_desconto2, Custo.Cus_desconto3, Custo.Cus_desconto4, Custo.Cus_IPI, Custo.Cus_Frete, Custo.Cus_Icms, 
Custo.Cus_Embalagens, Custo.Cus_Financeira, Custo.Cus_Simples, Custo.Cus_outros
 ,Custo.Cus_IcmsDESTINO,Custo.Cus_MargValAgreg,Custo.Cus_TributacaoICMS, Custo.Cus_importacao, Custo.Cus_cambio
 ,Cus_TpVlNFo,Cus_NFoICMS,Cus_NFoOutros,Cus_NFoIPI,Cus_NFoSimples,Cus_NFoEmbalagem,Cus_NFoFinanceiro,Cus_NFoFrete ,Cus_NFoDesconto,Cus_ICMSDifAlqIPI,Cus_PorcCartao  
 ,Cus_FreteemCompra,Cus_CreditoICMS,Cus_CreditoPIS,Cus_CreditoCOFINS,Cus_CustoFixo,Cus_Desconto, Cus_STEmbalagem, Cus_ICMSValorCompra
FROM Indice_preco INNER JOIN Custo ON Indice_preco.Ipr_custo = Custo.Cus_codigo
 where Indice_preco.for_codigo =@CodFor and Indice_preco.Ipr_descricao=@Indice)
OPEN indices
FETCH NEXT FROM indices  INTO
@Ipr_Indice,@Ipr_desconto,@Ipr_vl_com_inter, @Ipr_vl_com_exter, @Cus_Nome, @Cus_desconto1, @Cus_desconto2, @Cus_desconto3,
@Cus_desconto4,@Cus_IPI, @Cus_Frete,@Cus_Icms,@Cus_Embalagens,@Cus_Financeira,@Cus_Simples,@Cus_outros,@Cus_IcmsDESTINO 
,@Cus_MargValAgreg,@Cus_TributacaoICMS, @Cus_importacao, @Cus_cambio, @Cus_TpVlNFo,@Cus_NFoICMS,@Cus_NFoOutros,@Cus_NFoIPI,@Cus_NFoSimples,
@Cus_NFoEmbalagem,@Cus_NFoFinanceiro,@Cus_NFoFrete,@Cus_NFoDesconto, @Cus_ICMSDifAlqIPI,@Cus_PorcCartao
, @Cus_FreteemCompra, @Cus_CreditoICMS, @Cus_CreditoPIS, @Cus_CreditoCOFINS,@Cus_CustoFixo, @Cus_Desconto, @Cus_STEmbalagem,@Cus_ICMSValorCompra

if @banco = 1
begin
DECLARE produto CURSOR FOR
(SELECT Preco_Produto.pre_Codnosso,Preco_Produto.Pre_Acabamento,Preco_Produto.Pre_Codindice,Preco_Produto.Pre_Tabela,Preco_Produto.Pre_compra
,Preco_Produto.Pre_Custo,Preco_Produto.Pre_Venda,Preco_Produto.Pre_Lucro,Preco_Produto.Pre_PorLucro,Preco_Produto.Pre_est_min
,Preco_Produto.Pre_tp_vl,Preco_Produto.Pre_VlNFor
FROM produtos INNER JOIN
Preco_Produto ON produtos.Pro_codnosso = Preco_Produto.Pre_Codnosso INNER JOIN
ProdutosFornecedores ON produtos.Pro_codnosso = ProdutosFornecedores.Pro_codnosso
where ProdutosFornecedores.For_codigo=@CodFor and  Preco_Produto.Pre_Codindice=@Indice)
end
else
begin
 DECLARE produto CURSOR FOR
(SELECT bdprodutos.dbo.Preco_Produto.pre_Codnosso,bdprodutos.dbo.Preco_Produto.Pre_Acabamento,bdprodutos.dbo.Preco_Produto.Pre_Codindice,bdprodutos.dbo.Preco_Produto.Pre_Tabela,bdprodutos.dbo.Preco_Produto.Pre_compra
,bdprodutos.dbo.Preco_Produto.Pre_Custo,bdprodutos.dbo.Preco_Produto.Pre_Venda,bdprodutos.dbo.Preco_Produto.Pre_Lucro,bdprodutos.dbo.Preco_Produto.Pre_PorLucro,bdprodutos.dbo.Preco_Produto.Pre_est_min
,bdprodutos.dbo.Preco_Produto.Pre_tp_vl,bdprodutos.dbo.Preco_Produto.Pre_VlNFor
FROM bdprodutos.dbo.produtos INNER JOIN
bdprodutos.dbo.Preco_Produto ON bdprodutos.dbo.produtos.Pro_codnosso = bdprodutos.dbo.Preco_Produto.Pre_Codnosso INNER JOIN
bdprodutos.dbo.ProdutosFornecedores ON bdprodutos.dbo.produtos.Pro_codnosso = bdprodutos.dbo.ProdutosFornecedores.Pro_codnosso
where bdprodutos.dbo.ProdutosFornecedores.For_codigo=@CodFor and  bdprodutos.dbo.Preco_Produto.Pre_Codindice=@Indice)
end
OPEN produto
FETCH NEXT FROM produto INTO
@Pre_Codnosso,@Pre_Acabamento,@Pre_Codindice,@Pre_Tabela,@Pre_compra,@Pre_Custo,@Pre_Venda,@Pre_Lucro,
@Pre_PorLucro,@Pre_est_min,@Pre_tp_vl,@Pre_VlNFor
WHILE @@FETCH_STATUS = 0
BEGIN
if @Pre_Tabela > 0
begin
 set @vltabela = @Pre_Tabela
 /* calcular  importação */
 if @Cus_importacao > 0 set @vltabela =  @vltabela + (@Cus_importacao  * @vltabela) / 100
 if @Cus_cambio > 0 set @vltabela =  (@Cus_cambio * @vltabela)
 /* descontos */
 if @Cus_desconto1 > 0
 begin
  set @VlDesc_F1 = (@Cus_desconto1 * @VlTabela) / 100
 end
 else set @VlDesc_F1 = 0
 if @Cus_desconto2 > 0
 begin
  set @vlDesc_F2 = (@Cus_desconto2 * (@VlTabela - @vlDesc_F1)) / 100
 end
 else set @vlDesc_F2 = 0
 if @Cus_desconto3 > 0
 begin
  set @vlDesc_F3 = (@Cus_desconto3 * (@VlTabela - @vlDesc_F1 - @vlDesc_F2)) / 100
 end
 else set @vlDesc_F3 = 0
 if @Cus_desconto4 > 0
 begin
  set @vlDesc_F4 = (@Cus_desconto4 * (@VlTabela - @vlDesc_F1 - @vlDesc_F2 - @vlDesc_F3)) / 100
 end
 else set @vlDesc_F4 = 0
 set @vl_com_desc = ((((@VlTabela - @vlDesc_F1) -  @vlDesc_F2) - @vlDesc_F3) - @vlDesc_F4)
 /* creditos */
if @Cus_CreditoICMS > 0
 begin
set @vlCredIcms = (@vl_com_desc * @Cus_CreditoICMS) / 100
end
else set @vlCredIcms = 0
if @Cus_CreditoPIS > 0
begin
set @vlCredPIS = (@vl_com_desc * @Cus_CreditoPIS) / 100
end
else set @vlCredPIS = 0
if @Cus_CreditoCOFINS > 0
begin
set @vlCredCOFINS = (@vl_com_desc * @Cus_CreditoCOFINS) / 100
end
else set @vlCredCOFINS = 0
 /* ipi */
 if @Cus_IPI > 0
  begin
  set @vlipi = (@vl_com_desc * @Cus_IPI) / 100
  end
 else set @vlipi = 0
 /* embalagem */
 if @Cus_Embalagens > 0
 begin
   set @vlembalagem = (@vl_com_desc * @Cus_Embalagens) / 100
 end
else set @vlembalagem = 0
/* financeiro */
if @Cus_Financeira > 0
begin
 set @vlfinanceiro = ((@vl_com_desc + @vlembalagem + @vlipi) * @Cus_Financeira) / 100
end
else set @vlfinanceiro = 0
/* valor de compra */
if @Cus_FreteemCompra = 1
begin
/* frete */
if @Cus_frete > 0
set @vlfrete = (@vl_com_desc) * (@Cus_frete / 100)
else set @vlfrete = 0
/* valor de compra */
set @vl_com_desc = @vl_com_desc - (@vlCredIcms+@vlCredPIS+@vlCredCOFINS)
set @vlcompra = (@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro+@vlfrete)
end
else
begin
/* valor de compra */
set @vl_com_desc = @vl_com_desc - (@vlCredIcms+@vlCredPIS+@vlCredCOFINS)
set @vlcompra = (@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro)
/* frete */
if @Cus_frete > 0
 set @vlfrete = (@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro) * (@Cus_frete / 100)
else set @vlfrete = 0
end
/* outros */
if @Cus_outros > 0
 set @vloutros = ((@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro) * @Cus_outros) / 100
else set @vloutros = 0
/* valor de venda */
if @Ipr_Indice > 0
BEGIN
 if  @Cus_cambio > 0
 set @vlvenda = round((@vl_com_desc * @Ipr_Indice),2)
 else set @vlvenda = round((@Pre_Tabela * @Ipr_Indice),2)
 end
 else set @vlvenda = 0
if @Ipr_desconto > 0
 set @vldesconto = (@vlvenda * @Ipr_desconto) / 100
else set @vldesconto = 0
set @venda_com_desc = (@vlvenda - @vldesconto)
/* icms e iva */
if @Pais = 1
 begin
  set  @vlicms = 0
 if @Cus_TributacaoICMS = 'SUBSTITUIÇÃO TRIBUTÁRIA'
 begin
if @Cus_STEmbalagem = 1
begin
 set @vlicms = ((((@vlipi + @vl_com_desc+@vlembalagem) * (@Cus_MargValAgreg / 100)) + (@vlipi + @vl_com_desc+@vlembalagem)) *
(@Cus_ICMSDESTINO / 100)) - ((@vl_com_desc + @vlembalagem )* (@Cus_ICMS / 100))
 end
 else
 begin
 set @vlicms = ((((@vlipi + @vl_com_desc) * (@Cus_MargValAgreg / 100)) + (@vlipi + @vl_com_desc)) *(@Cus_ICMSDESTINO / 100)) - (@vl_com_desc * (@Cus_ICMS / 100))
 end
  if @vlicms < 0  set @vlicms = @vlicms * -1
 end
if @Cus_TributacaoICMS = 'DIFERENCIAL DE ALÍQUOTAS'
 begin
if @Cus_ICMSDifAlqIPI = 1
 set @vlicms = ((@vlipi + @vl_com_desc) * ((@Cus_ICMS - @Cus_ICMSDESTINO) / 100))
 else set @vlicms = ((@vl_com_desc) * ((@Cus_ICMS - @Cus_ICMSDESTINO) / 100))
 if @vlicms < 0 set @vlicms = @vlicms * -1
        end;
 if (@Cus_TributacaoICMS = null) or (@Cus_TributacaoICMS = '')
 begin
 if @Cus_Icms > 0
 set @vlicms = ((@vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro) * @Cus_Icmsdestino) / 100
 end;
 if @Cus_TributacaoICMS = 'ICMS NORMAL'
 begin
set @vlicms = (@venda_com_desc * (@Cus_ICMSDESTINO) / 100) - (@vl_com_desc * (@Cus_Icms / 100))
if @vlicms < 0 set @vlicms = @vlicms * -1
end
end
else
begin
set @vlicms = 0
if @Cus_TributacaoICMS = 'COM IVA'
begin
set @vlicms = (@venda_com_desc * (@Cus_icmsdestino) / 100) - (@vl_com_desc * (@Cus_icms / 100))
if @vlicms < 0 set @vlicms = @vlicms * -1
end
end
if @Cus_ICMSValorCompra = 1
begin
/* valor de compra */
set @vlcompra = (@vlcompra + @vlicms)
end
/* custo fixo */
if  @Cus_CustoFixo > 0
set @vlCustoFixo = (@venda_com_desc * @Cus_CustoFixo) / 100
else set @vlCustoFixo = 0
/* custo desconto */
if  @Cus_Desconto > 0
set @vlDescontoCusto = (@venda_com_desc * @Cus_Desconto) / 100
else set @vlDescontoCusto = 0
/* cartões  */
if @Cus_PorcCartao  > 0
set @vlcartao = (@venda_com_desc * @Cus_PorcCartao) / 100
else set @vlcartao = 0
/* simples  */
 if @Cus_Simples > 0
 set @vlsimples = (@venda_com_desc * @Cus_Simples) / 100
 else set @vlsimples = 0
/* valor de custo */
set @vlcusto = @vl_com_desc + @vlembalagem + @vlipi + @vlfinanceiro + @vlfrete + @vlicms + @vloutros + @vlsimples+@vlcartao+@vlCustoFixo+@vlDescontoCusto
/* comissão externa e interna */
if @Ipr_vl_com_inter > 0
  set @vlcom_int = (@Ipr_vl_com_inter * @venda_com_desc) / 100
else  set @vlcom_int = 0
if @Ipr_vl_com_exter > 0
 set @vlcom_ext = (@Ipr_vl_com_exter * @venda_com_desc) / 100
else set @vlcom_ext = 0
set @vllucro_vl = (@venda_com_desc - @vlcusto - @vlcom_int - @vlcom_ext)
if @venda_com_desc > 0 set @vllucro_por = (@vllucro_vl / @venda_com_desc) * 100
/* valor do produto na nota o fornecedor */
if @Cus_TpVlNFo =  '1' set @vlNFor = @vlcompra
if @Cus_TpVlNFo = '2' set @vlNFor = @vlcusto
if @Cus_TpVlNFo = '3'
begin
if @Cus_NFoDesconto = 1
 begin
set @vlNFor = @vl_com_desc
if @Cus_NFoICMS = 1 set @vlNFor = @vlNFor + @vlicms
if @Cus_NFoOutros = 1 set @vlNFor = @vlNFor + @Cus_outros
if @Cus_NFoIPI = 1 set @vlNFor = @vlNFor + @vlipi
if @Cus_NFoSimples = 1 set @vlNFor = @vlNFor + @vlsimples
if @Cus_NFoEmbalagem = 1 set @vlNFor = @vlNFor + @vlembalagem
if @Cus_NFoFinanceiro = 1 set @vlNFor = @vlNFor + @vlfinanceiro
if @Cus_NFoFrete = 1 set @vlNFor = @vlNFor + @vlfrete
end
else
begin
/* =========================== sem descontos ==========================*/
set @VlSemDesc = @VlTabela
 /* ipi */
 if @Cus_IPI > 0
  begin
set @vlipi = (@VlSemDesc * @Cus_IPI) / 100
 end
 else set @vlipi = 0
/* embalagem */
 if @Cus_Embalagens > 0
 begin
 set @vlembalagem = (@VlSemDesc * @Cus_Embalagens) / 100
 end
else set @vlembalagem = 0
/* financeiro */
if @Cus_Financeira > 0
begin
 set @vlfinanceiro = ((@VlSemDesc + @vlembalagem + @vlipi) * @Cus_Financeira) / 100
end
else set @vlfinanceiro = 0
 /* creditos */
if @Cus_CreditoICMS > 0
 begin
set @vlCredIcms = (@VlSemDesc * @Cus_CreditoICMS) / 100
end
else set @vlCredIcms = 0
if @Cus_CreditoPIS > 0
begin
set @vlCredPIS = (@VlSemDesc * @Cus_CreditoPIS) / 100
end
else set @vlCredPIS = 0
if @Cus_CreditoCOFINS > 0
begin
set @vlCredCOFINS = (@VlSemDesc * @Cus_CreditoCOFINS) / 100
end
else set @vlCredCOFINS = 0
if @Cus_FreteemCompra = 1
begin
/* frete */
if @Cus_frete > 0
set @vlfrete = (@VlSemDesc) * (@Cus_frete / 100)
else set @vlfrete = 0
/* valor de compra */
set @VlSemDesc = @VlSemDesc - (@vlCredIcms+@vlCredPIS+@vlCredCOFINS)
set @vlcompra = (@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro+@vlfrete)
end
else
begin
/* valor de compra */
set @vlcompra = (@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro)
/* frete */
if @Cus_frete > 0
 set @vlfrete = (@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro) * (@Cus_frete / 100)
else set @vlfrete = 0
end
/* outros */
if @Cus_outros > 0
set @vloutros = ((@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro) * @Cus_outros) / 100
else set @vloutros = 0
/* icms e iva */
if @Pais = 1
 begin
 set  @vlicms = 0
 if @Cus_TributacaoICMS = 'SUBSTITUIÇÃO TRIBUTÁRIA'
 begin
if @Cus_STEmbalagem = 1
begin
 set @vlicms = ((((@vlipi + @vl_com_desc+@vlembalagem) * (@Cus_MargValAgreg / 100)) + (@vlipi + @vl_com_desc+@vlembalagem)) *
(@Cus_ICMSDESTINO / 100)) - ((@vl_com_desc + @vlembalagem )* (@Cus_ICMS / 100))
 end
 else
 begin
 set @vlicms = ((((@vlipi + @vl_com_desc) * (@Cus_MargValAgreg / 100)) + (@vlipi + @vl_com_desc)) *(@Cus_ICMSDESTINO / 100)) - (@vl_com_desc * (@Cus_ICMS / 100))
 end
 if @vlicms < 0  set @vlicms = @vlicms * -1
 end
 if @Cus_TributacaoICMS = 'DIFERENCIAL DE ALÍQUOTAS'
 begin
if @Cus_ICMSDifAlqIPI = 1
 set @vlicms = ((@vlipi + @VlSemDesc) * ((@Cus_ICMS - @Cus_ICMSDESTINO) / 100))
 else set @vlicms = ((@VlSemDesc) * ((@Cus_ICMS - @Cus_ICMSDESTINO) / 100))
 if @vlicms < 0 set @vlicms = @vlicms * -1
 end;
 if (@Cus_TributacaoICMS = null) or (@Cus_TributacaoICMS = '')
 begin
 if @Cus_Icms > 0
 set @vlicms = ((@VlSemDesc + @vlembalagem + @vlipi + @vlfinanceiro) * @Cus_Icmsdestino) / 100
 end;
 if @Cus_TributacaoICMS = 'ICMS NORMAL'
 begin
set @vlicms = (@venda_com_desc * (@Cus_ICMSDESTINO) / 100) - (@VlSemDesc * (@Cus_Icms / 100))
if @vlicms < 0 set @vlicms = @vlicms * -1
end
end
else
begin
set @vlicms = 0
if @Cus_TributacaoICMS = 'COM IVA'
begin
set @vlicms = (@venda_com_desc * (@Cus_icmsdestino) / 100) - (@VlSemDesc * (@Cus_icms / 100))
if @vlicms < 0 set @vlicms = @vlicms * -1
end
end
if @Cus_ICMSValorCompra = 1
begin
/* valor de compra */
set @vlcompra = (@vlcompra + @vlicms)
end
/* simples  */
if @Cus_Simples > 0
set @vlsimples = (@venda_com_desc * @Cus_Simples) / 100
 else set @vlsimples = 0
set @vlNFor = 0
set @vlNFor = @VlSemDesc
if @Cus_NFoICMS = 1 set @vlNFor = @vlNFor + @vlicms
if @Cus_NFoOutros = 1 set @vlNFor = @vlNFor + @Cus_outros
if @Cus_NFoIPI = 1 set @vlNFor = @vlNFor + @vlipi
if @Cus_NFoSimples = 1 set @vlNFor = @vlNFor + @vlsimples
if @Cus_NFoEmbalagem = 1 set @vlNFor = @vlNFor + @vlembalagem
if @Cus_NFoFinanceiro = 1 set @vlNFor = @vlNFor + @vlfinanceiro
if @Cus_NFoFrete = 1 set @vlNFor = @vlNFor + @vlfrete
end
end
if @banco = 1
begin
set @sql ='insert into Preco_Produto_Log  (PreLog_Codnosso,PreLog_Acabamento,PreLog_Codindice,PreLog_tp_vl,usr_dt_hr_criacao,usr_cod_criacao,PreLog_Ativo,PreLog_Tabela,'+
'PreLog_compra,PreLog_Custo,PreLog_Venda,PreLog_Lucro,PreLog_PorLucro,PreLog_est_min,Prelog_VlNFor)'+
' select Pre_Codnosso,Pre_Acabamento,Pre_Codindice,Pre_tp_vl,getdate(),1,Pre_Ativo,Pre_Tabela,Pre_compra,Pre_Custo,Pre_Venda,Pre_Lucro,Pre_PorLucro,Pre_est_min,Pre_VlNFor  from Preco_Produto'+
' where Preco_Produto.Pre_Codnosso  = '
+ @aspas +  @Pre_Codnosso + @aspas +' and Preco_Produto.Pre_Acabamento = '+ @aspas +  @Pre_Acabamento + @aspas +
' AND Preco_Produto.Pre_Codindice = '+ @aspas + @Indice + @aspas
EXEC sp_executesql @sql
set @sql  = 'update Preco_Produto set Preco_Produto.Pre_compra = '+ LTRIM(RTRIM(STR(round(@vlcompra,2),10,2)))
+ ', Preco_Produto.Pre_Custo = ' +  LTRIM(RTRIM(STR(round(@vlcusto,2),10,2)))
+', Preco_Produto.Pre_Venda = '+ LTRIM(RTRIM(STR(round(@venda_com_desc,2),10,2)))
+', Preco_Produto.Pre_Lucro = '+ LTRIM(RTRIM(STR(round(@vllucro_vl,2),10,2)))
+ ', Preco_Produto.Pre_PorLucro = '+ LTRIM(RTRIM(STR(round(@vllucro_por,2),10,2)))
+ ', Preco_Produto.Pre_VlNFor = '+ LTRIM(RTRIM(STR(round(@vlNFor,2),10,2)))
+ '  where Preco_Produto.Pre_Codnosso  = ' + @aspas + @Pre_Codnosso + @aspas +' and Preco_Produto.Pre_Acabamento =  ' + @aspas + @Pre_Acabamento + @aspas  + 
' AND Preco_Produto.Pre_Codindice = '+ @aspas + @Indice + @aspas 
EXEC sp_executesql @sql
end
else
begin
set @sql  = 'update bdprodutos.dbo.Preco_Produto set bdprodutos.dbo.Preco_Produto.Pre_compra = ' + LTRIM(RTRIM(STR(round(@vlcompra,2),10,2)))
+ ', bdprodutos.dbo.Preco_Produto.Pre_Custo = ' + LTRIM(RTRIM(STR(round(@vlcusto,2),10,2))) 
+ ', bdprodutos.dbo.Preco_Produto.Pre_Venda = ' + LTRIM(RTRIM(STR(round(@venda_com_desc,2),10,2))) 
+ ', bdprodutos.dbo.Preco_Produto.Pre_Lucro = ' + LTRIM(RTRIM(STR(round(@vllucro_vl,2),10,2))) 
+ ', bdprodutos.dbo.Preco_Produto.Pre_PorLucro = ' + LTRIM(RTRIM(STR(round(@vllucro_por,2),10,2)))
+ ', bdprodutos.dbo.Preco_Produto.Pre_VlNFor = ' + LTRIM(RTRIM(STR(round(@vlNFor,2),10,2)))
+ '  where bdprodutos.dbo.Preco_Produto.Pre_Codnosso  = ' + @aspas + @Pre_Codnosso + @aspas +  ' and bdprodutos.dbo.Preco_Produto.Pre_Acabamento =  ' + @aspas + @Pre_Acabamento +  @aspas +  
' AND bdprodutos.dbo.Preco_Produto.Pre_Codindice = ' + @aspas + @Indice + @aspas  
EXEC sp_executesql @sql
end
end
FETCH NEXT FROM produto INTO
@Pre_Codnosso,@Pre_Acabamento,@Pre_Codindice,@Pre_Tabela,@Pre_compra,@Pre_Custo,@Pre_Venda,@Pre_Lucro,
@Pre_PorLucro,@Pre_est_min,@Pre_tp_vl,@Pre_VlNFor
end
CLOSE produto
DEALLOCATE produto
CLOSE indices
DEALLOCATE indices
end

GO

/* ===== SQL_STORED_PROCEDURE :: GravaEstoqueMinimo ===== */
CREATE PROCEDURE [dbo].[GravaEstoqueMinimo] (@Produto varchar(25),@Acabamento varchar(10))
AS
BEGIN
DECLARE @sql nvarchar(500)
declare @valor bit
set @valor = (SELECT top(1) Pre_EstMinCalcular FROM Preco_Produto where Pre_Codnosso = @Produto
and  Pre_Acabamento =@Acabamento)
if @valor = 1
begin
set @sql  = 'update Preco_Produto set Preco_Produto.Pre_est_min = '  + cast (DBO.EstoqueMinimo(@Produto,@Acabamento) as varchar(10))
 + '  where Preco_Produto.Pre_Codnosso  = ' + '''' + @Produto + '''' + ' and Preco_Produto.Pre_Acabamento =  ' + '''' +@Acabamento + ''''  
EXEC sp_executesql @sql
end
END

GO

/* ===== SQL_STORED_PROCEDURE :: IdTabela ===== */
CREATE PROCEDURE IdTabela @SeqTab_Tabela nvarchar(50), @SeqTab_Campo nvarchar(50), @Emp_codigo int, @SeqTab_Numero float OUTPUT AS set @SeqTab_Numero = (select SeqTab_Numero from SisSeqTabela where SeqTab_Tabela = @SeqTab_Tabela and SeqTab_Campo = @SeqTab_Campo and Emp_codigo = @Emp_codigo)	 update SisSeqTabela set SisSeqTabela.SeqTab_Numero = @SeqTab_Numero + 1 where SeqTab_Tabela = @SeqTab_Tabela and SeqTab_Campo = @SeqTab_Campo and Emp_codigo = @Emp_codigo; RETURN @SeqTab_Numero
GO

/* ===== SQL_STORED_PROCEDURE :: VendaDeProdutos ===== */
CREATE PROCEDURE [dbo].[VendaDeProdutos] (@sqlTemp nvarchar (100) ,
@datainicial datetime, @datafinal datetime,  @quantMeses int, @sql ntext, @Tipo
char(1) ) AS
CREATE TABLE #TabelaVendaTmp
(
    Codigo varchar(25)  NULL,
    Descricao varchar(50)  NULL,
    Acabamento varchar(10)  NULL,
    Produto varchar(30)  NULL,
    Peca varchar(30)  NULL,
    QuantVendida float  NULL,
    QuantProjetoVA Float  NULL,
    QuantProjetoVAGeral Float  NULL,
    QuantMediaProjetoVA Float  NULL,
    QuantMediaProjetoVAGeral Float  NULL,
    QuantMediaMes Float  NULL,
    PorcVenda Float  NULL,
    for_nome varchar(45)  NULL,
    estoque float  NULL
)
declare @QuantVendaProjeto  float /* mostra a quantidade de produto vedido nos projetos */
 declare @QuantVendaAvulsa  float /* mostra a quantidade de produto vedido nas VA */
declare @QuantVAprojeto  float /* mostra a quantidade de produto vedido nas VA e projetos */
declare @QuantProjeto float /* mostra a quantidade de projeto com o produto */
declare @QuantProjetoVA float /* mostra a quantidade de projeto e VA com ou sem o produto no período */
declare @QuantAvulsa float /* mostra a quantidade de va com o produto */
declare @QuantMediaProjetoVA float /* mostra a media por projeto e va com o produto */
declare @QuantMediaProjetoVAGeral float /* mostra a media de projeto e va com ou sem o produto */
declare @VarTrabalho float /* variavel de uso geral */
declare @VarPorcentagem float /* mostra a porcentagem de venda que contem o produto */
declare @VarMensal float /* mostra a porcentagem de venda que contem o produto */
DECLARE @Pro_codnosso varchar(25)
DECLARE @Pro_descricao varchar(50)
DECLARE @Pre_Acabamento varchar(10)
DECLARE @Pro_tp_peca varchar(30)
DECLARE @Pro_tp_produto varchar(30)
DECLARE @for_nome varchar(45)
DECLARE @estoque float
EXEC sp_executesql  @sql
OPEN Produtos
FETCH NEXT FROM Produtos INTO
@Pro_codnosso,@Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto
set @QuantProjetoVA=0
DECLARE fornecedor_estoque CURSOR FOR
SELECT     dbo.fornecedor.For_Nome, dbo.Estoque_produto.Epr_estoque
FROM        dbo.fornecedor INNER JOIN
ProdutosFornecedores ON dbo.fornecedor.For_codigo = dbo.ProdutosFornecedores.For_codigo INNER JOIN
Estoque_produto ON dbo.ProdutosFornecedores.Pro_codnosso = dbo.Estoque_produto.Epr_Codnosso
WHERE     (dbo.Estoque_produto.EstTp_Codigo = 1) and Estoque_produto.Epr_Codnosso = @Pro_codnosso and Estoque_produto.Epr_Acabamento  = @Pre_Acabamento
 OPEN fornecedor_estoque
 FETCH NEXT FROM fornecedor_estoque
 INTO @For_nome,@Estoque
 CLOSE fornecedor_estoque
 DEALLOCATE fornecedor_estoque
if (@tipo='P') or  (@TIPO='A' )
begin
     set @VarTrabalho =  (SELECT  COUNT(DISTINCT venda.ven_codigo) AS QUANTIDADE
 FROM   venda  WHERE (venda.ven_situacao = 'A') and venda.ven_tipo ='P' AND
venda.Ven_DataEmissao >=@Datainicial and venda.Ven_DataEmissao<=@Datafinal)
  if  (@VarTrabalho <> null) or (@VarTrabalho > 0) set @QuantProjetoVA= @VarTrabalho
end
WHILE @@FETCH_STATUS = 0
BEGIN
SET @QuantVendaProjeto =0
SET @QuantVendaAvulsa =0
SET @QuantProjeto =0
SET @QuantAvulsa =0
SET @QuantMediaProjetoVAGeral =0
Set @VarPorcentagem =0
set @VarMensal=0
set @QuantMediaProjetoVA =0
if (@tipo='P') or  (@TIPO='A' )
begin
set @QuantVendaProjeto  = (SELECT SUM
(VendaProduto.VenPro_Quantidade) AS QUANTIDADE
FROM Venda INNER JOIN
 VendaProduto ON dbo.Venda.Ven_CodigoPre =
dbo.VendaProduto.Ven_CodigoPre INNER JOIN
produtos ON dbo.VendaProduto.Pro_codnosso =
dbo.produtos.Pro_codnosso
WHERE (VENDA.VEN_tipo = 'P') and (VENDA.VEN_situacao = 'A') AND
venda.Ven_DataEmissao >=@Datainicial and venda.Ven_DataEmissao
<=@Datafinal  and VendaProduto.Pro_codnosso=@Pro_codnosso and
VendaProduto.CodAcabamento=@pre_acabamento )
if @QuantVendaProjeto = null set @QuantVendaProjeto=0
 set @QuantProjeto  = (SELECT COUNT(DISTINCT(Venda.Ven_codigo)) AS QUANTIDADE
 FROM Venda INNER JOIN  VendaProduto ON dbo.Venda.Ven_CodigoPre =
dbo.VendaProduto.Ven_CodigoPre INNER JOIN produtos ON dbo.VendaProduto.Pro_codnosso =
dbo.produtos.Pro_codnosso WHERE (VENDA.VEN_tipo = 'P') and (VENDA.VEN_situacao = 'A') AND
venda.Ven_DataEmissao >=@Datainicial and venda.Ven_DataEmissao <=@Datafinal
 and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento )
if @QuantProjeto = null set @QuantProjeto=0
end
IF @QuantProjetoVA > 0  set @QuantMediaProjetoVAGeral=round
((@QuantVendaProjeto+@QuantVendaavulsa)/(@QuantProjetoVA),2)
if (@Quantavulsa+@QuantProjeto) > 0
begin
set @QuantMediaProjetoVA=round((@QuantVendaProjeto+@QuantVendaavulsa)/
(@Quantavulsa+@QuantProjeto) ,2)
IF @QuantProjetoVA > 0  set   @VarPorcentagem=round((((@Quantavulsa
+@QuantProjeto) *100)/@QuantProjetoVA),2)
if @quantMeses > 0 set  @VarMensal=round(((@QuantVendaProjeto
+@QuantVendaAvulsa)/@quantMeses),2)
end
if @Quantavulsa+@QuantProjeto > 0
begin
INSERT into #TabelaVendaTmp (Codigo, Descricao, Acabamento,Produto,
Peca,QuantVendida,
QuantProjetoVA,QuantProjetoVAGeral,QuantMediaProjetoVA,QuantMediaProjetoVAgeral,QuantMediaMes
,PorcVenda,for_nome,estoque)
 values ( @Pro_codnosso,
@Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto,
(@QuantVendaProjeto+@QuantVendaAvulsa),(@QuantProjeto +
@QuantAvulsa),@QuantProjetoVA,@QuantMediaProjetoVA,@QuantMediaProjetoVAgeral,@VarMensal,
@VarPorcentagem,@for_nome,@estoque)
end
FETCH NEXT FROM Produtos INTO
@Pro_codnosso,@Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto
end
CLOSE produtos
DEALLOCATE produtos
EXEC sp_executesql  @sqltemp

GO

/* ===== SQL_STORED_PROCEDURE :: VendaDeProdutosValor ===== */
CREATE PROCEDURE [dbo].[VendaDeProdutosValor] (@sqlTemp nvarchar (100) , @datainicial datetime, @datafinal datetime, @sql ntext, @Tipo char(1), @Atendente varchar(15) ) AS
CREATE TABLE #TabelaVendaTmp
(
    Codigo varchar(25)  NULL,
    Descricao varchar(50)  NULL,
Acabamento varchar(10)  NULL,
Produto varchar(30)  NULL,
Peca varchar(30)  NULL,
QuantVendida float  NULL,
VlAtualUnitVenda Float  NULL,
ValorCusto Float  NULL,
ValorVenda Float  NULL,
ValorLucro Float  NULL,
ValorProcLucro Float  NULL,
for_nome varchar(45)  NULL,
estoque float  NULL
)
declare @QuantVendaProjeto  float /* mostra a quantidade de produto vedido nos projetos */
DEclare @QuantVendaAvulsa  float /* mostra a quantidade de produto vedido nas VA */
declare @Vlvenda float  /* mostra o valor de venda*/
declare @Vlcusto float  /* mostra o valor de custo*/
declare @Vlcompra float  /* mostra o valor de compra*/
declare @VlLucro float  /* mostra o valor do lucro*/
declare @VlProcLucro float  /* mostra a procentagem do lucro*/
declare @VlComisaoInterna float  /* mostra o valor da comisão interna*/
declare @VlComisaoExterna float  /* mostra o valor da comisão externa*/
DECLARE @Pro_codnosso varchar(25)
DECLARE @Pro_descricao varchar(50)
DECLARE @Pre_Acabamento varchar(10)
DECLARE @Pro_tp_peca varchar(30)
DECLARE @Pro_tp_produto varchar(30)
DECLARE @Pre_Venda float
DECLARE @Pre_Custo float
DECLARE @Pre_compra float
DECLARE @Pre_Tabela float
DECLARE @Pre_Lucro float
DECLARE @Pre_PorLucro float
DECLARE @Ipr_vl_com_inter float
DECLARE @Ipr_vl_com_exter float
declare @ValorTabela float
declare @Valorcompra float
declare @ValorCusto Float
declare @ValorVenda Float
declare @ValorLucro Float
declare @PorcLucro Float
DECLARE @Quantidade_det as float
declare @data_det as datetime
DECLARE @for_nome varchar(45)
DECLARE @estoque float
EXEC sp_executesql  @sql
OPEN Produtos
FETCH NEXT FROM Produtos INTO  @Pro_codnosso,@Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto,
@Pre_Venda, @Pre_Custo, @Pre_compra,@Pre_Tabela, @Pre_Lucro,@Pre_PorLucro, @Ipr_vl_com_inter, @Ipr_vl_com_exter
WHILE @@FETCH_STATUS = 0
BEGIN
SET @QuantVendaProjeto =0
SET @QuantVendaAvulsa =0
set  @Vlvenda =0
set @Vlcusto =0
set @Vlcompra =0
set @VlLucro =0
set @VlComisaoInterna=0
set @VlComisaoExterna=0
set @VlProcLucro=0
DECLARE fornecedor_estoque CURSOR FOR
SELECT     dbo.fornecedor.For_Nome, dbo.Estoque_produto.Epr_estoque
FROM        dbo.fornecedor INNER JOIN
ProdutosFornecedores ON dbo.fornecedor.For_codigo = dbo.ProdutosFornecedores.For_codigo INNER JOIN
Estoque_produto ON dbo.ProdutosFornecedores.Pro_codnosso = dbo.Estoque_produto.Epr_Codnosso
WHERE     (dbo.Estoque_produto.EstTp_Codigo = 1) and Estoque_produto.Epr_Codnosso = @Pro_codnosso and Estoque_produto.Epr_Acabamento  = @Pre_Acabamento
 OPEN fornecedor_estoque
 FETCH NEXT FROM fornecedor_estoque
 INTO @For_nome,@Estoque
 CLOSE fornecedor_estoque
 DEALLOCATE fornecedor_estoque
if (@tipo='P') or  (@TIPO='A' )
begin
   if @Atendente ='*'
	BEGIN
	DECLARE Materiais1 CURSOR FOR (SELECT VendaProduto.VenPro_Quantidade,venda.Ven_DataEmissao
	FROM Venda INNER JOIN
         VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
         produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
  WHERE (venda.ven_situacao = 'A') AND venda.Ven_DataEmissao >=@Datainicial and venda.Ven_DataEmissao<=@Datafinal
	and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento
 and VENDA.VEN_tipo = 'P' and VENDA.VEN_situacao = 'A' )
    END
	if @Atendente <> '*'
	BEGIN
	DECLARE Materiais1 CURSOR FOR (SELECT        dbo.VendaProduto.VenPro_Quantidade, dbo.Venda.Ven_DataEmissao
    FROM Venda INNER JOIN dbo.VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
    dbo.produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso INNER JOIN
    dbo.VendaAtendente ON dbo.Venda.Ven_CodigoPre = dbo.VendaAtendente.VenAten_NDocPre
	WHERE (venda.ven_situacao = 'A') AND venda.Ven_DataEmissao >=@Datainicial and venda.Ven_DataEmissao<=@Datafinal
	and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento
    and VENDA.VEN_tipo = 'P' and VENDA.VEN_situacao = 'A' AND  VendaAtendente.Fun_Codigo= @Atendente )
	END
	OPEN Materiais1
    	FETCH NEXT FROM Materiais1  INTO @Quantidade_det, @data_det
    	WHILE @@FETCH_STATUS = 0
	BEGIN
		DECLARE pegapreco CURSOR FOR SELECT * from PrecoProdutoLog(@Pro_codnosso,@pre_acabamento,@data_det )
		OPEN pegapreco
		FETCH NEXT FROM  pegapreco  INTO @ValorTabela,@Valorcompra,@ValorCusto,@ValorVenda,@ValorLucro,@PorcLucro
    set @QuantVendaProjeto = @QuantVendaProjeto + @Quantidade_det
   IF @ValorVenda >  0  SET @Vlvenda= @Vlvenda + round((@ValorVenda *  @Quantidade_det) ,2);
   if @Valorcompra > 0  set @Vlcompra=@Vlcompra+ round((@Valorcompra *  @Quantidade_det),2);
   if @ValorCusto > 0  set @Vlcusto=@Vlcusto+ round((@ValorCusto *  @Quantidade_det),2);
   if @ValorLucro > 0  set @VlLucro=@VlLucro+ round((@ValorLucro *  @Quantidade_det),2);
   CLOSE pegapreco
		DEALLOCATE pegapreco
		FETCH NEXT FROM  Materiais1  INTO @Quantidade_det, @data_det
	end
	CLOSE Materiais1
	DEALLOCATE Materiais1
end
if (@QuantVendaProjeto) > 0
begin
IF @Vlvenda > 0 set @VlProcLucro =round(((@VlLucro*100)/ @Vlvenda) ,2)
INSERT into #TabelaVendaTmp (Codigo, Descricao, Acabamento,Produto, Peca,QuantVendida, VlAtualUnitVenda, ValorVenda,ValorCusto, ValorLucro,ValorProcLucro, for_nome, estoque )
 values ( @Pro_codnosso, @Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto,(@QuantVendaProjeto),@Pre_Venda,@Vlvenda,@Vlcusto, @VlLucro,@VlProcLucro, @for_nome, @estoque)
end
FETCH NEXT FROM Produtos INTO  @Pro_codnosso,@Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto,
@Pre_Venda, @Pre_Custo, @Pre_compra,@Pre_Tabela, @Pre_Lucro,@Pre_PorLucro, @Ipr_vl_com_inter, @Ipr_vl_com_exter
end
CLOSE produtos
DEALLOCATE produtos
EXEC sp_executesql  @sqltemp

GO

/* ===== SQL_STORED_PROCEDURE :: VendaDeProdutosValorVenda ===== */
CREATE PROCEDURE [dbo].[VendaDeProdutosValorVenda] (@sqlTemp nvarchar (100) , @Inicial1 int, @Final1 int, @Inicial2 int, @Final2 int,  @sql ntext, @Tipo char(1) , @periodo char(1)) AS
CREATE TABLE #TabelaVendaTmp
(
    Codigo varchar(25)  NULL,
    Descricao varchar(50)  NULL,
    Acabamento varchar(10)  NULL,
    Produto varchar(30)  NULL,
    Peca varchar(30)  NULL,
    Valor1 float  NULL,
    Valor2 Float  NULL,
    diferenca float null,
)
declare @Venda1  float /* mostra a o valor de venda 1 */
declare @Venda2  float /* mostra a o valor de venda 2 */
declare @diferencia  float /* mostra a dirferencia em % do valor  */
declare @vendatotal1 float
declare @vendatotal2 float
declare @calculo float
DECLARE @Pro_codnosso varchar(25)
DECLARE @Pro_descricao varchar(50)
DECLARE @Pre_Acabamento varchar(10)
DECLARE @Pro_tp_peca varchar(30)
DECLARE @Pro_tp_produto varchar(30)
declare @mes1I int
declare @mes2I int
declare @mes1f int
declare @mes2f int
if @periodo='T'
 BEGIN
	if @inicial1 = 1
	begin
		set @mes1I=1
		set @mes2I=3
	end
	if @inicial1 = 2
	begin
		set @mes1I=4
		set @mes2I=6
	end
	if @inicial1 = 3
	begin
		set @mes1I=7
		set @mes2I=9
	end
	if @inicial1 = 4
	begin
		set @mes1I=10
		set @mes2I=12
	end
	if @final1 = 1
	begin
		set @mes1f=1
		set @mes2f=3
	end
	if @final1 = 2
	begin
		set @mes1f=4
		set @mes2f=6
	end
	if @final1 = 3
	begin
		set @mes1f=7
		set @mes2f=9
	end
	if @final1 = 4
	begin
		set @mes1f=10
		set @mes2f=12
	end
end
if @periodo='S'
 BEGIN
	if @inicial1 = 1
	begin
		set @mes1I=1
		set @mes2I=6
	end
	if @inicial1 = 2
	begin
		set @mes1I=7
		set @mes2I=12
	end
	if @final1 = 1
begin
		set @mes1f=1
		set @mes2f=6
	end
	if @final1 = 2
	begin
		set @mes1f=7
		set @mes2f=12
	end
end
EXEC sp_executesql  @sql
OPEN Produtos
FETCH NEXT FROM Produtos INTO  @Pro_codnosso,@Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto WHILE @@FETCH_STATUS = 0
BEGIN
set @Venda1 = 0
set @Venda2 = 0
set @diferencia = 0
set @vendatotal1 = 0
set @vendatotal2 = 0
if (@tipo='P') or  (@TIPO='A' )
begin
 if @Pro_tp_produto='LUMINÁRIAS'
      BEGIN
  if @periodo = 'M'  /* mensal */
          begin
         set @Venda1  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         FROM Venda INNER JOIN
         VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
         produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
         WHERE (venda.ven_situacao = 'A') AND month(venda.Ven_DataEmissao )=@inicial1 and year(venda.Ven_DataEmissao)=@inicial2
         and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo = 1)
 if @Venda1 = null set @Venda1=0
   set @Venda2  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         FROM Venda INNER JOIN
         VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
         produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
         WHERE (venda.ven_situacao = 'A') AND month(venda.Ven_DataEmissao)=@final1 and year(venda.Ven_DataEmissao)=@final2
         and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo = 1)
         if @Venda2 = null set @Venda2=0
         end
       if (@periodo = 'T') or (@periodo = 'S')  /* Trimestral ou Semestral */
          begin
        	set @Venda1  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         	FROM Venda INNER JOIN
            VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
            produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
            WHERE (venda.ven_situacao = 'A') AND month(venda.Ven_DataEmissao) >= @mes1i and month(venda.Ven_DataEmissao) <= @mes2i and year(venda.Ven_DataEmissao)=@inicial2
            and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo = 1)
            if @Venda1 = null set @Venda1=0
       set @Venda2  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         	FROM Venda INNER JOIN
            VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
            produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
         	WHERE (venda.ven_situacao = 'A') AND month(venda.Ven_DataEmissao)>=@mes1f and month(venda.Ven_DataEmissao)<=@mes2f and year(venda.Ven_DataEmissao)=@final2
         	and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo = 1)
            if @Venda2 = null set @Venda2=0
         end
       if @periodo ='A' /* Anual */
          begin
      	set @Venda1  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         	FROM Venda INNER JOIN
            VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
            produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
         	WHERE (venda.ven_situacao = 'A') AND year(venda.Ven_DataEmissao)=@inicial2
            and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo = 1)
  if @Venda1 = null set @Venda1=0
      	    set @Venda2  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         	FROM Venda INNER JOIN
            VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
            produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
          	WHERE (venda.ven_situacao = 'A') AND year(venda.Ven_DataEmissao)=@final2
            and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo = 1)
            if @Venda2 = null set @Venda2=0
         end
  end
set @vendatotal1=@vendatotal1+ @venda1
set @vendatotal2=@vendatotal2+@venda2
  if @Pro_tp_produto<>'LUMINÁRIAS'
    BEGIN
    if @periodo = 'M'  /* mensal */
          begin
         set @Venda1  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         FROM Venda INNER JOIN
         VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
         produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
         WHERE (venda.ven_situacao = 'A') AND month(venda.Ven_DataEmissao )=@inicial1 and year(venda.Ven_DataEmissao)=@inicial2
         and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo <> 1)
       if @Venda1 = null set @Venda1=0
         set @Venda2  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         FROM Venda INNER JOIN
         VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
         produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
         WHERE (venda.ven_situacao = 'A') AND month(venda.Ven_DataEmissao)=@final1 and year(venda.Ven_DataEmissao)=@final2
         and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P' and produtos.GrupoProduto_codigo <> 1)
         if @Venda2 = null set @Venda2=0
         end
       if (@periodo = 'T') or (@periodo = 'S')  /* Trimestral ou Semestral */
          begin
        	set @Venda1  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         	FROM Venda INNER JOIN
            VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
            produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
            WHERE (venda.ven_situacao = 'A') AND month(venda.Ven_DataEmissao) >= @mes1i and month(venda.Ven_DataEmissao) <= @mes2i and year(venda.Ven_DataEmissao)=@inicial2
            and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo <> 1)
            if @Venda1 = null set @Venda1=0
            set @Venda2  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         	FROM Venda INNER JOIN
            VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
            produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
         	WHERE (venda.ven_situacao = 'A') AND month(venda.Ven_DataEmissao)>=@mes1f and month(venda.Ven_DataEmissao)<=@mes2f and year(venda.Ven_DataEmissao)=@final2
         	and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo <> 1)
            if @Venda2 = null set @Venda2=0
         end
       if @periodo ='A' /* Anual */
          begin
        	set @Venda1  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         	FROM Venda INNER JOIN
            VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
            produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
         	WHERE (venda.ven_situacao = 'A') AND year(venda.Ven_DataEmissao)=@inicial2
            and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo <> 1)
            if @Venda1 = null set @Venda1=0
      	    set @Venda2  = (SELECT SUM(VendaProduto.VenPro_VlItem) AS valor
         	FROM Venda INNER JOIN
            VendaProduto ON dbo.Venda.Ven_CodigoPre = dbo.VendaProduto.Ven_CodigoPre INNER JOIN
            produtos ON dbo.VendaProduto.Pro_codnosso = dbo.produtos.Pro_codnosso
          	WHERE (venda.ven_situacao = 'A') AND year(venda.Ven_DataEmissao)=@final2
            and VendaProduto.Pro_codnosso=@Pro_codnosso and VendaProduto.CodAcabamento=@pre_acabamento and VENDA.VEN_tipo = 'P'  and produtos.GrupoProduto_codigo <> 1)
  if @Venda2 = null set @Venda2=0
         end
    END
end
set @vendatotal1=@vendatotal1+@venda1
set @vendatotal2=@vendatotal2+@venda2
IF @vendatotal1 > 0
begin
set @calculo =round( (@vendatotal2-@vendatotal1),2)
set @diferencia=round((@calculo*100)/@vendatotal1,2)
end
Else set @diferencia=0
IF (@vendatotal1 > 0)  or  (@vendatotal2 > 0)
begin
INSERT into #TabelaVendaTmp (Codigo, Descricao, Acabamento,Produto, Peca,valor1,valor2,diferenca)
 values ( @Pro_codnosso, @Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto,@vendatotal1,@vendatotal2,@diferencia)
end
FETCH NEXT FROM Produtos INTO  @Pro_codnosso,@Pro_descricao,@Pre_Acabamento,@Pro_tp_peca,@Pro_tp_produto
end
CLOSE produtos
DEALLOCATE produtos
EXEC sp_executesql  @sqltemp

GO

/* ===== SQL_TABLE_VALUED_FUNCTION :: fnConcatForNome ===== */
CREATE FUNCTION [dbo].[fnConcatForNome] (@nossoCod VARCHAR(MAX), @empCod INT) RETURNS @output TABLE(concatdata VARCHAR(MAX)) AS BEGIN DECLARE @forNome VARCHAR(MAX) (SELECT @forNome = COALESCE(@forNome + ', ', '') + For_Nome FROM fornecedor JOIN ProdutosFornecedores ON fornecedor.For_codigo = ProdutosFornecedores.For_codigo WHERE ProdutosFornecedores.Pro_codnosso = @nossoCod AND fornecedor.Emp_codigo = @empCod)  INSERT INTO @output (concatdata) VALUES(@fornome)    RETURN END
GO

/* ===== SQL_TABLE_VALUED_FUNCTION :: fnSplitString ===== */
CREATE FUNCTION [dbo].[fnSplitString]  (    @string NVARCHAR(MAX),    @delimiter CHAR(1)) RETURNS @output TABLE(splitdata NVARCHAR(MAX)) BEGIN    DECLARE @start INT, @end INT    SELECT @start = 1, @end = CHARINDEX(@delimiter, @string)    WHILE @start < LEN(@string) + 1 BEGIN        IF @end = 0            SET @end = LEN(@string) + 1        INSERT INTO @output (splitdata)        VALUES(SUBSTRING(@string, @start, @end - @start))        SET @start = @end + 1        SET @end = CHARINDEX(@delimiter, @string, @start)    END    RETURN END
GO

/* ===== SQL_TABLE_VALUED_FUNCTION :: PrecoProdutoLog ===== */
CREATE  FUNCTION [dbo].[PrecoProdutoLog]  (@produto varchar(30), @Acabamento varchar(10), @data datetime)
 RETURNS @TabelaPreco TABLE
   (
   ValorTabela float,
   Valorcompra float,
   ValorCusto Float,
   ValorVenda Float,
   ValorLucro  Float,
   PorcLucro Float
   )
 AS
begin
declare @ValorTabela float
declare @Valorcompra float
declare @ValorCusto float
declare @ValorVenda float
declare @ValorLucro float
declare @PorcLucro float
DECLARE preco CURSOR FOR
select  PreLog_Tabela,PreLog_compra,PreLog_Custo,PreLog_Venda,PreLog_Lucro,PreLog_PorLucro from Preco_Produto_Log where  usr_dt_hr_criacao >=@data and PreLog_Codnosso=@produto and PreLog_Acabamento =@Acabamento
OPEN preco
FETCH NEXT FROM preco INTO  @ValorTabela, @Valorcompra,@ValorCusto,@ValorVenda, @ValorLucro,@PorcLucro
IF @@FETCH_STATUS <> 0
BEGIN
cLOSE preco
DEALLOCATE preco
DECLARE preco CURSOR FOR
select  Pre_Tabela,Pre_compra,Pre_Custo,Pre_Venda,Pre_Lucro,Pre_PorLucro from Preco_Produto  where pre_Codnosso=@produto and Pre_Acabamento =@Acabamento
OPEN preco
FETCH NEXT FROM preco INTO  @ValorTabela, @Valorcompra,@ValorCusto,@ValorVenda, @ValorLucro,@PorcLucro
END
 INSERT @TabelaPreco ( ValorTabela, Valorcompra,  ValorCusto, ValorVenda,ValorLucro,PorcLucro) values (@ValorTabela, @Valorcompra,@ValorCusto,@ValorVenda,@ValorLucro,@PorcLucro)
 RETURN
end

GO

/* ===== SQL_TABLE_VALUED_FUNCTION :: TodasPorcentagemVendaMesAtendente ===== */
CREATE FUNCTION TodasPorcentagemVendaMesAtendente  (@atendente float, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
 RETURNS @TabelaVenda TABLE
   ( 
    Mes   int,
    ValorMesA float,
    ValorAnoA Float,
    PorcMesA Float,
    PorcAnoA Float,
    VendaMes Float,
    VendaAno Float
   )
 AS
begin
	declare @VLatendente float
	declare @Vltotal float
	declare @Vlporcentagem float
	declare  @mes int
  declare @VLTotalAno float
  declare @VLTotalAnoAt float
	declare @VlporcentagemAno float
	set @Mes =1
	WHILE @mes < 13
	begin
		SELECT  @VLatendente  = DBO.vendamesatendente(@atendente,@mes,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
		SELECT  @Vltotal  = DBO.vendames(@mes,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
   SELECT  @VLTotalAno  = DBO.vendaAno(@ano,@tabela,@Desconto,@ProjFechado,@Servico)
   SELECT  @VLTotalAnoAt  = DBO.vendaanoatendente(@atendente,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
   if @VLatendente = null 
   begin
     set @VLatendente=0
   end
   if @Vltotal = null
   begin
     set @Vltotal=0
   end
   if @VLTotalAno = null 
   begin
     set @VLTotalAno=0
   end
   if @VLTotalAnoAt = null 
   begin
     set @VLTotalAnoAt=0
   end
		if @VLatendente > 0
			set @Vlporcentagem =round(((@VLatendente*100)/@Vltotal),3)
		else set @Vlporcentagem = 0
		if @VLTotalAnoAt > 0
			set @VlporcentagemAno =round(((@VLTotalAnoAt*100)/@VLTotalAno),3)
		else set @VlporcentagemAno = 0
		INSERT @TabelaVenda ( Mes, ValorMesA,PorcMesA,VendaMes,ValorAnoA,PorcAnoA, VendaAno) values (@mes,@VLatendente,@Vlporcentagem, @Vltotal,@VLTotalAnoAt, @VlporcentagemAno,@VLTotalAno)
		set @Mes = @mes +1
		CONTINUE
	end
 RETURN
end

GO

/* ===== SQL_TABLE_VALUED_FUNCTION :: TodasPorcentagemVendaSemestreAtendente ===== */
CREATE FUNCTION TodasPorcentagemVendaSemestreAtendente  (@atendente float, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
 RETURNS @TabelaVenda TABLE
   (
    Semestre   int,
    ValorSemestreA float,
    ValorAnoA Float,
    PorcSemestreA Float,
    PorcAnoA Float,
    VendaSemestre Float,
    VendaAno Float
   )
AS
begin
	declare @VLatendente float
	declare @Vltotal float
	declare @Vlporcentagem float
	declare  @Semestre int
 declare @VLTotalAno float
 declare @VLTotalAnoAt float
 declare @VlporcentagemAno float
	set @Semestre =1
	WHILE @Semestre < 3
	begin
	SELECT  @VLatendente  = DBO.vendaSemestreatendente(@atendente,@Semestre,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
	SELECT  @Vltotal  = DBO.vendaSemestre(@Semestre,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
	SELECT  @VLTotalAno  = DBO.vendaAno(@ano,@tabela,@Desconto,@ProjFechado,@Servico)
	SELECT  @VLTotalAnoAt  = DBO.vendaanoatendente(@atendente,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
   if @VLatendente = null 
   begin
     set @VLatendente=0
   end
   if @Vltotal = null
   begin
     set @Vltotal=0
   end
   if @VLTotalAno = null 
   begin
     set @VLTotalAno=0
   end
   if @VLTotalAnoAt = null 
   begin
     set @VLTotalAnoAt=0
   end
	if @VLatendente > 0
 set @Vlporcentagem =round(((@VLatendente*100)/@Vltotal),3)
	else set @Vlporcentagem = 0
	if @VLTotalAnoAt > 0
	set @VlporcentagemAno =round(((@VLTotalAnoAt*100)/@VLTotalAno),3)
	else set @VlporcentagemAno = 0
	INSERT @TabelaVenda (Semestre, ValorSemestreA,PorcSemestreA,VendaSemestre,ValorAnoA,PorcAnoA, VendaAno) values (@Semestre,@VLatendente,@Vlporcentagem, @Vltotal,@VLTotalAnoAt, @VlporcentagemAno,@VLTotalAno)
	set @Semestre = @Semestre +1
	CONTINUE
 end
 RETURN
end

GO

/* ===== SQL_TABLE_VALUED_FUNCTION :: TodasPorcentagemVendaTrimestreAtendente ===== */
CREATE FUNCTION TodasPorcentagemVendaTrimestreAtendente  (@atendente float, @ano int, @tabela varchar(2), @Desconto char(1), @ProjFechado char(1), @Servico char(1))
RETURNS @TabelaVenda TABLE
   (
    Trimestre   int,
    ValorTrimestreA float,
    ValorAnoA Float,
    PorcTrimestreA Float,
    PorcAnoA Float,
    VendaTrimestre Float,
    VendaAno Float
   )
AS 
begin
 declare @VLatendente float
	declare @Vltotal float
	declare @Vlporcentagem float
	declare  @Trimestre int
 declare @VLTotalAno float
 declare @VLTotalAnoAt float
	declare @VlporcentagemAno float
	set @Trimestre =1
	WHILE @Trimestre < 5
 begin
  SELECT  @VLatendente  = DBO.vendaTrimestreatendente(@atendente,@Trimestre,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
  SELECT  @Vltotal  = DBO.vendaTrimestre(@Trimestre,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
 	SELECT  @VLTotalAno  = DBO.vendaAno(@ano,@tabela,@Desconto,@ProjFechado,@Servico)
 	SELECT  @VLTotalAnoAt  = DBO.vendaanoatendente(@atendente,@ano,@tabela,@Desconto,@ProjFechado,@Servico)
   if @VLatendente = null 
   begin
     set @VLatendente=0
   end
   if @Vltotal = null
   begin
     set @Vltotal=0
   end
   if @VLTotalAno = null 
   begin
     set @VLTotalAno=0
   end
   if @VLTotalAnoAt = null 
   begin
     set @VLTotalAnoAt=0
   end
		if @VLatendente > 0
			set @Vlporcentagem =round(((@VLatendente*100)/@Vltotal),3)
		else set @Vlporcentagem = 0
		if @VLTotalAnoAt > 0
		set @VlporcentagemAno =round(((@VLTotalAnoAt*100)/@VLTotalAno),3)
	else set @VlporcentagemAno = 0
	INSERT @TabelaVenda (Trimestre, ValorTrimestreA,PorcTrimestreA,VendaTrimestre,ValorAnoA,PorcAnoA, VendaAno) values (@Trimestre,@VLatendente,@Vlporcentagem, @Vltotal,@VLTotalAnoAt, @VlporcentagemAno,@VLTotalAno)
	set @Trimestre = @Trimestre +1
		CONTINUE
	end
 RETURN
 end

GO

/* ===== SQL_TRIGGER :: GatilhoEstoqueMinimo ===== */
CREATE TRIGGER [dbo].[GatilhoEstoqueMinimo] on [dbo].[Estoque_produto]
 AFTER UPDATE
AS
begin
DECLARE @produto  varchar(25), @acab varchar(5)
select  @produto = Epr_Codnosso, @acab = Epr_Acabamento from inserted
EXEC GravaEstoqueMinimo @produto, @acab
end

GO


