-- =============================================================================
-- Mængde × pris på "salg"-budgetlinjer, så et forventet salg kan tastes ind
-- som fx "100 stk × 2 kr" i stedet for kun ét samlet kronebeløb.
-- estimated_amount_dkk forbliver den autoritative totalsum (beregnes i UI'et
-- ud fra mængde×pris når de er udfyldt, men kan også bare tastes direkte).
-- =============================================================================

alter table budget_lines
  add column if not exists estimated_quantity numeric,
  add column if not exists estimated_unit text,
  add column if not exists estimated_price_per_unit numeric;
