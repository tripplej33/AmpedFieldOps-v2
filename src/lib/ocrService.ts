import Tesseract from 'tesseract.js'

export interface ExtractedLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface ExtractedDocumentData {
  vendor: string
  date: string
  invoiceNumber: string
  subtotal: number
  tax: number
  totalAmount: number
  lineItems: ExtractedLineItem[]
  rawText: string
  confidenceScore: number
}

const KNOWN_VENDORS = [
  { name: 'Bunnings Warehouse', keys: ['bunnings'] },
  { name: 'Mitre 10 MEGA', keys: ['mitre 10', 'mitre10', 'mega'] },
  { name: 'Corys Electrical', keys: ['corys'] },
  { name: 'Ideal Electrical Supplies', keys: ['ideal electrical', 'rexel'] },
  { name: 'JA Russell Electrical', keys: ['ja russell', 'j.a. russell', 'radcliffe'] },
  { name: 'Placemakers', keys: ['placemakers'] },
  { name: 'Carters Building Supplies', keys: ['carters'] },
  { name: 'ITM Building Supplies', keys: ['itm', 'independent timber'] },
  { name: 'Plumbing World', keys: ['plumbing world'] },
  { name: 'NZ Safety Blackwoods', keys: ['blackwoods', 'safety blackwoods'] },
  { name: 'Repco', keys: ['repco'] },
  { name: 'Supercheap Auto', keys: ['supercheap'] },
  { name: 'BP Fuel Station', keys: ['bp connect', 'wild bean', 'bp 2go', 'bp oil', 'bp petrol'] },
  { name: 'Z Energy', keys: ['z energy', 'z retail', 'z service', 'z station'] },
  { name: 'Mobil', keys: ['mobil'] },
  { name: 'Caltex', keys: ['caltex'] },
  { name: 'Gull Fuel', keys: ['gull'] },
  { name: 'Spark New Zealand', keys: ['spark'] },
  { name: 'One NZ', keys: ['one nz', 'vodafone'] },
  { name: '2degrees', keys: ['2degrees'] },
  { name: 'The Warehouse', keys: ['the warehouse', 'warehouse stationery'] },
]

/**
 * Parses raw OCR text into structured invoice/receipt data
 */
