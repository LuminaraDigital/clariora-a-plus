/** Upstream AI provider adapters for the coach gateway. */
export async function executeNvidiaNim(userMessage, systemPrompt, model, env) {
  if (!env.NVIDIA_API_KEY) return null;
  const targetModel = model || 'meta/llama-3.1-70b-instruct';

  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'nvidia',
        raw: data
      };
    }
  } catch (e) {
    console.warn('NVIDIA NIM call failed:', e.message);
  }
  return null;
}

/**
 * Private Self-Hosted Ollama Provider
 */
export async function executeOllama(userMessage, systemPrompt, model, env) {
  // Cloudflare Workers cannot reach host localhost; only call a remote endpoint.
  const endpoint = env.OLLAMA_ENDPOINT;
  if (!endpoint) return null;
  const endpointLower = String(endpoint).toLowerCase();
  if (
    endpointLower.includes('127.0.0.1') ||
    endpointLower.includes('localhost') ||
    endpointLower.includes('169.254.') ||
    endpointLower.includes('metadata.google.internal')
  ) {
    return null;
  }
  const targetModel = model || env.OLLAMA_MODEL || 'deepseek-r1:8b';

  const headers = { 'Content-Type': 'application/json' };
  if (env.OLLAMA_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${env.OLLAMA_AUTH_TOKEN}`;
  }

  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'ollama',
        raw: data
      };
    }
  } catch (e) {
    console.warn('Ollama call failed:', e.message);
  }
  return null;
}

/**
 * OpenRouter Multi-Model Provider
 */
export async function executeOpenRouter(userMessage, systemPrompt, model, env) {
  if (!env.OPENROUTER_API_KEY) return null;
  const targetModel = model || 'anthropic/claude-3.5-sonnet';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://clariora.com.au',
        'X-Title': 'Clariora A+'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'openrouter',
        raw: data
      };
    }
  } catch (e) {
    console.warn('OpenRouter call failed:', e.message);
  }
  return null;
}

/**
 * Groq Cloud Free Tier Provider
 */
export async function executeGroq(userMessage, systemPrompt, model, env) {
  if (!env.GROQ_API_KEY) return null;
  const targetModel = model || 'llama-3.1-8b-instant';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 350
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'groq',
        raw: data
      };
    }
  } catch (e) {
    console.warn('Groq call failed:', e.message);
  }
  return null;
}

/**
 * Cloudflare Workers AI Native Edge Fallback
 */
export async function executeWorkersAi(userMessage, systemPrompt, env) {
  if (!env.AI) return null;
  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 350
    });
    return {
      text: response.response,
      model: '@cf/meta/llama-3.1-8b-instruct',
      provider: 'workers_ai'
    };
  } catch (e) {
    console.warn('Workers AI call failed:', e.message);
  }
  return null;
}

