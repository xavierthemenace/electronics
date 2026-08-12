/**
 * Canonical circuit model.
 *
 * The netlist is the single source of truth. Editors, the solver, ERC, and
 * instruments all consume these structures. The netlist is *derived* from
 * components + wires; it is never user-editable mutable state, so the editor
 * and simulator can never diverge.
 *
 * @module core/model
 */

/** A component instance placed on the canvas. */
export const component = (
  id,
  type,
  params = {},
  pos = { x: 0, y: 0 },
  rotation = 0,
  label = undefined
) => ({
  id,
  type,
  params,
  pos,
  rotation,
  label,
});

/** An explicit pin-to-pin wire authored by the user. */
export const wire = (aComponentId, aPinId, bComponentId, bPinId) => ({
  a: { cid: aComponentId, pid: aPinId },
  b: { cid: bComponentId, pid: bPinId },
});

/**
 * Build a canonical CircuitProject.
 * @param {object} opts
 */
export const project = (opts = {}) => ({
  schemaVersion: 1,
  id: opts.id ?? `prj_${Date.now().toString(36)}`,
  name: opts.name ?? "Untitled Circuit",
  components: opts.components ?? [],
  wires: opts.wires ?? [],
  nets: [], // resolved by NetlistBuilder
  view: opts.view ?? { offsetX: 0, offsetY: 0, zoom: 1 },
  firmware: opts.firmware ?? null,
  simSettings: opts.simSettings ?? { dt: 1e-6, endTime: 0.1 },
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lessonId: opts.lessonId ?? null,
  },
});

export const NET_GROUND = "0"; // net 0 is always the ground reference.