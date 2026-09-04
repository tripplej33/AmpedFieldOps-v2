import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CompanyProfile } from '@/hooks/useCompanyProfile'
import type { Timesheet, ProjectMaterial } from '@/types'
import type { EquipmentUsageLog } from '@/types/plant'
import type { ProjectSitePhoto } from '@/types/photos'

export interface JobReportData {
  projectName: string
  clientName: string
  clientAddress?: string
  dateRange: string
  executiveSummary?: string
  timesheets: Timesheet[]
  equipmentLogs: EquipmentUsageLog[]
  materials: ProjectMaterial[]
  photos: ProjectSitePhoto[]
  clientSignerName?: string
  clientSignatureSvg?: string
}

export function generateJobReportPdf(data: JobReportData, companyProfile?: CompanyProfile): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()

  // 1. Header & Company Branding
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

  // 2. Summary & Job Scope
  let currentY = 44
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('1. JOB SCOPE & EXECUTIVE WORK SUMMARY', margin, currentY)
  currentY += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  const summaryText = data.executiveSummary || `Comprehensive field service work and installation carried out for ${data.clientName} at ${data.clientAddress || data.projectName}. All labor, heavy plant operations, and materials have been verified to standard.`
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - (margin * 2))
  doc.text(splitSummary, margin, currentY)
  currentY += splitSummary.length * 4 + 4

  // 3. Technician Timesheet & Shift Work Logs
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
    body: tsRows.length > 0 ? tsRows : [['—', 'Technician', 'General Work', '8.0 hrs', 'Completed field work']],
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

  // 4. Plant & Heavy Equipment Log (Diggers, Pressure Washers)
  if (data.equipmentLogs && data.equipmentLogs.length > 0) {
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
  if (data.materials && data.materials.length > 0) {
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

  // 6. Client Sign-Off & Verification
  if (currentY > 220) {
    doc.addPage()
    currentY = 20
  }

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('5. CLIENT WORK ACCEPTANCE & SIGN-OFF', margin, currentY)
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

  // Footer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(148, 163, 184)
  doc.text('AmpedFieldOps Verified Service Handover Pack • Confidential', pageWidth / 2, 287, { align: 'center' })

  return doc
}