export function parseReceiptText(
  rawText: string,
  fileName: string = '',
  confidence: number = 0.95
): ExtractedDocumentData {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // 1. Vendor Extraction
  let vendor = 'Merchant Receipt'

  // Match against known merchants in the first 8 lines
  for (const line of lines.slice(0, 8)) {
    const lower = line.toLowerCase()
    const found = KNOWN_VENDORS.find((v) => v.keys.some((k) => lower.includes(k)))
    if (found) {
      vendor = found.name
      break
    }
  }

  // Check filename hints if still default
  if (vendor === 'Merchant Receipt' && fileName) {
    const lowerFile = fileName.toLowerCase()
    const found = KNOWN_VENDORS.find((v) => v.keys.some((k) => lowerFile.includes(k)))
    if (found) vendor = found.name
  }

  // Generic header extraction if still default
  if (vendor === 'Merchant Receipt') {
    for (const line of lines.slice(0, 5)) {
      if (
        line.length >= 3 &&
        !/^(tax invoice|invoice|receipt|welcome|gst|abn|phone|date|customer|store|order)/i.test(line) &&
        /[a-zA-Z]{3,}/.test(line)
      ) {
        vendor = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim()
        break
      }
    }
  }

  // 2. Date Extraction
  let date = new Date().toISOString().split('T')[0]
  const dateMatch = rawText.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/)
  if (dateMatch) {
    const [, d, m, y] = dateMatch
    const year = y.length === 2 ? `20${y}` : y
    const day = d.padStart(2, '0')
    const month = m.padStart(2, '0')
    // Guard reasonable year
    if (Number(year) >= 2000 && Number(year) <= 2099) {
      date = `${year}-${month}-${day}`
    }
  } else {
    // Try written month format e.g. 15 Aug 2026
    const writtenMatch = rawText.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{2,4})\b/i)
    if (writtenMatch) {
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      }
      const [, d, mon, y] = writtenMatch
      const year = y.length === 2 ? `20${y}` : y
      const month = months[mon.toLowerCase().slice(0, 3)] || '01'
      const day = d.padStart(2, '0')
      date = `${year}-${month}-${day}`
    }
  }

  // 3. Invoice / Receipt Reference
  let invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
  for (const line of lines) {
    const invMatch = line.match(
      /(?:receipt|inv(?:oice)?|tax\s*invoice|order|ref|docket)[\s#:]+(?:no|num|number|#)?[:\s\-]*([A-Za-z0-9\-]{3,30})/i
    )
    if (invMatch && !/^(no|number|num|date|gst|nzd|aud|total|subtotal|tax)$/i.test(invMatch[1])) {
      invoiceNumber = invMatch[1].toUpperCase()
      break
    }
  }

  // 4. Financial Totals (Total, Subtotal, GST)
  let totalAmount = 0
  let subtotal = 0
  let tax = 0

  for (const line of lines) {
    if (
      /\b(?:grand\s*total|total(?:\s*(?:nzd|aud|\$|due|amount|inc|gross))?|net\s*payable|balance\s*due)\b/i.test(line) &&
      !/sub\s*total/i.test(line)
    ) {
      const match = line.match(/\$?([0-9]{1,5}\.[0-9]{2})/)
      if (match) totalAmount = parseFloat(match[1])
    } else if (/\b(?:sub\s*total|subtotal|net\s*amount|excl\s*gst|taxable\s*amount)\b/i.test(line)) {
      const match = line.match(/\$?([0-9]{1,5}\.[0-9]{2})/)
      if (match) subtotal = parseFloat(match[1])
    } else if (/\b(?:gst(?:\s*\(?15%\)?)?|tax|vat)\b/i.test(line) && !/gst\s*no/i.test(line)) {
      const match = line.match(/\$?([0-9]{1,5}\.[0-9]{2})/)
      if (match) tax = parseFloat(match[1])
    }
  }

  // 5. Line Items Extraction
  const lineItems: ExtractedLineItem[] = []

  for (const line of lines) {
    // Ignore lines that represent metadata, totals, payment details
    if (
      /\b(?:total|subtotal|sub-total|gst|tax|vat|invoice|receipt|date|eftpos|visa|mastercard|change|cash|balance|docket|auth|terminal|merchant|card|abn|phone|tel|email|www|http|store|lane|trans|thank\s*you|customer|copy|round)\b/i.test(
        line
      )
    ) {
      continue
    }

    // Match line ending with currency amount e.g. "Description ... 24.50"
    const match = line.match(/^(.*?)\s+[\$]?([0-9]{1,5}\.[0-9]{2})$/)
    if (match) {
      let desc = match[1].trim()
      const itemTot = parseFloat(match[2])

      // Ignore line if too short or digits only
      if (desc.length < 3 || /^\d+$/.test(desc)) continue

      let qty = 1
      const qtyPattern = desc.match(/^(\d+)\s*[xX@]\s*(.+)$/)
      if (qtyPattern) {
        qty = parseInt(qtyPattern[1], 10)
        desc = qtyPattern[2].trim()
      } else {
        const leadingCount = desc.match(/^(\d+)\s+([a-zA-Z].+)$/)
        if (leadingCount && parseInt(leadingCount[1], 10) <= 50) {
          qty = parseInt(leadingCount[1], 10)
          desc = leadingCount[2].trim()
        }
      }

      lineItems.push({
        id: `item-${lineItems.length + 1}`,
        description: desc,
        quantity: qty > 0 ? qty : 1,
        unitPrice: Number((itemTot / (qty > 0 ? qty : 1)).toFixed(2)),
        total: itemTot,
      })
    }
  }

  // 6. Intelligent Totals Reconciliation
  const lineItemsSum = lineItems.reduce((acc, itm) => acc + itm.total, 0)

  if (totalAmount === 0 && lineItemsSum > 0) {
    totalAmount = Number(lineItemsSum.toFixed(2))
  }

  if (totalAmount > 0) {
    if (tax === 0) {
      // 15% NZ GST included: tax = total * (0.15 / 1.15)
      tax = Number((totalAmount * (0.15 / 1.15)).toFixed(2))
    }
    if (subtotal === 0) {
      subtotal = Number((totalAmount - tax).toFixed(2))
    }
  } else if (subtotal > 0) {
    if (tax === 0) {
      tax = Number((subtotal * 0.15).toFixed(2))
    }
    totalAmount = Number((subtotal + tax).toFixed(2))
  }

  // Fallback if no itemized lines could be parsed
  if (lineItems.length === 0) {
    lineItems.push({
      id: 'item-1',
      description: `${vendor} Purchase`,
      quantity: 1,
      unitPrice: subtotal || totalAmount || 0,
      total: subtotal || totalAmount || 0,
    })
  }

  return {
    vendor,
    date,
    invoiceNumber,
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    lineItems,
    rawText,
    confidenceScore: confidence,
  }
}

/**
 * Real Optical Character Recognition (OCR) Engine using Tesseract.js
 * Analyzes document image or PDF, extracts genuine recognized text, and parses structured fields.
 */
export async function parseReceiptDocument(
  file: File,
  onProgress?: (progress: number, statusMessage: string) => void
): Promise<ExtractedDocumentData> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  onProgress?.(0.05, 'Preparing document for OCR analysis...')

  let targetInput: File | HTMLCanvasElement = file

  if (isPdf) {
    onProgress?.(0.15, 'Rendering PDF page for visual character analysis...')
    try {
      const pdfjs = await import('pdfjs-dist')
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
      }
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 2.0 })

      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        await (page.render({ canvasContext: ctx, viewport, canvas } as any)).promise
        targetInput = canvas
      }
    } catch (pdfErr) {
      console.warn('[OCR] PDF canvas rendering failed, attempting direct text parsing:', pdfErr)
    }
  }

  onProgress?.(0.25, 'Loading Tesseract OCR model...')

  try {
    const result = await Tesseract.recognize(targetInput, 'eng', {
      logger: (m) => {
        if (m && typeof m.progress === 'number') {
          const pct = Math.round(m.progress * 100)
          let msg = 'Analyzing document characters...'
          if (m.status === 'loading tesseract core') msg = 'Loading OCR core engine...'
          else if (m.status === 'initializing tesseract') msg = 'Initializing language dictionary...'
          else if (m.status === 'recognizing text') msg = `Recognizing document text (${pct}%)...`
          onProgress?.(m.progress, msg)
        }
      },
    })

    const rawText = result.data.text || ''
    const confidence = Number(((result.data.confidence || 90) / 100).toFixed(2))

    onProgress?.(0.95, 'Extracting vendors, line items, and financial totals...')

    const parsed = parseReceiptText(rawText, file.name, confidence)
    onProgress?.(1.0, 'Analysis complete!')

    return parsed
  } catch (err: any) {
    console.error('[OCR] Tesseract error during recognition:', err)
    throw new Error(err.message || 'Optical character recognition failed. Please try a clearer photo or PDF.')
  }
}
