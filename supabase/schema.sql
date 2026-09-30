-- =========================================================
-- Recuerdos — estrutura do banco no Supabase
-- Cole tudo isto no SQL Editor do seu projeto e execute.
-- =========================================================

-- ---------- PRODUTOS ----------
create table if not exists public.produtos (
  id          bigserial primary key,
  nome        text    not null,
  categoria   text    not null default 'Geral',
  preco       numeric(10,2) not null default 0,
  icone       text,                  -- nome do ícone (ver ICONES em produtos.js)
  img         text,                  -- URL da foto (opcional, sobrepõe o ícone)
  descricao   text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- ---------- PEDIDOS ----------
create table if not exists public.pedidos (
  id               bigserial primary key,
  cliente_nome     text,
  cliente_telefone text,
  cliente_email    text,
  total            numeric(10,2) not null default 0,
  status           text not null default 'novo',
  criado_em        timestamptz not null default now()
);

create table if not exists public.pedido_itens (
  id             bigserial primary key,
  pedido_id      bigint not null references public.pedidos(id) on delete cascade,
  produto_id     bigint references public.produtos(id) on delete set null,
  produto_nome   text not null,
  quantidade     integer not null default 1,
  preco_unitario numeric(10,2) not null default 0
);

-- ---------- CONTATOS ----------
create table if not exists public.contatos (
  id        bigserial primary key,
  nome      text not null,
  email     text not null,
  telefone  text,
  mensagem  text not null,
  criado_em timestamptz not null default now()
);

-- =========================================================
-- Segurança (RLS): o público só LÊ produtos e só ESCREVE
-- pedidos/contatos. Nada pode ser lido, alterado ou apagado
-- pelo visitante — isso fica para você, no painel do Supabase.
-- =========================================================
alter table public.produtos     enable row level security;
alter table public.pedidos      enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.contatos     enable row level security;

drop policy if exists "produtos_leitura_publica" on public.produtos;
create policy "produtos_leitura_publica"
  on public.produtos for select to anon, authenticated
  using (ativo = true);

drop policy if exists "pedidos_insercao_publica" on public.pedidos;
create policy "pedidos_insercao_publica"
  on public.pedidos for insert to anon, authenticated
  with check (true);

-- necessário porque o site usa .select('id') logo após o insert
drop policy if exists "pedidos_leitura_propria" on public.pedidos;
create policy "pedidos_leitura_propria"
  on public.pedidos for select to anon, authenticated
  using (criado_em > now() - interval '5 minutes');

drop policy if exists "itens_insercao_publica" on public.pedido_itens;
create policy "itens_insercao_publica"
  on public.pedido_itens for insert to anon, authenticated
  with check (true);

drop policy if exists "contatos_insercao_publica" on public.contatos;
create policy "contatos_insercao_publica"
  on public.contatos for insert to anon, authenticated
  with check (true);

-- =========================================================
-- Catálogo inicial (os mesmos 14 produtos do site)
-- =========================================================
insert into public.produtos (nome, categoria, preco, icone) values
  ('Canecas',            'Cozinha',     39.90, 'caneca'),
  ('Moleskine',          'Papelaria',   54.90, 'moleskine'),
  ('Porta copos',        'Casa',        24.90, 'portacopos'),
  ('Globo de neve',      'Decoração',   79.90, 'globo'),
  ('Porta retratos',     'Decoração',   64.90, 'portaretrato'),
  ('Metais esmaltados',  'Decoração',   49.90, 'metal'),
  ('Abridores',          'Cozinha',     29.90, 'abridor'),
  ('Chaveiros',          'Acessórios',  19.90, 'chaveiro'),
  ('Projetos especiais', 'Corporativo',129.90, 'projetos'),
  ('Corporativo',        'Corporativo', 99.90, 'corporativo'),
  ('Copos Shot',         'Cozinha',     22.90, 'shot'),
  ('Garrafas',           'Cozinha',     89.90, 'garrafa'),
  ('Placas',             'Decoração',   44.90, 'placa'),
  ('Imã MDF',            'Acessórios',  14.90, 'ima')
on conflict do nothing;
