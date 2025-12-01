/**
 * Seeded random number generator using a simple LCG (Linear Congruential Generator)
 * This ensures deterministic randomization based on a seed string
 */
function seededRandom(seed: string): () => number {
  // Convert string seed to number
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Use the hash as initial seed for LCG
  let state = Math.abs(hash)

  // LCG parameters (from Numerical Recipes)
  const a = 1664525
  const c = 1013904223
  const m = Math.pow(2, 32)

  return function() {
    state = (a * state + c) % m
    return state / m
  }
}

/**
 * Shuffles an array using the Fisher-Yates algorithm with a seeded RNG
 * @param array - The array to shuffle
 * @param seed - A string seed for deterministic randomization
 * @returns A new shuffled array (does not modify original)
 */
export function seededShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array]
  const rng = seededRandom(seed)

  // Fisher-Yates shuffle with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

/**
 * Creates a hash from a string to use as a shorter seed identifier
 * @param str - The string to hash
 * @returns A numeric hash
 */
export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}
