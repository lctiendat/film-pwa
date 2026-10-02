// Translate Service - High-performance multilingual translation engine
// Pipeline: Google Translate → MyMemory → LibreTranslate
// Features: Endpoint rotation, concurrency limiter, batch chunking, LRU cache

// ═══════════════════════════════════════════════════════════════════
// LRU Cache (max 5000 entries to prevent memory leaks)
// ═══════════════════════════════════════════════════════════════════
const MAX_CACHE_SIZE = 5000;
const translationCache = new Map();

function cacheGet(key) {
  if (!translationCache.has(key)) return undefined;
  const value = translationCache.get(key);
  // Move to end (most recently used)
  translationCache.delete(key);
  translationCache.set(key, value);
  return value;
}

function cacheSet(key, value) {
  if (translationCache.has(key)) {
    translationCache.delete(key);
  } else if (translationCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest (first) entry
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(key, value);
}

// ═══════════════════════════════════════════════════════════════════
// Concurrency Limiter (max 8 simultaneous requests)
// ═══════════════════════════════════════════════════════════════════
const MAX_CONCURRENT = 8;
let activeRequests = 0;
const requestQueue = [];

function acquireSlot() {
  return new Promise((resolve) => {
    if (activeRequests < MAX_CONCURRENT) {
      activeRequests++;
      resolve();
    } else {
      requestQueue.push(resolve);
    }
  });
}

function releaseSlot() {
  activeRequests--;
  if (requestQueue.length > 0) {
    activeRequests++;
    const next = requestQueue.shift();
    next();
  }
}

async function withThrottle(fn) {
  await acquireSlot();
  try {
    return await fn();
  } finally {
    releaseSlot();
  }
}

// ═══════════════════════════════════════════════════════════════════
// Google Translate Endpoints (rotation on 429/503/HTML/parse failure)
// ═══════════════════════════════════════════════════════════════════
const GOOGLE_ENDPOINTS = [
  {
    name: 'dict-chrome-ex',
    buildUrl: (text, sl, tl) =>
      `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${encodeURIComponent(text)}`,
  },
  {
    name: 'translate.google.com-dict',
    buildUrl: (text, sl, tl) =>
      `https://translate.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${encodeURIComponent(text)}`,
  },
  {
    name: 'client-at',
    buildUrl: (text, sl, tl) =>
      `https://translate.google.com/translate_a/single?client=at&dt=t&dt=rm&sl=${sl}&tl=${tl}&q=${encodeURIComponent(text)}`,
  },
  {
    name: 'client-webapp',
    buildUrl: (text, sl, tl) =>
      `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sl}&tl=${tl}&q=${encodeURIComponent(text)}`,
  },
];

let googleEndpointIndex = 0;

function rotateGoogleEndpoint() {
  googleEndpointIndex = (googleEndpointIndex + 1) % GOOGLE_ENDPOINTS.length;
}

function parseGoogleResponse(data, endpointName) {
  // dict-chrome-ex returns: ["translated text"] or [["translated text"]]
  if (endpointName.includes('dict')) {
    if (Array.isArray(data)) {
      if (typeof data[0] === 'string') return data[0];
      if (Array.isArray(data[0]) && typeof data[0][0] === 'string') return data[0][0];
    }
    if (typeof data === 'string') return data;
  }

  // client=at / client=gtx returns: [[["translated","original",null,null,X],...]]
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const sentences = data[0];
    if (Array.isArray(sentences)) {
      const parts = [];
      for (const seg of sentences) {
        if (Array.isArray(seg) && typeof seg[0] === 'string') {
          parts.push(seg[0]);
        }
      }
      if (parts.length > 0) return parts.join('');
    }
  }

  return null;
}

