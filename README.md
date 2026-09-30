# Recuerdos — loja de souvenirs

Site estático (HTML + CSS + JavaScript puro). Não precisa instalar nada:
basta abrir `index.html` no navegador.

**No ar em:** https://joaoeduardopompeo987-byte.github.io/Recuerdos/

## Estrutura

```
index.html                 Página inicial (topo, banner, quem somos, segmentos, produtos, cidades, clientes, contato)
loja.html                  Loja com filtros, busca e carrinho
assets/css/style.css       Todo o visual — as cores ficam no bloco :root, no topo
assets/js/produtos.js      Catálogo local / fallback (nome, categoria, preço, ícone) — mexa aqui primeiro
assets/js/supabase-config.js  Chaves do Supabase (só este arquivo precisa ser editado para conectar)
assets/js/db.js            Conversa com o Supabase (produtos, pedidos, contatos)
assets/js/main.js          Menu mobile, carrossel, grade da home, formulário
assets/js/loja.js          Filtros e carrinho (salvo no navegador via localStorage)
assets/img/                Suas imagens (veja LEIA-ME.txt)
supabase/schema.sql        SQL para criar as tabelas e as políticas de segurança
```

## O que trocar primeiro

| Quero mudar | Onde |
|---|---|
| Nome, telefone, e-mail, endereço | `index.html` e `loja.html` (topo e rodapé) |
| Número que recebe os pedidos | `WHATSAPP` no topo de `assets/js/loja.js` |
| Cores | variáveis `--ciano`, `--azul`, etc. em `assets/css/style.css` |
| Produtos e preços | tabela `produtos` no Supabase, ou `PRODUTOS_PADRAO` em `assets/js/produtos.js` |
| Logo | bloco `.logo` no HTML — troque o SVG por `<img src="assets/img/logo.png">` |
| Banners | classes `.slide-1/2/3` no CSS |

## Supabase

1. Crie um projeto em https://supabase.com
2. Cole `supabase/schema.sql` no SQL Editor e execute (cria as tabelas, o RLS e o catálogo inicial)
3. Em *Project Settings → API*, copie a **Project URL** e a chave **anon public** para `assets/js/supabase-config.js`

Enquanto as chaves estiverem vazias, o site roda em modo demonstração com o
catálogo local — nada quebra.

Use somente a chave `anon`; ela é pública por natureza e quem protege o banco
são as políticas de RLS. A chave `service_role` nunca deve entrar neste repositório.

## Carrinho

Os itens ficam salvos no navegador do visitante. O botão **Finalizar** grava o
pedido no Supabase (se conectado) e abre o WhatsApp com o resumo. Não há
pagamento online — para isso seria preciso um gateway (Mercado Pago, Stripe).

## Publicação

O site é publicado pelo GitHub Pages a partir da branch `main`, pasta raiz.
Cada `git push` atualiza o site no ar em 1 a 2 minutos.

```powershell
git add -A
git commit -m "descricao da mudanca"
git push
```

## Rodar localmente (opcional)

```powershell
python -m http.server 5500
```
Depois acesse http://localhost:5500
