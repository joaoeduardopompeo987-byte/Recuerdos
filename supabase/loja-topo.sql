-- =========================================================
-- Recuerdos — topo da página da loja, editável pelo painel
-- Execute no SQL Editor. Pode rodar de novo sem problema.
-- =========================================================

alter table public.configuracoes
  add column if not exists loja_titulo     text    not null default 'Loja de souvenirs',
  add column if not exists loja_subtitulo  text    not null default 'Escolha seus produtos e finalize o pedido pelo WhatsApp.',
  add column if not exists loja_img        text,
  add column if not exists loja_cor_inicio text    not null default '#0a3d6b',
  add column if not exists loja_cor_fim    text    not null default '#00c2f3';

select loja_titulo, loja_subtitulo, loja_cor_inicio, loja_cor_fim from public.configuracoes where id = 1;
