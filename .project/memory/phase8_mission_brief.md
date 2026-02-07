# Phase 8 Mission Brief - Document Intelligence & OCR
*Date: January 28, 2026*
*Phase: 8 - Advanced Document Processing*
*Duration: 3-4 days*

## Overview

Implement DeepSeek-OCR-2 for intelligent document analysis and automatic metadata extraction. Users can upload receipts, invoices, and project documents to automatically populate project details, extract line items, and organize files by content.

**Scope:**
- DeepSeek-OCR-2 backend service (Python microservice or Express wrapper)
- Document upload with intelligent OCR processing
- Automatic field extraction (date, amount, description, vendor)
- Receipt/invoice line item parsing
- Document categorization (receipt, invoice, contract, other)
- Receipt data → Expense/Timesheet pre-fill
- Document → Project file association
- OCR results caching and audit trail
- Progress indicator for long-running OCR jobs

---

## Architecture

### Tech Stack
- **OCR Model:** DeepSeek-OCR-2 (Vision Language Model)
- **OCR Runtime:** vLLM 0.8.5 (for inference efficiency) or Transformers (simpler, single-machine)
- **Backend:** Express.js (existing) or Python microservice (separate, recommended)
- **GPU:** NVIDIA (CUDA 11.8+) for OCR inference
- **Image Processing:** sharp (Node.js) or PIL/OpenCV (Python)
- **Message Queue:** BullMQ + Redis (for long-running OCR jobs)
- **Database:** Supabase (store OCR results and extracted data)
- **Frontend:** React 18 + TypeScript (existing)

### Deployment Options

**Option A: Python Microservice (Recommended for Production)**
```
┌─────────────┐          ┌──────────────────────┐
│ Express API │◄────────►│ Python OCR Service   │
│ (Node.js)   │          │ (DeepSeek-OCR-2)     │
└─────────────┘          │ - vLLM inference     │
                         │ - CUDA/GPU support   │
                         │ - Async processing   │
                         └──────────────────────┘
```

**Option B: Single Express + Node.js Wrapper (Simpler)**
```
Express API (Node.js)
├── Upload endpoint
├── Node wrapper for DeepSeek-OCR-2
├── BullMQ job processor
└── Supabase storage & results DB
```

**Option C: Hybrid with Headless GPU Server**
```
Development: Run locally (GPU enabled)
Production: GPU server + REST API calls from main Express instance
```

---

### Folder Structure

```
backend/src/
├── ocr/                             # NEW OCR service
│   ├── service.ts                   # Main OCR orchestration
│   ├── deepseek.ts                  # DeepSeek-OCR-2 integration
│   ├── extractor.ts                 # Field extraction from OCR results
│   ├── categorizer.ts               # Document categorization
│   └── validators.ts                # OCR result validation
├── jobs/
│   ├── processDocument.ts           # BullMQ job for OCR processing
│   └── worker.ts                    # Updated to include OCR jobs
├── routes/
│   ├── documents.ts                 # NEW - Document upload/management
│   ├── ocr.ts                       # NEW - OCR processing endpoints
│   └── [existing routes...]
├── config/
│   └── ocr.ts                       # OCR configuration (model path, GPU settings)
└── types/
    └── ocr.ts                       # OCR response types and schemas

ocr-service/ (Optional - Python microservice)
├── main.py                          # FastAPI/Flask app
├── ocr_processor.py                 # DeepSeek-OCR-2 inference
├── field_extractor.py               # Extract structured data
├── config.py                        # Model + CUDA config
├── requirements.txt                 # Python dependencies
└── Dockerfile                       # Container for production
```

---

## Phase 8 Deliverables

### Part 1: OCR Infrastructure Setup (Day 1)
- [x] Choose deployment model (recommend Python microservice)
- [x] Install DeepSeek-OCR-2 dependencies (PyTorch, transformers, vLLM)
- [x] GPU/CUDA configuration validation
- [x] Model download from Hugging Face (deepseek-ai/DeepSeek-OCR-2)
- [x] Test OCR inference with sample images
- [x] Create OCR service wrapper (Python or Node.js)
- [x] Set up message queue for async processing (BullMQ + Redis)
- [x] Database migrations: `ocr_results` and `document_extractions` tables

### Part 2: Backend OCR Service (Day 1-2)
- [x] Service: `ocr/deepseek.ts`
  - `processImage(filePath)` → Returns markdown/text from OCR
  - `processPDF(filePath)` → Handles multi-page PDFs
  - Prompt engineering: Use `<|grounding|>` for document → markdown conversion
  - Batch processing for multiple pages
