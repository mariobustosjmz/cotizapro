export const RESERVATION_FIXTURE = [
  { event_id: '11111111-1111-4111-8111-111111111111', nonce: '22222222-2222-4222-8222-222222222222' },
] as const

export const SUMMARY_FIXTURE = {
  used: 2,
  allowance: 400,
  pack_credits: 0,
  remaining: 398,
  percent: 0,
  resets_on: '2026-11-01',
  enforced: true,
  by_feature: [{ feature: 'describe_item', credits: 2, uses: 1 }],
  packs: [],
}
