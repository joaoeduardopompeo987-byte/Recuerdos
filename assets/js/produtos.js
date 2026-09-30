/* =========================================================
   Catálogo de produtos — edite aqui para mudar o site todo.
   Cada item: nome, categoria, preco (R$) e o ícone (SVG).
   Para usar foto no lugar do ícone, preencha "img":
   { nome:'Caneca', img:'assets/img/caneca.jpg', ... }
   ========================================================= */
const ICONES = {
  caneca:'<path d="M4 7h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 9h2a3 3 0 0 1 0 6h-2"/><path d="M7 4c0-1 1-1 1-2M11 4c0-1 1-1 1-2"/>',
  moleskine:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 3v18"/>',
  portacopos:'<circle cx="13" cy="10" r="6"/><path d="M6 15c0 2 3 4 7 4s7-2 7-4"/><path d="M6 18c0 2 3 3 7 3"/>',
  globo:'<circle cx="12" cy="10" r="7"/><path d="M5 19h14l-1 3H6z"/><path d="M12 7l2 4h-4z"/>',
  portaretrato:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l4-4 3 3 3-3 6 5"/>',
  metal:'<path d="M4 20V9l8-5 8 5v11z"/><path d="M8 20v-5h3v5M14 20v-5h2v5"/><path d="M4 9h16"/>',
  abridor:'<path d="M14 3l7 7-9 9-7-7z"/><circle cx="16" cy="8" r="1.4"/><path d="M5 12l-2 2 5 5 2-2"/>',
  chaveiro:'<rect x="6" y="8" width="9" height="11" rx="2"/><circle cx="10.5" cy="12" r="1.8"/><path d="M10.5 14v3"/><path d="M13 8V6a3 3 0 0 1 6 0v2"/>',
  projetos:'<path d="M3 6c4-2 8 2 12 0l6 3-6 3c-4 2-8-2-12 0z"/><circle cx="17" cy="15" r="3"/><path d="M19 17l3 3"/>',
  corporativo:'<circle cx="12" cy="4" r="2"/><path d="M10 6h4l-1 3 2 9-3 2-3-2 2-9z"/>',
  shot:'<path d="M7 5h10l-1.5 14h-7z"/><path d="M7.6 11h8.8"/>',
  garrafa:'<path d="M10 2h4v3l2 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-3z"/><path d="M8 12h8"/>',
  placa:'<rect x="2" y="7" width="20" height="11" rx="2"/><path d="M6 12h12"/><circle cx="4.5" cy="9.5" r=".6"/><circle cx="19.5" cy="9.5" r=".6"/>',
  ima:'<path d="M6 4h4v8a2 2 0 0 0 4 0V4h4v8a6 6 0 0 1-12 0z"/><path d="M6 9h4M14 9h4"/>'
};

const PRODUTOS_PADRAO = [
  { nome:'Canecas',            categoria:'Cozinha',    preco: 39.90, icone:'caneca' },
  { nome:'Moleskine',          categoria:'Papelaria',  preco: 54.90, icone:'moleskine' },
  { nome:'Porta copos',        categoria:'Casa',       preco: 24.90, icone:'portacopos' },
  { nome:'Globo de neve',      categoria:'Decoração',  preco: 79.90, icone:'globo' },
  { nome:'Porta retratos',     categoria:'Decoração',  preco: 64.90, icone:'portaretrato' },
  { nome:'Metais esmaltados',  categoria:'Decoração',  preco: 49.90, icone:'metal' },
  { nome:'Abridores',          categoria:'Cozinha',    preco: 29.90, icone:'abridor' },
  { nome:'Chaveiros',          categoria:'Acessórios', preco: 19.90, icone:'chaveiro' },
  { nome:'Projetos especiais', categoria:'Corporativo',preco:129.90, icone:'projetos' },
  { nome:'Corporativo',        categoria:'Corporativo',preco: 99.90, icone:'corporativo' },
  { nome:'Copos Shot',         categoria:'Cozinha',    preco: 22.90, icone:'shot' },
  { nome:'Garrafas',           categoria:'Cozinha',    preco: 89.90, icone:'garrafa' },
  { nome:'Placas',             categoria:'Decoração',  preco: 44.90, icone:'placa' },
  { nome:'Imã MDF',            categoria:'Acessórios', preco: 14.90, icone:'ima' }
];

/* id estável para o carrinho */
PRODUTOS_PADRAO.forEach((p, i) => p.id = 'p' + (i + 1));

/* Catálogo em uso: começa local e é trocado pelo do Supabase, se houver. */
let PRODUTOS = PRODUTOS_PADRAO;

/** Promessa resolvida quando o catálogo definitivo está carregado.
 *  As páginas fazem: CATALOGO_PRONTO.then(render) */
const CATALOGO_PRONTO = (async () => {
  try {
    const remoto = await DB.listarProdutos();
    if(remoto.length) PRODUTOS = remoto;
  } catch(e){
    console.warn('Catálogo remoto indisponível, usando o local.', e);
  }
  return PRODUTOS;
})();

/** Devolve o HTML da arte do produto (foto se existir, senão ícone). */
function arteProduto(p){
  return p.img
    ? `<img src="${p.img}" alt="${p.nome}">`
    : `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[p.icone] || ICONES.projetos}</svg>`;
}

/** Preço no formato brasileiro. */
function precoBR(v){
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}
