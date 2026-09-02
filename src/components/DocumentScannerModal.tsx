import { useState, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { parseReceiptDocument, ExtractedDocumentData, ExtractedLineItem } from '@/lib/ocrService'

interface DocumentScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onApply?: (data: ExtractedDocumentData, file?: File) => void
  projectId?: string
}

export default function DocumentScannerModal({ isOpen, onClose, onApply }: DocumentScannerModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (selectedFile: File) => {
    try {
      setFile(selectedFile)
      setError(null)

      // Set image preview
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreviewUrl(objectUrl)

      // Run OCR Analysis
      setIsProcessing(true)
      const parsed = await parseReceiptDocument(selectedFile)
      setExtractedData(parsed)
    } catch (err) {
      console.error('OCR Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze document')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleApply = () => {
    if (extractedData && onApply) {
      onApply(extractedData, file || undefined)
      onClose()
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreviewUrl(null)
    setExtractedData(null)
    setError(null)
  }

  const updateField = (field: keyof ExtractedDocumentData, value: any) => {
    if (!extractedData) return
    setExtractedData({
      ...extractedData,
      [field]: value,
    })
  }

  const updateLineItem = (index: number, field: keyof ExtractedLineItem, value: any) => {
    if (!extractedData) return
    const updatedItems = [...extractedData.lineItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' || field === 'unitPrice' || field === 'total' ? Number(value) : value,
    }
    
    // Auto-recalculate total if qty or unitPrice changed
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = Number((updatedItems[index].quantity * updatedItems[index].unitPrice).toFixed(2))
    }

    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
    const newTax = Number((newSubtotal * 0.15).toFixed(2))

    setExtractedData({
      ...extractedData,
      lineItems: updatedItems,
      subtotal: newSubtotal,
      tax: newTax,
      totalAmount: Number((newSubtotal + newTax).toFixed(2)),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt & Invoice AI Scanner" size="xl">
      <div className="space-y-6">
        {/* Upload Dropzone */}
        {!file && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border-dark hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer transition-colors bg-background-dark/50"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <span className="material-symbols-outlined text-4xl">document_scanner</span>
              </div>
              <div>
                <p className="text-white font-semibold text-base">Drop receipt or invoice here, or click to upload</p>
                <p className="text-text-muted text-sm mt-1">Supports PNG, JPG, WEBP, and PDF documents</p>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="text-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div>
              <p className="text-white font-medium text-lg">Analyzing document with AI OCR...</p>
              <p className="text-text-muted text-sm">Extracting vendor name, line items, totals, and invoice metadata</p>
            </div>
          </div>
        )}

        {/* Extracted Data Verification & Form */}
        {extractedData && !isProcessing && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="bg-background-dark border border-border-dark rounded-lg p-3 overflow-hidden max-h-96 flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Receipt Preview" className="object-contain max-h-80 rounded" />
                ) : (
                  <div className="text-center text-text-muted py-8">
                    <span className="material-symbols-outlined text-4xl">description</span>
                    <p className="text-sm mt-1">Document uploaded</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>File: {file?.name}</span>
                <button onClick={handleReset} className="text-red-400 hover:underline">
                  Scan different file
                </button>
              </div>
            </div>

            {/* Right: Extracted Fields Form */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Vendor / Merchant"
                  value={extractedData.vendor}
                  onChange={(e) => updateField('vendor', e.target.value)}
                />
                <Input
                  label="Invoice / Receipt Date"
                  type="date"
                  value={extractedData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Invoice Number"
                  value={extractedData.invoiceNumber}
                  onChange={(e) => updateField('invoiceNumber', e.target.value)}
                />
                <Input
                  label="GST / Tax ($)"
                  type="number"
                  step="0.01"
                  value={extractedData.tax}
                  onChange={(e) => updateField('tax', Number(e.target.value))}
                />
                <Input
                  label="Total Amount ($)"
                  type="number"
                  step="0.01"
                  value={extractedData.totalAmount}
                  onChange={(e) => updateField('totalAmount', Number(e.target.value))}
                />
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Extracted Line Items</p>
                  <span className="text-xs text-primary font-medium">Confidence: {(extractedData.confidenceScore * 100).toFixed(0)}%</span>
                </div>
                <div className="border border-border-dark rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-background-dark text-text-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-2 py-2 text-center w-16">Qty</th>
                        <th className="px-2 py-2 text-right w-20">Price</th>
                        <th className="px-3 py-2 text-right w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dark bg-card-dark">
                      {extractedData.lineItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="px-3 py-1.5 text-white">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                              className="bg-transparent border-none text-white w-full focus:outline-none"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center text-text-muted">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                              className="bg-transparent border-none text-center text-text-muted w-full focus:outline-none"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-text-muted">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)}
                              className="bg-transparent border-none text-right font-mono text-text-muted w-full focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-white">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">warning</span>
            {error}
          </p>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {extractedData && (
            <Button variant="primary" onClick={handleApply}>
              <span className="material-symbols-outlined text-base">check</span>
              Apply Extracted Data
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
