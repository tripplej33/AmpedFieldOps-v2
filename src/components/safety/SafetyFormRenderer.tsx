import type { SafetySchema, RiskMatrixRow, GasTestRow } from '@/types/safety'
import { calculateRiskRating, LIKELIHOOD_LEVELS, CONSEQUENCE_LEVELS } from '@/lib/safety/riskMatrix'

interface SafetyFormRendererProps {
  schema: SafetySchema
  formData: Record<string, any>
  onChange: (sectionId: string, value: any) => void
  readOnly?: boolean
}

export default function SafetyFormRenderer({
  schema,
  formData,
  onChange,
  readOnly = false,
}: SafetyFormRendererProps) {
  if (!schema?.sections || schema.sections.length === 0) {
    return (
      <div className="p-6 text-center text-text-muted text-xs">
        No form sections defined in this template.
      </div>
    )
  }

  // Handle updates to nested standard fields
  const handleFieldChange = (sectionId: string, fieldId: string, value: any) => {
    const currentSectionData = formData[sectionId] || {}
    onChange(sectionId, {
      ...currentSectionData,
      [fieldId]: value,
    })
  }

  // Handle updates to PPE grid toggles
  const handlePPEToggle = (sectionId: string, ppeId: string, currentVal: boolean) => {
    if (readOnly) return
    const currentPPE = formData[sectionId] || {}
    onChange(sectionId, {
      ...currentPPE,
      [ppeId]: !currentVal,
    })
  }

  // Handle Checkbox Group toggles
  const handleCheckboxGroupToggle = (sectionId: string, option: string) => {
    if (readOnly) return
    const currentOptions: string[] = formData[sectionId] || []
    if (currentOptions.includes(option)) {
      onChange(
        sectionId,
        currentOptions.filter((opt) => opt !== option)
      )
    } else {
      onChange(sectionId, [...currentOptions, option])
    }
  }

  // Handle Risk Matrix Row Updates
  const handleRiskRowUpdate = (
    sectionId: string,
    rowIndex: number,
    updatedRow: Partial<RiskMatrixRow>
  ) => {
    if (readOnly) return
    const section = schema.sections.find((s) => s.id === sectionId)
    const currentRows: RiskMatrixRow[] = formData[sectionId] || section?.default_rows || []
    const newRows = [...currentRows]
    newRows[rowIndex] = { ...newRows[rowIndex], ...updatedRow }
    onChange(sectionId, newRows)
  }

  const handleAddRiskRow = (sectionId: string) => {
    if (readOnly) return
    const section = schema.sections.find((s) => s.id === sectionId)
    const currentRows: RiskMatrixRow[] = formData[sectionId] || section?.default_rows || []
    const newRow: RiskMatrixRow = {
      step: '',
      hazard: '',
      initial_likelihood: 3,
      initial_consequence: 3,
      controls: '',
      residual_likelihood: 1,
      residual_consequence: 2,
    }
    onChange(sectionId, [...currentRows, newRow])
  }

  const handleDeleteRiskRow = (sectionId: string, rowIndex: number) => {
    if (readOnly) return
    const section = schema.sections.find((s) => s.id === sectionId)
    const currentRows: RiskMatrixRow[] = formData[sectionId] || section?.default_rows || []
    const newRows = currentRows.filter((_, idx) => idx !== rowIndex)
    onChange(sectionId, newRows)
  }

  // Handle Gas Test Row Updates
  const handleGasRowUpdate = (
    sectionId: string,
    rowIndex: number,
    updatedRow: Partial<GasTestRow>
  ) => {
    if (readOnly) return
    const section = schema.sections.find((s) => s.id === sectionId)
    const currentRows: GasTestRow[] = formData[sectionId] || section?.default_rows || []
    const newRows = [...currentRows]
    newRows[rowIndex] = { ...newRows[rowIndex], ...updatedRow }
    onChange(sectionId, newRows)
  }

  const handleAddGasRow = (sectionId: string) => {
    if (readOnly) return
    const section = schema.sections.find((s) => s.id === sectionId)
    const currentRows: GasTestRow[] = formData[sectionId] || section?.default_rows || []
    const newRow: GasTestRow = {
      test_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      oxygen: '20.9',
      lel_flammable: '0',
      co_carbon_monoxide: '0',
      h2s_hydrogen_sulfide: '0',
      tester_name: '',
      result: 'PASS',
    }
    onChange(sectionId, [...currentRows, newRow])
  }

  return (
    <div className="space-y-6">
      {schema.sections.map((section) => {
        // Render 1: PPE Grid
        if (section.type === 'ppe_grid') {
          const ppeData = formData[section.id] || {}
          return (
            <div
              key={section.id}
              className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-3"
            >
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">safety_check</span>
                  {section.title}
                </h4>
                {section.description && (
                  <p className="text-[11px] text-text-muted mt-0.5">{section.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {(section.items || []).map((item) => {
                  const isChecked =
                    ppeData[item.id] !== undefined ? ppeData[item.id] : !!item.default
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => handlePPEToggle(section.id, item.id, isChecked)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        isChecked
                          ? 'border-primary/80 bg-primary/10 text-white shadow-sm'
                          : 'border-border-dark bg-background-dark/80 text-text-muted hover:border-border-dark/80'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-primary text-white'
                            : 'bg-card-dark text-text-muted border border-border-dark'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">{item.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate leading-tight">{item.label}</p>
                        <p className="text-[10px] text-text-muted leading-tight mt-0.5">
                          {isChecked ? 'Required' : 'Optional'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        }

        // Render 2: Checkbox Group (e.g. HRCW Flags)
        if (section.type === 'checkbox_group') {
          const checkedOptions: string[] = formData[section.id] || []
          return (
            <div
              key={section.id}
              className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-3"
            >
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-base">warning</span>
                  {section.title}
                </h4>
                {section.description && (
                  <p className="text-[11px] text-text-muted mt-0.5">{section.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {(section.options || []).map((opt, idx) => {
                  const isChecked = checkedOptions.includes(opt)
                  return (
                    <label
                      key={idx}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                          : 'border-border-dark bg-background-dark/80 text-text-muted hover:text-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={readOnly}
                        onChange={() => handleCheckboxGroupToggle(section.id, opt)}
                        className="mt-0.5 rounded border-border-dark bg-card-dark text-primary focus:ring-primary h-4 w-4 shrink-0"
                      />
                      <span className="leading-snug">{opt}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        }

        // Render 3: 5x5 Risk Matrix Table
        if (section.type === 'risk_matrix_table') {
          const rows: RiskMatrixRow[] = formData[section.id] || section.default_rows || []
          return (
            <div
              key={section.id}
              className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">grid_view</span>
                    {section.title}
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Evaluate initial risk (Likelihood × Consequence), apply controls, and verify residual risk.
                  </p>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleAddRiskRow(section.id)}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Job Step
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {rows.map((row, idx) => {
                  const initRisk = calculateRiskRating(
                    row.initial_likelihood,
                    row.initial_consequence
                  )
                  const resRisk = calculateRiskRating(
                    row.residual_likelihood,
                    row.residual_consequence
                  )

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-background-dark/90 border border-border-dark space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                          Step #{idx + 1}
                        </span>
                        {!readOnly && rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRiskRow(section.id, idx)}
                            className="text-text-muted hover:text-red-400 text-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-text-muted">
                            Task Step / Work Activity
                          </label>
                          <input
                            type="text"
                            value={row.step}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleRiskRowUpdate(section.id, idx, { step: e.target.value })
                            }
                            placeholder="e.g. Isolate Switchboard at Main Breaker"
                            className="w-full px-3 py-1.5 bg-card-dark border border-border-dark focus:border-primary rounded-lg text-xs text-white placeholder-text-muted/40 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-text-muted">
                            Potential Hazard Identified
                          </label>
                          <input
                            type="text"
                            value={row.hazard}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleRiskRowUpdate(section.id, idx, { hazard: e.target.value })
                            }
                            placeholder="e.g. Electric shock, accidental energisation"
                            className="w-full px-3 py-1.5 bg-card-dark border border-border-dark focus:border-primary rounded-lg text-xs text-white placeholder-text-muted/40 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Risk Scores Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Inherent Risk */}
                        <div className="p-3 rounded-lg bg-card-dark/60 border border-border-dark/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-text-muted">
                              Inherent Risk (Pre-Controls)
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${initRisk.bgClass} ${initRisk.colorClass} ${initRisk.borderClass}`}
                            >
                              Score: {initRisk.score} ({initRisk.level})
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={row.initial_likelihood}
                              disabled={readOnly}
                              onChange={(e) =>
                                handleRiskRowUpdate(section.id, idx, {
                                  initial_likelihood: Number(e.target.value),
                                })
                              }
                              className="px-2 py-1 bg-background-dark border border-border-dark rounded-md text-[11px] text-white focus:outline-none"
                            >
                              {LIKELIHOOD_LEVELS.map((lvl) => (
                                <option key={lvl.value} value={lvl.value}>
                                  L: {lvl.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={row.initial_consequence}
                              disabled={readOnly}
                              onChange={(e) =>
                                handleRiskRowUpdate(section.id, idx, {
                                  initial_consequence: Number(e.target.value),
                                })
                              }
                              className="px-2 py-1 bg-background-dark border border-border-dark rounded-md text-[11px] text-white focus:outline-none"
                            >
                              {CONSEQUENCE_LEVELS.map((lvl) => (
                                <option key={lvl.value} value={lvl.value}>
                                  C: {lvl.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Residual Risk */}
                        <div className="p-3 rounded-lg bg-card-dark/60 border border-border-dark/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-text-muted">
                              Residual Risk (Post-Controls)
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${resRisk.bgClass} ${resRisk.colorClass} ${resRisk.borderClass}`}
                            >
                              Score: {resRisk.score} ({resRisk.level})
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={row.residual_likelihood}
                              disabled={readOnly}
                              onChange={(e) =>
                                handleRiskRowUpdate(section.id, idx, {
                                  residual_likelihood: Number(e.target.value),
                                })
                              }
                              className="px-2 py-1 bg-background-dark border border-border-dark rounded-md text-[11px] text-white focus:outline-none"
                            >
                              {LIKELIHOOD_LEVELS.map((lvl) => (
                                <option key={lvl.value} value={lvl.value}>
                                  L: {lvl.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={row.residual_consequence}
                              disabled={readOnly}
                              onChange={(e) =>
                                handleRiskRowUpdate(section.id, idx, {
                                  residual_consequence: Number(e.target.value),
                                })
                              }
                              className="px-2 py-1 bg-background-dark border border-border-dark rounded-md text-[11px] text-white focus:outline-none"
                            >
                              {CONSEQUENCE_LEVELS.map((lvl) => (
                                <option key={lvl.value} value={lvl.value}>
                                  C: {lvl.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Control Measures */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-text-muted">
                          Hierarchy of Control Measures
                        </label>
                        <textarea
                          rows={2}
                          value={row.controls}
                          disabled={readOnly}
                          onChange={(e) =>
                            handleRiskRowUpdate(section.id, idx, { controls: e.target.value })
                          }
                          placeholder="Describe specific isolation, barriers, tags, PPE, and test procedures..."
                          className="w-full px-3 py-1.5 bg-card-dark border border-border-dark focus:border-primary rounded-lg text-xs text-white placeholder-text-muted/40 focus:outline-none leading-relaxed"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        // Render 4: Confined Space Gas Test Table
        if (section.type === 'gas_test_table') {
          const rows: GasTestRow[] = formData[section.id] || section.default_rows || []
          return (
            <div
              key={section.id}
              className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-cyan-400 text-base">air</span>
                    {section.title}
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Safe Limits: O2 (19.5% - 23.5%) | LEL (&lt;5%) | CO (&lt;30ppm) | H2S (&lt;10ppm)
                  </p>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleAddGasRow(section.id)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Log Gas Reading
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-border-dark rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-background-dark text-text-muted text-[11px] font-semibold border-b border-border-dark">
                    <tr>
                      <th className="p-2.5">Time / Stage</th>
                      <th className="p-2.5">O2 %</th>
                      <th className="p-2.5">LEL %</th>
                      <th className="p-2.5">CO ppm</th>
                      <th className="p-2.5">H2S ppm</th>
                      <th className="p-2.5">Tester Name</th>
                      <th className="p-2.5">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark/60">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="bg-card-dark/40 hover:bg-card-dark/80">
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.test_time}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleGasRowUpdate(section.id, idx, { test_time: e.target.value })
                            }
                            className="w-24 px-2 py-1 bg-background-dark border border-border-dark rounded text-xs text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.oxygen}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleGasRowUpdate(section.id, idx, { oxygen: e.target.value })
                            }
                            className="w-16 px-2 py-1 bg-background-dark border border-border-dark rounded text-xs text-white font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.lel_flammable}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleGasRowUpdate(section.id, idx, {
                                lel_flammable: e.target.value,
                              })
                            }
                            className="w-16 px-2 py-1 bg-background-dark border border-border-dark rounded text-xs text-white font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.co_carbon_monoxide}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleGasRowUpdate(section.id, idx, {
                                co_carbon_monoxide: e.target.value,
                              })
                            }
                            className="w-16 px-2 py-1 bg-background-dark border border-border-dark rounded text-xs text-white font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.h2s_hydrogen_sulfide}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleGasRowUpdate(section.id, idx, {
                                h2s_hydrogen_sulfide: e.target.value,
                              })
                            }
                            className="w-16 px-2 py-1 bg-background-dark border border-border-dark rounded text-xs text-white font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.tester_name}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleGasRowUpdate(section.id, idx, {
                                tester_name: e.target.value,
                              })
                            }
                            placeholder="Tester"
                            className="w-28 px-2 py-1 bg-background-dark border border-border-dark rounded text-xs text-white"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.result}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleGasRowUpdate(section.id, idx, {
                                result: e.target.value as 'PASS' | 'FAIL',
                              })
                            }
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              row.result === 'PASS'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        // Render 5: Standard Fields Section
        const sectionData = formData[section.id] || {}
        return (
          <div
            key={section.id}
            className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-4"
          >
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">description</span>
                {section.title}
              </h4>
              {section.description && (
                <p className="text-[11px] text-text-muted mt-0.5">{section.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(section.fields || []).map((field) => {
                const val = sectionData[field.id] !== undefined ? sectionData[field.id] : ''

                if (field.type === 'textarea') {
                  return (
                    <div key={field.id} className="md:col-span-2 space-y-1">
                      <label className="block text-xs font-semibold text-white/90">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <textarea
                        rows={3}
                        value={val}
                        disabled={readOnly}
                        placeholder={field.placeholder}
                        onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                        className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/40 focus:outline-none leading-relaxed"
                      />
                    </div>
                  )
                }

                if (field.type === 'select') {
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-xs font-semibold text-white/90">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <select
                        value={val}
                        disabled={readOnly}
                        onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                        className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white focus:outline-none"
                      >
                        <option value="">-- Select Option --</option>
                        {(field.options || []).map((opt, oIdx) => (
                          <option key={oIdx} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-xs font-semibold text-white/90">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={val}
                      disabled={readOnly}
                      placeholder={field.placeholder}
                      onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                      className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/40 focus:outline-none"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
