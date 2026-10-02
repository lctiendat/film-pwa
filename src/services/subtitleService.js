// Subtitle Service - WebVTT & SRT Parser, Fetcher, and Real-time Vietnamese Translation Engine
import { apiClient } from './api';

const subtitleCache = new Map();

/**
 * Convert time string (00:01:23.456 or 01:23,456) to seconds
 */
export function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  const ms = parseInt(match[4] || '0', 10);
  return h * 3600 + m * 60 + s + ms / 1000;
}

/**
 * Format seconds to mm:ss
 */
export function formatSubtitleTime(secs) {
  if (isNaN(secs) || secs < 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Parse WebVTT or SRT formatted string into structured cues array
 * @param {string} content
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
export function parseSubtitle(content) {
  if (!content || typeof content !== 'string') return [];

  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues = [];
  let i = 0;

  // Skip WEBVTT header block if present
  if (lines[0] && lines[0].trim().startsWith('WEBVTT')) {
    i++;
    while (i < lines.length && lines[i].trim() !== '') i++;
    while (i < lines.length && lines[i].trim() === '') i++;
  }

  const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})/;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Check if current line is timestamp or if next line is timestamp (SRT index number line)
    let match = line.match(timeRegex);
    if (!match && i + 1 < lines.length) {
      match = lines[i + 1].trim().match(timeRegex);
      if (match) {
        i++; // skip SRT number line
      }
    }

    if (match) {
      const start = timeToSeconds(match[0].split('-->')[0]);
      const end = timeToSeconds(match[0].split('-->')[1]);
      i++;

      const textLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        // Strip HTML / styling tags like <c.white>, <b>, <i>, <v Speaker>
        const clean = lines[i].replace(/<[^>]+>/g, '').trim();
        if (clean) {
          textLines.push(clean);
        }
        i++;
      }

      if (textLines.length > 0) {
        cues.push({
          start,
          end,
          text: textLines.join(' '),
        });
      }
    } else {
      i++;
    }
  }

  return cues;
}

/**
 * Fetch subtitle file from URL (via CORS proxy if needed)
 * @param {string} url
 * @returns {Promise<Array<{ start: number, end: number, text: string }>>}
 */
export async function fetchSubtitle(url) {
  if (!url) return [];
  const cacheKey = `raw_${url}`;
  if (subtitleCache.has(cacheKey)) {
    return subtitleCache.get(cacheKey);
  }

  try {
    // Attempt through local proxy first to guarantee CORS and custom headers
    const proxyUrl = `/api/subtitle?url=${encodeURIComponent(url)}`;
    let res = await fetch(proxyUrl);
    if (!res.ok) {
      // Fallback direct fetch
      res = await fetch(url);
    }

    if (res.ok) {
      const text = await res.text();
      const cues = parseSubtitle(text);
      if (cues.length > 0) {
        subtitleCache.set(cacheKey, cues);
        return cues;
      }
    }
  } catch (err) {
    console.warn('[SubtitleService] Error fetching subtitle:', err.message);
  }

  return [];
}

/**
 * Translate an array of subtitle cues into Vietnamese
 * @param {Array<{ start: number, end: number, text: string }>} cues
 * @param {string} url - Identifier for caching
 * @param {string} to - Target language
 * @returns {Promise<Array<{ start: number, end: number, text: string }>>}
 */
export async function translateSubtitle(cues, url = '', to = 'vi') {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const cacheKey = `translated_${to}_${url || cues[0]?.text?.slice(0, 30)}`;
  if (subtitleCache.has(cacheKey)) {
    return subtitleCache.get(cacheKey);
  }

  try {
    const res = await apiClient.post('/api/subtitle/translate', { cues, to });
    if (res.data && res.data.ok && Array.isArray(res.data.cues)) {
      subtitleCache.set(cacheKey, res.data.cues);
      return res.data.cues;
    }
  } catch (err) {
    console.warn('[SubtitleService] Error translating subtitle cues:', err.message);
  }

  return cues;
}

/**
 * Auto-generate intelligent Vietnamese subtitles when no upstream subtitle file exists
 * @param {object} params
 * @returns {Promise<Array<{ start: number, end: number, text: string }>>}
 */
export async function autoGenerateSubtitles({ title, episodeNumber = 1, totalEpisodes = 45, description = '', duration = 90 }) {
  const cacheKey = `autogen_${title}_${episodeNumber}`;
  if (subtitleCache.has(cacheKey)) {
    return subtitleCache.get(cacheKey);
  }

  try {
    const res = await apiClient.post('/api/subtitle/auto-generate', {
      title,
      episodeNumber,
      totalEpisodes,
      description,
      duration,
    });
    if (res.data && res.data.ok && Array.isArray(res.data.cues)) {
      subtitleCache.set(cacheKey, res.data.cues);
      return res.data.cues;
    }
  } catch (err) {
    console.warn('[SubtitleService] Error auto-generating subtitles:', err.message);
  }
  return [];
}

/**
 * Parse user uploaded local subtitle file (.srt or .vtt)
 * @param {File} file
 * @returns {Promise<{ name: string, cues: Array<{ start: number, end: number, text: string }> }>}
 */
export function parseLocalSubtitleFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const cues = parseSubtitle(content);
        resolve({
          name: file.name,
          cues,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}


