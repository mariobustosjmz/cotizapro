import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAiQueue } from './queue'

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createAiQueue', () => {
  it('ejecuta una llamada a la vez en orden de llegada', async () => {
    const queue = createAiQueue({ maxWaiting: 6, waitTimeoutMs: 10_000 })
    const order: string[] = []
    const gate = deferred()
    const a = queue.run('org-a', async () => {
      order.push('a:start')
      await gate.promise
      order.push('a:end')
      return 'a'
    })
    const b = queue.run('org-b', async () => {
      order.push('b')
      return 'b'
    })
    expect(queue.stats()).toEqual({ running: 1, waiting: 1 })
    gate.resolve()
    await expect(Promise.all([a, b])).resolves.toEqual(['a', 'b'])
    expect(order).toEqual(['a:start', 'a:end', 'b'])
    expect(queue.stats()).toEqual({ running: 0, waiting: 0 })
  })

  it('rechaza una segunda llamada de la misma empresa', async () => {
    const queue = createAiQueue({ maxWaiting: 6, waitTimeoutMs: 10_000 })
    const gate = deferred()
    const first = queue.run('org-a', () => gate.promise)
    await expect(queue.run('org-a', async () => 'otra')).rejects.toMatchObject({ code: 'busy' })
    gate.resolve()
    await first
    await expect(queue.run('org-a', async () => 'después')).resolves.toBe('después')
  })

  it('con 6 en espera la siguiente recibe ocupada', async () => {
    const queue = createAiQueue({ maxWaiting: 6, waitTimeoutMs: 10_000 })
    const gate = deferred()
    const running = queue.run('org-0', () => gate.promise)
    const waiting = [1, 2, 3, 4, 5, 6].map((n) => queue.run(`org-${n}`, async () => n))
    await expect(queue.run('org-7', async () => 7)).rejects.toMatchObject({ code: 'busy' })
    gate.resolve()
    await running
    await expect(Promise.all(waiting)).resolves.toEqual([1, 2, 3, 4, 5, 6])
  })

  it('saca de la fila a quien espera más del límite', async () => {
    vi.useFakeTimers()
    const queue = createAiQueue({ maxWaiting: 6, waitTimeoutMs: 1000 })
    const gate = deferred()
    const running = queue.run('org-a', () => gate.promise)
    const late = queue.run('org-b', async () => 'b')
    const assertion = expect(late).rejects.toMatchObject({ code: 'busy' })
    vi.advanceTimersByTime(1001)
    await assertion
    expect(queue.stats()).toEqual({ running: 1, waiting: 0 })
    gate.resolve()
    await running
  })

  it('libera el turno aunque la llamada falle', async () => {
    const queue = createAiQueue({ maxWaiting: 6, waitTimeoutMs: 10_000 })
    await expect(queue.run('org-a', async () => { throw new Error('falla') })).rejects.toThrow('falla')
    await expect(queue.run('org-a', async () => 'ok')).resolves.toBe('ok')
  })

  it("respeta el orden de llegada con 4 o más trabajos", async () => {
    const queue = createAiQueue({ maxWaiting: 6, waitTimeoutMs: 10_000 })
    const started: string[] = []
    const gate = deferred()
    const jobs = ["a", "b", "c", "d", "e"].map((id, i) =>
      queue.run(`org-${id}`, async () => {
        started.push(id)
        if (i === 0) await gate.promise
        return id
      }),
    )
    expect(started).toEqual(["a"])
    gate.resolve()
    await expect(Promise.all(jobs)).resolves.toEqual(["a", "b", "c", "d", "e"])
    expect(started).toEqual(["a", "b", "c", "d", "e"])
    expect(queue.stats()).toEqual({ running: 0, waiting: 0 })
  })

  it("quien expira nunca ejecuta su tarea y su empresa queda libre", async () => {
    vi.useFakeTimers()
    const queue = createAiQueue({ maxWaiting: 6, waitTimeoutMs: 1000 })
    const gate = deferred()
    const running = queue.run("org-a", () => gate.promise)
    const lateTask = vi.fn(async () => "b")
    const late = queue.run("org-b", lateTask)
    const assertion = expect(late).rejects.toMatchObject({ code: "busy" })
    vi.advanceTimersByTime(1001)
    await assertion
    gate.resolve()
    await running
    expect(lateTask).not.toHaveBeenCalled()
    await expect(queue.run("org-b", async () => "otra vez")).resolves.toBe("otra vez")
    expect(queue.stats()).toEqual({ running: 0, waiting: 0 })
  })

  it("libera el turno si la tarea lanza de forma síncrona", async () => {
    const queue = createAiQueue({ maxWaiting: 6, waitTimeoutMs: 10_000 })
    const boom = (): Promise<string> => {
      throw new Error("síncrona")
    }
    await expect(queue.run("org-a", boom)).rejects.toThrow("síncrona")
    expect(queue.stats()).toEqual({ running: 0, waiting: 0 })
    await expect(queue.run("org-a", async () => "ok")).resolves.toBe("ok")
  })
})
