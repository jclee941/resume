const VISION_MODELS = [
  'gpt-5.4',
  'gpt-5.5',
  'gemini-3.5-flash-low',
  'gemini-3-flash',
  'gpt-5.4-mini',
  'gemini-3.1-flash-lite',
];

const WEAK_CAPTCHA_TOKENS = new Set([
  'answer',
  'captcha',
  'captchas',
  'characters',
  'image',
  'images',
  'letter',
  'letters',
  'number',
  'numbers',
  'text',
  'word',
  'words',
]);

export function resolveVisionModels(env = process.env) {
  const override = env.JOBKOREA_CAPTCHA_MODELS?.trim();
  if (!override) return [...VISION_MODELS];

  const parsed = override
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...VISION_MODELS];
}

export function resolveCliproxyBase(env = process.env) {
  const rawBase = env.CLIPROXY_BASE?.trim();
  if (!rawBase) {
    throw new Error('CLIPROXY_BASE is required for JobKorea CAPTCHA solving');
  }
  if (!/^https?:\/\//.test(rawBase)) {
    throw new Error('CLIPROXY_BASE must start with http:// or https://');
  }
  try {
    new URL(rawBase);
  } catch {
    throw new Error('CLIPROXY_BASE must be a valid URL');
  }
  return rawBase.replace(/\/+$/, '');
}

export function resolveCliproxyApiKey(env = process.env) {
  const apiKey = env.CLIPROXY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('CLIPROXY_API_KEY is required for JobKorea CAPTCHA solving');
  }
  return apiKey;
}

export function isCliproxyConfigured(env = process.env) {
  return !!env.CLIPROXY_BASE?.trim() && !!env.CLIPROXY_API_KEY?.trim();
}

export async function callVisionModel(image, model) {
  const cliproxyBase = resolveCliproxyBase();
  const cliproxyKey = resolveCliproxyApiKey();

  const reqBody = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'The image contains a short distorted string of letters and digits. ' +
              'Transcribe exactly the characters you see in the image, preserving upper/lower case. ' +
              'It is usually 5 to 8 characters long and contains no real words. ' +
              'Do NOT guess, do NOT output any word that is not literally drawn in the image. ' +
              'Reply with ONLY those characters — no spaces, no punctuation, no explanation. ' +
              'The answer must not be a normal word like image, captcha, letters, or text. ' +
              'If the characters are illegible, reply with exactly: ZZZZZZ.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${image.mime};base64,${image.base64}`, detail: 'high' },
          },
        ],
      },
    ],
    max_tokens: 32,
    temperature: 0,
  };

  const res = await fetch(`${cliproxyBase}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cliproxyKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reqBody),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`cliproxy ${model} HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || '';
  return normalizeCaptchaAnswer(raw);
}

export function normalizeCaptchaAnswer(raw) {
  const tokens = String(raw)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const candidates = tokens.filter(isPlausibleCaptchaAnswer);
  return candidates.length ? candidates[candidates.length - 1] : '';
}

function isPlausibleCaptchaAnswer(token) {
  if (token === 'ZZZZZZ') return false;
  if (token.length < 4 || token.length > 8) return false;
  if (WEAK_CAPTCHA_TOKENS.has(token.toLowerCase())) return false;
  return /^[A-Za-z0-9]+$/.test(token);
}
