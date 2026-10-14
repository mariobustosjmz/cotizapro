export interface RunHandle {
  readonly signal: AbortSignal
}

export interface RunGuard {
  readonly start: () => RunHandle | null
  readonly finish: (handle: RunHandle) => boolean
  readonly abortAll: () => void
  readonly isActive: () => boolean
}

/** Una sola ejecución a la vez; solo la ejecución vigente puede bajar el estado de carga. */
export function createRunGuard(): RunGuard {
  let current: { readonly handle: RunHandle; readonly controller: AbortController } | null = null
  return {
    start() {
      if (current) return null
      const controller = new AbortController()
      current = { handle: { signal: controller.signal }, controller }
      return current.handle
    },
    finish(handle) {
      if (current?.handle !== handle) return false
      current = null
      return true
    },
    abortAll() {
      current?.controller.abort()
      current = null
    },
    isActive: () => current !== null,
  }
}
