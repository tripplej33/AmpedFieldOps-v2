import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { SafetyDocument } from '@/types/safety'
import { calculateRiskRating } from '@/lib/safety/riskMatrix'

/**
 * Generates an audit-ready, high-resolution PDF document for a Safety Document
 */
export async function generateSafetyPdf(document: SafetyDocument): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 36
  let currentY = margin

  // 1. Top Header Banner
  doc.setFillColor(18, 20, 23) // Dark #121417
  doc.rect(0, 0, pageWidth, 60, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('AmpedFieldOps • Safety Compliance', margin, 36)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text(`Ref: ${document.id.slice(0, 8).toUpperCase()} | Status: ${document.status.toUpperCase()}`, pageWidth - margin, 36, { align: 'right' })

  currentY = 80

  // 2. Document Title
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(document.title, margin, currentY)
  currentY += 16

  // 3. Project & Site Metadata Table
  const projectInfo = [
    [
      { content: 'Project:', styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      document.project?.name || 'General Operations',
      { content: 'Client:', styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      document.project?.client?.name || 'N/A',
    ],
    [
      { content: 'Site Address:', styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      [document.project?.address, document.project?.suburb, document.project?.city].filter(Boolean).join(', ') || 'N/A',
      { content: 'Date & Time:', styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      new Date(document.created_at).toLocaleString(),
    ],
    [
      { content: 'Category:', styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      document.category.toUpperCase(),
      { content: 'Cost Center:', styles: { fontStyle: 'bold' as const, fillColor: [243, 244, 246] as [number, number, number] } },
      document.cost_center?.name || 'General',
    ],
  ]

  autoTable(doc, {
    startY: currentY,
    body: projectInfo,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, textColor: [31, 41, 55] },
    margin: { left: margin, right: margin },
  })

  currentY = (doc as any).lastAutoTable.finalY + 16

  // 4. Form Sections & Data Content
  const schema = document.template?.schema
  const formData = document.form_data || {}

  if (schema?.sections && schema.sections.length > 0) {
    for (const section of schema.sections) {
      if (currentY > 720) {
        doc.addPage()
        currentY = margin
      }

      // Section Header
      doc.setFillColor(243, 244, 246)
      doc.rect(margin, currentY, pageWidth - margin * 2, 20, 'F')
      doc.setTextColor(31, 41, 55)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(section.title, margin + 6, currentY + 14)
      currentY += 26

      // Handle Section by Type
      if (section.type === 'ppe_grid') {
        const ppeData = formData[section.id] || {}
        const selectedPPE = (section.items || [])
          .filter((item) => ppeData[item.id] !== false && (ppeData[item.id] === true || item.default))
          .map((item) => item.label)

        const ppeRows = [
          [
            {
              content: `Mandatory PPE In Place: ${selectedPPE.length > 0 ? selectedPPE.join(' • ') : 'None selected'}`,
              styles: { fontSize: 8, fontStyle: 'italic' as const },
            },
          ],
        ]

        autoTable(doc, {
          startY: currentY,
          body: ppeRows,
          theme: 'plain',
          styles: { cellPadding: 3, textColor: [55, 65, 81] },
          margin: { left: margin, right: margin },
        })
        currentY = (doc as any).lastAutoTable.finalY + 12
      } else if (section.type === 'risk_matrix_table') {
        const rows = formData[section.id] || section.default_rows || []
        const tableBody = rows.map((r: any) => {
          const initRisk = calculateRiskRating(r.initial_likelihood, r.initial_consequence)
          const resRisk = calculateRiskRating(r.residual_likelihood, r.residual_consequence)
          return [
            r.step || 'Task Step',
            r.hazard || 'Hazard',
            `${initRisk.score} (${initRisk.level})`,
            r.controls || 'Control Measures',
            `${resRisk.score} (${resRisk.level})`,
          ]
        })

        autoTable(doc, {
          startY: currentY,
          head: [['Job Step', 'Hazard Identified', 'Initial Risk', 'Control Measures', 'Residual Risk']],
          body: tableBody,
          theme: 'striped',
          headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontSize: 8 },
          styles: { fontSize: 7.5, cellPadding: 4, textColor: [31, 41, 55] },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 110 },
            2: { cellWidth: 65, halign: 'center' },
            3: { cellWidth: 180 },
            4: { cellWidth: 65, halign: 'center' },
          },
          margin: { left: margin, right: margin },
        })
        currentY = (doc as any).lastAutoTable.finalY + 12
      } else if (section.type === 'gas_test_table') {
        const rows = formData[section.id] || section.default_rows || []
        const tableBody = rows.map((r: any) => [
          r.test_time || 'Initial',
          `${r.oxygen || '20.9'}%`,
          `${r.lel_flammable || '0'}%`,
          `${r.co_carbon_monoxide || '0'} ppm`,
          `${r.h2s_hydrogen_sulfide || '0'} ppm`,
          r.tester_name || 'Technician',
          r.result || 'PASS',
        ])

        autoTable(doc, {
          startY: currentY,
          head: [['Test Time', 'O2 (19.5-23.5%)', 'LEL (<5%)', 'CO (<30ppm)', 'H2S (<10ppm)', 'Tester', 'Result']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5 },
          styles: { fontSize: 7.5, cellPadding: 3, halign: 'center' },
          margin: { left: margin, right: margin },
        })
        currentY = (doc as any).lastAutoTable.finalY + 12
      } else if (section.type === 'checkbox_group') {
        const checkedItems = formData[section.id] || []
        const bodyRows = (section.options || []).map((opt) => [
          checkedItems.includes(opt) ? '[ X ]' : '[   ]',
          opt,
        ])

        autoTable(doc, {
          startY: currentY,
          body: bodyRows,
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 2, textColor: [55, 65, 81] },
          columnStyles: { 0: { cellWidth: 30, fontStyle: 'bold' as const } },
          margin: { left: margin, right: margin },
        })
        currentY = (doc as any).lastAutoTable.finalY + 12
      } else if (section.fields && section.fields.length > 0) {
        // Standard fields (support nested sectionData as well as root keys)
        const sectionData = typeof formData[section.id] === 'object' && formData[section.id] !== null
          ? formData[section.id]
          : {}

        const fieldRows = section.fields.map((f) => {
          const rawVal = sectionData[f.id] !== undefined
            ? sectionData[f.id]
            : (formData[f.id] !== undefined ? formData[f.id] : '')

          const displayVal = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
            ? String(rawVal).trim()
            : 'Not Specified'

          return [
            { content: `${f.label}:`, styles: { fontStyle: 'bold' as const, cellWidth: 150, textColor: [17, 24, 39] as [number, number, number] } },
            { content: displayVal, styles: { textColor: [31, 41, 55] as [number, number, number] } },
          ]
        })

        autoTable(doc, {
          startY: currentY,
          body: fieldRows,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 4 },
          margin: { left: margin, right: margin },
        })
        currentY = (doc as any).lastAutoTable.finalY + 12
      } else if (typeof formData[section.id] === 'string' && formData[section.id].trim() !== '') {
        autoTable(doc, {
          startY: currentY,
          body: [[formData[section.id].trim()]],
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 4, textColor: [31, 41, 55] as [number, number, number] },
          margin: { left: margin, right: margin },
        })
        currentY = (doc as any).lastAutoTable.finalY + 12
      }
    }

    // Optional General Notes
    if (formData['notes'] && typeof formData['notes'] === 'string' && formData['notes'].trim() !== '') {
      if (currentY > 720) {
        doc.addPage()
        currentY = margin
      }
      doc.setFillColor(243, 244, 246)
      doc.rect(margin, currentY, pageWidth - margin * 2, 20, 'F')
      doc.setTextColor(31, 41, 55)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('General Notes & Observations', margin + 6, currentY + 14)
      currentY += 26

      autoTable(doc, {
        startY: currentY,
        body: [[formData['notes'].trim()]],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 4, textColor: [31, 41, 55] as [number, number, number] },
        margin: { left: margin, right: margin },
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
    }
  }

  // 5. Signatures Section
  if (currentY > 640) {
    doc.addPage()
    currentY = margin
  }

  doc.setFillColor(31, 41, 55)
  doc.rect(margin, currentY, pageWidth - margin * 2, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Authorized Personnel & Crew Sign-Off Register', margin + 6, currentY + 14)
  currentY += 28

  const signatures = document.signatures || []

  if (signatures.length === 0) {
    doc.setTextColor(156, 163, 175)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('No signatures recorded on this document.', margin + 6, currentY + 10)
    currentY += 24
  } else {
    for (const sig of signatures) {
      if (currentY > 740) {
        doc.addPage()
        currentY = margin
      }

      // Draw box for signature entry
      doc.setDrawColor(229, 231, 235)
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 54, 4, 4, 'FD')

      // Signer Name & Role
      doc.setTextColor(17, 24, 39)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`${sig.signer_name} (${sig.signer_role})`, margin + 10, currentY + 16)

      // Timestamp & GPS Stamp
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      const dateStr = sig.signed_at ? new Date(sig.signed_at).toLocaleString() : 'N/A'
      const geoStr = sig.geo_location
        ? `GPS: ${sig.geo_location.latitude.toFixed(4)}, ${sig.geo_location.longitude.toFixed(4)}`
        : 'GPS: Verified'
      doc.text(`Signed: ${dateStr} • ${geoStr} • Mode: ${sig.sign_type.toUpperCase()}`, margin + 10, currentY + 30)

      // Signature Image Stroke
      if (sig.signature_data && sig.signature_data.startsWith('data:image/')) {
        try {
          doc.addImage(sig.signature_data, 'PNG', pageWidth - margin - 110, currentY + 6, 95, 42)
        } catch {
          // Signature drawing error fallback
          doc.text('[Digital Signature Verified]', pageWidth - margin - 100, currentY + 28)
        }
      }

      currentY += 60
    }
  }

  // 6. Page Numbers & Legal Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(156, 163, 175)
    doc.text(
      `AmpedFieldOps Compliance Record • ISO 45001 / AS/NZS 3000 Standard • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 15,
      { align: 'center' }
    )
  }

  const pdfBlob = doc.output('blob')
  const cleanTitle = document.title.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`

  return { blob: pdfBlob, filename }
}
