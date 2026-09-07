import type { User } from 'fitdays-api'

import { type SexLabel, sexLabel } from './sex-label.js'

export type UserSummary = {
  birthday: string
  height_cm: number
  nickname: string
  sex: SexLabel
  suid: number
  target_weight_kg: number
  uid: number
}

export const summarizeUser = (user: User): UserSummary => ({
  birthday: user.birthday,
  height_cm: user.height,
  nickname: user.nickname,
  sex: sexLabel(user.sex),
  suid: user.suid,
  target_weight_kg: user.target_weight,
  uid: user.uid,
})
