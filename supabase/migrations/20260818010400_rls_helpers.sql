-- Security-definer helpers used inside RLS policies. Defined as SECURITY DEFINER + STABLE so
-- policies can look up the caller's tenant/permissions without re-triggering RLS recursively
-- on public.users / public.user_roles.

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid();
$$;

comment on function public.current_tenant_id() is 'Tenant of the currently authenticated user, or null for customers/unauthenticated.';

create or replace function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.code = permission_code
  );
$$;

comment on function public.has_permission(text) is 'True if the currently authenticated user holds a role granting the given permission code.';
