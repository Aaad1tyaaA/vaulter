// node scripts/test-providers.cjs: checks key-prefix detection order and provider-name matching.
const fs = require('fs')
const path = require('path')
const assert = require('assert')
eval(fs.readFileSync(path.join(__dirname, '..', 'public', 'providers.js'), 'utf8') +
  ';globalThis.detect = detectProvider; globalThis.byName = providerByName; globalThis.PROVIDERS = PROVIDERS;')

const keys = [
  ['sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxx', 'Anthropic'],
  ['sk_' + 'a1'.repeat(24), 'ElevenLabs'],
  ['sk_live_abc123', 'Stripe'],
  ['sk-proj-abcdefghijklmnopqrstuvwxyz', 'OpenAI'],
  ['sk-' + '0123456789abcdef'.repeat(2), 'DeepSeek'],
  ['sk-or-v1-abc', 'OpenRouter'],
  ['sk_car_abc', 'Cartesia'],
  ['AIzaSyA1234567890123456789012345678901', 'Google Gemini'],
  ['ghp_abc', 'GitHub'],
  ['tvly-abc', 'Tavily'],
  ['mongodb+srv://x', 'MongoDB Atlas'],
  ['123456789:AAabcdefghijklmnopqrstuvwxyz0123456', 'Telegram'],
  ['nothing-known', undefined],
]
for (const [k, want] of keys) assert.strictEqual(detect(k)?.name, want, k)
for (const [q, want] of [['eleven labs', 'ElevenLabs'], ['ElevenLabs prod', 'ElevenLabs'], ['openai', 'OpenAI'], ['suno', 'Suno'], ['Hugging face', 'Hugging Face']])
  assert.strictEqual(byName(q)?.name, want, q)
console.log('ok', PROVIDERS.length, 'providers')
