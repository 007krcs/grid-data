/**
 * Create a snapshot before a paste operation (if time-travel plugin is available).
 */
export function snapshotBeforePaste(ctx: any, label: string): void {
  try {
    ctx.commandBus.dispatch('timeTravel:snapshot' as any, {
      label: `Before ${label}`,
    });
  } catch {
    // Time-travel plugin not installed, skip
  }
}

/**
 * Create a snapshot after a paste operation (if time-travel plugin is available).
 */
export function snapshotAfterPaste(ctx: any, label: string): void {
  try {
    ctx.commandBus.dispatch('timeTravel:snapshot' as any, {
      label: `After ${label}`,
    });
  } catch {
    // Time-travel plugin not installed, skip
  }
}
