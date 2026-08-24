-- Private profile/avatar behavioral regression.
-- Coverage: self-service field updates, protected-column denial, phone
-- verification reset, private avatar reads, cross-client denial, path
-- ownership, and immutable originals.

update public.profiles
set phone_e164 = '+14075550100',
    phone_verified_at = now(),
    sms_opt_in = true,
    sms_opted_in_at = now()
where id = '20000000-0000-0000-0000-000000000002';

insert into storage.objects (bucket_id, name) values
  ('profile-avatars', '20000000-0000-0000-0000-000000000001/founder.png'),
  ('profile-avatars', '20000000-0000-0000-0000-000000000002/member.png'),
  ('profile-avatars', '20000000-0000-0000-0000-000000000003/client-a.png'),
  ('profile-avatars', '20000000-0000-0000-0000-000000000004/client-b.png'),
  ('profile-avatars', '20000000-0000-0000-0000-000000000005/other-org.png');

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'profile-avatars';

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  do $$ declare c int; verified timestamptz; opted boolean; begin
    update public.profiles
    set display_name = 'Member Updated',
        phone_e164 = '+14075550101',
        timezone = 'America/Chicago',
        locale = 'pt-BR',
        sms_opt_in = true
    where id = auth.uid();

    select phone_verified_at, sms_opt_in into verified, opted
    from public.profiles where id = auth.uid();
    if verified is not null or opted then raise exception 'phone change retained verification or SMS opt-in'; end if;

    begin
      update public.profiles set email = 'attacker@test.invalid' where id = auth.uid();
      raise exception 'protected profile email was self-editable';
    exception when insufficient_privilege then null; end;

    begin
      update public.profiles
      set avatar_path = '20000000-0000-0000-0000-000000000001/impersonated.png'
      where id = auth.uid();
      raise exception 'profile accepted another user avatar path';
    exception when insufficient_privilege then null; end;

    with u as (
      update public.profiles set display_name = 'Cross-user tamper'
      where id = '20000000-0000-0000-0000-000000000001'
      returning 1
    ) select count(*) into c from u;
    if c <> 0 then raise exception 'cross-user profile update allowed'; end if;

    select count(*) into c from storage.objects where bucket_id = 'profile-avatars';
    if c <> 2 then raise exception 'internal avatar visibility widened: %', c; end if;

    insert into storage.objects (bucket_id, name)
      values ('profile-avatars', '20000000-0000-0000-0000-000000000002/fresh.png');

    begin
      insert into storage.objects (bucket_id, name)
        values ('profile-avatars', '20000000-0000-0000-0000-000000000001/impersonated.png');
      raise exception 'avatar upload accepted another profile path';
    exception when insufficient_privilege then null; end;

    with u as (
      update storage.objects set metadata = '{"tampered":true}'::jsonb
      where bucket_id = 'profile-avatars' and name like '%/fresh.png'
      returning 1
    ) select count(*) into c from u;
    if c <> 0 then raise exception 'avatar original overwrite allowed'; end if;
  end $$;
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
  do $$ declare c int; begin
    select count(*) into c from storage.objects where bucket_id = 'profile-avatars';
    if c <> 4 then raise exception 'global owner avatar visibility failed: %', c; end if;
  end $$;
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
  do $$ declare c int; begin
    select count(*) into c from storage.objects where bucket_id = 'profile-avatars';
    if c <> 1 then raise exception 'cross-client avatar visibility allowed: %', c; end if;
  end $$;
rollback;

begin;
  set local role anon;
  select set_config('request.jwt.claim.sub', '', true);
  do $$ declare c int; begin
    select count(*) into c from storage.objects where bucket_id = 'profile-avatars';
    if c <> 0 then raise exception 'anonymous avatar read allowed: %', c; end if;
  end $$;
rollback;
