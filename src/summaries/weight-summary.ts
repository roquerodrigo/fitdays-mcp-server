import type { WeightRecord } from 'fitdays-api'

import { summarizeWeightExtensionData, type WeightExtensionDataSummary } from './weight-extension-data-summary.js'

export type WeightSummary = {
  bfr_pct: number
  bm_kg: number
  bmi: number
  bmr_kcal: number
  bodyage: number
  data_id: string
  ext_data?: null | WeightExtensionDataSummary
  is_deleted: 0 | 1
  measured_at: string
  measured_time: number
  pp_pct: number
  rom_pct: number
  rosm_pct: number
  sfr_pct: number
  suid: number
  uid: number
  uvi: number
  vwc_pct: number
  weight_kg: number
  weight_lb: number
}

export const summarizeWeight = (
  weightRecord: WeightRecord,
  includeExtensionData: boolean,
): WeightSummary => ({
  bfr_pct: weightRecord.bfr,
  bm_kg: weightRecord.bm,
  bmi: weightRecord.bmi,
  bmr_kcal: weightRecord.bmr,
  bodyage: weightRecord.bodyage,
  data_id: weightRecord.data_id,
  ...(includeExtensionData ?
      { ext_data: summarizeWeightExtensionData(weightRecord.ext_data) } :
      {}),
  is_deleted: weightRecord.is_deleted,
  measured_at: new Date(weightRecord.measured_time * 1000).toISOString(),
  measured_time: weightRecord.measured_time,
  pp_pct: weightRecord.pp,
  rom_pct: weightRecord.rom,
  rosm_pct: weightRecord.rosm,
  sfr_pct: weightRecord.sfr,
  suid: weightRecord.suid,
  uid: weightRecord.uid,
  uvi: weightRecord.uvi,
  vwc_pct: weightRecord.vwc,
  weight_kg: weightRecord.weight_kg,
  weight_lb: weightRecord.weight_lb,
})
