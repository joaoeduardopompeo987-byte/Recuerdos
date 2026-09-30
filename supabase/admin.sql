-- =========================================================
-- Recuerdos — permissões do painel administrativo
-- Execute DEPOIS do schema.sql, no SQL Editor do Supabase.
--
-- ANTES DE RODAR, crie seu usuário:
--   Authentication > Users > Add user > Create new user
--   Marque "Auto Confirm User" e guarde a senha.
-- Depois troque o e-mail abaixo pelo que você cadastrou.
-- =========================================================

-- ---------- Quem pode administrar ----------
create table if not exists public.admins (
  email      text primary key,
  criado_em  timestamptz not null default now()
);

insert into public.admins (email) values
  ('novosnegocios@mmcreceptivo.com.br')   -- <<< troque/adicione aqui
on conflict do nothing;

alter table public.admins enable row level security;

-- Função que responde "quem está logado é admin?".
-- security definer: ela lê a tabela admins ignorando o RLS,
-- o que evita recursão infinita nas políticas abaixo.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = (auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to anon, authenticated;

drop policy if exists "admins_leitura" on public.admins;
create policy "admins_leitura"
  on public.admins for select to authenticated
  using (public.eh_admin());

-- =========================================================
-- Poderes do administrador
-- (as políticas do schema.sql continuam valendo para o público:
--  no Postgres elas se somam, nunca se anulam)
-- =========================================================

-- Produtos: criar, editar, apagar e ver até os inativos
drop policy if exists "produtos_admin_total" on public.produtos;
create policy "produtos_admin_total"
  on public.produtos for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

-- Pedidos: ler todos e mudar o status
drop policy if exists "pedidos_admin_leitura" on public.pedidos;
create policy "pedidos_admin_leitura"
  on public.pedidos for select to authenticated
  using (public.eh_admin());

drop policy if exists "pedidos_admin_update" on public.pedidos;
create policy "pedidos_admin_update"
  on public.pedidos for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists "pedidos_admin_delete" on public.pedidos;
create policy "pedidos_admin_delete"
  on public.pedidos for delete to authenticated
  using (public.eh_admin());

-- Itens do pedido
drop policy if exists "itens_admin_leitura" on public.pedido_itens;
create policy "itens_admin_leitura"
  on public.pedido_itens for select to authenticated
  using (public.eh_admin());

drop policy if exists "itens_admin_delete" on public.pedido_itens;
create policy "itens_admin_delete"
  on public.pedido_itens for delete to authenticated
  using (public.eh_admin());

-- Contatos: ler e apagar
drop policy if exists "contatos_admin_leitura" on public.contatos;
create policy "contatos_admin_leitura"
  on public.contatos for select to authenticated
  using (public.eh_admin());

drop policy if exists "contatos_admin_delete" on public.contatos;
create policy "contatos_admin_delete"
  on public.contatos for delete to authenticated
  using (public.eh_admin());

-- =========================================================
-- Recomendado: desligue o cadastro público em
-- Authentication > Sign In / Providers > Email > "Allow new users to sign up".
-- Mesmo que alguém se cadastre, sem estar na tabela admins não vê nada.
-- =========================================================
