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

/* ---- Carrossel do hero ---- */
(function(){
  const slider = document.getElementById('slider');
  if(!slider) return;
  const trilho = slider.querySelector('.slides');
  const total  = trilho.children.length;
  const dots   = document.getElementById('dots');
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
