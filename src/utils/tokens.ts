/** Mirrors the API's conservative estimate for Thai writing. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const thai = (text.match(/[\u0e00-\u0e7f]/g) ?? []).length;
  return Math.max(1, thai + Math.ceil((text.length - thai) / 3));
}
