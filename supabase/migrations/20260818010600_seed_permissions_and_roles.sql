-- Baseline permission catalog and system-wide roles. This is application configuration
-- (not throwaway test data), so it ships as a migration and runs in every environment.
-- New features must add their own permission codes here as part of their own migration
-- (see docs/regras-negocio and the "Definition of Done" template in the project doc).

insert into public.permissions (code, description) values
  ('tenant.manage', 'Criar e administrar tenants (uso Wezcar Admin)'),
  ('user.manage', 'Gerenciar usuários e papéis dentro do próprio tenant'),
  ('vehicle.create', 'Cadastrar veículo'),
  ('vehicle.update', 'Alterar veículo próprio'),
  ('work_order.update', 'Alterar ordem de serviço'),
  ('estimate.approve', 'Aprovar orçamento');

-- System-wide role for end customers (Wezcar App). tenant_id is null: it applies regardless
-- of tenant, since customers are not tied to any single workshop.
insert into public.roles (tenant_id, name, description) values
  (null, 'CUSTOMER', 'Cliente final do aplicativo Wezcar');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('vehicle.create', 'vehicle.update', 'estimate.approve')
where r.name = 'CUSTOMER' and r.tenant_id is null;
