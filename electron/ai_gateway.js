/** electron/ai_gateway.js - Desktop AI chat proxy. */
'use strict';

const AI_PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    allowedHost: 'api.groq.com',
    defaultModel: 'qwen/qwen3.8-27b',
    isLocal: false,
    requiresKey: true
  },
  ollama: {
    id: 'ollama',
    name: 'Private Ollama (LAN/Air-gapped)',
    url: 'http://localhost:11434/v1/chat/completions',
    allowedHost: null,
    defaultModel: 'deepseek-r1:latest',
    isLocal: true,
    requiresKey: false
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    allowedHost: 'integrate.api.nvidia.com',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    isLocal: false,
    requiresKey: true
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter Multi-Model',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    allowedHost: 'openrouter.ai',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    isLocal: false,
    requiresKey: true
  }
};

function isLocalOrPrivateHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  // Block Cloud Metadata Services & Link-Local SSRF vectors
  if (h === '169.254.169.254' || h.startsWith('169.254.') || h === 'metadata.google.internal' || h === '100.100.100.200') {
    return false;
  }
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.corp')) return true;
  if (h.endsWith('.internal') && h !== 'metadata.google.internal') return true;
  return false;
}

function createAiGateway(deps) {
  const writeLog = deps.writeLog;
  const loadEnterprisePolicy = deps.loadEnterprisePolicy;
  const GROQ_CHAT_URL = deps.GROQ_CHAT_URL;
  const GROQ_ALLOWED_HOST = deps.GROQ_ALLOWED_HOST;

async function handleAiChat(payload) {
  try {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      writeLog('warn', 'ai:chat rejected non-object payload');
      return { ok: false, error: 'invalid_payload' };
    }

    const providerId = (typeof payload.provider === 'string' && payload.provider.trim().toLowerCase()) || 'groq';
    const providerCfg = AI_PROVIDERS[providerId];
    if (!providerCfg) {
      writeLog('warn', `ai:chat rejected unknown provider: ${providerId}`);
      return { ok: false, error: 'unknown_provider' };
    }

    const policy = loadEnterprisePolicy();

    // Enterprise policy enforcement
    if (policy.offlineOnly && !providerCfg.isLocal) {
      writeLog('warn', `ai:chat blocked external provider ${providerId} due to offlineOnly policy`);
      return {
        ok: false,
        error: 'policy_offline_only',
        message: 'External AI access is disabled by organizational policy.'
      };
    }
    if (policy.disableExternalAi && !providerCfg.isLocal) {
      writeLog('warn', `ai:chat blocked external provider ${providerId} due to disableExternalAi policy`);
      return {
        ok: false,
        error: 'policy_external_ai_disabled',
        message: 'External cloud AI is disabled. Use local/air-gapped Ollama.'
      };
    }
    if (Array.isArray(policy.allowedAiProviders) && !policy.allowedAiProviders.includes(providerId)) {
      writeLog('warn', `ai:chat provider ${providerId} not permitted by allowedAiProviders policy`);
      return {
        ok: false,
        error: 'provider_not_allowed_by_policy',
        message: `Provider "${providerId}" is not allowed by organizational policy.`
      };
    }

    const apiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
    if (providerCfg.requiresKey) {
      if (!apiKey) {
        return { ok: false, error: 'missing_api_key' };
      }
      if (apiKey.length < 10 || apiKey.length > 512) {
        writeLog('warn', `ai:chat rejected API key with invalid bounds for ${providerId}`);
        return { ok: false, error: 'invalid_api_key' };
      }
    }

    // Determine endpoint URL
    let endpointUrl = providerCfg.url;
    if (providerId === 'ollama') {
      const base = (policy.ollamaBaseUrl || payload.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
      endpointUrl = base + '/v1/chat/completions';
    }

    // Endpoint security validation
    const parsedEndpoint = new URL(endpointUrl);
    if (providerCfg.allowedHost) {
      if (parsedEndpoint.protocol !== 'https:' || parsedEndpoint.hostname !== providerCfg.allowedHost) {
        writeLog('error', `ai:chat blocked non-allowlisted endpoint for ${providerId}: ${endpointUrl}`);
        return { ok: false, error: 'blocked_endpoint' };
      }
    } else if (providerId === 'ollama') {
      if (!isLocalOrPrivateHost(parsedEndpoint.hostname)) {
        writeLog('error', `ai:chat blocked non-local host for ollama: ${parsedEndpoint.hostname}`);
        return { ok: false, error: 'blocked_endpoint', message: 'Ollama host must be local or private LAN.' };
      }
    }

    if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > 50) {
      writeLog('warn', 'ai:chat rejected invalid messages list');
      return { ok: false, error: 'invalid_messages' };
    }
    for (const msg of payload.messages) {
      if (!msg || typeof msg !== 'object' || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
        writeLog('warn', 'ai:chat rejected malformed message item');
        return { ok: false, error: 'malformed_message_entry' };
      }
      if (msg.content.length > 65536) {
        writeLog('warn', 'ai:chat rejected message exceeding 64KB');
        return { ok: false, error: 'message_too_large' };
      }
      if (/(?:ignore|bypass|override)\s+(?:all\s+)?(?:previous|prior|above|system)\s+instructions?/i.test(msg.content)) {
        writeLog('warn', 'ai:chat rejected adversarial prompt injection attempt');
        return { ok: false, error: 'prompt_injection_rejected', message: 'Query rejected due to instruction override markers.' };
      }
    }

    const model = typeof payload.model === 'string' && payload.model.trim()
      ? payload.model.trim()
      : providerCfg.defaultModel;
    if (model.length > 128 || !/^[a-zA-Z0-9_.:\-\/]+$/.test(model)) {
      writeLog('warn', 'ai:chat rejected invalid model identifier');
      return { ok: false, error: 'invalid_model' };
    }

    const temperature = typeof payload.temperature === 'number' && Number.isFinite(payload.temperature)
      ? Math.max(0, Math.min(2, payload.temperature))
      : 0.2;
    const max_tokens = typeof payload.max_tokens === 'number' && Number.isFinite(payload.max_tokens)
      ? Math.max(1, Math.min(4096, Math.floor(payload.max_tokens)))
      : 220;

    const body = {
      model: model,
      messages: payload.messages,
      temperature: temperature,
      max_tokens: max_tokens
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = 'Bearer ' + apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let res;
    try {
      res = await fetch(endpointUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      writeLog('warn', `${providerId} http ${res.status} model=${body.model}`);
      return {
        ok: false,
        provider: providerId,
        error: (data && data.error && (data.error.message || data.error)) || ('http_' + res.status),
        raw: data
      };
    }

    let content = data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '').trim()
      : '';

    // Cybersecurity Guard: Redact credentials or dangerous payloads from desktop response
    content = content
      .replace(/gsk_[a-zA-Z0-9]{20,}/g, '[REDACTED_CREDENTIAL]')
      .replace(/nvapi-[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_CREDENTIAL]')
      .replace(/sk-or-v1-[a-zA-Z0-9]{20,}/g, '[REDACTED_CREDENTIAL]')
      .replace(/sk-[a-zA-Z0-9_\-]{24,}/g, '[REDACTED_CREDENTIAL]');

    return {
      ok: true,
      provider: providerId,
      content: content,
      model: body.model,
      raw: data
    };
  } catch (err) {
    const isTimeout = err && (err.name === 'AbortError' || err.code === 'ETIMEDOUT');
    const errMsg = isTimeout ? 'request_timeout' : ((err && err.message) || 'ai_ipc_error');
    writeLog('warn', `ai:chat request failed: ${errMsg}`);
    return { ok: false, error: errMsg };
  }
}


  return { AI_PROVIDERS, isLocalOrPrivateHost, handleAiChat };
}

module.exports = { createAiGateway, AI_PROVIDERS, isLocalOrPrivateHost };
