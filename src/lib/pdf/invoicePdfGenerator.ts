import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Invoice } from '@/types/invoicing'
import type { CompanyProfile } from '@/hooks/useCompanyProfile'

export function generateInvoicePdf(invoice: Invoice, companyProfile?: CompanyProfile): jsPDF {
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
      // Fallback text
    }
  }

  const headerLeftOffset = companyProfile?.logoUrl ? margin + 28 : margin
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(companyProfile?.companyName || 'AMPED LOGIX LTD', headerLeftOffset, 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(203, 213, 225)
  const coDetails = [
    companyProfile?.address,
    companyProfile?.phone ? `Phone: ${companyProfile.phone}` : null,
    companyProfile?.supportEmail ? `Email: ${companyProfile.supportEmail}` : null,
    companyProfile?.nzbn ? `GST / NZBN: ${companyProfile.nzbn}` : null,
  ].filter(Boolean).join(' • ')
  doc.text(coDetails || 'New Zealand Registered Field Services', headerLeftOffset, 20)

  // Top-right TAX INVOICE
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(245, 158, 11) // Amber 500
  doc.text('TAX INVOICE', pageWidth - margin, 16, { align: 'right' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(`# ${invoice.invoice_number}`, pageWidth - margin, 24, { align: 'right' })

  // 2. Client & Invoice Metadata Box
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE TO:', margin, 46)
  doc.text('INVOICE DETAILS:', pageWidth / 2 + 10, 46)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(invoice.client?.name || 'Client', margin, 52)
  if (invoice.client?.address) {
    doc.text(invoice.client.address, margin, 57)
  }
  if (invoice.client?.email) {
    doc.text(`Email: ${invoice.client.email}`, margin, 62)
  }

  doc.text(`Issue Date: ${invoice.issue_date}`, pageWidth / 2 + 10, 52)
  doc.text(`Due Date: ${invoice.due_date}`, pageWidth / 2 + 10, 57)
  doc.text(`Project: ${invoice.project?.name || 'General Project Work'}`, pageWidth / 2 + 10, 62)

  // 3. Line Items Table
  const tableRows = (invoice.line_items || []).map((item, idx) => [
    idx + 1,
    item.description,
    item.item_type.toUpperCase().replace('_', ' '),
    Number(item.quantity).toFixed(2),
    `$${Number(item.unit_price).toFixed(2)}`,
    `$${Number(item.line_total).toFixed(2)}`,
  ])

  autoTable(doc, {
    startY: 70,
    margin: { left: margin, right: margin },
    head: [['#', 'Description', 'Type', 'Qty / Hrs', 'Unit Price', 'Total']],
    body: tableRows.length > 0 ? tableRows : [['1', 'Field service and electrical labor', 'LABOR', '1.00', `$${invoice.subtotal.toFixed(2)}`, `$${invoice.subtotal.toFixed(2)}`]],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
  })

  // 4. Totals & Payment Details
  const finalY = (doc as any).lastAutoTable.finalY + 8

  // Bank & Remittance
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('PAYMENT INSTRUCTIONS & REMITTANCE:', margin, finalY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(`Bank Account: 12-3456-7890123-00`, margin, finalY + 5)
  doc.text(`Reference: ${invoice.invoice_number}`, margin, finalY + 10)
  if (invoice.notes) {
    doc.text(`Notes: ${invoice.notes}`, margin, finalY + 15)
  }

  // Right Totals Box
  const totalsX = pageWidth - margin - 60
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text('Subtotal:', totalsX, finalY + 5)
  doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - margin, finalY + 5, { align: 'right' })

  doc.text(`GST (${invoice.tax_rate}%):`, totalsX, finalY + 11)
  doc.text(`$${invoice.tax_total.toFixed(2)}`, pageWidth - margin, finalY + 11, { align: 'right' })

  doc.setDrawColor(203, 213, 225)
  doc.line(totalsX, finalY + 14, pageWidth - margin, finalY + 14)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Total Due:', totalsX, finalY + 20)
  doc.text(`$${invoice.total_amount.toFixed(2)}`, pageWidth - margin, finalY + 20, { align: 'right' })

  // Footer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(148, 163, 184)
  doc.text('Thank you for your business. Generated by AmpedFieldOps.', pageWidth / 2, 285, { align: 'center' })

  return doc
}
