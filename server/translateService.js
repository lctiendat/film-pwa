// Translate Service - High-quality multilingual translation engine with caching & chunking
// Powered by MyMemory & NLP Language Detection

const translationCache = new Map();

/**
 * Detect source language from text patterns
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  // Check for Chinese / Japanese / Korean
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';

  // Check for common Indonesian / Malay words
  const lower = text.toLowerCase();
  const idWords = ['yang', 'dan', 'di', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'adalah', 'episode', 'terbaru', 'drama', 'mereka', 'akan'];
  const words = lower.split(/\s+/);
  const idMatchCount = idWords.filter(w => words.includes(w)).length;
  if (idMatchCount >= 2) return 'id';

  // Check for common Vietnamese words
  const viWords = ['và', 'của', 'là', 'trong', 'những', 'được', 'người', 'phim', 'tập', 'với'];
  const viMatchCount = viWords.filter(w => words.includes(w)).length;
  if (viMatchCount >= 2) return 'vi';

  return 'en';
}

/**
 * Translate a single chunk (< 450 chars)
 */
async function translateChunk(chunk, fromLang, toLang) {
  const cacheKey = `${fromLang}_${toLang}_${chunk.trim()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk.trim())}&langpair=${fromLang}|${toLang}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && !translated.includes('IS AN INVALID SOURCE LANGUAGE')) {
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch (err) {
    console.warn('[Translate] Error translating chunk:', err.message);
  }

  return chunk;
}

/**
 * Translate arbitrary text with automatic chunking and sentence boundary detection
 */
export async function translateText(text, targetLang = 'vi', sourceLang = null) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return '';
  }

  const detected = sourceLang || detectLanguage(text);
  if (detected === targetLang) {
    return text;
  }

  // Split into sentence chunks to preserve context and avoid character limits
  const chunks = text.match(/[^.!?\n]+(?:[.!?\n]+|$)/g) || [text];

  const translatedChunks = await Promise.all(
    chunks.map(chunk => {
      const trimmed = chunk.trim();
      if (!trimmed) return '';
      return translateChunk(trimmed, detected, targetLang);
    })
  );

  return translatedChunks.filter(Boolean).join(' ');
}

/**
 * Batch translation helper
 */
export async function translateBatch(items, targetLang = 'vi') {
  if (!Array.isArray(items)) return [];
  return Promise.all(items.map(t => translateText(t, targetLang)));
}
