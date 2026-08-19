export const MIA_TYPING_INTERVAL_MS = 18;

/**
 * Choisit un petit groupe de caractères à révéler à chaque battement :
 * le texte reste fluide, même pour une réponse un peu longue.
 */
export function nextMiaTypingLength(fullText: string, visibleLength: number): number {
  const total = fullText.length;
  if (total === 0 || visibleLength >= total) return total;

  const step = total > 1400 ? 8 : total > 650 ? 5 : 3;
  return Math.min(total, Math.max(0, visibleLength) + step);
}

export function isMiaTypingComplete(fullText: string, visibleLength: number): boolean {
  return visibleLength >= fullText.length;
}
