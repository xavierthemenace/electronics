import { describe, expect, it } from 'vitest';
import { buildBreadboardRuntimeProject } from './breadboardBridge.js';
import { createBreadboard, placePin, addJumper } from './breadboard.js';
import { component, project } from './model.js';

describe('breadboard bridge', () => {
  it('creates solver-only wires between pins placed in one physical group', () => {
    const topology = createBreadboard();
    placePin(topology, 'r1', '1', 'tb-left-1-1');
    placePin(topology, 'led1', 'a', 'tb-left-1-4');
    const result = buildBreadboardRuntimeProject(project({
      components: [component('r1', 'resistor'), component('led1', 'led')],
      wires: [],
    }), topology);
    expect(result.wires).toContainEqual({ a: { cid: 'r1', pid: '1' }, b: { cid: 'led1', pid: 'a' } });
  });

  it('uses jumpers to connect otherwise separate strips', () => {
    const topology = createBreadboard();
    addJumper(topology, 'tb-left-2-1', 'tb-right-2-1');
    placePin(topology, 'a', '1', 'tb-left-2-2');
    placePin(topology, 'b', '1', 'tb-right-2-4');
    const result = buildBreadboardRuntimeProject(project({
      components: [component('a', 'resistor'), component('b', 'led')],
      wires: [],
    }), topology);
    expect(result.wires).toHaveLength(1);
  });
});
