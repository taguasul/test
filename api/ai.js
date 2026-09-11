module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    const quote = body.quote || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });

    const context = {
      cliente: quote.client || '',
      vendedor: quote.seller || '',
      status: quote.status || '',
      pagamento: quote.payment || '',
      prazo: quote.deadline || '',
      validade: quote.validity || '',
      desconto: quote.discount || 0,
      itens: Array.isArray(quote.items) ? quote.items : []
    };

    const instructions = `Você é o Assistente de Orçamentos da Taguasul Comunicação Visual, empresa de Brasília/DF. Ajude vendedores a montar propostas comerciais claras, técnicas e objetivas. Trabalhe com serviços de comunicação visual como fachadas em ACM e lona, letras caixa, acrílico, PVC, adesivação, envelopamento, totens, placas e luminosos. Não invente medidas, materiais, preços ou prazos que não tenham sido informados. Quando sugerir valores, deixe claro que são referências a validar internamente. Escreva em português do Brasil e prefira textos prontos para copiar na proposta.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        instructions,
        input: `CONTEXTO DA PROPOSTA:\n${JSON.stringify(context, null, 2)}\n\nPEDIDO DO VENDEDOR:\n${prompt}`
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'Erro na OpenAI API.' });
    const text = (data.output || []).flatMap(item => item.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('\n').trim();
    return res.status(200).json({ text: text || 'Não foi possível gerar uma resposta.' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro interno.' });
  }
};