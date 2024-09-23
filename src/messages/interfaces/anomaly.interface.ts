export interface IAnomalyCalcResult { 
  currentCount: number,
  average: number,
  stdDev: number,
  interval: Date,
}

export interface IAnomalyAggResult {
  _id: Date,
  count: number,
}