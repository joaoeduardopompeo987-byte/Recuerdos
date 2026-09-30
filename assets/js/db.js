/* =========================================================
   Camada de dados — fala com o Supabase.
   Se as chaves não estiverem preenchidas em supabase-config.js,
   tudo cai no modo local (catálogo de produtos.js) sem quebrar.
   ========================================================= */
const DB = (() => {
  const ativo = Boolean(
    typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
    typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY &&
    window.supabase
  );

  const cliente = ativo
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  /** Busca os produtos publicados. Devolve [] se estiver offline/local. */
  async function listarProdutos(){
    if(!cliente) return [];
    const { data, error } = await cliente
      .from('produtos')
      .select('id, nome, categoria, preco, icone, img, ativo')
      .eq('ativo', true)
      .order('nome');
    if(error){ console.warn('[Supabase] produtos:', error.message); return []; }
    return (data || []).map(p => ({ ...p, id: String(p.id), preco: Number(p.preco) }));
  }

  /** Grava um pedido com seus itens. Devolve o id do pedido ou null. */
  async function criarPedido({ cliente: dados, itens, total }){
    if(!cliente) return null;
    const { data: pedido, error } = await cliente
      .from('pedidos')
      .insert({
        cliente_nome:     dados.nome     || null,
        cliente_telefone: dados.telefone || null,
        cliente_email:    dados.email    || null,
        total,
        status: 'novo'
      })
      .select('id')
      .single();
    if(error){ console.warn('[Supabase] pedido:', error.message); return null; }

    const linhas = itens.map(i => ({
      pedido_id:      pedido.id,
      produto_id:     isNaN(Number(i.id)) ? null : Number(i.id),
      produto_nome:   i.nome,
      quantidade:     i.qtd,
      preco_unitario: i.preco
    }));
    const { error: erroItens } = await cliente.from('pedido_itens').insert(linhas);
    if(erroItens) console.warn('[Supabase] itens:', erroItens.message);
    return pedido.id;
  }

  /** Grava uma mensagem do formulário de contato. */
  async function criarContato(dados){
    if(!cliente) return false;
    const { error } = await cliente.from('contatos').insert(dados);
    if(error){ console.warn('[Supabase] contato:', error.message); return false; }
    return true;
  }

  return { ativo, cliente, listarProdutos, criarPedido, criarContato };
})();
