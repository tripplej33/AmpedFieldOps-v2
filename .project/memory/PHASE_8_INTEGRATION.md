# Phase 8 Integration Points & Dependencies

## Phase 8 Integration with Existing Phases

### ✅ Phase 6 Integration (File Explorer)
**How it works:**
- Phase 6 creates file upload/management infrastructure
- Phase 8 reuses the same file upload mechanism
- Documents stored in same `project_files` table
- OCR results linked via foreign key: `project_files.ocr_result_id`

**What Phase 8 Adds:**
- Intelligence layer on top of file storage
- `ocr_results` table (extracted text, fields, categorization)
- `document_extractions` table (mapping to expenses/timesheets)
- Document gallery view (filtered by category, project, date)
- Quick-create buttons (expense, activity from document)

**Database Relationship:**
```
project_files (existing in Phase 6)
    ↓
ocr_results (new in Phase 8) - stores: raw_ocr_text, extracted_data, confidence_scores
    ↓
document_extractions (new in Phase 8) - stores: mapped entities (expenses, activities)
```

---

### ✅ Phase 7 Integration (Xero)
**How it works:**
- Phase 8 can auto-create expenses from receipts
- Those expenses can be synced to Xero (via Phase 7)
- Creates seamless workflow: Receipt → Expense → Xero Invoice

**Workflow Example:**
```
1. User uploads receipt
2. Phase 8 OCR extracts: { date: "2026-01-28", vendor: "Office Depot", amount: 150.00 }
3. User clicks "Create Expense" 
4. Expense created with Phase 8 data
5. If Xero enabled (Phase 7), expense syncs to Xero as expense/bill
6. Xero status updates in dashboard
```

**No Direct Phase 7 Code Changes:**
- Phase 7 doesn't need to know about OCR
- Phase 8 just pre-populates the expense form
- Standard expense creation flow applies

---

### ✅ Timesheets Module Integration
**How it works:**
- Receipt OCR can create timesheet activities
- Parse receipt description as activity description
- Use receipt amount as hourly rate or activity amount
- Link to project automatically

**Workflow Example:**
```
1. Upload travel receipt: "Flight to NYC - $500"
2. Phase 8 categorizes as "travel expense"
3. User clicks "Create Activity"
4. Creates timesheet entry: { activity: "Travel", amount: 500, date: 2026-01-28 }
5. User approves in timesheet workflow
```

---

### ✅ Projects Module Integration
**How it works:**
- Upload project planning documents (contracts, RFPs, specifications)
- Phase 8 extracts project name, budget, scope, requirements
- Pre-fills project creation form

**Workflow Example:**
```
1. User uploads signed contract PDF
2. Phase 8 OCR extracts: { project_name: "Website Redesign", budget: 25000 }
3. User clicks "Create Project"
4. Project form pre-filled from OCR data
5. User adds client link and other details
```

---

### ✅ Dashboard Integration
**What Phase 8 Adds to Dashboard:**
- "Recent Documents" widget (last 5 uploaded)
- "Documents Pending Review" count
- Quick stats: "Total extracted from OCR this month"
- Link to document gallery

---

## Data Flow Architecture

```
USER WORKFLOW:
┌─────────────────────────────────────────────────────────────┐
│ 1. Upload Receipt/Invoice/Document                          │
│    (Phase 6 file upload + Phase 8 OCR processing)           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Phase 8 Processes Document                               │
│    - OCR text extraction (DeepSeek-OCR-2)                   │
│    - Field extraction (date, vendor, amount)                │
│    - Categorization (receipt, invoice, contract)            │
│    - Confidence scoring                                      │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Display Extraction Results to User                       │
│    - Show extracted fields                                   │
│    - Allow manual corrections                               │
│    - Show confidence scores                                 │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    OPTION A:     OPTION B:
Create Expense  Create Activity
    (Phase 7)    (Timesheets)
        │             │
        ▼             ▼
Expense Table   Timesheet Entry
  in Supabase     in Supabase
        │             │
        └──────┬──────┘
               │
        (If Phase 7 Enabled)
               ▼
         Xero Sync
    (Phase 7 Background Job)
               │
               ▼
        Xero Invoice/Bill
```

