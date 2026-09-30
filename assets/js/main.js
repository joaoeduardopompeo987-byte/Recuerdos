/* =========================================================
   Recuerdos — comportamentos da página
   ========================================================= */

/* ---- Menu mobile ---- */
(function(){
  const btn = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if(!btn || !nav) return;
  btn.addEventListener('click', () => {
    const aberto = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', aberto);
  });
  nav.addEventListener('click', e => {
    if(e.target.tagName === 'A') nav.classList.remove('open');
  });
})();

/* ---- Visualizador de imagem em tela cheia ---- */
const Lightbox = (() => {
  let caixa;

  function montar(){
    caixa = document.createElement('div');
    caixa.className = 'lightbox';
    caixa.hidden = true;
    caixa.innerHTML = `
      <button class="lightbox-fechar" aria-label="Fechar">&times;</button>
      <img alt="">`;
    document.body.appendChild(caixa);

    caixa.addEventListener('click', e => {
      if(e.target === caixa || e.target.closest('.lightbox-fechar')) fechar();
    });
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && !caixa.hidden) fechar();
    });
  }

  function abrir(src, alt){
    if(!caixa) montar();
    const img = caixa.querySelector('img');
    img.src = src;
    img.alt = alt || '';
    caixa.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function fechar(){
    caixa.hidden = true;
    document.body.style.overflow = '';
  }

  return { abrir, fechar };
})();

/* ---- Como a logo se encaixa no topo, conforme o formato escolhido ----
   redondo  : recorta em círculo (bom para símbolos quadrados)
   quadrado : cabe inteira dentro da caixa, cantos arredondados
   larga    : só a altura manda; a largura se ajusta sozinha (bom para
              logos horizontais, assinaturas e nomes escritos)          */
function estiloLogo(cfg){
  const larg = cfg.logo_largura + 'px';
  const alt  = cfg.logo_altura + 'px';
  if(cfg.logo_formato === 'larga')
    return { height: alt, width: 'auto', maxWidth: larg, objectFit: 'contain', borderRadius: '0' };
  if(cfg.logo_formato === 'quadrado')
    return { height: alt, width: larg, objectFit: 'contain', borderRadius: '8px' };
  return { height: alt, width: larg, objectFit: 'cover', borderRadius: '50%' };
}

/* ---- Identidade do site: logo, nome e frase (vêm do painel) ---- */
(async function(){
  if(typeof DB === 'undefined' || !DB.ativo) return;
  const cfg = await DB.obterConfig();
  if(!cfg) return;

  document.querySelectorAll('.logo-text').forEach(el => el.textContent = cfg.nome_site);
  const frase = document.querySelector('.hero-tagline');
  if(frase && cfg.tagline) frase.textContent = cfg.tagline;

  if(cfg.logo_url){
    document.querySelectorAll('.logo-mark').forEach(marca => {
      const img = new Image();
      img.src = cfg.logo_url;
      img.alt = cfg.nome_site;
      Object.assign(img.style, estiloLogo(cfg));
      marca.replaceChildren(img);
      marca.classList.add('amplia');
      marca.title = 'Clique para ver a logo ampliada';
    });
  }

  /* clicar na logo abre a imagem grande, em vez de navegar */
  document.querySelectorAll('.logo-mark.amplia').forEach(marca => {
    marca.addEventListener('click', e => {
      const img = marca.querySelector('img');
      if(!img) return;
      e.preventDefault();
      e.stopPropagation();
      Lightbox.abrir(img.src, img.alt);
    });
  });
})();

/* ---- Carrossel do hero ---- */
(async function(){
  const slider = document.getElementById('slider');
  if(!slider) return;
  const trilho = slider.querySelector('.slides');
  const dots   = document.getElementById('dots');

  /* Se houver banners cadastrados no painel, eles substituem os fixos. */
  if(typeof DB !== 'undefined' && DB.ativo){
    const banners = await DB.listarBanners();
    if(banners.length){
      trilho.innerHTML = banners.map(b => {
        const fundo = b.img
          ? `background-image:linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18)),url('${b.img}')`
          : `background-image:linear-gradient(135deg,${b.cor_inicio},${b.cor_fim})`;
        return `<div class="slide" style="${fundo}">
          <div class="slide-content">
            ${b.titulo ? `<h2>${b.titulo}</h2>` : ''}
            ${b.subtitulo ? `<p>${b.subtitulo}</p>` : ''}
          </div>
        </div>`;
      }).join('');
      dots.innerHTML = '';
    }
  }

  const total = trilho.children.length;
  if(!total) return;
  let atual = 0, timer;

  for(let i = 0; i < total; i++){
    const d = document.createElement('button');
    d.setAttribute('aria-label', 'Slide ' + (i + 1));
    d.addEventListener('click', () => ir(i));
    dots.appendChild(d);
  }

  function ir(i){
    atual = (i + total) % total;
    trilho.style.transform = `translateX(-${atual * 100}%)`;
    [...dots.children].forEach((d, k) => d.classList.toggle('active', k === atual));
    reiniciar();
  }
  function reiniciar(){
    clearInterval(timer);
    timer = setInterval(() => ir(atual + 1), 6000);
  }

  slider.querySelector('.prev').addEventListener('click', () => ir(atual - 1));
  slider.querySelector('.next').addEventListener('click', () => ir(atual + 1));
  ir(0);
})();

/* ---- Grade de produtos da home ---- */
(function(){
  const grid = document.getElementById('prod-grid');
  if(!grid || typeof CATALOGO_PRONTO === 'undefined') return;
  const pintar = () => {
    grid.innerHTML = PRODUTOS.map(p => `
      <a class="prod-card" href="loja.html#${p.id}">
        ${arteProduto(p)}
        <span>${p.nome}</span>
      </a>`).join('');
  };
  pintar();                       // mostra o catálogo local na hora
  CATALOGO_PRONTO.then(pintar);   // e repinta se o Supabase responder
})();

/* ---- Formulário de contato: grava no Supabase (ou abre o e-mail) ---- */
(function(){
  const form = document.getElementById('form-contato');
  if(!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('form-msg');
    if(!form.checkValidity()){
      msg.textContent = 'Preencha nome, e-mail e mensagem.';
      return;
    }
    const d = new FormData(form);
    const dados = {
      nome:     d.get('nome'),
      email:    d.get('email'),
      telefone: d.get('telefone'),
      mensagem: d.get('mensagem')
    };

    if(DB.ativo){
      msg.textContent = 'Enviando...';
      const ok = await DB.criarContato(dados);
      msg.textContent = ok
        ? 'Mensagem enviada! Retornaremos em breve.'
        : 'Não foi possível enviar agora. Tente pelo WhatsApp.';
      if(ok) form.reset();
      return;
    }

    const corpo = `Nome: ${dados.nome}\nE-mail: ${dados.email}\nTelefone: ${dados.telefone}\n\n${dados.mensagem}`;
    window.location.href = `mailto:contato@recuerdos.com.br?subject=${encodeURIComponent('Contato pelo site')}&body=${encodeURIComponent(corpo)}`;
    msg.textContent = 'Abrindo seu programa de e-mail...';
    form.reset();
  });
})();

/* ---- Ano do rodapé ---- */
(function(){
  const ano = document.getElementById('ano');
  if(ano) ano.textContent = new Date().getFullYear();
})();
