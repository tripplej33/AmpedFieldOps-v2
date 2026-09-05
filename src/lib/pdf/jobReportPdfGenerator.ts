import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CompanyProfile } from '@/hooks/useCompanyProfile'
import type { Timesheet, ProjectMaterial, ProjectSnag } from '@/types'
import type { EquipmentUsageLog } from '@/types/plant'
import type { ProjectSitePhoto } from '@/types/photos'

export interface JobReportData {
  projectName: string
  clientName: string
  clientAddress?: string
  dateRange: string
  executiveSummary?: string
  includeSummary?: boolean
  timesheets: Timesheet[]
  includeTimesheets?: boolean
  equipmentLogs: EquipmentUsageLog[]
  includeEquipment?: boolean
  materials: ProjectMaterial[]
  includeMaterials?: boolean
  snags?: ProjectSnag[]
  includeSnags?: boolean
  photos: (ProjectSitePhoto & { base64DataUrl?: string })[]
  includePhotos?: boolean
  clientSignerName?: string
  clientSignatureSvg?: string
  includeSignoff?: boolean
}

export function generateJobReportPdf(data: JobReportData, companyProfile?: CompanyProfile): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const renderHeader = () => {
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, pageWidth, 36, 'F')

    if (companyProfile?.logoUrl) {
      try {
        doc.addImage(companyProfile.logoUrl, 'PNG', margin, 6, 24, 24)
      } catch {
        // Fallback
      }
    }

    const headerLeftOffset = companyProfile?.logoUrl ? margin + 28 : margin
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text(companyProfile?.companyName || 'AMPED LOGIX LTD', headerLeftOffset, 14)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(203, 213, 225)
    doc.text('FIELD OPERATIONS & JOB COMPLETION REPORT', headerLeftOffset, 20)
    doc.text(`Project: ${data.projectName} • Client: ${data.clientName}`, headerLeftOffset, 26)

    // Top-Right Date
    doc.setFontSize(8)
    doc.setTextColor(245, 158, 11) // Amber 500
    doc.setFont('helvetica', 'bold')
    doc.text(`Period: ${data.dateRange}`, pageWidth - margin, 18, { align: 'right' })
  }

  // 1. Initial Page Header
  renderHeader()
  let currentY = 44

  // 2. Executive Summary
  if (data.includeSummary !== false && data.executiveSummary) {
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('1. JOB SCOPE & EXECUTIVE WORK SUMMARY', margin, currentY)
    currentY += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    const summaryText = data.executiveSummary
    const splitSummary = doc.splitTextToSize(summaryText, pageWidth - (margin * 2))
    doc.text(splitSummary, margin, currentY)
    currentY += splitSummary.length * 4 + 6
  }

  // 3. Technician Timesheet & Shift Work Logs
  if (data.includeTimesheets !== false && data.timesheets && data.timesheets.length > 0) {
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('2. TECHNICIAN SHIFT & TASK LOGS', margin, currentY)
    currentY += 4

    const tsRows = data.timesheets.map((ts) => [
      ts.entry_date ? new Date(ts.entry_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—',
      ts.user?.full_name || 'Technician',
      ts.activity_type?.name || 'General Labor',
      `${Number(ts.hours || 0).toFixed(1)} hrs`,
      ts.notes || 'Work completed per schedule.',
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Date', 'Technician', 'Activity', 'Hours', 'Work Notes & Site Observations']],
      body: tsRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 32 },
        2: { cellWidth: 28 },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 'auto' },
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  }

  // 4. Plant & Heavy Equipment Log (Diggers, Pressure Washers)
  if (data.includeEquipment !== false && data.equipmentLogs && data.equipmentLogs.length > 0) {
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('3. HEAVY PLANT & EQUIPMENT DEPLOYED', margin, currentY)
    currentY += 4

    const eqRows = data.equipmentLogs.map((eq) => [
      eq.date || '—',
      eq.vehicle?.make_model || 'Plant Equipment',
      eq.vehicle?.asset_category?.toUpperCase().replace('_', ' ') || 'PLANT',
      `${Number(eq.units_used || 0).toFixed(1)} ${eq.tracking_type || 'hrs'}`,
      eq.notes || 'Operating as planned.',
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Date', 'Equipment / Machine', 'Category', 'Usage Units', 'Operating Notes']],
      body: eqRows,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 'auto' },
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  }

  // 5. Materials Consumed
  if (data.includeMaterials !== false && data.materials && data.materials.length > 0) {
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('4. MATERIALS & PARTS INSTALLED', margin, currentY)
    currentY += 4

    const matRows = data.materials.map((m) => [
      m.description || m.inventory_item?.name || 'Material Item',
      Number(m.quantity_used || 1).toString(),
      `$${Number(m.charge_out_rate || 0).toFixed(2)}`,
      `$${(Number(m.quantity_used || 1) * Number(m.charge_out_rate || 0)).toFixed(2)}`,
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Part / Item Name', 'Quantity', 'Rate', 'Total']],
      body: matRows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  }

  // 6. Snag List & QA Closeout Items
  if (data.includeSnags !== false && data.snags && data.snags.length > 0) {
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('5. QUALITY ASSURANCE & DEFECT CLOSEOUT', margin, currentY)
    currentY += 4

    const snagRows = data.snags.map((snag) => [
      snag.title,
      snag.location || 'Site',
      snag.status.toUpperCase().replace('_', ' '),
      snag.priority.toUpperCase(),
      snag.description || 'Verified and completed.',
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Defect / Snag Item', 'Location', 'Status', 'Priority', 'Resolution Notes']],
      body: snagRows,
      theme: 'grid',
      headStyles: { fillColor: [14, 116, 144], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 'auto' },
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  }

  // 7. Site Photo Evidence Gallery Appendix
  if (data.includePhotos !== false && data.photos && data.photos.length > 0) {
    doc.addPage()
    currentY = 20

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('SITE PHOTO EVIDENCE & VERIFICATION GALLERY', margin, currentY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Certified on-site photos captured by field technicians during execution.', margin, currentY + 5)
    currentY += 12

    const colWidth = 86
    const rowHeight = 65
    let col = 0

    for (let i = 0; i < data.photos.length; i++) {
      const p = data.photos[i]
      if (currentY + rowHeight > pageHeight - 20) {
        doc.addPage()
        currentY = 20
        col = 0
      }

      const x = margin + col * (colWidth + 10)
      const y = currentY

      // Card border
      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(x, y, colWidth, rowHeight, 2, 2, 'FD')

      // Embed Image if base64 available
      if (p.base64DataUrl || p.photo_url) {
        try {
          const imgSource = (p.base64DataUrl || p.photo_url) as string
          let format = 'JPEG'
          if (imgSource.startsWith('data:image/png')) {
            format = 'PNG'
          } else if (imgSource.startsWith('data:image/webp')) {
            format = 'WEBP'
          }
          doc.addImage(imgSource, format, x + 2, y + 2, colWidth - 4, 44)
        } catch {
          doc.setFillColor(241, 245, 249)
          doc.rect(x + 2, y + 2, colWidth - 4, 44, 'F')
          doc.setFontSize(8)
          doc.setTextColor(148, 163, 184)
          doc.text('[ Photo Evidence Attached ]', x + colWidth / 2, y + 24, { align: 'center' })
        }
      }

      // Caption & metadata
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      const catTag = p.category ? `[${p.category.toUpperCase()}] ` : ''
      const captionText = `${catTag}${p.caption || 'Site progress photo'}`
      doc.text(captionText.length > 36 ? captionText.slice(0, 34) + '...' : captionText, x + 3, y + 51)

      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      const dateStr = p.taken_at ? new Date(p.taken_at).toLocaleString() : new Date().toLocaleDateString()
      doc.text(`Taken: ${dateStr}`, x + 3, y + 56)

      if (p.latitude && p.longitude) {
        doc.text(`GPS: ${Number(p.latitude).toFixed(4)}, ${Number(p.longitude).toFixed(4)}`, x + 3, y + 61)
      }

      if (col === 1) {
        col = 0
        currentY += rowHeight + 6
      } else {
        col = 1
      }
    }

    if (col === 1) {
      currentY += rowHeight + 6
    }
  }

  // 8. Client Sign-Off & Verification
  if (data.includeSignoff !== false) {
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENT WORK ACCEPTANCE & SIGN-OFF', margin, currentY)
    currentY += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text('I confirm that the work detailed in this field report has been completed to my satisfaction.', margin, currentY)
    currentY += 8

    // Signature box
    doc.setDrawColor(203, 213, 225)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 2, 2, 'FD')

    if (data.clientSignatureSvg) {
      try {
        doc.addImage(data.clientSignatureSvg, 'PNG', margin + 4, currentY + 2, 45, 18)
      } catch {
        // Fallback
      }
    }

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`Client Signer: ${data.clientSignerName || data.clientName}`, margin + 55, currentY + 10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Date Signed: ${new Date().toLocaleDateString()}`, margin + 55, currentY + 16)
  }

  // Final Footer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(148, 163, 184)
  doc.text('AmpedFieldOps Verified Service Handover Pack • Confidential', pageWidth / 2, 287, { align: 'center' })

  return doc
}
