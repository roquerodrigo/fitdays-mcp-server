export type SexLabel = 'female' | 'male'

export const sexLabel = (sex: number): SexLabel => sex === 0 ? 'male' : 'female'
