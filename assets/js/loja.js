/* =========================================================
   Loja — catálogo, filtros e carrinho (salvo no navegador)
   ========================================================= */
const WHATSAPP = '5547992157309'; // número que recebe os pedidos

const grid   = document.getElementById('loja-grid');
const vazio  = document.getElementById('vazio');
const busca  = document.getElementById('busca');
const ordem  = document.getElementById('ordem');
const chips  = document.getElementById('chips');

let categoria = 'Todos';
let carrinho = carregar();

/* ---------- Filtros ---------- */
function montarFiltros(){
  const categorias = ['Todos', ...new Set(PRODUTOS.map(p => p.categoria))];
  chips.innerHTML = categorias
    .map(c => `<button class="chip${c === categoria ? ' ativo' : ''}" data-cat="${c}">${c}</button>`)
    .join('');
}

chips.addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if(!b) return;
  categoria = b.dataset.cat;
  chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('ativo', c === b));
  render();
});
busca.addEventListener('input', render);
ordem.addEventListener('change', render);

function listaFiltrada(){
  const termo = busca.value.trim().toLowerCase();
  let lista = PRODUTOS.filter(p =>
    (categoria === 'Todos' || p.categoria === categoria) &&
    (!termo || p.nome.toLowerCase().includes(termo))
  );
  if(ordem.value === 'menor') lista.sort((a, b) => a.preco - b.preco);
  else if(ordem.value === 'maior') lista.sort((a, b) => b.preco - a.preco);
  else lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return lista;
}

function render(){
  const lista = listaFiltrada();
  vazio.hidden = lista.length > 0;
  grid.innerHTML = lista.map(p => `
    <article class="loja-card" id="${p.id}">
      <div class="loja-arte">${arteProduto(p)}</div>
      <div class="loja-info">
        <p class="loja-cat">${p.categoria}</p>
        <h3>${p.nome}</h3>
        <p class="loja-preco">${precoBR(p.preco)}</p>
        <button class="btn add" data-id="${p.id}">Adicionar</button>
      </div>
    </article>`).join('');
}

grid.addEventListener('click', e => {
  const b = e.target.closest('.add');
  if(!b) return;
  adicionar(b.dataset.id);
});

/* ---------- Carrinho ---------- */
function carregar(){
  try { return JSON.parse(localStorage.getItem('recuerdos-carrinho')) || {}; }
  catch { return {}; }
}
function salvar(){
  try { localStorage.setItem('recuerdos-carrinho', JSON.stringify(carrinho)); } catch {}
}
function adicionar(id){
  carrinho[id] = (carrinho[id] || 0) + 1;
  salvar(); pintarCarrinho(); abrir();
}
function mudarQtd(id, delta){
  carrinho[id] = (carrinho[id] || 0) + delta;
  if(carrinho[id] <= 0) delete carrinho[id];
  salvar(); pintarCarrinho();
}

const painel   = document.getElementById('carrinho');
const overlay  = document.getElementById('overlay');
const itensEl  = document.getElementById('carrinho-itens');
const totalEl  = document.getElementById('total');
const contador = document.getElementById('cart-count');

function abrir(){
  painel.hidden = false;
  overlay.hidden = false;
  document.body.classList.add('carrinho-aberto');
}
function fechar(){
  painel.hidden = true;
  overlay.hidden = true;
  document.body.classList.remove('carrinho-aberto');
}

document.getElementById('cart-btn').addEventListener('click', abrir);
document.getElementById('fechar-carrinho').addEventListener('click', fechar);
overlay.addEventListener('click', fechar);
document.addEventListener('keydown', e => { if(e.key === 'Escape') fechar(); });

document.getElementById('limpar').addEventListener('click', () => {
  carrinho = {}; salvar(); pintarCarrinho();
});

itensEl.addEventListener('click', e => {
  const b = e.target.closest('button[data-acao]');
  if(!b) return;
  mudarQtd(b.dataset.id, b.dataset.acao === 'mais' ? 1 : -1);
});

function itensDoCarrinho(){
  return Object.entries(carrinho)
    .map(([id, qtd]) => ({ ...PRODUTOS.find(p => p.id === id), qtd }))
    .filter(i => i.nome);
}

function pintarCarrinho(){
  const itens = itensDoCarrinho();
  const total = itens.reduce((s, i) => s + i.preco * i.qtd, 0);
  const qtd   = itens.reduce((s, i) => s + i.qtd, 0);

  contador.textContent = qtd;
  contador.classList.toggle('vis', qtd > 0);
  totalEl.textContent = precoBR(total);

  itensEl.innerHTML = itens.length
    ? itens.map(i => `
        <div class="item">
          <div class="item-arte">${arteProduto(i)}</div>
          <div class="item-info">
            <strong>${i.nome}</strong>
            <span>${precoBR(i.preco)}</span>
          </div>
          <div class="qtd">
            <button data-acao="menos" data-id="${i.id}" aria-label="Diminuir">−</button>
            <span>${i.qtd}</span>
            <button data-acao="mais" data-id="${i.id}" aria-label="Aumentar">+</button>
          </div>
        </div>`).join('')
    : '<p class="carrinho-vazio">Seu carrinho está vazio.</p>';
}

document.getElementById('finalizar').addEventListener('click', async () => {
  const itens = itensDoCarrinho();
  if(!itens.length){ alert('Adicione produtos ao carrinho primeiro.'); return; }
  const total = itens.reduce((s, i) => s + i.preco * i.qtd, 0);

  /* registra o pedido no banco antes de mandar para o WhatsApp */
  let numero = null;
  if(DB.ativo){
    const nome     = prompt('Seu nome:') || '';
    const telefone = prompt('Seu telefone/WhatsApp:') || '';
    numero = await DB.criarPedido({ cliente: { nome, telefone }, itens, total });
  }

  const texto = 'Olá! Gostaria de fazer um pedido:\n\n'
    + itens.map(i => `• ${i.qtd}x ${i.nome} — ${precoBR(i.preco * i.qtd)}`).join('\n')
    + `\n\nTotal: ${precoBR(total)}`
    + (numero ? `\nPedido nº ${numero}` : '');
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank');
});

/* primeiro desenho com o catálogo local, depois com o do Supabase */
montarFiltros();
render();
pintarCarrinho();
CATALOGO_PRONTO.then(() => { montarFiltros(); render(); pintarCarrinho(); });
