/**
 * Default Groq config (no secrets). Ghost Coach reads this when no key is stored.
 * For a local key, set it in the app UI (persisted via storage) or create
 * groq-secrets.local.js from groq-secrets.local.js.example (gitignored).
 */
window.APLUS_GROQ_CONFIG = {
  apiKey: '',
  model: 'qwen/qwen3.8-27b',
  enabled: true
};
