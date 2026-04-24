-- Look up a single user_id from an email (owner/super_admin only)
create or replace function public.lookup_user_by_email(p_email text)
returns table(user_id uuid, email text, name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (is_owner(auth.uid()) or has_role(auth.uid(),'super_admin'::app_role)) then
    raise exception 'Owner or super_admin required' using errcode = '42501';
  end if;

  return query
  select u.id, u.email::text, p.name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email))
  limit 1;
end;
$$;

-- Return staff list with emails (owner/super_admin only)
create or replace function public.get_staff_with_emails()
returns table(user_id uuid, email text, name text, role app_role)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (is_owner(auth.uid()) or has_role(auth.uid(),'super_admin'::app_role)) then
    raise exception 'Owner or super_admin required' using errcode = '42501';
  end if;

  return query
  select ur.user_id, u.email::text, p.name, ur.role
  from public.user_roles ur
  left join auth.users u on u.id = ur.user_id
  left join public.profiles p on p.id = ur.user_id
  order by ur.user_id;
end;
$$;