- [x] Service: `ocr/extractor.ts`
  - `extractReceiptData(ocrText)` → { date, vendor, amount, items: [], total }
  - `extractInvoiceData(ocrText)` → { invoice_number, date, client, amount, items }
  - `extractProjectData(ocrText)` → { project_name, description, budget }
  - LLM-powered extraction (or structured prompt parsing)
- [x] Service: `ocr/categorizer.ts`
  - `categorizeDocument(ocrText)` → "receipt" | "invoice" | "contract" | "timesheet" | "other"
  - Uses content heuristics + keywords
- [x] Route: `POST /documents/upload` (with OCR processing)
  - Accept multipart/form-data (image or PDF)
  - Trigger BullMQ job for async OCR
  - Return job ID + progress endpoint
- [x] Route: `POST /documents/{id}/process-ocr` (manual trigger)
- [x] Route: `GET /documents/{id}/ocr-results` (get extracted data)
- [x] BullMQ Job: `processDocument`
  - Input: file path, document type (hint)
  - Process: OCR → Extract fields → Categorize
  - Output: Structured JSON with extracted data
  - Store results in `ocr_results` table
  - Log progress to Redis for real-time updates

### Part 3: Field Extraction & Data Mapping (Day 2)
- [x] Smart field mapping:
  - Receipt → Expense form pre-fill (date, vendor, amount, category)
  - Invoice → Project file metadata (amount, date, vendor = client)
  - Timesheet receipt → Activity lines (description, amount)
- [x] Confidence scores for extracted fields
- [x] Manual review UI (if confidence < 80%)
- [x] Validation rules (amount must be number, date must parse, etc.)
- [x] Audit trail: Store original OCR text + extracted fields + manual corrections

### Part 4: Frontend Integration (Day 2-3)
- [x] Document upload widget (drag-drop)
  - Accept: JPG, PNG, PDF, TIFF
  - Show preview + OCR processing progress
- [x] New route: `/app/documents` (Document Gallery)
  - Grid view of all uploaded documents
  - Filter by category, project, date range
  - Search by extracted text
  - Preview with OCR overlay (highlighted text)
- [x] Document detail page: `/app/documents/{id}`
  - Full OCR result (markdown)
  - Extracted fields table with edit option
  - Manual field correction UI
  - Project/expense association
  - Download original file
- [x] Extraction results modal:
  - Show extracted data pre-filled
  - Allow quick acceptance → Auto-create expense/timesheet
  - Edit fields before creating
  - Option to ignore OCR and manually enter
- [x] Progress indicator during OCR processing
  - Real-time job status via WebSocket or polling
  - Estimated time remaining
  - Cancel option

### Part 5: Database & Data Persistence (Day 3)
- [x] New tables:
  ```sql
  -- OCR processing results
  CREATE TABLE ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES project_files(id),
    raw_ocr_text TEXT NOT NULL,          -- Full markdown from DeepSeek-OCR-2
    extracted_data JSONB NOT NULL,       -- { date, vendor, amount, etc. }
    confidence_score DECIMAL,             -- 0-100 (average field confidence)
    document_category TEXT,               -- receipt, invoice, contract, timesheet, other
    processing_status TEXT,               -- pending, completed, failed
    error_message TEXT,                   -- If failed
    processing_time_ms INT,               -- How long OCR took
    model_version TEXT,                   -- DeepSeek-OCR-2 version
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Mapping from OCR extractions to app entities
  CREATE TABLE document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id),
    entity_type TEXT,                    -- expense, timesheet_activity, project_note
    entity_id UUID,                      -- ID of created expense/timesheet/etc
    extracted_fields JSONB,              -- { field_name: value, confidence: 0-100 }
    user_corrections JSONB,              -- Manual corrections { field_name: corrected_value }
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Cache OCR results to avoid reprocessing
  CREATE TABLE ocr_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_hash TEXT UNIQUE,               -- SHA256 of file
    ocr_result_id UUID REFERENCES ocr_results(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Add to project_files table:
  ALTER TABLE project_files ADD COLUMN ocr_processed BOOLEAN DEFAULT false;
  ALTER TABLE project_files ADD COLUMN ocr_result_id UUID REFERENCES ocr_results(id);
  ```

### Part 6: Admin Dashboard & Monitoring (Day 3-4)
- [x] Admin dashboard: `/app/admin/ocr-status`
  - OCR processing statistics (documents processed, success rate)
  - Average processing time
  - Failed documents list (with retry option)
  - Model performance metrics
