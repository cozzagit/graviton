import { LevelDefinition, LevelProgress, SaveData } from '../engine/types';

const STORAGE_KEY = 'graviton_save';

export function calculateStars(wellsUsed: number, par: number): number {
  if (wellsUsed <= par) return 3;
  if (wellsUsed <= par + 1) return 2;
  return 1;
}

export function loadProgress(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as SaveData;
    }
  } catch {
    // Corrupted data, start fresh
  }
  return createFreshSave();
}

export function saveProgress(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export function createFreshSave(): SaveData {
  const levels: Record<number, LevelProgress> = {};
  for (let i = 1; i <= 20; i++) {
    levels[i] = {
      unlocked: i <= 1,
      stars: 0,
      completed: false,
    };
  }
  return { levels };
}

export function completeLevelAndSave(
  data: SaveData,
  levelId: number,
  stars: number
): SaveData {
  const current = data.levels[levelId];
  if (!current) return data;

  // Update only if better
  if (stars > current.stars) {
    current.stars = stars;
  }
  current.completed = true;

  // Unlock next level
  const nextId = levelId + 1;
  if (nextId <= 20 && data.levels[nextId]) {
    data.levels[nextId].unlocked = true;
  }

  saveProgress(data);
  return data;
}
