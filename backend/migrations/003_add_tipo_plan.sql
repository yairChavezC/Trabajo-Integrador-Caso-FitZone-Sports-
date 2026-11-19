ALTER TABLE public.plan
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'REGULAR';

-- Ejemplo: el plan anual usa la estrategia de pago anual por adelantado
UPDATE public.plan SET tipo = 'PROMO_ANUAL' WHERE intervalo = 'anual';