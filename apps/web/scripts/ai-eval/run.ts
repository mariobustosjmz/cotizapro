import { readFileSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { chatJson } from '@/lib/ai/client'
import { loadAiConfig, type AiConfig } from '@/lib/ai/config'
import { assertEvalAllowed } from '@/lib/ai/eval/guard'
import { scoreCase, summarize, type CaseScore, type EvalCase } from '@/lib/ai/eval/score'
import { AI_FEATURES } from '@/lib/ai/features'
import { whatsappDraftMessages } from '@/lib/ai/prompts/whatsapp-draft'
import { normalizeExtraction, rawExtractionSchema } from '@/lib/ai/whatsapp/extraction'

const ORG = { name: 'Negocio de prueba', trade: process.env.AI_EVAL_TRADE ?? 'glass' }
const anyObject = z.record(z.string(), z.unknown())
const casesSchema = z.array(
  z.object({
    id: z.string(),
    message: z.string(),
    expected: z.object({
      zone: z.string().nullable(),
      clientName: z.string().nullable(),
      phone: z.string().nullable(),
      items: z.array(z.object({ concept: z.string(), quantity: z.number(), widthM: z.number().nullable(), heightM: z.number().nullable() })),
    }),
  }),
)
const out = (line: string): void => {
  process.stdout.write(`${line}\n`)
}
const flag = (value: boolean): string => (value ? 'sí' : 'no')

function loadCases(): readonly EvalCase[] {
  const file = path.resolve(__dirname, 'messages.json')
  return casesSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
}

async function runCase(config: AiConfig, testCase: EvalCase): Promise<{ score: CaseScore; latencyMs: number }> {
  const spec = AI_FEATURES.whatsapp_draft
  const result = await chatJson({ config }, whatsappDraftMessages(ORG, testCase.message), anyObject, { temperature: spec.temperature, maxTokens: spec.maxTokens })
  const extraction = normalizeExtraction(rawExtractionSchema.parse(result.value))
  return { score: scoreCase(testCase.id, testCase.expected, extraction, JSON.stringify(result.value)), latencyMs: result.latencyMs }
}

async function main(): Promise<void> {
  assertEvalAllowed(process.env, process.argv.slice(2))
  const config = loadAiConfig()
  out(`Modelo ${config.model} en ${config.baseUrl}`)
  const scores: CaseScore[] = []
  const latencies: number[] = []
  for (const testCase of loadCases()) {
    try {
      const { score, latencyMs } = await runCase(config, testCase)
      scores.push(score)
      latencies.push(latencyMs)
      out(`${score.id}  ${score.score.toFixed(2)}  zona:${flag(score.zone)} cliente:${flag(score.client)} partidas:${flag(score.items)} medidas:${flag(score.measures)} sin-precio:${flag(score.noPrice)}  ${latencyMs} ms`)
    } catch (error) {
      scores.push({ id: testCase.id, zone: false, client: false, items: false, measures: false, noPrice: true, score: 0.2 })
      out(`${testCase.id}  error: ${error instanceof Error ? error.name : 'desconocido'}`)
    }
  }
  const summary = summarize(scores)
  const sorted = [...latencies].sort((a, b) => a - b)
  out(`Promedio ${(summary.average * 100).toFixed(0)} % · zona ${(summary.zoneRate * 100).toFixed(0)} % · p50 ${sorted[Math.floor(sorted.length / 2)] ?? 0} ms · máx ${sorted[sorted.length - 1] ?? 0} ms`)
  out(summary.passed ? 'Meta alcanzada (≥ 90 %)' : 'Meta NO alcanzada (< 90 %)')
  process.exitCode = summary.passed ? 0 : 1
}

main().catch((error: unknown) => {
  out(`ai:eval abortó: ${error instanceof Error ? error.message : 'error desconocido'}`)
  process.exitCode = 1
})
