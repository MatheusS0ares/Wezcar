-- Corrige um furo encontrado ao escrever os testes do módulo de agenda/SLA:
-- estimates_insert_staff (20260823010000) não restringia `status` no INSERT, então staff
-- podia inserir um orçamento já como APPROVED/REJECTED, pulando a decisão do cliente e abrindo
-- caminho pra criar a OS sem aprovação real — o oposto do que RN-EST-002 pretende garantir.
--
-- version_and_supersede_estimate() já roda BEFORE INSERT em toda linha nova; força status a
-- ser sempre 'SENT' na criação, não importa o que o app mande. As únicas formas de sair de
-- 'SENT' continuam sendo a decisão do cliente (estimates_customer_decide, UPDATE) e o próprio
-- trigger marcando a versão anterior como SUPERSEDED.
create or replace function public.version_and_supersede_estimate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'SENT';

  select coalesce(max(version), 0) + 1 into new.version
  from public.estimates
  where service_request_id = new.service_request_id;

  update public.estimates
  set status = 'SUPERSEDED'
  where service_request_id = new.service_request_id and status = 'SENT';

  return new;
end;
$$;
