-- =========================================================
-- Recuerdos — cards de "Segmentos de atuação"
-- Execute no SQL Editor, depois do admin.sql.
-- Pode rodar de novo sem problema.
-- =========================================================

create table if not exists public.segmentos (
  id        bigserial primary key,
  titulo    text not null,
  descricao text,
  img       text,
  ordem     integer not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.segmentos enable row level security;

drop policy if exists "segmentos_leitura_publica" on public.segmentos;
create policy "segmentos_leitura_publica"
  on public.segmentos for select to anon, authenticated
  using (ativo = true);

drop policy if exists "segmentos_admin_total" on public.segmentos;
create policy "segmentos_admin_total"
  on public.segmentos for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Os quatro que já estão no site (só entram se a tabela estiver vazia)
insert into public.segmentos (titulo, descricao, ordem)
select * from (values
  ('Parques',             'Criamos souvenirs personalizados e exclusivos para todos os tipos de atrações turísticas.', 1),
  ('Atrações turísticas', 'Desenvolvemos e personalizamos produtos para a atração da sua cidade.',                     2),
  ('Cidades',             'Atuamos nas maiores cidades turísticas do Brasil com inúmeros souvenirs.',                  3),
  ('Empresa/corporativo', 'Sua marca aplicada em um produto com acabamento de alta qualidade transmite sofisticação e confiança.', 4)
) as v
where not exists (select 1 from public.segmentos);

select id, titulo, ordem, ativo from public.segmentos order by ordem;