- [x] OCR job queue monitoring:
  - Real-time job queue stats (pending, completed, failed)
  - Ability to retry failed jobs
  - Model version tracking
- [x] Document audit trail:
  - View OCR results history
  - See manual corrections
  - Compare original vs corrected data
- [x] Configuration UI:
  - Upload confidence threshold adjustment
  - OCR model selection (if multiple available)
  - GPU/processing resource status

### Part 7: Advanced Features (Day 4 / Optional)
- [x] Receipt intelligence:
  - Parse itemized lists (automatic line item detection)
  - Currency detection and conversion
  - Tax/tip extraction
  - Receipt → Multiple expense items
- [x] Expense auto-creation:
  - "Quick Create from Receipt" button
  - Pre-fills expense form with OCR data
  - One-click expense + timesheet activity creation
- [x] Document similarity search:
  - Find duplicate receipts (prevent duplicate expenses)
  - Similar documents (from same vendor, same date, etc.)
- [x] Multi-language support:
  - DeepSeek-OCR-2 supports multiple languages
  - Auto-detect language from document
  - Translate to English (optional)

---

## API Endpoints

### Document Upload & Processing
```
POST /documents/upload
  Input: multipart/form-data { file, project_id?, document_hint? }
  Output: { job_id, document_id, status: 'processing' }

GET /documents/{id}/ocr-status
  Output: { job_id, status, progress: 0-100, estimated_time_s }

GET /documents/{id}/ocr-results
  Output: { 
    raw_ocr_text, 
    extracted_data: { date, vendor, amount, items, confidence },
    document_category,
    processing_time_ms
  }

POST /documents/{id}/ocr-process
  Input: { reprocess: true }  -- Force reprocess (bypass cache)
  Output: { job_id, status: 'processing' }

PUT /documents/{id}/extraction
  Input: { field_name: corrected_value, field_name_2: corrected_value }
  Output: { updated_extraction, user_corrections_saved }

DELETE /documents/{id}
  Output: { deleted: true }
```

### Document Discovery
```
GET /documents
  Query: ?category=receipt&project_id=...&date_from=...&search=...
  Output: [ { id, filename, category, amount, date, status } ]

GET /documents/{id}
  Output: Full document with OCR results and extraction

POST /documents/{id}/create-expense
  Input: { ocr_result_id, field_corrections: {} }
  Output: { expense_id, created: true }

POST /documents/{id}/create-activity
  Input: { project_id, activity_type_id, field_corrections: {} }
  Output: { activity_id, timesheet_id, created: true }
```

### Admin & Monitoring
```
GET /admin/ocr/statistics
  Output: { 
    total_processed, 
    success_rate,
    avg_processing_time,
    documents_by_category,
    failed_count
  }

GET /admin/ocr/queue-status
  Output: { pending: 10, processing: 2, completed: 150, failed: 3 }

POST /admin/ocr/retry-failed
  Input: { document_id_list? }  -- Retry specific or all failed
  Output: { retried_count, job_ids: [] }

GET /admin/ocr/model-status
  Output: { version, loaded: true, gpu_available: true, memory_usage: "2.5GB" }
```

---

## Database Schema Updates

### New Tables
- `ocr_results` — OCR processing results + extracted data
- `document_extractions` — Mapping from OCR → app entities (expenses, timesheets)
- `ocr_cache` — Cache processed results by file hash

### Existing Table Updates
- `project_files`: Add `ocr_processed`, `ocr_result_id`

---

## Deployment Architecture

### Local Development
```bash
# Option 1: Python microservice (recommended)
conda create -n deepseek-ocr2 python=3.12.9
conda activate deepseek-ocr2
pip install torch torchvision transformers vllm pillow
# Download model: HF_TOKEN=... python -c "from huggingface_hub import snapshot_download; snapshot_download('deepseek-ai/DeepSeek-OCR-2')"
python ocr-service/main.py &

# Option 2: Node.js + child_process (simpler but less efficient)
npm install deepseek-ocr-node  # If available, or use Python via spawn

# Start Express backend (calls Python service)
npm run dev:backend
```

