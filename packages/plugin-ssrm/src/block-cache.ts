// ─── Block Cache ───
// Block-based caching for server-side row model data.

import type { BlockState } from './types';

export class BlockCache {
  private blocks = new Map<number, BlockState>();
  private _maxBlocks: number;
  private _blockSize: number;

  constructor(blockSize: number, maxBlocks: number) {
    this._blockSize = blockSize;
    this._maxBlocks = maxBlocks;
  }

  /** Get the block size */
  get blockSize(): number {
    return this._blockSize;
  }

  /** Get the max blocks */
  get maxBlocks(): number {
    return this._maxBlocks;
  }

  /** Get the number of cached blocks */
  get size(): number {
    return this.blocks.size;
  }

  /** Get the block index for a given row index */
  getBlockIndex(rowIndex: number): number {
    return Math.floor(rowIndex / this._blockSize);
  }

  /** Get a cached block */
  getBlock(blockIndex: number): BlockState | undefined {
    const block = this.blocks.get(blockIndex);
    if (block) {
      block.lastAccessed = Date.now();
    }
    return block;
  }

  /** Set a block */
  setBlock(blockIndex: number, state: BlockState): void {
    this.blocks.set(blockIndex, state);
    this.evictIfNeeded();
  }

  /** Check if a row range needs to be fetched */
  getMissingBlocks(startRow: number, endRow: number): number[] {
    const missing: number[] = [];
    const startBlock = this.getBlockIndex(startRow);
    const endBlock = this.getBlockIndex(endRow - 1);

    for (let i = startBlock; i <= endBlock; i++) {
      const block = this.blocks.get(i);
      if (!block || block.status === 'failed') {
        missing.push(i);
      }
    }
    return missing;
  }

  /** Get rows from cache for a range */
  getRows(startRow: number, endRow: number): (any | null)[] {
    const rows: (any | null)[] = [];
    for (let i = startRow; i < endRow; i++) {
      const blockIndex = this.getBlockIndex(i);
      const block = this.blocks.get(blockIndex);
      if (block?.status === 'loaded') {
        const offset = i - blockIndex * this._blockSize;
        rows.push(block.data[offset] ?? null);
      } else {
        rows.push(null);
      }
    }
    return rows;
  }

  /** Clear all cached blocks */
  clear(): void {
    this.blocks.clear();
  }

  /** Purge oldest blocks if over capacity */
  private evictIfNeeded(): void {
    while (this.blocks.size > this._maxBlocks) {
      let oldestKey = -1;
      let oldestTime = Infinity;
      for (const [key, block] of this.blocks) {
        if (block.lastAccessed < oldestTime) {
          oldestTime = block.lastAccessed;
          oldestKey = key;
        }
      }
      if (oldestKey >= 0) {
        this.blocks.delete(oldestKey);
      }
    }
  }
}
