import { describe, expect, it } from 'vitest';
import { addJumper, connectivityGroups, createBreadboard, placePin, validateBreadboard } from './breadboard.js';

describe('breadboard topology', () => {
  it('creates 30 rows of two five-hole banks per side', () => {
    const board = createBreadboard();
    expect(board.holes).toHaveLength(30 * 2 * 2 * 5);
  });

  it('connects holes in the same physical five-hole strip', () => {
    const board = createBreadboard();
    const groups = connectivityGroups(board);
    const first = groups.find(g => g.includes('tb-left-1-1'))!;
    expect(first).toContain('tb-left-1-5');
    expect(first).not.toContain('tb-right-1-1');
  });

  it('adds jumper connectivity', () => {
    const board = createBreadboard();
    addJumper(board, 'tb-left-1-1', 'tb-right-1-1');
    const groups = connectivityGroups(board);
    const first = groups.find(g => g.includes('tb-left-1-1'))!;
    expect(first).toContain('tb-right-1-5');
  });

  it('places component pins and validates references', () => {
    const board = createBreadboard();
    placePin(board, 'r1', '1', 'tb-left-4-1');
    placePin(board, 'r1', '2', 'tb-right-4-1');
    expect(validateBreadboard(board)).toEqual([]);
  });
});