---

## Database Schema Dependencies

### Phase 8 Needs from Phase 6:
```sql
-- Existing Phase 6 table (must exist)
project_files (
  id,
  project_id,
  filename,
  size,
  mime_type,
  storage_path,
  created_at
)

-- Phase 8 adds columns:
ALTER TABLE project_files ADD COLUMN ocr_processed BOOLEAN DEFAULT false;
ALTER TABLE project_files ADD COLUMN ocr_result_id UUID REFERENCES ocr_results(id);
```

### Phase 8 Creates:
```sql
-- OCR processing results
CREATE TABLE ocr_results (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES project_files(id),
  raw_ocr_text TEXT,
  extracted_data JSONB,
  confidence_score DECIMAL,
  document_category TEXT,
  processing_status TEXT,
  created_at TIMESTAMPTZ
)

-- Mapping to app entities
CREATE TABLE document_extractions (
  id UUID PRIMARY KEY,
  ocr_result_id UUID REFERENCES ocr_results(id),
  entity_type TEXT,          -- 'expense', 'timesheet_activity', 'project'
  entity_id UUID,            -- ID in expenses, timesheets, or projects table
  extracted_fields JSONB,
  user_corrections JSONB,
  created_at TIMESTAMPTZ
)

-- Cache processed documents
CREATE TABLE ocr_cache (
  id UUID PRIMARY KEY,
  file_hash TEXT UNIQUE,
  ocr_result_id UUID REFERENCES ocr_results(id)
)
```

### Phase 8 References (No Changes Needed):
```sql
-- Can create expenses (existing table from earlier phase)
expenses (id, amount, date, description, ...)

-- Can create timesheet entries (existing from Phase 4)
timesheets (id, date, status, ...)
timesheet_items (id, timesheet_id, activity_type_id, amount, ...)

-- Can populate projects (existing from Phase 3)
projects (id, name, budget, description, ...)
```

---

## API Dependencies

### Phase 8 Adds These Endpoints:
```
POST   /documents/upload                 → Trigger OCR
GET    /documents/{id}/ocr-status        → Job progress
GET    /documents/{id}/ocr-results       → Extracted data
POST   /documents/{id}/create-expense    → Auto-create from OCR
POST   /documents/{id}/create-activity   → Auto-create timesheet
GET    /documents                        → List all documents
```

### Phase 8 Calls These Existing Endpoints:
```
POST   /expenses                         → Create expense from OCR
POST   /timesheets/{id}/items            → Create activity from OCR
POST   /projects                         → Create project from OCR
```

**Note:** No changes needed to existing endpoints. Phase 8 just uses them.

---

## Environment Variables Needed

### Phase 8 Specific:
```bash
# OCR Service Configuration
OCR_SERVICE_URL=http://localhost:8000      # Python microservice
OCR_SERVICE_TYPE=python|node|cloud         # Deployment type
OCR_TIMEOUT_SECONDS=30                     # Max processing time
OCR_GPU_MEMORY_MB=16000                    # VRAM available
OCR_BATCH_SIZE=4                           # Documents per batch

# HuggingFace (model download)
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxx         # Optional, for private models

# OCR Feature Flags
ENABLE_OCR=true
ENABLE_AUTO_EXPENSE_CREATE=true
ENABLE_DUPLICATE_DETECTION=true
OCR_CONFIDENCE_THRESHOLD=0.80              # Min confidence to auto-create
```

### From Phase 7 (Already Set):
```bash
SUPABASE_URL                               # Database
SUPABASE_SERVICE_ROLE_KEY                  # API access
REDIS_URL                                  # BullMQ jobs
```

---

