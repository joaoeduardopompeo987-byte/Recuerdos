-- =========================================================
-- Recuerdos — painel administrativo (v2)
-- Execute DEPOIS do schema.sql, no SQL Editor do Supabase.
-- Pode rodar quantas vezes quiser: é tudo idempotente.
--
-- ANTES DE RODAR, crie seu usuário:
--   Authentication > Users > Add user > Create new user
--   Marque "Auto Confirm User" e guarde a senha.
-- O UID é preenchido sozinho a partir do e-mail (passo 1.3).
-- =========================================================


-- =========================================================
-- 1. QUEM PODE ADMINISTRAR (por UID e por e-mail)
-- =========================================================
create table if not exists public.admins (
  email      text primary key,
  user_id    uuid,
  criado_em  timestamptz not null default now()
);
alter table public.admins add column if not exists user_id uuid;

-- 1.1 cadastre aqui os e-mails que terão acesso ao painel
insert into public.admins (email) values
  ('novosnegocios@mmcreceptivo.com.br')   -- <<< troque/adicione aqui
on conflict (email) do nothing;

-- 1.2 função que responde "quem está logado é admin?"
-- security definer: lê a tabela admins ignorando o RLS, evitando recursão.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to anon, authenticated;

-- 1.3 preenche o UID de quem já tem conta criada
update public.admins a
   set user_id = u.id
  from auth.users u
 where lower(u.email) = lower(a.email)
   and a.user_id is distinct from u.id;

-- 1.4 mantém o UID em dia quando um admin novo se cadastrar depois
create or replace function public.vincular_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.admins
     set user_id = new.id
   where lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.vincular_admin();

alter table public.admins enable row level security;
drop policy if exists "admins_leitura" on public.admins;
create policy "admins_leitura"
  on public.admins for select to authenticated
  using (public.eh_admin());


-- =========================================================
-- 2. CATÁLOGOS (as coleções que viram os filtros da loja)
-- =========================================================
create table if not exists public.catalogos (
  id        bigserial primary key,
  nome      text not null,
  descricao text,
  img       text,
  ordem     integer not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- cria um catálogo para cada categoria que já existe em produtos
insert into public.catalogos (nome)
select distinct categoria from public.produtos
where categoria is not null
  and categoria not in (select nome from public.catalogos)
on conflict do nothing;

-- liga os produtos ao catálogo de mesmo nome
alter table public.produtos
  add column if not exists catalogo_id bigint references public.catalogos(id) on delete set null;

update public.produtos p
   set catalogo_id = c.id
  from public.catalogos c
 where c.nome = p.categoria
   and p.catalogo_id is null;

alter table public.catalogos enable row level security;

drop policy if exists "catalogos_leitura_publica" on public.catalogos;
create policy "catalogos_leitura_publica"
  on public.catalogos for select to anon, authenticated
  using (ativo = true);

drop policy if exists "catalogos_admin_total" on public.catalogos;
create policy "catalogos_admin_total"
  on public.catalogos for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());


-- =========================================================
-- 3. CONFIGURAÇÕES DO SITE (logo, nome, frase)
--    Uma linha só, sempre id = 1.
-- =========================================================
create table if not exists public.configuracoes (
  id            integer primary key default 1,
  nome_site     text not null default 'Recuerdos',
  tagline       text not null default 'Souvenirs incríveis, para momentos inesquecíveis',
  logo_url      text,
  logo_formato  text not null default 'redondo',   -- 'redondo' ou 'quadrado'
  logo_largura  integer not null default 56,
  logo_altura   integer not null default 56,
  atualizado_em timestamptz not null default now(),
  constraint so_uma_linha check (id = 1)
);

insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

alter table public.configuracoes enable row level security;

drop policy if exists "config_leitura_publica" on public.configuracoes;
create policy "config_leitura_publica"
  on public.configuracoes for select to anon, authenticated
  using (true);

