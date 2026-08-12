/**
 * Authoring helper for component definitions.
 *
 * A definition is plain data. Only `status === "modelled"` definitions carry a
 * `device()` factory; otherwise the registry exposes the component to the
 * palette/curriculum without faking electrical behaviour.
 *
 * @module core/define
 */

/**
 * @typedef {Object} PinDef
 * @property {string} id
 * @property {string} name
 * @property {("power"|"ground"|"digital"|"analog"|"passive"|"input"|"output"|"pwm"|"bidirectional")} kind
 * @property {number} [currentLimit]
 * @property {{min:number,max:number}} [voltageLimits]
 */

/**
 * @typedef {Object} ParamDef
 * @property {number|string|boolean} default
 * @property {string} [unit]
 * @property {number} [min]
 * @property {number} [max]
 */

/**
 * Validate + freeze a component definition.
 * @param {object} def
 */
export function defineComponent(def) {
  if (!def.type || typeof def.type !== "string")
    throw new Error("ComponentDefinition requires a string `type`");
  if (!def.pins || !Array.isArray(def.pins))
    throw new Error(`ComponentDefinition "${def.type}" requires a pins array`);
  // Pin ids unique within the component.
  const ids = new Set();
  for (const p of def.pins) {
    if (!p.id) throw new Error(`ComponentDefinition "${def.type}" has a pin without an id`);
    if (ids.has(p.id))
      throw new Error(`ComponentDefinition "${def.type}" has duplicate pin id "${p.id}"`);
    ids.add(p.id);
  }
  def.status = def.status ?? "modelled";
  def.params = def.params ?? {};
  def.docs = def.docs ?? { description: "" };
  return Object.freeze(def);
}

/** Pull the effective parameter values for an instance (defaults merged). */
export function resolveParams(def, instanceParams) {
  const out = {};
  for (const [k, v] of Object.entries(def.params)) {
    out[k] = instanceParams?.[k] ?? v.default;
  }
  return out;
}