## Testing Strategy for Integration

### Phase 6 ↔ Phase 8:
```
1. Upload document via Phase 6 file upload
2. Verify file appears in project_files table
3. Verify Phase 8 job triggered automatically
4. Verify ocr_result_id populated after processing
5. Verify document appears in Phase 8 gallery
```

### Phase 7 ↔ Phase 8:
```
1. Enable OCR (ENABLE_OCR=true)
2. Upload receipt, create expense via OCR
3. If Xero connected, verify expense syncs to Xero
4. Verify payment status updates in expense
5. Check Xero sync log shows expense from OCR
```

### Phase 8 ↔ Timesheets:
```
1. Upload timesheet receipt
2. Create activity from OCR
3. Verify activity appears in timesheet
4. Approve timesheet normally
5. Verify no duplicates if re-uploaded
```

---

## Rollback & Compatibility

### Phase 8 is Optional
- Can be disabled with `ENABLE_OCR=false`
- No changes to existing code paths
- Existing file upload works without OCR
- Existing expenses/timesheets unaffected

### Backward Compatibility
- All Phase 1-7 features work without Phase 8
- Phase 8 only adds new features, doesn't modify old ones
- Can deploy Phase 8 anytime after Phase 7 without issues

### Database Backward Compat
- New tables created, no modifications to existing tables
- Optional columns added to `project_files` (can be NULL)
- Safe to rollback: just disable OCR service

---

## Performance Implications

### Storage Impact
- `ocr_results` table: ~5KB per document
- `document_extractions` table: ~1KB per mapped entity
- `ocr_cache` table: ~256 bytes per document
- **Total per 100 documents:** ~600KB

### Compute Impact
- OCR processing: Uses dedicated GPU (doesn't block API)
- Database queries: Added indices on `ocr_results.document_id`
- Redis usage: Minimal (just job queue metadata)

### No Impact On:
- User authentication
- Real-time data sync
- Project/timesheet/client operations
- Existing file operations

---

## Deployment Sequence

**Phase 8 Requires:**
1. ✅ Phase 6 complete (file upload infrastructure)
2. ✅ Phase 7 complete (backend API structure, BullMQ)
3. ✅ GPU available (or use CPU with slower performance)

**Recommended Timeline:**
```
Phase 6 → Phase 7 → Phase 8
  (Jan 28)  (Jan 29)  (Feb 1)
   complete complete  complete
```

---

## FAQ: Phase 8 Integration

**Q: Does Phase 8 require Phase 7?**  
A: No, Phase 8 is independent. It works on its own. Phase 7 just enables the Xero workflow.

**Q: What if I don't have a GPU?**  
A: OCR will run on CPU but be very slow (2-5 min per document vs 2-5 seconds with GPU). Performance mode exists but not recommended for production.

**Q: Can I disable Phase 8 after deploying?**  
A: Yes, set `ENABLE_OCR=false`. All Phase 8 tables remain but are unused.

**Q: Do existing timesheets work with Phase 8?**  
A: Yes, Phase 8 just offers auto-create from documents. Manual timesheet entry still works.

**Q: Can Phase 8 create other entity types?**  
A: Current scope: expenses, timesheet activities, project metadata. Could extend to custom entities later.

**Q: What languages does OCR support?**  
A: DeepSeek-OCR-2 supports 100+ languages. Phase 8 currently targets English extraction. Multi-language support can be added.

---

## Success Metrics for Integration

✅ Upload document → Auto-extract fields with > 90% accuracy  
✅ Create expense from receipt → Takes < 3 clicks  
✅ Expense created from OCR syncs to Xero (if Phase 7 enabled)  
✅ No database conflicts with existing data  
✅ File upload speed unchanged (OCR is async)  
✅ Can disable Phase 8 without affecting other features  
✅ 0 null pointer errors from missing ocr_results_id  

---

**Next Step:** Approve Phase 8 approach and begin implementation after Phase 7.
