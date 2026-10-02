import { openDB } from 'idb';

const DB_NAME = 'film_pwa_db';
const DB_VERSION = 2;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store cached API responses by provider key
      if (!db.objectStoreNames.contains('sections_cache')) {
        db.createObjectStore('sections_cache', { keyPath: 'providerKey' });
      }
      // Store user's favorite dramas (offline viewing bookmarks)
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'book_id' });
      }
      // Store watch history
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'book_id' });
      }
      // Store app preferences / offline metadata
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      // Store detailed episode lists per drama
      if (!db.objectStoreNames.contains('episodes_cache')) {
        db.createObjectStore('episodes_cache', { keyPath: 'book_id' });
      }
    },
  });
}

// --- Sections Caching ---
export async function saveSectionsCache(providerKey, data) {
  try {
    const db = await getDB();
    await db.put('sections_cache', {
      providerKey: providerKey || 'default',
      data,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('[IndexedDB] saveSectionsCache error:', err);
  }
}

export async function getSectionsCache(providerKey) {
  try {
    const db = await getDB();
    const result = await db.get('sections_cache', providerKey || 'default');
    return result ? result.data : null;
  } catch (err) {
    console.warn('[IndexedDB] getSectionsCache error:', err);
    return null;
  }
}

// --- Favorites ---
export async function getFavorites() {
  try {
    const db = await getDB();
    return await db.getAll('favorites');
  } catch (err) {
    console.warn('[IndexedDB] getFavorites error:', err);
    return [];
  }
}

export async function saveFavorite(drama) {
  try {
    const db = await getDB();
    await db.put('favorites', {
      ...drama,
      savedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn('[IndexedDB] saveFavorite error:', err);
    return false;
  }
}

export async function removeFavorite(bookId) {
  try {
    const db = await getDB();
    await db.delete('favorites', bookId);
    return true;
  } catch (err) {
    console.warn('[IndexedDB] removeFavorite error:', err);
    return false;
  }
}

export async function isFavorite(bookId) {
  try {
    const db = await getDB();
    const found = await db.get('favorites', bookId);
    return !!found;
  } catch (err) {
    return false;
  }
}

// --- Watch History ---
export async function saveHistory(drama) {
  try {
    const db = await getDB();
    await db.put('history', {
      ...drama,
      viewedAt: Date.now(),
    });
  } catch (err) {
    console.warn('[IndexedDB] saveHistory error:', err);
  }
}

export async function getHistory() {
  try {
    const db = await getDB();
    return await db.getAll('history');
  } catch (err) {
    return [];
  }
}

// --- Meta KV ---
export async function setMeta(key, value) {
  try {
    const db = await getDB();
    await db.put('meta', { key, value });
  } catch (err) {
    console.warn('[IndexedDB] setMeta error:', err);
  }
}

export async function getMeta(key) {
  try {
    const db = await getDB();
    const row = await db.get('meta', key);
    return row ? row.value : null;
  } catch (err) {
    return null;
  }
}