async function tryGoogleTranslate(text, sourceLang, targetLang) {
  const startIdx = googleEndpointIndex;
  let attempts = 0;

  while (attempts < GOOGLE_ENDPOINTS.length) {
    const endpoint = GOOGLE_ENDPOINTS[googleEndpointIndex];
    const url = endpoint.buildUrl(text, sourceLang, targetLang);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, */*',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 429 || res.status === 503) {
        console.warn(`[Translate] Google ${endpoint.name} returned ${res.status}, rotating...`);
        rotateGoogleEndpoint();
        attempts++;
        continue;
      }

      if (!res.ok) {
        rotateGoogleEndpoint();
        attempts++;
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      const bodyText = await res.text();

      // Reject HTML responses
      if (contentType.includes('text/html') || bodyText.trimStart().startsWith('<!') || bodyText.trimStart().startsWith('<html')) {
        console.warn(`[Translate] Google ${endpoint.name} returned HTML, rotating...`);
        rotateGoogleEndpoint();
        attempts++;
        continue;
      }

      // Try parsing JSON
      let data;
      try {
        data = JSON.parse(bodyText);
      } catch {
        console.warn(`[Translate] Google ${endpoint.name} JSON parse failed, rotating...`);
        rotateGoogleEndpoint();
        attempts++;
        continue;
      }

      const translated = parseGoogleResponse(data, endpoint.name);
      if (translated && translated.trim() && translated.trim().toLowerCase() !== text.trim().toLowerCase()) {
        return translated;
      }

      // Same text returned → try next endpoint
      rotateGoogleEndpoint();
      attempts++;
    } catch (err) {
      console.warn(`[Translate] Google ${endpoint.name} error: ${err.message}`);
      rotateGoogleEndpoint();
      attempts++;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// MyMemory Fallback (max 500 chars)
// ═══════════════════════════════════════════════════════════════════
async function tryMyMemoryTranslate(text, sourceLang, targetLang) {
  // MyMemory has a 500 character limit
  const input = text.length > 490 ? text.slice(0, 490) : text;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data?.responseStatus !== 200) return null;

    const translated = data?.responseData?.translatedText;
    if (!translated) return null;
    if (translated.includes('IS AN INVALID SOURCE LANGUAGE')) return null;

    // Reject if it returns the original text unchanged
    if (translated.trim().toLowerCase() === input.trim().toLowerCase()) return null;

    return translated;
  } catch (err) {
    console.warn('[Translate] MyMemory error:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// LibreTranslate Fallback (public instances)
// ═══════════════════════════════════════════════════════════════════
const LIBRE_INSTANCES = [
  'https://libretranslate.de',
  'https://translate.argosopentech.com',
];

async function tryLibreTranslate(text, sourceLang, targetLang) {
  for (const instance of LIBRE_INSTANCES) {
    try {
      const res = await fetch(`${instance}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const translated = data?.translatedText;
      if (!translated) continue;

      // Reject if it returns the original text unchanged
      if (translated.trim().toLowerCase() === text.trim().toLowerCase()) continue;

      return translated;
    } catch (err) {
      console.warn(`[Translate] LibreTranslate ${instance} error:`, err.message);
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Language Detection
// ═══════════════════════════════════════════════════════════════════
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';

  // Chinese / Japanese / Korean
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // Indonesian / Malay
  const idWords = ['yang', 'dan', 'di', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'adalah', 'episode', 'terbaru', 'drama', 'mereka', 'akan'];
  const idMatchCount = idWords.filter(w => words.includes(w)).length;
  if (idMatchCount >= 2) return 'id';

  // Vietnamese
  const viWords = ['và', 'của', 'là', 'trong', 'những', 'được', 'người', 'phim', 'tập', 'với'];
  const viMatchCount = viWords.filter(w => words.includes(w)).length;
  if (viMatchCount >= 2) return 'vi';

  return 'en';
}

// ═══════════════════════════════════════════════════════════════════
// Core Translation Pipeline: Google → MyMemory → LibreTranslate
// ═══════════════════════════════════════════════════════════════════
async function translateSingle(text, sourceLang, targetLang) {
  const cleanInput = text.trim();
  if (!cleanInput) return '';

  const cacheKey = `${sourceLang}_${targetLang}_${cleanInput}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  // 1. Google Translate (fastest, primary)
  const googleResult = await tryGoogleTranslate(cleanInput, sourceLang, targetLang);
  if (googleResult) {
    cacheSet(cacheKey, googleResult);
    return googleResult;
  }

  // 2. MyMemory (fallback)
  const myMemoryResult = await tryMyMemoryTranslate(cleanInput, sourceLang, targetLang);
  if (myMemoryResult) {
    cacheSet(cacheKey, myMemoryResult);
    return myMemoryResult;
  }

  // 3. LibreTranslate (last resort)
  const libreResult = await tryLibreTranslate(cleanInput, sourceLang, targetLang);
  if (libreResult) {
    cacheSet(cacheKey, libreResult);
    return libreResult;
  }

  // All failed → return original
  console.warn(`[Translate] All providers failed for: "${cleanInput.slice(0, 60)}..."`);
  return cleanInput;
}

// ═══════════════════════════════════════════════════════════════════
// Public API: translateText (with auto-chunking for long texts)
// ═══════════════════════════════════════════════════════════════════
export async function translateText(text, targetLang = 'vi', sourceLang = null) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return '';
  }

  const detected = sourceLang || detectLanguage(text);
  if (detected === targetLang) {
    return text;
  }

  // For short texts, translate directly with throttle
  if (text.length < 500) {
    return withThrottle(() => translateSingle(text, detected, targetLang));
  }

  // For long texts, split into sentence chunks
  const chunks = text.match(/[^.!?\n]+(?:[.!?\n]+|$)/g) || [text];

  const translatedChunks = await Promise.all(
    chunks.map(chunk => {
      const trimmed = chunk.trim();
      if (!trimmed) return Promise.resolve('');
      return withThrottle(() => translateSingle(trimmed, detected, targetLang));
    })
  );

  return translatedChunks.filter(Boolean).join(' ');
}

// ═══════════════════════════════════════════════════════════════════
// Batch Translation (chunks of 20 sentences, 80ms delay between)
// ═══════════════════════════════════════════════════════════════════
const BATCH_CHUNK_SIZE = 20;
const BATCH_DELAY_MS = 80;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function translateBatch(items, targetLang = 'vi') {
  if (!Array.isArray(items)) return [];
  if (items.length === 0) return [];

  const results = new Array(items.length);

  // Split into chunks of BATCH_CHUNK_SIZE
  for (let i = 0; i < items.length; i += BATCH_CHUNK_SIZE) {
    const chunkEnd = Math.min(i + BATCH_CHUNK_SIZE, items.length);
    const chunkPromises = [];

    for (let j = i; j < chunkEnd; j++) {
      const idx = j;
      chunkPromises.push(
        translateText(items[idx], targetLang).then(result => {
          results[idx] = result;
        })
      );
    }

    await Promise.all(chunkPromises);

    // Delay between chunks to avoid burst
    if (chunkEnd < items.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════
// Subtitle Translation (preserves cue timings)
// ═══════════════════════════════════════════════════════════════════
export async function translateSubtitleCues(cues, targetLang = 'vi') {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const texts = cues.map(c => c.text || '');
  const translatedTexts = await translateBatch(texts, targetLang);
  return cues.map((c, i) => ({
    start: c.start,
    end: c.end,
    text: translatedTexts[i] || c.text || '',
  }));
}

// ═══════════════════════════════════════════════════════════════════
// Auto-Generate Captions (unchanged from original)
// ═══════════════════════════════════════════════════════════════════
export async function generateAutoCaptions({ title, episodeNumber = 1, totalEpisodes = 45, description = '', duration = 90 }) {
  const ep = parseInt(episodeNumber || 1, 10);
  const total = parseInt(totalEpisodes || 45, 10);
  const dur = Math.max(45, Math.min(300, parseInt(duration || 90, 10)));

  // Translate title & description to Vietnamese
  const viTitle = await translateText(title || '', 'vi');
  const viDesc = await translateText(description || '', 'vi');

  // Extract main character names from description
  const nameRegex = /([A-Z][a-z]{2,12})/g;
  const rawNames = (description.match(nameRegex) || []).filter(n =>
    !['The', 'And', 'She', 'He', 'His', 'Her', 'They', 'With', 'From', 'Into', 'When', 'After', 'Before', 'This', 'That'].includes(n)
  );
  const uniqueNames = [...new Set(rawNames)].slice(0, 3);
  const char1 = uniqueNames[0] || 'Nữ chính';
  const char2 = uniqueNames[1] || 'Nam chính';

  // Build cues based on narrative progression
  let dialogueTemplates = [];

  if (ep === 1) {
    dialogueTemplates = [
      { text: `[Mở đầu tập 1 - ${viTitle}] Cuộc gặp gỡ định mệnh bắt đầu...` },
      { text: `${char1}: "Các người... rốt cuộc các người muốn đưa tôi đi đâu?!"` },
      { text: `${char2}: "Đừng vùng vẫy nữa. Định mệnh của nàng từ nay thuộc về ta."` },
      { text: `${char1}: "Tôi tuyệt đối sẽ không bao giờ khuất phục trước kẻ như anh!"` },
      { text: `${char2}: "Một thiếu nữ kiên cường... nhưng nàng sẽ phải hiểu ai mới là chủ nhân ở đây."` },
      { text: `Không khí ngột ngạt bao trùm, bí mật ngàn năm dần thức tỉnh...` },
      { text: `${char1}: "Nếu anh dám làm hại người vô tội, tôi sẽ liều mạng với anh!"` },
      { text: `${char2}: "Ta sẽ chờ xem nàng chống cự được bao lâu."` },
      { text: `Ánh mắt đối đầu tóe lửa, một mối duyên cấm kỵ chính thức bắt đầu.` }
    ];
  } else if (ep === 2 || ep === 3) {
    dialogueTemplates = [
      { text: `[Tập ${ep}] Mối nguy hiểm cận kề, những toan tính ngầm dần lộ diện.` },
      { text: `${char1}: "Tại sao lại đối xử với tôi như vậy? Tôi đâu có nợ anh điều gì!"` },
      { text: `${char2}: "Nàng không nợ ta, nhưng số phận nàng đã gắn liền với ta rồi."` },
      { text: `Tiếng bước chân dồn dập vang lên từ phía hành lang tối...` },
      { text: `${char1}: "Có kẻ đang theo dõi chúng ta! Anh có nghe thấy không?"` },
      { text: `${char2}: "Yên lặng và nấp sau lưng ta. Dù ai đến, ta cũng sẽ bảo vệ nàng."` },
      { text: `${char1}: "Bảo vệ tôi sao? Anh nghĩ tôi sẽ tin lời anh dễ dàng thế à?"` },
      { text: `${char2}: "Rồi thời gian sẽ chứng minh tất cả những gì ta nói là thật."` },
      { text: `Căng thẳng leo thang, sự thật đằng sau âm mưu đen tối dần hiển hiện.` }
    ];
  } else if (ep < Math.floor(total * 0.4)) {
    dialogueTemplates = [
      { text: `[Tập ${ep}] Sóng gió ập tới, thử thách lòng kiên nhẫn của ${char1}.` },
      { text: `${char1}: "Tôi đã tìm thấy bằng chứng rồi. Kẻ phản bội không phải ai xa lạ!"` },
      { text: `${char2}: "Quả nhiên đúng như ta dự đoán. Bọn chúng đã bắt đầu hành động."` },
      { text: `${char1}: "Chúng ta phải làm gì tiếp theo? Cứ để chúng tự tung tự tác sao?"` },
      { text: `${char2}: "Đừng manh động. Ta đã chuẩn bị sẵn một cái bẫy hoàn hảo."` },
      { text: `Từng bước cạm bẫy được giăng ra trong sự im lặng nghẹt thở...` },
      { text: `${char1}: "Nếu lần này thất bại, cả hai chúng ta đều sẽ không còn đường lui!"` },
      { text: `${char2}: "Chỉ cần nàng tin tưởng ta, ta nhất định sẽ không để nàng phải rơi lệ."` },
      { text: `Tình thế xoay chuyển bất ngờ trước thềm bão táp!` }
    ];
  } else if (ep < Math.floor(total * 0.8)) {
    dialogueTemplates = [
      { text: `[Tập ${ep} - Cao Trào] Cơn phẫn nộ bùng nổ, thân phận thực sự hé lộ!` },
      { text: `${char1}: "Hóa ra tất cả mọi chuyện từ đầu đến cuối đều nằm trong kế hoạch của anh?!"` },
      { text: `${char2}: "Nàng nghe ta giải thích đã! Chuyện này hoàn toàn không giống như nàng nghĩ!"` },
      { text: `${char1}: "Đủ rồi! Tôi không muốn nghe thêm bất kỳ lời dối trá nào nữa!"` },
      { text: `${char2}: "Ta có thể lừa cả thiên hạ, nhưng tình cảm dành cho nàng là duy nhất!"` },
      { text: `Giọt nước mắt nghẹn ngào rơi trong khoảnh khắc quyết định...` },
      { text: `${char1}: "Nếu muốn tôi tin, hãy chứng minh bằng hành động của anh đi!"` },
      { text: `${char2}: "Được, mạng sống này của ta, ta giao lại cho nàng định đoạt!"` },
      { text: `Một bước ngoặt định mệnh làm thay đổi hoàn toàn cục diện!` }
    ];
  } else {
    dialogueTemplates = [
      { text: `[Tập ${ep} - Hồi Kết Trọn Vẹn] Trận chiến cuối cùng và lời thề nguyền vĩnh cửu.` },
      { text: `${char2}: "Kẻ ác đã phải đền tội. Giờ đây không còn ai có thể chia cắt chúng ta."` },
      { text: `${char1}: "Trải qua bao nhiêu giông bão, cuối cùng chúng ta cũng có thể bình yên."` },
      { text: `${char2}: "Từ nay về sau, cả cuộc đời này ta chỉ muốn ở bên cạnh một mình nàng."` },
      { text: `${char1}: "Cảm ơn anh vì đã luôn kiên định bảo vệ em đến giây phút cuối."` },
      { text: `Ánh hoàng hôn rạng rỡ soi rọi nụ cười hạnh phúc của cả hai...` },
      { text: `${char2}: "Nắm lấy tay ta, chúng ta cùng nhau bước tiếp tương lai nhé."` },
      { text: `${char1}: "Vâng, mãi mãi không bao giờ buông tay!"` },
      { text: `Khép lại trọn bộ ${total} tập phim với một kết thúc viên mãn, ngọt ngào.` }
    ];
  }

  // Calculate proportional timestamps across episode duration
  const count = dialogueTemplates.length;
  const interval = (dur - 8) / count;

  return dialogueTemplates.map((item, idx) => {
    const start = Math.round((3 + idx * interval) * 10) / 10;
    const end = Math.round((start + interval * 0.85) * 10) / 10;
    return {
      start,
      end,
      text: item.text,
    };
  });
}
