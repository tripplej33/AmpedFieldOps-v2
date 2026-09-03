export type TradeType =
  | 'electrical'
  | 'plumbing'
  | 'automotive'
  | 'civil'
  | 'landscaping'
  | 'custom'

export interface TradeTerminology {
  project: string
  projects: string
  task: string
  tasks: string
  costCenter: string
  costCenters: string
  technician: string
  technicians: string
  clients: string
  vanStock: string
  fleet: string
  safety: string
  timesheets: string
  purchaseOrders: string
  financials: string
  schedule: string
  compliance?: string
  files: string
}

export interface ModuleFlags {
  dashboard: boolean
  clients: boolean
  projects: boolean
  schedule: boolean
  purchaseOrders: boolean
  vanStock: boolean
  fleet: boolean
  safety: boolean
  compliance?: boolean
  timesheets: boolean
  financials: boolean
  files: boolean
}

export interface TradeCustomizationConfig {
  tradeType: TradeType
  tradeName: string
  description?: string
  terminology: TradeTerminology
  modules: ModuleFlags
  updatedAt?: string
}

export type TerminologyKey = keyof TradeTerminology
export type ModuleKey = keyof ModuleFlags
