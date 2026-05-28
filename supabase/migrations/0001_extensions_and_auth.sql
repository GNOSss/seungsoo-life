-- 0001_extensions_and_auth.sql
-- Auth-related bootstrap: extensions + profiles 미러 테이블 + auth.users INSERT 자동 처리

-- gen_random_uuid() 함수 활성화
create extension if not exists pgcrypto;

-- profiles: auth.users 미러 (앱 영역 FK 타깃)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Google OAuth 등으로 auth.users INSERT 시 자동으로 profiles row 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
