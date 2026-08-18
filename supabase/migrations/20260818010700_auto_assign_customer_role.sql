-- Extend the signup trigger (defined in 20260818010200_users.sql) now that roles/user_roles
-- exist: a user signing up without a tenant_id is a customer and gets the CUSTOMER role
-- automatically.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_customer_role_id uuid;
begin
  v_tenant_id := nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid;

  insert into public.users (id, tenant_id, name, email, phone)
  values (
    new.id,
    v_tenant_id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );

  if v_tenant_id is null then
    select id into v_customer_role_id
    from public.roles
    where tenant_id is null and name = 'CUSTOMER';

    if v_customer_role_id is not null then
      insert into public.user_roles (user_id, role_id) values (new.id, v_customer_role_id);
    end if;
  end if;

  return new;
end;
$$;
