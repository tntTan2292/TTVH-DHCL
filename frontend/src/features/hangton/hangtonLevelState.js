import { useState } from 'react';
import { sanitizeHiddenLevels } from './hangtonLevels.js';

// Hidden Loại Tồn levels of one screen block, remembered per viewer (localStorage under `key`).
// Without a stored choice (or when storage is unavailable) the block starts with `defaultHidden`.
export function useStoredHiddenLevels(key, defaultHidden = []) {
  const [hidden, setHidden] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? [...defaultHidden] : sanitizeHiddenLevels(JSON.parse(raw));
    } catch {
      return [...defaultHidden];
    }
  });

  const apply = (next) => {
    setHidden(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage unavailable: the choice only lasts for this visit
    }
  };

  return [hidden, apply];
}
