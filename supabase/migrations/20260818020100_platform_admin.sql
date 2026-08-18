-- PLATFORM_ADMIN — "Wezcar Admin" role from the original doc (PARTE VIII, ambiente
-- "Wezcar Admin | Equipe Wezcar | Tenants, planos, auditoria, cadastros globais e
-- administração da plataforma"). A system-wide role (tenant_id null, like CUSTOMER) that
-- can see every tenant/user and create/administer tenants.
--
-- There is deliberately no self-service way to become PLATFORM_ADMIN — it's granted with a
-- one-off `insert into user_roles` run as postgres (SQL Editor) or service_role, never
-- through the app. See docs/seguranca/rls-e-autenticacao.md.

insert into public.permissions (code, description) values
  ('platform.super_admin', 'Acesso administrativo total à plataforma (Wezcar Admin): enxerga todos os tenants e usuários');

insert into public.roles (tenant_id, name, description) values
  (null, 'PLATFORM_ADMIN', 'Administrador da plataforma Wezcar (Wezcar Admin) — acesso a todos os tenants');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('platform.super_admin', 'tenant.manage')
where r.name = 'PLATFORM_ADMIN' and r.tenant_id is null;

-- ── extend existing read policies so a platform admin bypasses tenant scoping ──
alter policy "tenants_select_own" on public.tenants
  using (
    id = public.current_tenant_id()
    or public.has_permission('platform.super_admin')
  );

alter policy "users_select_self_or_same_tenant" on public.users
  using (
    id = auth.uid()
    or (tenant_id is not null and tenant_id = public.current_tenant_id())
    or public.has_permission('platform.super_admin')
  );

alter policy "roles_select_global_or_own_tenant" on public.roles
  using (
    tenant_id is null
    or tenant_id = public.current_tenant_id()
    or public.has_permission('platform.super_admin')
  );

alter policy "role_permissions_select_visible_roles" on public.role_permissions
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and (r.tenant_id is null or r.tenant_id = public.current_tenant_id())
    )
    or public.has_permission('platform.super_admin')
  );

alter policy "user_roles_select_self_or_same_tenant" on public.user_roles
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = user_roles.user_id
        and u.tenant_id is not null
        and u.tenant_id = public.current_tenant_id()
    )
    or public.has_permission('platform.super_admin')
  );

-- ── tenant management (create/edit tenants from the Wezcar Admin screen) ──────
grant insert, update, delete on public.tenants to authenticated;

create policy "tenants_write_platform_admin"
  on public.tenants for all
  to authenticated
  using (public.has_permission('tenant.manage'))
  with check (public.has_permission('tenant.manage'));
