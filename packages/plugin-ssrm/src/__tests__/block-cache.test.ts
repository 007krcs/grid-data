import { describe, it, expect } from 'vitest';
import { BlockCache } from '../block-cache';

describe('BlockCache', () => {
  it('getBlockIndex returns correct index', () => {
    const cache = new BlockCache(100, 10);

    expect(cache.getBlockIndex(0)).toBe(0);
    expect(cache.getBlockIndex(50)).toBe(0);
    expect(cache.getBlockIndex(99)).toBe(0);
    expect(cache.getBlockIndex(100)).toBe(1);
    expect(cache.getBlockIndex(250)).toBe(2);
    expect(cache.getBlockIndex(999)).toBe(9);
  });

  it('setBlock/getBlock round trip', () => {
    const cache = new BlockCache(100, 10);
    const block = {
      startRow: 0,
      endRow: 100,
      status: 'loaded' as const,
      data: [{ id: 1 }, { id: 2 }],
      lastAccessed: Date.now(),
    };

    cache.setBlock(0, block);
    const retrieved = cache.getBlock(0);

    expect(retrieved).toBeDefined();
    expect(retrieved!.status).toBe('loaded');
    expect(retrieved!.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(retrieved!.startRow).toBe(0);
    expect(retrieved!.endRow).toBe(100);
  });

  it('getBlock returns undefined for uncached blocks', () => {
    const cache = new BlockCache(100, 10);
    expect(cache.getBlock(5)).toBeUndefined();
  });

  it('getBlock updates lastAccessed timestamp', () => {
    const cache = new BlockCache(100, 10);
    const initialTime = Date.now() - 1000;

    cache.setBlock(0, {
      startRow: 0,
      endRow: 100,
      status: 'loaded',
      data: [],
      lastAccessed: initialTime,
    });

    const retrieved = cache.getBlock(0);
    expect(retrieved!.lastAccessed).toBeGreaterThan(initialTime);
  });

  it('getMissingBlocks finds uncached blocks', () => {
    const cache = new BlockCache(100, 10);

    // Cache block 0
    cache.setBlock(0, {
      startRow: 0,
      endRow: 100,
      status: 'loaded',
      data: [],
      lastAccessed: Date.now(),
    });

    // Request rows 0-299 (blocks 0, 1, 2)
    const missing = cache.getMissingBlocks(0, 300);
    expect(missing).toEqual([1, 2]);
  });

  it('getMissingBlocks includes failed blocks', () => {
    const cache = new BlockCache(100, 10);

    // Cache block 0 as failed
    cache.setBlock(0, {
      startRow: 0,
      endRow: 100,
      status: 'failed',
      data: [],
      lastAccessed: Date.now(),
    });

    // Cache block 1 as loaded
    cache.setBlock(1, {
      startRow: 100,
      endRow: 200,
      status: 'loaded',
      data: [],
      lastAccessed: Date.now(),
    });

    // Request rows 0-200 (blocks 0, 1)
    const missing = cache.getMissingBlocks(0, 200);
    // Block 0 is 'failed', should be in missing; block 1 is loaded, should not
    expect(missing).toEqual([0]);
  });

  it('getMissingBlocks does not include loading blocks', () => {
    const cache = new BlockCache(100, 10);

    // Cache block 0 as loading
    cache.setBlock(0, {
      startRow: 0,
      endRow: 100,
      status: 'loading',
      data: [],
      lastAccessed: Date.now(),
    });

    const missing = cache.getMissingBlocks(0, 100);
    // Block 0 is 'loading', should NOT be in missing
    expect(missing).toEqual([]);
  });

  it('getRows returns data from cache', () => {
    const cache = new BlockCache(3, 10);

    cache.setBlock(0, {
      startRow: 0,
      endRow: 3,
      status: 'loaded',
      data: ['a', 'b', 'c'],
      lastAccessed: Date.now(),
    });

    const rows = cache.getRows(0, 3);
    expect(rows).toEqual(['a', 'b', 'c']);
  });

  it('getRows returns null for uncached rows', () => {
    const cache = new BlockCache(3, 10);

    // Cache only block 0
    cache.setBlock(0, {
      startRow: 0,
      endRow: 3,
      status: 'loaded',
      data: ['a', 'b', 'c'],
      lastAccessed: Date.now(),
    });

    // Request rows spanning blocks 0 and 1
    const rows = cache.getRows(0, 6);
    expect(rows).toEqual(['a', 'b', 'c', null, null, null]);
  });

  it('getRows returns null for loading blocks', () => {
    const cache = new BlockCache(3, 10);

    cache.setBlock(0, {
      startRow: 0,
      endRow: 3,
      status: 'loading',
      data: [],
      lastAccessed: Date.now(),
    });

    const rows = cache.getRows(0, 3);
    expect(rows).toEqual([null, null, null]);
  });

  it('eviction works when maxBlocks exceeded', () => {
    const cache = new BlockCache(10, 3);

    // Fill to capacity
    cache.setBlock(0, {
      startRow: 0,
      endRow: 10,
      status: 'loaded',
      data: [0],
      lastAccessed: 1000,
    });
    cache.setBlock(1, {
      startRow: 10,
      endRow: 20,
      status: 'loaded',
      data: [1],
      lastAccessed: 2000,
    });
    cache.setBlock(2, {
      startRow: 20,
      endRow: 30,
      status: 'loaded',
      data: [2],
      lastAccessed: 3000,
    });

    expect(cache.size).toBe(3);

    // Add one more block — should evict the oldest (block 0, lastAccessed: 1000)
    cache.setBlock(3, {
      startRow: 30,
      endRow: 40,
      status: 'loaded',
      data: [3],
      lastAccessed: 4000,
    });

    expect(cache.size).toBe(3);
    expect(cache.getBlock(0)).toBeUndefined(); // evicted
    expect(cache.getBlock(1)).toBeDefined();
    expect(cache.getBlock(2)).toBeDefined();
    expect(cache.getBlock(3)).toBeDefined();
  });

  it('clear empties all blocks', () => {
    const cache = new BlockCache(10, 10);

    cache.setBlock(0, {
      startRow: 0,
      endRow: 10,
      status: 'loaded',
      data: [0],
      lastAccessed: Date.now(),
    });
    cache.setBlock(1, {
      startRow: 10,
      endRow: 20,
      status: 'loaded',
      data: [1],
      lastAccessed: Date.now(),
    });

    expect(cache.size).toBe(2);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.getBlock(0)).toBeUndefined();
    expect(cache.getBlock(1)).toBeUndefined();
  });

  it('LRU eviction removes oldest accessed block', () => {
    const cache = new BlockCache(10, 2);

    // Add block 0 at time 1000
    cache.setBlock(0, {
      startRow: 0,
      endRow: 10,
      status: 'loaded',
      data: ['old'],
      lastAccessed: 1000,
    });

    // Add block 1 at time 2000
    cache.setBlock(1, {
      startRow: 10,
      endRow: 20,
      status: 'loaded',
      data: ['newer'],
      lastAccessed: 2000,
    });

    // Access block 0 to make it more recent
    cache.getBlock(0); // updates lastAccessed to now

    // Add block 2 — should evict block 1 (it now has the oldest lastAccessed)
    cache.setBlock(2, {
      startRow: 20,
      endRow: 30,
      status: 'loaded',
      data: ['newest'],
      lastAccessed: Date.now(),
    });

    expect(cache.size).toBe(2);
    expect(cache.getBlock(0)).toBeDefined(); // retained (recently accessed)
    expect(cache.getBlock(1)).toBeUndefined(); // evicted (oldest access)
    expect(cache.getBlock(2)).toBeDefined(); // newly added
  });
});
