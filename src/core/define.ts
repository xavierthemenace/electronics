/**
 * Authoring helper for component definitions.
 *
 * A definition is plain data. Only `status === "modelled"` definitions carry a
 * `device()` factory; otherwise the registry exposes the component to the
 * palette/curriculum without faking electrical behaviour.
 *
 * @module core/define
 */

import type { ComponentDef } from './model.js';

/** Validate + freeze a component definition. */
export function defineComponent(def: Omit<ComponentDef, 'status'> & { status?: 'modelled' | 'planned' }): ComponentDef {
  if (!def.type || typeof def.type !== 'string') {
    throw new Error('ComponentDefinition requires a string `type`');
  }
  if (!def.pins || !Array.isArray(def.pins)) {
    throw new Error(`ComponentDefinition "${def.type}" requires a pins array`);
  }
  // Pin ids unique within the component.
  const ids = new Set<string>();
  for (const p of def.pins) {
    if (!p.id) throw new Error(`ComponentDefinition "${def.type}" has a pin without an id`);
    if (ids.has(p.id)) throw new Error(`ComponentDefinition "${def.type}" has duplicate pin id "${p.id}"`);
    ids.add(p.id);
  }
  const fullDef: ComponentDef = {
    ...def,
    status: def.status ?? 'modelled',
    params: def.params ?? {},
    docs: def.docs ?? { description: '' },
  };
  return Object.freeze(fullDef);
}

/** Pull the effective parameter values for an instance (defaults merged). */
export function resolveParams(def: ComponentDef, instanceParams: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(def.params)) {
    out[k] = instanceParams[k] ?? v.default;
  }
  return out;
}