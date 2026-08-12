/**
 * Dense matrix + Gaussian elimination with partial pivoting.
 * Suitable for circuits up to ~100 nodes (Phase 3 target).
 * For larger circuits, a sparse LU implementation would be needed.
 *
 * @module core/matrix
 */

export interface LinearSystem {
  A: number[][];
  z: number[];
  size: number;
}

export interface MatrixConfig {
  maxSize: number;
}

/** Create a zero-initialized linear system. */
export function createSystem(size: number): LinearSystem {
  if (size <= 0) throw new Error('Matrix size must be positive');
  const A = new Array(size);
  for (let i = 0; i < size; i++) {
    A[i] = new Array(size).fill(0);
  }
  return {
    A,
    z: new Array(size).fill(0),
    size,
  };
}

/** Reset system matrices to zero (reuse allocation). */
export function clearSystem(sys: LinearSystem): void {
  const { A, z, size } = sys;
  for (let i = 0; i < size; i++) {
    const row = A[i];
    for (let j = 0; j < size; j++) row[j] = 0;
    z[i] = 0;
  }
}

/**
 * Solve A*x = z using Gaussian elimination with partial pivoting.
 * Modifies A and z in place.
 * Returns solution vector x, or null if singular.
 */
export function solveLinear(sys: LinearSystem): Float64Array | null {
  const { A, z, size } = sys;
  if (size === 0) return new Float64Array(0);

  // Forward elimination with partial pivoting
  for (let k = 0; k < size; k++) {
    // Find pivot
    let maxRow = k;
    let maxVal = Math.abs(A[k][k]);
    for (let i = k + 1; i < size; i++) {
      const val = Math.abs(A[i][k]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = i;
      }
    }

    if (maxVal < 1e-12) return null; // Singular

    // Swap rows if needed
    if (maxRow !== k) {
      [A[k], A[maxRow]] = [A[maxRow], A[k]];
      [z[k], z[maxRow]] = [z[maxRow], z[k]];
    }

    // Eliminate below
    const pivot = A[k][k];
    for (let i = k + 1; i < size; i++) {
      const factor = A[i][k] / pivot;
      if (factor === 0) continue;
      A[i][k] = 0;
      for (let j = k + 1; j < size; j++) {
        A[i][j] -= factor * A[k][j];
      }
      z[i] -= factor * z[k];
    }
  }

  // Back substitution
  const x = new Float64Array(size);
  for (let i = size - 1; i >= 0; i--) {
    let sum = z[i];
    for (let j = i + 1; j < size; j++) {
      sum -= A[i][j] * x[j];
    }
    const diag = A[i][i];
    if (Math.abs(diag) < 1e-12) return null;
    x[i] = sum / diag;
  }

  return x;
}