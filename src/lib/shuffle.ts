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
 * Seeded shuffle that also spaces out items from the same group so the
 * respondent never sees two consecutive questions probing the same axis.
 *
 * A uniform shuffle of this bank (264 items, 15 axes) produces ~18
 * same-axis adjacent pairs per session on average, which reads as
 * "similar questions right next to each other". This first applies the
 * ordinary seeded shuffle, then makes a single left-to-right repair
 * pass: whenever an item shares a group with its left neighbor, it is
 * swapped with the next later item that fits both positions. Conflicts
 * a swap pushes rightward are re-examined as the pass reaches them.
 *
 * Best-effort: if no valid swap candidate exists (only possible when
 * one group dominates the tail), the conflict is left in place rather
 * than looping. Deterministic for a given seed.
 *
 * @param array - The array to shuffle
 * @param seed - A string seed for deterministic randomization
 * @param groupOf - Returns the grouping key (e.g. axis id) for an item
 * @returns A new shuffled array (does not modify original)
 */
export function seededShuffleSpaced<T>(
  array: T[],
  seed: string,
  groupOf: (item: T) => string
): T[] {
  const result = seededShuffle(array, seed)

  for (let i = 1; i < result.length; i++) {
    if (groupOf(result[i]) !== groupOf(result[i - 1])) continue

    for (let j = i + 1; j < result.length; j++) {
      const candidateFitsHere = groupOf(result[j]) !== groupOf(result[i - 1])
      const displacedFitsThere =
        groupOf(result[i]) !== groupOf(result[j - 1]) &&
        (j + 1 >= result.length || groupOf(result[i]) !== groupOf(result[j + 1]))

      if (candidateFitsHere && displacedFitsThere) {
        ;[result[i], result[j]] = [result[j], result[i]]
        break
      }
    }
  }

  return result
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
