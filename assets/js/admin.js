/* =========================================================
   Painel administrativo — abre com #admin no fim do endereço
   Ex.: https://.../Recuerdos/#admin

   Só entra quem tem conta no Supabase Auth E está na tabela
   admins (por UID ou e-mail). Veja supabase/admin.sql.
   ========================================================= */
(function(){
  const VERSAO = '2026-09-30';
  const app = document.getElementById('admin-app');
  if(!app) return;

  const sb = DB.cliente;
  let aba = 'produtos';
  let sessao = null;
  let catalogosCache = [];

  /* ---------- utilidades ---------- */
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const dataBR = d => new Date(d).toLocaleString('pt-BR');
  const aviso = t => `<div class="adm-box"><p>${t}</p><a class="btn" href="#">Voltar ao site</a></div>`;
  const alvo = () => document.getElementById('adm-conteudo');

  function recado(texto, tipo){
    const el = document.getElementById('adm-recado');
    if(!el) return;
    el.textContent = texto;
    el.className = 'adm-recado ' + (tipo || '');
    if(texto) setTimeout(() => { if(el.textContent === texto) el.textContent = ''; }, 4000);
  }

  /** Envia um arquivo para o bucket "midia" e devolve a URL pública. */
  async function enviarImagem(arquivo, pasta){
    if(arquivo.size > 2 * 1024 * 1024) throw new Error('A imagem passa de 2 MB.');
    const ext  = (arquivo.name.split('.').pop() || 'png').toLowerCase();
    const alea = Math.random().toString(36).slice(2, 8);
    const caminho = `${pasta}/${Date.now()}-${alea}.${ext}`;
    const { error } = await sb.storage.from('midia').upload(caminho, arquivo, { cacheControl: '3600' });
    if(error) throw error;
    return sb.storage.from('midia').getPublicUrl(caminho).data.publicUrl;
  }

  /** Abre o seletor de arquivo e devolve a URL já enviada. */
  function escolherImagem(pasta){
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      input.addEventListener('change', async () => {
        const arq = input.files[0];
        if(!arq) return resolve(null);
        recado('Enviando imagem...');
        try { resolve(await enviarImagem(arq, pasta)); recado('Imagem enviada.', 'ok'); }
        catch(e){ recado('Erro no envio: ' + e.message, 'erro'); resolve(null); }
      });
      input.click();
    });
  }

  /* ---------- abre/fecha pelo endereço ---------- */
  function checarHash(){ location.hash === '#admin' ? abrir() : fechar(); }
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

  function desenhar(){ sessao ? telaPainel() : telaLogin(); }

  /* ---------- login ---------- */
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

  /* ---------- moldura do painel ---------- */
  const ABAS = [
    ['produtos',  '📦 Produtos'],
    ['catalogos', '🏷️ Catálogos'],
    ['banners',   '🖼️ Banners'],
    ['logo',      '🎨 Logo'],
    ['pedidos',   '🧾 Pedidos'],
    ['contatos',  '✉️ Mensagens']
  ];

  function telaPainel(){
    app.innerHTML = `
      <div class="adm-cabecalho">
        <h1>Administração <small>versão ${VERSAO}</small></h1>
        <div class="adm-acoes-topo">
          <a class="mini" href="#">Ver site</a>
          <button class="mini apagar" id="adm-sair">Sair</button>
        </div>
      </div>
      <nav class="adm-abas">
        ${ABAS.map(([id, rotulo]) =>
          `<button data-aba="${id}" class="${id === aba ? 'ativa' : ''}">${rotulo}</button>`).join('')}
      </nav>
      <p class="adm-recado" id="adm-recado"></p>
      <div class="adm-conteudo" id="adm-conteudo"><p class="adm-carregando">Carregando...</p></div>`;

    app.querySelectorAll('[data-aba]').forEach(b =>
      b.addEventListener('click', () => { aba = b.dataset.aba; telaPainel(); }));
    document.getElementById('adm-sair').addEventListener('click', async () => {
      await sb.auth.signOut(); sessao = null; desenhar();
    });

    ({ produtos: verProdutos, catalogos: verCatalogos, banners: verBanners,
       logo: verLogo, pedidos: verPedidos, contatos: verContatos })[aba]();
  }

  /* =======================================================
     PRODUTOS
     ======================================================= */
  async function verProdutos(){
    const [{ data: produtos, error }, { data: catalogos }] = await Promise.all([
      sb.from('produtos').select('*').order('nome'),
      sb.from('catalogos').select('id, nome').order('nome')
    ]);
    if(error) return alvo().innerHTML = aviso('Sem permissão para ler produtos: ' + esc(error.message));
    catalogosCache = catalogos || [];

    alvo().innerHTML = `
      <div class="adm-barra">
        <h2>Produtos (${produtos.length})</h2>
        <button class="btn" id="novo">+ Novo produto</button>
      </div>
      <div class="adm-tabela-rol">
      <table class="adm-tabela">
        <thead><tr>
          <th>Foto</th><th>Nome</th><th>Catálogo</th><th>Preço</th><th>Ícone</th><th>Ativo</th><th></th>
        </tr></thead>
        <tbody>${produtos.map(linhaProduto).join('')}</tbody>
      </table></div>
      <p class="adm-dica">Sem foto, o site desenha um ícone. Ícones disponíveis: ${Object.keys(ICONES).join(', ')}.</p>`;

    document.getElementById('novo').addEventListener('click', async () => {
      const { error } = await sb.from('produtos').insert({
        nome: 'Novo produto', categoria: 'Geral', preco: 0, icone: 'projetos', ativo: false
      });
      error ? recado('Erro: ' + error.message, 'erro') : verProdutos();
    });

    alvo().querySelectorAll('tbody tr').forEach(tr => {
      tr.querySelector('.salvar').addEventListener('click', () => salvarProduto(tr));
      tr.querySelector('.apagar').addEventListener('click', () => apagarProduto(tr));
      tr.querySelector('.trocar-foto').addEventListener('click', async () => {
        const url = await escolherImagem('produtos');
        if(!url) return;
        tr.querySelector('[data-c="img"]').value = url;
        tr.querySelector('.miniatura').innerHTML = `<img src="${url}" alt="">`;
      });
      tr.querySelector('.tirar-foto').addEventListener('click', () => {
        tr.querySelector('[data-c="img"]').value = '';
        tr.querySelector('.miniatura').innerHTML = '<span>sem foto</span>';
      });
    });
  }

  function linhaProduto(p){
    const opcoes = ['<option value="">— sem catálogo —</option>'].concat(
      catalogosCache.map(c => `<option value="${c.id}" ${c.id === p.catalogo_id ? 'selected' : ''}>${esc(c.nome)}</option>`)
    ).join('');
    return `<tr data-id="${p.id}">
      <td>
        <div class="miniatura">${p.img ? `<img src="${esc(p.img)}" alt="">` : '<span>sem foto</span>'}</div>
        <input type="hidden" data-c="img" value="${esc(p.img)}">
        <button class="mini trocar-foto">Trocar</button>
        <button class="mini tirar-foto">Tirar</button>
      </td>
      <td><input value="${esc(p.nome)}" data-c="nome"></td>
      <td><select data-c="catalogo_id">${opcoes}</select></td>
      <td><input value="${p.preco}" data-c="preco" type="number" step="0.01" class="curto"></td>
      <td><input value="${esc(p.icone)}" data-c="icone" class="curto"></td>
      <td class="meio"><input type="checkbox" data-c="ativo" ${p.ativo ? 'checked' : ''}></td>
      <td class="acoes"><button class="mini salvar">Salvar</button><button class="mini apagar">Apagar</button></td>
    </tr>`;
  }

  async function salvarProduto(tr){
    const v = c => tr.querySelector(`[data-c="${c}"]`);
    const catalogoId = v('catalogo_id').value ? Number(v('catalogo_id').value) : null;
    const nomeCat = catalogosCache.find(c => c.id === catalogoId)?.nome;
    const dados = {
      nome: v('nome').value.trim(),
      catalogo_id: catalogoId,
      categoria: nomeCat || 'Geral',
      preco: Number(v('preco').value) || 0,
      icone: v('icone').value.trim() || null,
      img: v('img').value.trim() || null,
      ativo: v('ativo').checked
    };
    const btn = tr.querySelector('.salvar');
    btn.textContent = '...';
    const { error } = await sb.from('produtos').update(dados).eq('id', tr.dataset.id);
    btn.textContent = error ? 'Erro' : 'Salvo ✓';
    if(error) recado('Erro: ' + error.message, 'erro');
    setTimeout(() => btn.textContent = 'Salvar', 1800);
  }

  async function apagarProduto(tr){
    const nome = tr.querySelector('[data-c="nome"]').value;
    if(!confirm(`Apagar "${nome}" definitivamente?\n\nPara só tirar do site, desmarque "Ativo".`)) return;
    const { error } = await sb.from('produtos').delete().eq('id', tr.dataset.id);
    error ? recado('Erro: ' + error.message, 'erro') : verProdutos();
  }

  /* =======================================================
     CATÁLOGOS
     ======================================================= */
  async function verCatalogos(){
    const { data, error } = await sb.from('catalogos').select('*').order('ordem').order('nome');
    if(error) return alvo().innerHTML = aviso('Sem permissão para ler catálogos: ' + esc(error.message));

    alvo().innerHTML = `
      <div class="adm-barra">
        <h2>Catálogos (${data.length})</h2>
        <button class="btn" id="novo-cat">+ Novo catálogo</button>
      </div>
      <div class="adm-tabela-rol">
      <table class="adm-tabela">
        <thead><tr><th>Imagem</th><th>Nome</th><th>Descrição</th><th>Ordem</th><th>Ativo</th><th></th></tr></thead>
        <tbody>${data.map(c => `
          <tr data-id="${c.id}">
            <td>
              <div class="miniatura">${c.img ? `<img src="${esc(c.img)}" alt="">` : '<span>sem foto</span>'}</div>
              <input type="hidden" data-c="img" value="${esc(c.img)}">
              <button class="mini trocar-foto">Trocar</button>
              <button class="mini tirar-foto">Tirar</button>
            </td>
            <td><input value="${esc(c.nome)}" data-c="nome"></td>
            <td><input value="${esc(c.descricao)}" data-c="descricao"></td>
            <td><input value="${c.ordem}" data-c="ordem" type="number" class="curto"></td>
            <td class="meio"><input type="checkbox" data-c="ativo" ${c.ativo ? 'checked' : ''}></td>
            <td class="acoes"><button class="mini salvar">Salvar</button><button class="mini apagar">Apagar</button></td>
          </tr>`).join('')}</tbody>
      </table></div>
      <p class="adm-dica">Os catálogos viram os filtros da loja. "Ordem" define a sequência (menor primeiro).</p>`;

    document.getElementById('novo-cat').addEventListener('click', async () => {
      const nome = prompt('Nome do novo catálogo:');
      if(!nome) return;
      const { error } = await sb.from('catalogos').insert({ nome: nome.trim() });
      error ? recado('Erro: ' + error.message, 'erro') : verCatalogos();
    });

    alvo().querySelectorAll('tbody tr').forEach(tr => {
      const v = c => tr.querySelector(`[data-c="${c}"]`);
      tr.querySelector('.trocar-foto').addEventListener('click', async () => {
        const url = await escolherImagem('catalogos');
        if(!url) return;
        v('img').value = url;
        tr.querySelector('.miniatura').innerHTML = `<img src="${url}" alt="">`;
      });
      tr.querySelector('.tirar-foto').addEventListener('click', () => {
        v('img').value = '';
        tr.querySelector('.miniatura').innerHTML = '<span>sem foto</span>';
      });
      tr.querySelector('.salvar').addEventListener('click', async () => {
        const btn = tr.querySelector('.salvar');
        btn.textContent = '...';
        const { error } = await sb.from('catalogos').update({
          nome: v('nome').value.trim(),
          descricao: v('descricao').value.trim() || null,
          img: v('img').value.trim() || null,
          ordem: Number(v('ordem').value) || 0,
          ativo: v('ativo').checked
        }).eq('id', tr.dataset.id);
        btn.textContent = error ? 'Erro' : 'Salvo ✓';
        if(error) recado('Erro: ' + error.message, 'erro');
        setTimeout(() => btn.textContent = 'Salvar', 1800);
      });
      tr.querySelector('.apagar').addEventListener('click', async () => {
        if(!confirm('Apagar este catálogo? Os produtos dele ficam sem catálogo, mas não são apagados.')) return;
        const { error } = await sb.from('catalogos').delete().eq('id', tr.dataset.id);
        error ? recado('Erro: ' + error.message, 'erro') : verCatalogos();
      });
    });
  }

  /* =======================================================
     BANNERS (o fundo do topo)
     ======================================================= */
  async function verBanners(){
    const { data, error } = await sb.from('banners').select('*').order('ordem').order('id');
    if(error) return alvo().innerHTML = aviso('Sem permissão para ler banners: ' + esc(error.message));

    alvo().innerHTML = `
      <div class="adm-barra">
        <h2>Banners do topo (${data.length})</h2>
        <button class="btn" id="novo-ban">+ Novo banner</button>
      </div>
      <div class="adm-banners">${data.map(b => `
        <article class="adm-banner" data-id="${b.id}">
          <div class="adm-banner-previa" style="${b.img
            ? `background-image:linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18)),url('${esc(b.img)}')`
            : `background-image:linear-gradient(135deg,${esc(b.cor_inicio)},${esc(b.cor_fim)})`}">
            <strong>${esc(b.titulo)}</strong>
            <span>${esc(b.subtitulo)}</span>
          </div>
          <input type="hidden" data-c="img" value="${esc(b.img)}">
          <div class="adm-banner-campos">
            <label>Título <input value="${esc(b.titulo)}" data-c="titulo"></label>
            <label>Subtítulo <input value="${esc(b.subtitulo)}" data-c="subtitulo"></label>
            <div class="dupla">
              <label>Cor inicial <input type="color" value="${esc(b.cor_inicio)}" data-c="cor_inicio"></label>
              <label>Cor final <input type="color" value="${esc(b.cor_fim)}" data-c="cor_fim"></label>
              <label>Ordem <input type="number" value="${b.ordem}" data-c="ordem" class="curto"></label>
              <label class="check">Ativo <input type="checkbox" data-c="ativo" ${b.ativo ? 'checked' : ''}></label>
            </div>
            <div class="adm-banner-acoes">
              <button class="mini trocar-foto">${b.img ? 'Trocar imagem' : 'Escolher imagem'}</button>
              <button class="mini tirar-foto">Usar só as cores</button>
              <button class="mini salvar">Salvar</button>
              <button class="mini apagar">Apagar</button>
            </div>
          </div>
        </article>`).join('')}</div>
      <p class="adm-dica">Com imagem, ela substitui o fundo azul. Sem imagem, vale o degradê entre as duas cores. PNG, JPG ou WEBP até 2 MB — o ideal é algo por volta de 1920×600.</p>`;

    document.getElementById('novo-ban').addEventListener('click', async () => {
      const { error } = await sb.from('banners').insert({ titulo: 'Novo banner', subtitulo: '', ordem: 99, ativo: false });
      error ? recado('Erro: ' + error.message, 'erro') : verBanners();
    });

    alvo().querySelectorAll('.adm-banner').forEach(card => {
      const v = c => card.querySelector(`[data-c="${c}"]`);
      const previa = card.querySelector('.adm-banner-previa');

      card.querySelector('.trocar-foto').addEventListener('click', async () => {
        const url = await escolherImagem('banners');
        if(!url) return;
        v('img').value = url;
        previa.style.backgroundImage = `linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18)),url('${url}')`;
      });
      card.querySelector('.tirar-foto').addEventListener('click', () => {
        v('img').value = '';
        previa.style.backgroundImage = `linear-gradient(135deg,${v('cor_inicio').value},${v('cor_fim').value})`;
      });
      card.querySelector('.salvar').addEventListener('click', async () => {
        const btn = card.querySelector('.salvar');
        btn.textContent = '...';
        const { error } = await sb.from('banners').update({
          titulo: v('titulo').value.trim(),
          subtitulo: v('subtitulo').value.trim(),
          img: v('img').value.trim() || null,
          cor_inicio: v('cor_inicio').value,
          cor_fim: v('cor_fim').value,
          ordem: Number(v('ordem').value) || 0,
          ativo: v('ativo').checked
        }).eq('id', card.dataset.id);
        btn.textContent = error ? 'Erro' : 'Salvo ✓';
        if(error) recado('Erro: ' + error.message, 'erro');
        setTimeout(() => btn.textContent = 'Salvar', 1800);
      });
      card.querySelector('.apagar').addEventListener('click', async () => {
        if(!confirm('Apagar este banner?')) return;
        const { error } = await sb.from('banners').delete().eq('id', card.dataset.id);
        error ? recado('Erro: ' + error.message, 'erro') : verBanners();
      });
    });
  }

  /* =======================================================
     LOGO E IDENTIDADE
     ======================================================= */
  async function verLogo(){
    const { data: cfg, error } = await sb.from('configuracoes').select('*').eq('id', 1).maybeSingle();
    if(error || !cfg) return alvo().innerHTML = aviso('Não consegui ler as configurações: ' + esc(error?.message || 'tabela vazia'));

    alvo().innerHTML = `
      <div class="adm-previa-topo">
        <p class="adm-previa-rotulo">Pré-visualização do topo do site</p>
        <div class="adm-previa-logo">
          <span id="previa-marca"></span>
          <strong id="previa-nome">${esc(cfg.nome_site)}</strong>
        </div>
      </div>

      <div class="adm-form-logo">
        <label class="bloco">Nome do site
          <input id="cfg-nome" value="${esc(cfg.nome_site)}">
        </label>
        <label class="bloco">Frase do banner
          <input id="cfg-tagline" value="${esc(cfg.tagline)}">
        </label>

        <p class="rotulo">Imagem da logo</p>
        <input type="hidden" id="cfg-logo" value="${esc(cfg.logo_url)}">
        <div class="adm-banner-acoes">
          <button class="mini" id="btn-logo">📷 Escolher imagem</button>
          <button class="mini apagar" id="btn-tirar-logo">Remover logo</button>
        </div>
        <p class="adm-dica">PNG, JPG ou WEBP, até 2 MB. PNG com fundo transparente fica melhor.</p>

        <p class="rotulo">Formato</p>
        <div class="adm-opcoes">
          <button class="opcao ${cfg.logo_formato === 'redondo' ? 'ativa' : ''}" data-formato="redondo">◔ Redondo</button>
          <button class="opcao ${cfg.logo_formato === 'quadrado' ? 'ativa' : ''}" data-formato="quadrado">▣ Quadrado</button>
          <button class="opcao ${cfg.logo_formato === 'larga' ? 'ativa' : ''}" data-formato="larga">▭ Larga</button>
        </div>
        <p class="adm-dica">
          <strong>Redondo</strong> recorta em círculo — só para símbolos quadrados.
          <strong>Quadrado</strong> encaixa a imagem inteira numa caixa.
          <strong>Larga</strong> é a certa para logos horizontais, nomes escritos e assinaturas: a largura se ajusta sozinha e nada é cortado.
        </p>

        <div class="dupla">
          <label class="bloco">Largura (px) <input type="number" id="cfg-larg" min="16" max="600" value="${cfg.logo_largura}"></label>
          <label class="bloco">Altura (px) <input type="number" id="cfg-alt" min="16" max="200" value="${cfg.logo_altura}"></label>
        </div>
        <p class="adm-dica">No formato Larga, a largura vira apenas um limite máximo — ajuste a altura (algo entre 44 e 70 costuma ficar bom) e deixe a largura folgada, tipo 260.</p>

        <div class="adm-banner-acoes">
          <button class="btn" id="salvar-logo">Salvar logo</button>
          <button class="mini" id="descartar-logo">Descartar alterações</button>
        </div>
      </div>`;

    let formato = cfg.logo_formato;
    const el = id => document.getElementById(id);

    function atualizarPrevia(){
      const url = el('cfg-logo').value;
      const larg = Number(el('cfg-larg').value) || 56;
      const alt  = Number(el('cfg-alt').value) || 56;
      const marca = el('previa-marca');
      el('previa-nome').textContent = el('cfg-nome').value || 'Recuerdos';
      const est = estiloLogo({ logo_formato: formato, logo_largura: larg, logo_altura: alt });
      const css = Object.entries(est)
        .map(([p, v]) => p.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ':' + v)
        .join(';');
      marca.innerHTML = url
        ? `<img src="${esc(url)}" alt="" title="Clique para ampliar" style="cursor:zoom-in;${css}">`
        : `<span class="sem-logo" style="width:${larg}px;height:${alt}px;border-radius:${formato === 'redondo' ? '50%' : '8px'}"></span>`;
      const foto = marca.querySelector('img');
      if(foto) foto.addEventListener('click', () => Lightbox.abrir(foto.src, 'Logo'));
    }

    ['cfg-nome','cfg-larg','cfg-alt'].forEach(id => el(id).addEventListener('input', atualizarPrevia));
    alvo().querySelectorAll('.opcao').forEach(b => b.addEventListener('click', () => {
      formato = b.dataset.formato;
      alvo().querySelectorAll('.opcao').forEach(o => o.classList.toggle('ativa', o === b));
      atualizarPrevia();
    }));
    el('btn-logo').addEventListener('click', async () => {
      const url = await escolherImagem('logo');
      if(!url) return;
      el('cfg-logo').value = url;
      atualizarPrevia();
    });
    el('btn-tirar-logo').addEventListener('click', () => { el('cfg-logo').value = ''; atualizarPrevia(); });
    el('descartar-logo').addEventListener('click', verLogo);

    el('salvar-logo').addEventListener('click', async () => {
      const larg = Math.min(600, Math.max(16, Number(el('cfg-larg').value) || 56));
      const alt  = Math.min(200, Math.max(16, Number(el('cfg-alt').value) || 56));
      const { error } = await sb.from('configuracoes').update({
        nome_site: el('cfg-nome').value.trim() || 'Recuerdos',
        tagline: el('cfg-tagline').value.trim(),
        logo_url: el('cfg-logo').value.trim() || null,
        logo_formato: formato,
        logo_largura: larg,
        logo_altura: alt,
        atualizado_em: new Date().toISOString()
      }).eq('id', 1);
      recado(error ? 'Erro: ' + error.message : 'Logo salva. Recarregue o site para ver.', error ? 'erro' : 'ok');
    });

    atualizarPrevia();
  }

  /* =======================================================
     PEDIDOS
     ======================================================= */
  async function verPedidos(){
    const { data, error } = await sb
      .from('pedidos')
      .select('*, pedido_itens(produto_nome, quantidade, preco_unitario)')
      .order('criado_em', { ascending: false })
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

    alvo().querySelectorAll('.adm-card').forEach(c =>
      c.querySelector('.status').addEventListener('change', async e => {
        const { error } = await sb.from('pedidos').update({ status: e.target.value }).eq('id', c.dataset.id);
        recado(error ? 'Erro: ' + error.message : 'Status atualizado.', error ? 'erro' : 'ok');
      }));
  }

  /* =======================================================
     MENSAGENS
     ======================================================= */
  async function verContatos(){
    const { data, error } = await sb.from('contatos').select('*').order('criado_em', { ascending: false }).limit(200);
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
