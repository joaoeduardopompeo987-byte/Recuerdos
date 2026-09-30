/* =========================================================
   Painel administrativo — abre em qualquer página com #admin
   Ex.: https://.../Recuerdos/#admin
   Exige login (Supabase Auth) e e-mail cadastrado na tabela admins.
   ========================================================= */
(function(){
  const app = document.getElementById('admin-app');
  if(!app) return;

  const sb = DB.cliente;          // null se o Supabase não estiver configurado
  let aba = 'produtos';
  let sessao = null;

  /* ---------- abre/fecha pelo endereço ---------- */
  function checarHash(){
    if(location.hash === '#admin') abrir();
    else fechar();
  }
  window.addEventListener('hashchange', checarHash);

  async function abrir(){
    app.hidden = false;
    document.body.style.overflow = 'hidden';
    if(!sb){ app.innerHTML = aviso('O Supabase não está configurado neste site.'); return; }
    const { data } = await sb.auth.getSession();
    sessao = data.session;
    desenhar();
  }
  function fechar(){
    app.hidden = true;
    document.body.style.overflow = '';
  }

  const aviso = t => `<div class="adm-box"><p>${t}</p><a class="btn" href="#">Voltar ao site</a></div>`;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const dataBR = d => new Date(d).toLocaleString('pt-BR');

  /* ---------- telas ---------- */
  function desenhar(){
    if(!sessao) return telaLogin();
    telaPainel();
  }

  function telaLogin(){
    app.innerHTML = `
      <div class="adm-box">
        <h1>Painel Recuerdos</h1>
        <p class="adm-sub">Entre com seu e-mail de administrador.</p>
        <form id="adm-login" class="form">
          <label>E-mail <input type="email" name="email" required autocomplete="username"></label>
          <label>Senha <input type="password" name="senha" required autocomplete="current-password"></label>
          <button class="btn" type="submit">Entrar</button>
          <p class="form-msg" id="adm-erro"></p>
        </form>
        <a class="adm-voltar" href="#">← Voltar ao site</a>
      </div>`;

    document.getElementById('adm-login').addEventListener('submit', async e => {
      e.preventDefault();
      const erro = document.getElementById('adm-erro');
      erro.textContent = 'Entrando...';
      const f = new FormData(e.target);
      const { data, error } = await sb.auth.signInWithPassword({
        email: f.get('email'), password: f.get('senha')
      });
      if(error){ erro.textContent = 'E-mail ou senha incorretos.'; return; }
      sessao = data.session;
      desenhar();
    });
  }

  function telaPainel(){
    app.innerHTML = `
      <div class="adm-topo">
        <strong>Painel Recuerdos</strong>
        <nav class="adm-abas">
          <button data-aba="produtos">Produtos</button>
          <button data-aba="pedidos">Pedidos</button>
          <button data-aba="contatos">Contatos</button>
        </nav>
        <span class="adm-user">${esc(sessao.user.email)}</span>
        <a class="adm-link" href="#">Ver site</a>
        <button class="adm-link" id="adm-sair">Sair</button>
      </div>
      <div class="adm-conteudo" id="adm-conteudo"><p class="adm-carregando">Carregando...</p></div>`;

    app.querySelectorAll('[data-aba]').forEach(b => {
      b.classList.toggle('ativa', b.dataset.aba === aba);
      b.addEventListener('click', () => { aba = b.dataset.aba; telaPainel(); });
    });
    document.getElementById('adm-sair').addEventListener('click', async () => {
      await sb.auth.signOut(); sessao = null; desenhar();
    });

    if(aba === 'produtos') verProdutos();
    if(aba === 'pedidos')  verPedidos();
    if(aba === 'contatos') verContatos();
  }

  const alvo = () => document.getElementById('adm-conteudo');

  /* ---------- Produtos ---------- */
  async function verProdutos(){
    const { data, error } = await sb.from('produtos').select('*').order('nome');
    if(error) return alvo().innerHTML = aviso('Sem permissão para ler produtos: ' + esc(error.message));

    alvo().innerHTML = `
      <div class="adm-barra">
        <h2>Produtos (${data.length})</h2>
        <button class="btn" id="novo">+ Novo produto</button>
      </div>
      <div class="adm-tabela-rol">
      <table class="adm-tabela">
        <thead><tr>
          <th>Nome</th><th>Categoria</th><th>Preço</th><th>Ícone</th><th>Foto (URL)</th><th>Ativo</th><th></th>
        </tr></thead>
        <tbody>${data.map(linhaProduto).join('')}</tbody>
      </table></div>
      <p class="adm-dica">Os ícones disponíveis são: ${Object.keys(ICONES).join(', ')}. Preencha a foto para substituir o ícone.</p>`;

    document.getElementById('novo').addEventListener('click', async () => {
      const { error } = await sb.from('produtos').insert({ nome:'Novo produto', categoria:'Geral', preco:0, icone:'projetos', ativo:false });
      if(error) alert('Erro: ' + error.message); else verProdutos();
    });

    alvo().querySelectorAll('tbody tr').forEach(tr => {
      tr.querySelector('.salvar').addEventListener('click', () => salvarProduto(tr));
      tr.querySelector('.apagar').addEventListener('click', () => apagarProduto(tr));
    });
  }

  function linhaProduto(p){
    return `<tr data-id="${p.id}">
      <td><input value="${esc(p.nome)}" data-c="nome"></td>
      <td><input value="${esc(p.categoria)}" data-c="categoria" size="12"></td>
      <td><input value="${p.preco}" data-c="preco" type="number" step="0.01" size="8"></td>
      <td><input value="${esc(p.icone)}" data-c="icone" size="10"></td>
      <td><input value="${esc(p.img)}" data-c="img" placeholder="https://..."></td>
      <td class="meio"><input type="checkbox" data-c="ativo" ${p.ativo ? 'checked' : ''}></td>
      <td class="acoes"><button class="mini salvar">Salvar</button><button class="mini apagar">Apagar</button></td>
    </tr>`;
  }

  async function salvarProduto(tr){
    const v = c => tr.querySelector(`[data-c="${c}"]`);
    const dados = {
      nome: v('nome').value.trim(),
      categoria: v('categoria').value.trim() || 'Geral',
      preco: Number(v('preco').value) || 0,
      icone: v('icone').value.trim() || null,
      img: v('img').value.trim() || null,
      ativo: v('ativo').checked
    };
    const btn = tr.querySelector('.salvar');
    btn.textContent = '...';
    const { error } = await sb.from('produtos').update(dados).eq('id', tr.dataset.id);
    btn.textContent = error ? 'Erro' : 'Salvo ✓';
    if(error) alert('Erro: ' + error.message);
    setTimeout(() => btn.textContent = 'Salvar', 1800);
  }

  async function apagarProduto(tr){
    const nome = tr.querySelector('[data-c="nome"]').value;
    if(!confirm(`Apagar "${nome}" definitivamente?\n\nDica: para só tirar do site, desmarque "Ativo".`)) return;
    const { error } = await sb.from('produtos').delete().eq('id', tr.dataset.id);
    if(error) alert('Erro: ' + error.message); else verProdutos();
  }

  /* ---------- Pedidos ---------- */
  async function verPedidos(){
    const { data, error } = await sb
      .from('pedidos')
      .select('*, pedido_itens(produto_nome, quantidade, preco_unitario)')
      .order('criado_em', { ascending:false })
      .limit(200);
    if(error) return alvo().innerHTML = aviso('Sem permissão para ler pedidos: ' + esc(error.message));
    if(!data.length) return alvo().innerHTML = '<p class="adm-vazio">Nenhum pedido ainda.</p>';

    const status = ['novo','em andamento','concluido','cancelado'];
    alvo().innerHTML = `<h2>Pedidos (${data.length})</h2>` + data.map(p => `
      <article class="adm-card" data-id="${p.id}">
        <header>
          <strong>#${p.id} — ${esc(p.cliente_nome) || 'sem nome'}</strong>
          <span>${dataBR(p.criado_em)}</span>
        </header>
        <p class="adm-meta">${esc(p.cliente_telefone) || '—'} ${p.cliente_email ? '· ' + esc(p.cliente_email) : ''}</p>
        <ul>${(p.pedido_itens || []).map(i =>
          `<li>${i.quantidade}× ${esc(i.produto_nome)} — ${precoBR(Number(i.preco_unitario) * i.quantidade)}</li>`).join('')}</ul>
        <footer>
          <strong>${precoBR(Number(p.total))}</strong>
          <select class="status">${status.map(s => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </footer>
      </article>`).join('');

    alvo().querySelectorAll('.adm-card').forEach(c => {
      c.querySelector('.status').addEventListener('change', async e => {
        const { error } = await sb.from('pedidos').update({ status: e.target.value }).eq('id', c.dataset.id);
        if(error) alert('Erro: ' + error.message);
      });
    });
  }

  /* ---------- Contatos ---------- */
  async function verContatos(){
    const { data, error } = await sb.from('contatos').select('*').order('criado_em', { ascending:false }).limit(200);
    if(error) return alvo().innerHTML = aviso('Sem permissão para ler contatos: ' + esc(error.message));
    if(!data.length) return alvo().innerHTML = '<p class="adm-vazio">Nenhuma mensagem ainda.</p>';

    alvo().innerHTML = `<h2>Mensagens (${data.length})</h2>` + data.map(c => `
      <article class="adm-card">
        <header><strong>${esc(c.nome)}</strong><span>${dataBR(c.criado_em)}</span></header>
        <p class="adm-meta">${esc(c.email)} ${c.telefone ? '· ' + esc(c.telefone) : ''}</p>
        <p>${esc(c.mensagem)}</p>
      </article>`).join('');
  }

  checarHash();
})();
