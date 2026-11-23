// Farben für Plätze im Plan
export const AWAY_COLOR = '#7a7a7a';
export const COLOR_CHOICES = [
  ['#2e7d32', 'Grün'], ['#c62828', 'Rot'], ['#1565c0', 'Blau'],
  ['#ef6c00', 'Orange'], ['#6a1b9a', 'Lila'], ['#00838f', 'Türkis'],
];

export function fieldColor(field, index = 0) {
  return field?.color || COLOR_CHOICES[index % COLOR_CHOICES.length][0];
}

// Helle Variante einer Farbe (für Trainings-Blöcke)
export function tint(hex, alpha = 0.2) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
