-- Regular annual price after the 500 Founder places (content/oferta.json).
update public.products
   set preco_referencia = 97
 where code = 'anual';