### Production Deployment
```dockerfile
# Dockerfile.ocr-service (Python microservice)
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04
RUN apt-get update && apt-get install -y python3.12 python3-pip git
RUN pip install torch torchvision transformers vllm pillow fastapi uvicorn
RUN git clone https://github.com/deepseek-ai/DeepSeek-OCR-2.git
COPY ocr-service/ /app/
WORKDIR /app
CMD ["python", "main.py"]

# docker-compose.yml (updated)
services:
  ocr-service:
    build:
      context: .
      dockerfile: Dockerfile.ocr-service
    ports:
      - "8000:8000"
    environment:
      CUDA_VISIBLE_DEVICES: "0"
      MODEL_PATH: "/models/deepseek-ocr-2"
    volumes:
      - ./models:/models      # Pre-downloaded model
      - ./uploads:/uploads    # Temporary file storage
    gpus:
      - all
  
  backend:
    depends_on:
      - ocr-service
    environment:
      OCR_SERVICE_URL: "http://ocr-service:8000"
```

---

## DeepSeek-OCR-2 Integration Details

### Model Information
- **Model Name:** deepseek-ai/DeepSeek-OCR-2
- **Type:** Vision Language Model (VLM) for document OCR
- **Size:** ~7B parameters (quantized for efficiency)
- **Capabilities:**
  - Text extraction with layout preservation
  - Multi-page document support
  - Document → Markdown conversion
  - Multiple language support
  - Grounding/region-based OCR

### Key Prompts
```python
# Document with layout → markdown
prompt = "<image>\n<|grounding|>Convert the document to markdown. "

# Free OCR (no layout)
prompt = "<image>\nFree OCR. "

# Custom extraction
prompt = "<image>\nExtract all financial information (date, amount, vendor). Format as JSON."
```

### Inference Options

**Option A: vLLM (High Performance, Recommended)**
```python
from vllm import LLM, SamplingParams

llm = LLM(model="deepseek-ai/DeepSeek-OCR-2", tensor_parallel_size=1, dtype="bfloat16")
output = llm.generate(prompts, sampling_params)
```

**Option B: Transformers (Simpler, Single GPU)**
```python
from transformers import AutoModel, AutoTokenizer
import torch

tokenizer = AutoTokenizer.from_pretrained("deepseek-ai/DeepSeek-OCR-2", trust_remote_code=True)
model = AutoModel.from_pretrained("deepseek-ai/DeepSeek-OCR-2", _attn_implementation='flash_attention_2', use_safetensors=True)
model = model.eval().cuda().to(torch.bfloat16)

output = model.infer(tokenizer, prompt=prompt, image_file=image_file)
```

### Performance Characteristics
- **Inference Speed:** ~2-5 seconds per page (depends on GPU)
- **Batch Processing:** vLLM supports batch inference
- **Memory:** ~10-16GB VRAM required
- **Accuracy:** 98%+ for English documents; varies by language

---

## Implementation Workflow

### Day 1: Infrastructure & OCR Service
1. Choose deployment model (Python microservice recommended)
2. Set up Python environment with PyTorch + transformers
3. Download DeepSeek-OCR-2 model from Hugging Face
4. Create OCR service wrapper:
   - FastAPI endpoint: `POST /process` (accepts image file)
   - Response: { ocr_text, processing_time_ms }
   - Error handling: timeout, GPU memory, invalid image
5. Test OCR service with sample images/receipts
6. Set up message queue for async processing (BullMQ)
7. Create database migrations

### Day 2: Field Extraction & Backend Routes
1. Implement field extractor:
   - Receipt parser: extract date, vendor, amount, items
   - Invoice parser: extract invoice #, amount, client
   - Categorizer: document type classification
2. Create backend routes:
   - `POST /documents/upload` (triggers OCR job)
   - `GET /documents/{id}/ocr-status` (job progress)
   - `GET /documents/{id}/ocr-results` (extracted data)
3. Implement BullMQ job processor
4. Add confidence scoring to extractions
5. Test end-to-end: upload → OCR → extract fields

### Day 3: Frontend & UI
1. Create document upload widget (drag-drop)
2. Build document gallery page (`/app/documents`)
3. Build document detail page with OCR preview
4. Create extraction results modal
5. Add "Create Expense" quick-action from OCR
6. Implement progress indicator + WebSocket polling
7. Test upload, processing, and extraction workflows

### Day 4: Polish & Advanced Features
1. Add admin dashboard for OCR monitoring
2. Implement quick-create expense/activity from receipt
3. Add document similarity detection (prevent duplicates)
4. Implement manual field correction UI
5. Add audit trail logging
6. Performance optimization (caching, batch processing)
7. QA testing: various document types, languages, edge cases

---

## Success Criteria

