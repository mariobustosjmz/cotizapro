import { AiError } from './errors'

export interface AiQueueOptions {
  readonly maxWaiting: number
  readonly waitTimeoutMs: number
}

export interface AiQueue {
  run<T>(orgId: string, task: () => Promise<T>): Promise<T>
  stats(): { readonly running: number; readonly waiting: number }
}

interface Waiter {
  readonly orgId: string
  readonly start: () => void
  readonly timer: ReturnType<typeof setTimeout>
}

/** Semáforo en memoria: Ollama es compartido y sin GPU, así que una sola generación a la vez por servidor. */
export function createAiQueue({ maxWaiting, waitTimeoutMs }: AiQueueOptions): AiQueue {
  let running = false
  let waiting: readonly Waiter[] = []
  let orgs: ReadonlySet<string> = new Set()

  const forgetOrg = (orgId: string): void => {
    orgs = new Set([...orgs].filter((o) => o !== orgId))
  }

  function release(orgId: string): void {
    forgetOrg(orgId)
    const [next, ...rest] = waiting
    waiting = rest
    if (!next) {
      running = false
      return
    }
    clearTimeout(next.timer)
    next.start()
  }

  async function execute<T>(orgId: string, task: () => Promise<T>): Promise<T> {
    try {
      return await task()
    } finally {
      release(orgId)
    }
  }

  function enqueue<T>(orgId: string, task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiting = waiting.filter((w) => w !== waiter)
        forgetOrg(orgId)
        reject(new AiError('busy', 'queue_timeout'))
      }, waitTimeoutMs)
      const waiter: Waiter = { orgId, timer, start: () => execute(orgId, task).then(resolve, reject) }
      waiting = [...waiting, waiter]
    })
  }

  return {
    // La tarea debe tener su propio tiempo límite: la cola no impone tope a lo que está corriendo.
    run<T>(orgId: string, task: () => Promise<T>): Promise<T> {
      if (orgs.has(orgId)) return Promise.reject(new AiError('busy', 'org_busy'))
      if (running && waiting.length >= maxWaiting) return Promise.reject(new AiError('busy', 'queue_full'))
      orgs = new Set([...orgs, orgId])
      if (running) return enqueue(orgId, task)
      running = true
      return execute(orgId, task)
    },
    stats: () => ({ running: running ? 1 : 0, waiting: waiting.length }),
  }
}
