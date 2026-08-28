import type { User, WeightRecord } from 'fitdays-api'

export type BodyTypeLabel =
  | 'Athletic' |
  'Balanced' |
  'Hidden Overweight' |
  'Muscular' |
  'Muscular Overweight' |
  'Muscular Slim' |
  'Obese' |
  'Overweight' |
  'Slightly Underweight' |
  'Slim' |
  'Underweight'

export type SexLabel = 'female' | 'male'

/**
 * `FitDays SDK filed `WeightExtData` is FitDays App API oriented. It is not suitable as an MCP response type.
 * This shape removes App-specific and weight-unrelated fields and converts raw values into LLM-friendly ones.
 */
export type WeightExtensionDataSummary = {
  age: number

  bfmControl: number
  bfmMax: number
  bfmMin: number
  bfmStandard: number

  bfpMax: number
  bfpMin: number
  bfpStandard: number

  bmiMax: number
  bmiMin: number
  bmiStandard: number

  bmrMax: number
  bmrMin: number
  bmrStandard: number

  bodyScore: number
  bodyType: 'unknown' | BodyTypeLabel

  boneMax: number
  boneMin: number

  deviceModelExt: string
  deviceNameExt: string
  deviceSoftwareVer: null | string

  ffmControl: number
  ffmStandard: number

  height: number

  muscleMassMax: number
  muscleMassMin: number

  obesityDegree: number
  onlyMeasureWeight: boolean

  proteinMassMax: number
  proteinMassMin: number

  recalculate: boolean
  sex: SexLabel

  smi: number
  smmMax: number
  smmMin: number
  smmStandard: number

  targetBodyfatMass: null | number
  targetSMMMass: null | number
  targetWeight: number

  waterMassMax: number
  waterMassMin: number

  weightControl: number
  weightMax: number
  weightMin: number
  weightStandard: number
}

type WeightSummary = {
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

const BODY_TYPE_LABELS: Readonly<Record<number, BodyTypeLabel>> = {
  0: 'Underweight',
  1: 'Slightly Underweight',
  2: 'Muscular Slim',
  3: 'Slim',
  4: 'Muscular',
  5: 'Balanced',
  6: 'Athletic',
  7: 'Muscular Overweight',
  8: 'Obese',
  9: 'Overweight',
  10: 'Hidden Overweight',
}

export const sexLabel = (sex: number): SexLabel => sex === 0 ? 'male' : 'female'

const summarizeExtensionData = (
  extensionData: NonNullable<WeightRecord['ext_data']> | null,
): null | WeightExtensionDataSummary => {
  if (extensionData === null) return null

  return {
    age: extensionData.age,

    bfmControl: extensionData.bfmControl,
    bfmMax: extensionData.bfmMax,
    bfmMin: extensionData.bfmMin,
    bfmStandard: extensionData.bfmStandard,

    bfpMax: extensionData.bfpMax,
    bfpMin: extensionData.bfpMin,
    bfpStandard: extensionData.bfpStandard,

    bmiMax: extensionData.bmiMax,
    bmiMin: extensionData.bmiMin,
    bmiStandard: extensionData.bmiStandard,

    bmrMax: extensionData.bmrMax,
    bmrMin: extensionData.bmrMin,
    bmrStandard: extensionData.bmrStandard,

    bodyScore: extensionData.bodyScore,
    bodyType: BODY_TYPE_LABELS[extensionData.bodyType] ?? 'unknown',

    boneMax: extensionData.boneMax,
    boneMin: extensionData.boneMin,

    deviceModelExt: extensionData.deviceModelExt,
    deviceNameExt: extensionData.deviceNameExt,
    deviceSoftwareVer: extensionData.deviceSoftwareVer ?? null,

    ffmControl: extensionData.ffmControl,
    ffmStandard: extensionData.ffmStandard,

    height: extensionData.height,

    muscleMassMax: extensionData.muscleMassMax,
    muscleMassMin: extensionData.muscleMassMin,

    obesityDegree: extensionData.obesityDegree,
    onlyMeasureWeight: extensionData.onlyMeasureWeight === '1',

    proteinMassMax: extensionData.proteinMassMax,
    proteinMassMin: extensionData.proteinMassMin,

    recalculate: 'recalculate' in extensionData &&
      typeof extensionData.recalculate === 'boolean' ?
      extensionData.recalculate :
      false,
    sex: sexLabel(extensionData.sex),

    smi: extensionData.smi,
    smmMax: extensionData.smmMax,
    smmMin: extensionData.smmMin,
    smmStandard: extensionData.smmStandard,

    targetBodyfatMass: extensionData.targetBodyfatMass ?? null,
    targetSMMMass: extensionData.targetSMMMass ?? null,
    targetWeight: extensionData.targetWeight,

    waterMassMax: extensionData.waterMassMax,
    waterMassMin: extensionData.waterMassMin,

    weightControl: extensionData.weightControl,
    weightMax: extensionData.weightMax,
    weightMin: extensionData.weightMin,
    weightStandard: extensionData.weightStandard,
  }
}

/** Convert an SDK user record into the MCP user response shape. */
export const summarizeUser = (user: User) => ({
  birthday: user.birthday,
  height_cm: user.height,
  nickname: user.nickname,
  sex: sexLabel(user.sex),
  suid: user.suid,
  target_weight_kg: user.target_weight,
  uid: user.uid,
})

/** Convert an SDK weight record into the MCP weight response shape. */
export const summarizeWeight = (
  weightRecord: WeightRecord,
  includeExtensionData = true,
): WeightSummary => ({
  bfr_pct: weightRecord.bfr,
  bm_kg: weightRecord.bm,
  bmi: weightRecord.bmi,
  bmr_kcal: weightRecord.bmr,
  bodyage: weightRecord.bodyage,
  data_id: weightRecord.data_id,
  ...(includeExtensionData ?
      { ext_data: summarizeExtensionData(weightRecord.ext_data) } :
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
