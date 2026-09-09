/**
 * Clariora Exam Simulator v3.0.0
 * groq-client.js - Groq chat client for ghost-coach background polish
 *
 * Key sources (first match wins):
 * 1) APlus.storage "groq_api_key"
 * 2) window.APLUS_GROQ_CONFIG.apiKey (from groq-secrets.local.js)
 * 3) window.electronAPI env bridge (optional)
 *
 * Transport:
 * - Desktop: electronAPI.groq.chat (main-process HTTPS, avoids CORS)
 * - Browser: fetch to https://api.groq.com/openai/v1/chat/completions
 */

(function (window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
  const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

  function readConfig() {
    const fromWindow = window.APLUS_GROQ_CONFIG || {};
    let storedKey = null;
    let storedModel = null;
    let storedEnabled = null;
    try {
      if (APlus.storage) {
        storedKey = APlus.storage.get('groq_api_key', null);
        storedModel = APlus.storage.get('groq_model', null);
        storedEnabled = APlus.storage.get('groq_enabled', null);
      }
    } catch (_) {}

    const apiKey = String(storedKey || fromWindow.apiKey || '').trim();
    const model = String(storedModel || fromWindow.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
    const enabled = storedEnabled === null || storedEnabled === undefined
      ? (fromWindow.enabled !== false)
      : Boolean(storedEnabled);

    return { apiKey, model, enabled };
  }

  function hasKey() {
    return Boolean(readConfig().apiKey);
  }

  function isEnabled() {
    const cfg = readConfig();
    return cfg.enabled && Boolean(cfg.apiKey);
  }

  function persistFromLocalFileIfNeeded() {
    const fromWindow = window.APLUS_GROQ_CONFIG || {};
    if (!fromWindow.apiKey || !APlus.storage) return;
    const existing = APlus.storage.get('groq_api_key', null);
    if (!existing) {
      APlus.storage.set('groq_api_key', String(fromWindow.apiKey).trim());
    }
    if (fromWindow.model) {
      APlus.storage.set('groq_model', String(fromWindow.model).trim());
    }
    if (fromWindow.enabled === false) {
      APlus.storage.set('groq_enabled', false);
    } else if (APlus.storage.get('groq_enabled', null) === null) {
      APlus.storage.set('groq_enabled', true);
    }
  }

  async function chatCompletions(messages, options) {
    const cfg = readConfig();
    if (!cfg.enabled) {
      return { ok: false, error: 'groq_disabled', content: null };
    }
    if (!cfg.apiKey) {
      return { ok: false, error: 'missing_api_key', content: null };
    }

    const opts = options || {};
    const model = opts.model || cfg.model || DEFAULT_MODEL;
    const payload = {
      model: model,
      messages: messages || [],
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.2,
      max_tokens: typeof opts.max_tokens === 'number' ? opts.max_tokens : 220
    };

    try {
      if (window.electronAPI && window.electronAPI.groq && typeof window.electronAPI.groq.chat === 'function') {
        const result = await window.electronAPI.groq.chat({
          apiKey: cfg.apiKey,
          ...payload
        });
        if (!result || result.ok === false) {
          return {
            ok: false,
            error: (result && result.error) || 'electron_groq_failed',
            content: null,
            raw: result
          };
        }
        return {
          ok: true,
          content: result.content || '',
          model: result.model || model,
          raw: result.raw || null
        };
      }

      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + cfg.apiKey
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          error: (data && data.error && data.error.message) || ('http_' + res.status),
          content: null,
          raw: data
        };
      }

      const content = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';

      return { ok: true, content: String(content || '').trim(), model: model, raw: data };
    } catch (err) {
      return {
        ok: false,
        error: (err && err.message) || 'network_error',
        content: null
      };
    }
  }

  async function completeJson(systemPrompt, userPrompt, options) {
    const result = await chatCompletions([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], options);

    if (!result.ok) return result;

    let text = String(result.content || '').trim();
    // Strip common markdown fences
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    try {
      return { ok: true, data: JSON.parse(text), content: text, model: result.model };
    } catch (_) {
      return { ok: false, error: 'invalid_json', content: text, data: null };
    }
  }

  function setApiKey(key) {
    if (!APlus.storage) return false;
    APlus.storage.set('groq_api_key', String(key || '').trim());
    return true;
  }

  function setEnabled(on) {
    if (!APlus.storage) return false;
    APlus.storage.set('groq_enabled', Boolean(on));
    return true;
  }

  function status() {
    const cfg = readConfig();
    return {
      configured: Boolean(cfg.apiKey),
      enabled: cfg.enabled,
      model: cfg.model,
      transport: (window.electronAPI && window.electronAPI.groq) ? 'electron-ipc' : 'fetch'
    };
  }

  function init() {
    persistFromLocalFileIfNeeded();
  }

  APlus.groq = {
    init: init,
    chatCompletions: chatCompletions,
    completeJson: completeJson,
    hasKey: hasKey,
    isEnabled: isEnabled,
    setApiKey: setApiKey,
    setEnabled: setEnabled,
    status: status,
    readConfig: readConfig,
    DEFAULT_MODEL: DEFAULT_MODEL
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
