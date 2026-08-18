-- RLS policies enforcing tenant isolation, plus the explicit GRANTs the Supabase Data API
-- (PostgREST) needs to reach these tables at all. Recent Supabase versions no longer
-- auto-expose newly created tables to anon/authenticated/service_role, so every role that
-- should be able to touch a table needs an explicit GRANT in addition to its RLS policy.

grant usage on schema public to anon, authenticated, service_role;

-- service_role is used only from trusted server-side code (Next.js server actions/route
-- handlers with the service role key) and bypasses RLS, so it gets full DML on every table.
grant select, insert, update, delete on
  public.tenants,
  public.users,
  public.roles,
  public.permissions,
  public.role_permissions,
  public.user_roles
to service_role;

-- ── tenants ─────────────────────────────────────────────────────────────────
grant select on public.tenants to authenticated;

create policy "tenants_select_own"
  on public.tenants for select
  to authenticated
  using (id = public.current_tenant_id());

-- ── users ───────────────────────────────────────────────────────────────────
grant select on public.users to authenticated;
grant update (name, phone) on public.users to authenticated;

create policy "users_select_self_or_same_tenant"
  on public.users for select
  to authenticated
  using (
    id = auth.uid()
    or (tenant_id is not null and tenant_id = public.current_tenant_id())
  );

create policy "users_update_self"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── roles ───────────────────────────────────────────────────────────────────
grant select on public.roles to authenticated;

create policy "roles_select_global_or_own_tenant"
  on public.roles for select
  to authenticated
  using (tenant_id is null or tenant_id = public.current_tenant_id());

-- ── permissions (global catalog, safe to read for anyone authenticated) ─────
grant select on public.permissions to authenticated;

create policy "permissions_select_all"
  on public.permissions for select
  to authenticated
  using (true);

-- ── role_permissions ─────────────────────────────────────────────────────────
grant select on public.role_permissions to authenticated;

create policy "role_permissions_select_visible_roles"
  on public.role_permissions for select
  to authenticated
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and (r.tenant_id is null or r.tenant_id = public.current_tenant_id())
    )
  );

-- ── user_roles ────────────────────────────────────────────────────────────
grant select on public.user_roles to authenticated;

create policy "user_roles_select_self_or_same_tenant"
  on public.user_roles for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = user_roles.user_id
        and u.tenant_id is not null
        and u.tenant_id = public.current_tenant_id()
    )
  );
