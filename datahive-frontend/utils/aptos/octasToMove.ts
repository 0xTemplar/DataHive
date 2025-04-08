/**
 * Converts MOVE to Octas
 * @param move - The amount in MOVE
 * @returns The equivalent amount in Octas (smallest unit of MOVE)
 */
export function moveToOctas(move: number | string): number {
  const moveNum = typeof move === 'string' ? parseFloat(move) : move;
  return Math.floor(moveNum * 100_000_000);
}

/**
 * Converts Octas to MOVE
 * @param octas - The amount in Octas (smallest unit of MOVE)
 * @returns The equivalent amount in MOVE as a string with 2 decimal places
 */
export function octasToMove(octas: number | string): string {
  const octasNum = typeof octas === 'string' ? parseInt(octas) : octas;
  const move = octasNum / 100_000_000;
  return move.toFixed(2);
}