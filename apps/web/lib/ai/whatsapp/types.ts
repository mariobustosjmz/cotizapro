export interface DraftClient {
  readonly name: string | null
  readonly phone: string | null
  readonly email: string | null
  readonly zone: string | null
}

export interface DraftItem {
  readonly concept: string
  readonly quantity: number
  readonly widthM: number | null
  readonly heightM: number | null
  readonly notes: string | null
}

export interface DraftExtraction {
  readonly client: DraftClient
  readonly items: readonly DraftItem[]
  readonly notes: string | null
}