drop policy if exists "config_admin_update" on public.configuracoes;
create policy "config_admin_update"
  on public.configuracoes for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());


-- =========================================================
-- 4. BANNERS (o fundo azul do topo vira imagem)
-- =========================================================
create table if not exists public.banners (
  id         bigserial primary key,
  titulo     text,
  subtitulo  text,
  img        text,                       -- URL da imagem de fundo
  cor_inicio text not null default '#7ed3f5',   -- usado quando não há imagem
  cor_fim    text not null default '#0a5ea3',
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

insert into public.banners (titulo, subtitulo, cor_inicio, cor_fim, ordem)
select * from (values
  ('Parques de diversões', 'Copos, garrafas e canecas exclusivas com a marca do seu parque.', '#7ed3f5', '#0a5ea3', 1),
  ('Aquários e museus',    'Globos de neve, ímãs e chaveiros que eternizam a visita.',        '#8fe3f0', '#046b8f', 2),
  ('Cidades turísticas',   'Do norte ao sul do Brasil, lembranças com a cara de cada lugar.', '#ffd77a', '#c9531f', 3)
) as v
where not exists (select 1 from public.banners);

alter table public.banners enable row level security;

drop policy if exists "banners_leitura_publica" on public.banners;
create policy "banners_leitura_publica"
  on public.banners for select to anon, authenticated
  using (ativo = true);

drop policy if exists "banners_admin_total" on public.banners;
create policy "banners_admin_total"
  on public.banners for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());


-- =========================================================
-- 5. PODERES DO ADMIN nas tabelas que já existiam
-- =========================================================
drop policy if exists "produtos_admin_total" on public.produtos;
create policy "produtos_admin_total"
  on public.produtos for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "pedidos_admin_leitura" on public.pedidos;
create policy "pedidos_admin_leitura"
  on public.pedidos for select to authenticated using (public.eh_admin());

drop policy if exists "pedidos_admin_update" on public.pedidos;
create policy "pedidos_admin_update"
  on public.pedidos for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "pedidos_admin_delete" on public.pedidos;
create policy "pedidos_admin_delete"
  on public.pedidos for delete to authenticated using (public.eh_admin());

drop policy if exists "itens_admin_leitura" on public.pedido_itens;
create policy "itens_admin_leitura"
  on public.pedido_itens for select to authenticated using (public.eh_admin());

drop policy if exists "itens_admin_delete" on public.pedido_itens;
create policy "itens_admin_delete"
  on public.pedido_itens for delete to authenticated using (public.eh_admin());

drop policy if exists "contatos_admin_leitura" on public.contatos;
create policy "contatos_admin_leitura"
  on public.contatos for select to authenticated using (public.eh_admin());

drop policy if exists "contatos_admin_delete" on public.contatos;
create policy "contatos_admin_delete"
  on public.contatos for delete to authenticated using (public.eh_admin());


-- =========================================================
-- 6. STORAGE — onde ficam logo, banners e fotos de produto
-- =========================================================
insert into storage.buckets (id, name, public)
values ('midia', 'midia', true)
on conflict (id) do update set public = true;

drop policy if exists "midia_leitura_publica" on storage.objects;
create policy "midia_leitura_publica"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'midia');

drop policy if exists "midia_admin_envio" on storage.objects;
create policy "midia_admin_envio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'midia' and public.eh_admin());

drop policy if exists "midia_admin_update" on storage.objects;
create policy "midia_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'midia' and public.eh_admin())
  with check (bucket_id = 'midia' and public.eh_admin());

drop policy if exists "midia_admin_delete" on storage.objects;
create policy "midia_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'midia' and public.eh_admin());


-- =========================================================
-- 7. CONFIRA SE DEU CERTO
--    Deve listar seu e-mail com o user_id preenchido.
-- =========================================================
select email, user_id, (user_id is not null) as conta_vinculada
from public.admins;

-- Recomendado: desligue o cadastro público em
-- Authentication > Sign In / Providers > Email > "Allow new users to sign up".
