// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Dependency Graph ───
// DAG for tracking formula cell dependencies and computing evaluation order.

export class DependencyGraph {
  // Map from cell key to the set of cell keys it depends on
  private dependencies: Map<string, Set<string>> = new Map();
  // Map from cell key to the set of cell keys that depend on it
  private dependents: Map<string, Set<string>> = new Map();

  /**
   * Register that `cellKey` depends on `depKeys`.
   */
  setDependencies(cell: string, depKeys: string[]): void {
    // Remove old dependencies
    this.removeDependencies(cell);

    // Add new dependencies
    const depSet = new Set(depKeys);
    this.dependencies.set(cell, depSet);

    for (const dep of depKeys) {
      let set = this.dependents.get(dep);
      if (!set) {
        set = new Set();
        this.dependents.set(dep, set);
      }
      set.add(cell);
    }
  }

  /**
   * Remove all dependency information for a cell.
   */
  removeDependencies(cell: string): void {
    const oldDeps = this.dependencies.get(cell);
    if (oldDeps) {
      for (const dep of oldDeps) {
        const set = this.dependents.get(dep);
        if (set) {
          set.delete(cell);
          if (set.size === 0) {
            this.dependents.delete(dep);
          }
        }
      }
    }
    this.dependencies.delete(cell);
  }

  /**
   * Get all cells that transitively depend on the given cell.
   * Returns them in topological order (dependents come after their dependencies).
   */
  getDependents(cell: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (key: string) => {
      if (visited.has(key)) return;
      visited.add(key);
      const deps = this.dependents.get(key);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }
      result.push(key);
    };

    // Start from direct dependents of the changed cell
    const directDeps = this.dependents.get(cell);
    if (directDeps) {
      for (const dep of directDeps) {
        visit(dep);
      }
    }

    return result;
  }

  /**
   * Topological sort of all formula cells.
   * Returns cells in evaluation order (dependencies before dependents).
   * Returns null if a cycle is detected.
   */
  topologicalSort(formulaCells: string[]): string[] | null {
    const cycle = this.detectCycle(formulaCells);
    if (cycle) return null;

    const visited = new Set<string>();
    const result: string[] = [];
    const formulaSet = new Set(formulaCells);

    const visit = (key: string) => {
      if (visited.has(key)) return;
      visited.add(key);
      const deps = this.dependencies.get(key);
      if (deps) {
        for (const dep of deps) {
          if (formulaSet.has(dep)) {
            visit(dep);
          }
        }
      }
      result.push(key);
    };

    for (const cell of formulaCells) {
      visit(cell);
    }

    return result;
  }

  /**
   * Detect circular references using DFS.
   * Returns the cells involved in a cycle, or null if none found.
   */
  detectCycle(formulaCells?: string[]): string[] | null {
    const cells = formulaCells ?? Array.from(this.dependencies.keys());
    const WHITE = 0; // unvisited
    const GRAY = 1; // in progress
    const BLACK = 2; // completed
    const color = new Map<string, number>();
    const parent = new Map<string, string>();

    for (const cell of cells) {
      color.set(cell, WHITE);
    }

    const dfs = (u: string): string[] | null => {
      color.set(u, GRAY);
      const deps = this.dependencies.get(u);
      if (deps) {
        for (const v of deps) {
          const c = color.get(v);
          if (c === GRAY) {
            // Found cycle — reconstruct it
            const cycle = [v, u];
            return cycle;
          }
          if (c === WHITE || c === undefined) {
            // If c is undefined, the dep is a non-formula cell, skip
            if (color.has(v)) {
              parent.set(v, u);
              const result = dfs(v);
              if (result) return result;
            }
          }
        }
      }
      color.set(u, BLACK);
      return null;
    };

    for (const cell of cells) {
      if (color.get(cell) === WHITE) {
        const cycle = dfs(cell);
        if (cycle) return cycle;
      }
    }

    return null;
  }

  /**
   * Check if adding dependencies for a cell would create a cycle.
   */
  wouldCreateCycle(cell: string, newDeps: string[]): boolean {
    // Temporarily add the dependencies
    const oldDeps = this.dependencies.get(cell);
    this.dependencies.set(cell, new Set(newDeps));

    const visited = new Set<string>();
    const inStack = new Set<string>();

    const hasCycle = (key: string): boolean => {
      if (inStack.has(key)) return true;
      if (visited.has(key)) return false;
      visited.add(key);
      inStack.add(key);
      const deps = this.dependencies.get(key);
      if (deps) {
        for (const dep of deps) {
          if (hasCycle(dep)) return true;
        }
      }
      inStack.delete(key);
      return false;
    };

    const result = hasCycle(cell);

    // Restore old dependencies
    if (oldDeps) {
      this.dependencies.set(cell, oldDeps);
    } else {
      this.dependencies.delete(cell);
    }

    return result;
  }

  /**
   * Clear the entire graph.
   */
  clear(): void {
    this.dependencies.clear();
    this.dependents.clear();
  }
}