✅ DeepSeek-OCR-2 service deployed (local or containerized)  
✅ Document upload endpoint working with file handling  
✅ OCR processing via BullMQ (async, non-blocking)  
✅ Field extraction for receipts (date, vendor, amount, items)  
✅ Field extraction for invoices (number, date, amount, client)  
✅ Document categorization (receipt, invoice, contract, etc.)  
✅ Confidence scoring for extracted fields  
✅ Manual field correction UI  
✅ Document gallery with search and filter  
✅ Quick-create expense/activity from OCR results  
✅ Admin dashboard with OCR statistics  
✅ OCR results cached and audit-trailed  
✅ No console errors; TypeScript compiles  
✅ All endpoints return proper errors  
✅ Frontend handles long-running OCR processing  
✅ GPU utilization monitoring  

---

## Testing Strategy

### Unit Tests
- Field extraction functions (receipt, invoice parsers)
- Document categorizer (various document types)
- Confidence score calculations
- Validation rules (amount, date, etc.)

### Integration Tests
- End-to-end: upload → OCR → extract → create expense
- OCR service with various document types (receipt, invoice, contract)
- Error handling: invalid file, timeout, GPU memory issues
- Multi-page PDF processing
- Batch processing (multiple documents)

### Manual Testing (QA)
1. Upload JPG receipt → Verify OCR text → Verify extracted data
2. Upload PDF invoice → Verify multi-page OCR → Extract fields
3. Edit extracted fields → Create expense → Verify expense created
4. Upload duplicate receipt → Verify similarity detection
5. Monitor OCR job queue → Check admin stats
6. Test with non-English document (if supported)
7. Test timeout scenarios (cancel processing)
8. Verify GPU memory cleanup after processing

### Performance Testing
- OCR processing time (should be < 10s per page)
- Job queue throughput (documents/minute)
- GPU memory usage under load
- Frontend responsiveness during OCR (non-blocking)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| GPU not available in dev environment | HIGH | Provide CPU fallback (slower), or cloud GPU access |
| Large PDF files timeout | MEDIUM | Set timeout limits, split PDFs, batch processing |
| OCR accuracy varies by document | MEDIUM | Add confidence thresholds, manual review for low confidence |
| Memory issues during inference | HIGH | Monitor GPU memory, implement job queue backpressure |
| Model download bandwidth | MEDIUM | Pre-download model in Dockerfile, cache locally |
| DeepSeek-OCR-2 model changes | LOW | Pin specific version, test on upgrades |
| Field extraction hallucinations | MEDIUM | Confidence scoring, manual review, validation rules |
| User uploads malicious files | MEDIUM | File type validation (whitelist JPG/PNG/PDF), size limits |

---

## Dependencies

**Required:**
- Phase 1-7 complete (file management, storage bucket, API structure)
- NVIDIA GPU with CUDA 11.8+ support (or Docker GPU image)
- 16GB+ VRAM for model inference
- Redis (already installed for BullMQ)

**Optional but Recommended:**
- HuggingFace account for model hosting/downloading
- Docker for containerized OCR service
- GPU monitoring tools (nvidia-smi, etc.)

---

## Documentation Deliverables

1. **OCR_SETUP.md** — Installation guide for DeepSeek-OCR-2, CUDA setup, model download
2. **OCR_API_REFERENCE.md** — All OCR endpoints with examples and error codes
3. **EXTRACTION_RULES.md** — Field extraction logic, prompts, confidence thresholds
4. **ADMIN_GUIDE.md** — Monitoring OCR jobs, troubleshooting, performance tuning
5. **USER_GUIDE.md** — How to use document upload, extraction results, quick-create

---

## Next Steps (Phase 8 Handoff)

1. Backend developer chooses deployment model:
   - Recommend: Python microservice (FastAPI/Flask + DeepSeek-OCR-2)
   - Alternative: Node.js wrapper with child_process
2. Sets up OCR service locally (with GPU)
3. Implements field extractors and categorizer
4. Creates backend routes and BullMQ jobs
5. Frontend developer builds upload widget and document gallery
6. Both test end-to-end workflow
7. QA validates various document types and edge cases

---

**Estimated Duration:** 3-4 days (24-32 hours)  
**Priority:** P2 (nice-to-have; not blocking core workflow)  
**Dependencies:** Phase 7 complete (backend API structure)  
**Blockers:** None (GPU access optional but recommended)

---

**Status: Ready for Phase 8 implementation after Phase 7 approval.**
