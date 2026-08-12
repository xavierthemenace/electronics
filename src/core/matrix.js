/**
 * Dense matrix + linear algebra helpers for the MNA solver.
 *
 * Small circuits (hundreds of nodes) are fine with a dense matrix; this is
 * the pragmatic Phase-3 implementation. A sparse LU can drop in later to
 * satisfy larger designs without changing call sites.
 *
 * @module core/matrix
 */

/**
 * Create an n×n zero matrix plus a right-hand-side vector of length n.
 * @param {number} n
 */
export function createSystem(n) {
  const A = new Array(n);
  for (let i = 0; i < n; i++) A[i] = new Float64Array(n);
  const z = new Float64Array(n);
  return { A, z, size: n };
}

/** Add `v` into A[i][j] (conductance / companion stamp). */
export function stampConductance(sys, i, j, v) {
  if (i < 0 || j < 0) return; // ground rows/cols are dropped (node 0)
  sys.A[i][j] += v;
}

/** Add `v` into the RHS vector z[r]. */
export function stampSource(sys, r, v) {
  if (r < 0) return;
  sys.z[r] += v;
}

/**
 * Solve A·x = z in place via Gaussian elimination with partial pivoting.
 * Mutates `sys`. Returns the solution vector (length n), or null if singular.
 * @param {{A: Float64Array[], z: Float64Array, size: number}} sys
 * @returns {Float64Array | null}
 */
export function solveLinear(sys) {
  const { A, z, size } = sys;
  // Forward elimination with partial pivoting.
  for (let k = 0; k < size; k++) {
    // Find pivot.
    let pivotRow = k;
    let max = Math.abs(A[k][k]);
    for (let r = k + 1; r < size; r++) {
      const a = Math.abs(A[r][k]);
      if (a > max) {
        max = a;
        pivotRow = r;
      }
    }
    if (max === 0) return null; // singular
    if (pivotRow !== k) {
      const tmpRow = A[k];
      A[k] = A[pivotRow];
      A[pivotRow] = tmpRow;
      const tmpZ = z[k];
      z[k] = z[pivotRow];
      z[pivotRow] = tmpZ;
    }
    // Eliminate below.
    const pivot = A[k][k];
    for (let r = k + 1; r < size; r++) {
      const factor = A[r][k] / pivot;
      if (factor === 0) continue;
      for (let c = k; c < size; c++) A[r][c] -= factor * A[k][c];
      z[r] -= factor * z[k];
    }
  }
  // Back substitution.
  const x = new Float64Array(size);
  for (let r = size - 1; r >= 0; r--) {
    let sum = z[r];
    for (let c = r + 1; c < size; c++) sum -= A[r][c] * x[c];
    const diag = A[r][r];
    if (diag === 0) return null;
    x[r] = sum / diag;
  }
  return x;
}

/** Clone a system so a transient step can re-stamp from scratch. */
export function cloneSystem(sys) {
  const A = sys.A.map((row) => Float64Array.from(row));
  const z = Float64Array.from(sys.z);
  return { A, z, size: sys.size };
}

/** Reset A and z to zero, keeping the allocated size. */
export function clearSystem(sys) {
  for (let i = 0; i < sys.size; i++) {
    sys.A[i].fill(0);
  }
  sys.z.fill(0);
}
