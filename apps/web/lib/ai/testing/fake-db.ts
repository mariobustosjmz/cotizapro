import type { AiDb } from '../usage'

export interface RpcResult {
  readonly data: unknown
  readonly error: { readonly message: string } | null
}

export type RpcHandler = (args: Readonly<Record<string, unknown>>) => RpcResult

export interface RpcCall {
  readonly fn: string
  readonly args: Readonly<Record<string, unknown>>
}

export interface FakeDb {
  readonly db: AiDb
  readonly calls: readonly RpcCall[]
}

/** Doble de `supabase.rpc` para pruebas; `calls` se lee después de cada caso. */
export function fakeDb(handlers: Readonly<Record<string, RpcHandler>>): FakeDb {
  const calls: RpcCall[] = []
  const rpc = async (fn: string, args: Readonly<Record<string, unknown>> = {}): Promise<RpcResult> => {
    calls.push({ fn, args })
    const handler = handlers[fn]
    return handler ? handler(args) : { data: null, error: null }
  }
  return { db: { rpc } as unknown as AiDb, calls }
}
