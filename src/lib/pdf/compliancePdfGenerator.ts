import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ElectricalCertificate, SwitchboardSchedule } from '@/types/compliance'
import type { CompanyProfile } from '@/hooks/useCompanyProfile'

export function generateCertificatePdf(
  cert: ElectricalCertificate,
  companyProfile?: CompanyProfile
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const companyName = companyProfile?.companyName || 'Amped Electrical & Field Operations Ltd'
  const logoDataUrl = companyProfile?.logoUrl || null
  const nzbn = companyProfile?.nzbn || '9429050012345'
  const phone = companyProfile?.phone || '+64 21 000 0000'
  const email = companyProfile?.supportEmail || 'compliance@ampedlogix.com'

  const certTitle =
    cert.cert_type === 'coc'
      ? 'Certificate of Compliance (CoC)'
      : cert.cert_type === 'esc'
      ? 'Electrical Safety Certificate (ESC)'
      : 'Combined CoC & Electrical Safety Certificate'

  // Header Background Banner
  doc.setFillColor(15, 23, 42) // Dark Slate
  doc.rect(0, 0, 210, 36, 'F')

  // Accent Line
  doc.setFillColor(59, 130, 246) // Blue accent
  doc.rect(0, 36, 210, 1.5, 'F')

  let titleStartX = 14

  // Embed Logo if available
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 14, 6, 24, 24)
      titleStartX = 42
    } catch {
      titleStartX = 14
    }
  }

  // Company Name & Certificate Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, titleStartX, 14)

  doc.setFontSize(11)
  doc.setTextColor(96, 165, 250) // Sky blue
  doc.text(certTitle.toUpperCase(), titleStartX, 21)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(203, 213, 225)
  doc.text(
    `NZBN: ${nzbn} • Phone: ${phone} • Email: ${email} • AS/NZS 3000:2018 Compliant`,
    titleStartX,
    28
  )

  // Certificate Number & Date Badge (Top Right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(`CERT #: ${cert.cert_number}`, 196, 14, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(203, 213, 225)
  doc.text(`Date: ${cert.certification_date}`, 196, 20, { align: 'right' })
  doc.text(`Status: ${cert.status.toUpperCase()}`, 196, 26, { align: 'right' })

  let currentY = 44

  // Section 1: Installation & Client Details Table
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['1. INSTALLATION & PROPERTY DETAILS', '2. CLIENT / OWNER DETAILS']],
    body: [
      [
        `Project: ${cert.project?.name || 'General Electrical Work'}\nSite Address: ${
          [cert.project?.address, cert.project?.suburb, cert.project?.city].filter(Boolean).join(', ') || 'On Site'
        }\nInstallation Type: ${cert.installation_type.replace('_', ' ').toUpperCase()}\nHigh Risk Work: ${
          cert.is_high_risk ? 'YES - ' + (cert.high_risk_details || 'Recorded') : 'NO'
        }`,
        `Client: ${cert.project?.client?.name || 'Customer'}\nIssuing Org: ${companyName}\nSupply System: ${
          cert.test_sheet?.supply_system || 'MEN (230V / 400V 50Hz)'
        }\nMain Earth: ${cert.test_sheet?.main_earth_resistance || 0.5} Ω (${
          cert.test_sheet?.earth_electrode_type || 'Driven Rod'
        })`,
      ],
    ],
  })

  currentY = (doc as any).lastAutoTable.finalY + 4

  // Section 2: AS/NZS 3000 Verification Test Results
  const testRows = (cert.test_sheet?.circuits || []).map((c) => [
    c.circuitNumber || '1',
    c.description || 'Circuit',
    `${c.breakerRating || '16A'} ${c.breakerType || 'MCB'}`,
    c.rpe !== null && c.rpe !== undefined ? `${c.rpe} Ω` : 'N/A',
    c.rins !== null && c.rins !== undefined ? `${c.rins} MΩ` : 'N/A',
    c.polarity ? 'CORRECT' : 'FAIL',
    c.zs !== null && c.zs !== undefined ? `${c.zs} Ω` : 'N/A',
    c.rcdTripTime !== null && c.rcdTripTime !== undefined ? `${c.rcdTripTime} ms` : 'N/A',
    c.pass ? 'PASS' : 'FAIL',
  ])

  if (testRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      head: [['Cct', 'Description', 'Protection', 'Rpe (Earth)', 'Rins (MΩ)', 'Polarity', 'Zs (Loop)', 'RCD (ms)', 'Result']],
      body: testRows,
    })

    currentY = (doc as any).lastAutoTable.finalY + 4
  }

  // Section 3: Statutory Declaration
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(14, currentY, 182, 28, 2, 2, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('3. STATUTORY CERTIFIER DECLARATION (Electricity Act & AS/NZS 3000)', 18, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(51, 65, 85)
  doc.text(
    'I hereby certify that the electrical installation / prescribed electrical work described in this certificate has been\ninstalled, inspected, and tested in accordance with the Electricity (Safety) Regulations and AS/NZS 3000 Standards,\nis electrically safe to connect to electricity supply, and is certified for lawful operation.',
    18,
    currentY + 12
  )

  doc.setFont('helvetica', 'bold')
  doc.text(`Certifier: ${cert.certifier_name} • Registered Practitioner #: ${cert.certifier_registration}`, 18, currentY + 24)

  currentY += 34

  // Section 4: Dual Signatures Table
  const sigBoxWidth = 88
  const sigBoxHeight = 32

  // Practitioner Signature Box
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(14, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('CERTIFIER SIGNATURE:', 18, currentY + 5)

  if (cert.certifier_signature_svg) {
    try {
      doc.addImage(cert.certifier_signature_svg, 'PNG', 18, currentY + 7, 50, 18)
    } catch {}
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`${cert.certifier_name} (${cert.certifier_registration})`, 18, currentY + 28)

  // Client / Receiver Signature Box
  doc.roundedRect(108, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT / OWNER ACKNOWLEDGEMENT:', 112, currentY + 5)

  if (cert.client_signature_svg) {
    try {
      doc.addImage(cert.client_signature_svg, 'PNG', 112, currentY + 7, 50, 18)
    } catch {}
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`${cert.client_signer_name || 'Customer Signature'} • Date: ${cert.certification_date}`, 112, currentY + 28)

  // Page Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `${companyName} • Electrical Compliance Record • AS/NZS 3000 / Electricity (Safety) Regulations • Page 1 of 1`,
    105,
    pageHeight - 6,
    { align: 'center' }
  )

  return doc
}

export function generateSwitchboardSchedulePdf(
  schedule: SwitchboardSchedule,
  companyProfile?: CompanyProfile
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const companyName = companyProfile?.companyName || 'Amped Electrical & Field Operations Ltd'

  // Header Banner
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, 297, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`SWITCHBOARD DIRECTORY: ${schedule.board_name.toUpperCase()}`, 14, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(203, 213, 225)
  doc.text(
    `Location: ${schedule.location || 'Main Board'} • Incomer: ${schedule.incomer_rating || '63A'} • Enclosure: ${schedule.enclosure_type || 'Standard'} • ${companyName}`,
    14,
    18
  )

  const rows = (schedule.circuits || []).map((c) => [
    c.circuitNo || '1',
    c.phase || 'Single',
    `${c.breakerRating || '16A'} (${c.poles || 1}P)`,
    c.cableSize || '2.5mm²',
    c.rcdGroup || 'None',
    c.isSpare ? 'SPARE' : c.description || 'General Power',
  ])

  autoTable(doc, {
    startY: 30,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Cct #', 'Phase', 'Breaker', 'Cable Size', 'RCD Group', 'Description / Load']],
    body: rows.length > 0 ? rows : [['1', 'Single', '16A (1P)', '2.5mm²', 'RCD 1', 'General Power Outlets']],
  })

  return doc
}
