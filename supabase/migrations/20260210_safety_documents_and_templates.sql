-- Migration: Safety Documents, Custom Templates, and Digital Signatures

-- 1. Create safety_templates Table
CREATE TABLE IF NOT EXISTS public.safety_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('jsa', 'swms', 'confined_space', 'take5', 'hot_work', 'custom')),
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create safety_documents Table
CREATE TABLE IF NOT EXISTS public.safety_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.safety_templates(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'jsa',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signatures', 'completed', 'expired')),
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_safety_doc_parent CHECK (project_id IS NOT NULL OR cost_center_id IS NOT NULL)
);

-- 3. Create safety_signatures Table
CREATE TABLE IF NOT EXISTS public.safety_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.safety_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL DEFAULT 'Technician',
  signature_data TEXT NOT NULL,
  sign_type TEXT NOT NULL DEFAULT 'on_the_spot' CHECK (sign_type IN ('on_the_spot', 'remote', 'qr_code')),
  status TEXT NOT NULL DEFAULT 'signed' CHECK (status IN ('signed', 'pending')),
  signed_at TIMESTAMPTZ DEFAULT now(),
  geo_location JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.safety_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_signatures ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for Authenticated Users
DROP POLICY IF EXISTS "Allow authenticated full access to safety_templates" ON public.safety_templates;
CREATE POLICY "Allow authenticated full access to safety_templates" ON public.safety_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to safety_documents" ON public.safety_documents;
CREATE POLICY "Allow authenticated full access to safety_documents" ON public.safety_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to safety_signatures" ON public.safety_signatures;
CREATE POLICY "Allow authenticated full access to safety_signatures" ON public.safety_signatures
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public access for QR Code Touchless Sign-on
DROP POLICY IF EXISTS "Allow public read of active safety_documents" ON public.safety_documents;
CREATE POLICY "Allow public read of active safety_documents" ON public.safety_documents
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public insert of safety_signatures via QR" ON public.safety_signatures;
CREATE POLICY "Allow public insert of safety_signatures via QR" ON public.safety_signatures
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read of safety_signatures" ON public.safety_signatures;
CREATE POLICY "Allow public read of safety_signatures" ON public.safety_signatures
  FOR SELECT TO anon USING (true);

-- Create Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_safety_docs_project ON public.safety_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_safety_docs_cost_center ON public.safety_documents(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_safety_docs_status ON public.safety_documents(status);
CREATE INDEX IF NOT EXISTS idx_safety_signatures_doc ON public.safety_signatures(document_id);

-- 4. Pre-seed Default Templates (JSA, SWMS, Confined Space, Take 5, Hot Work/LOTO)
INSERT INTO public.safety_templates (title, category, description, is_system_default, schema)
VALUES
(
  'Job Safety Analysis (JSA)',
  'jsa',
  'Standard task-by-task hazard identification, 5x5 risk evaluation, and control implementation plan.',
  true,
  '{
    "sections": [
      {
        "id": "site_info",
        "title": "Site & Job Context",
        "fields": [
          { "id": "task_description", "label": "Specific Scope of Work", "type": "textarea", "required": true, "placeholder": "Describe the work being performed today..." },
          { "id": "work_permit_required", "label": "Permit to Work Required?", "type": "select", "options": ["No", "Hot Work Permit", "Confined Space Permit", "Isolation/LOTO Permit", "Working at Heights Permit"] },
          { "id": "emergency_assembly_point", "label": "Site Emergency Assembly Point", "type": "text", "placeholder": "e.g. Front Carpark / Main Gate" }
        ]
      },
      {
        "id": "ppe_requirements",
        "title": "Mandatory PPE & Safety Equipment",
        "type": "ppe_grid",
        "items": [
          { "id": "hard_hat", "label": "Hard Hat", "icon": "engineering", "default": true },
          { "id": "hi_vis", "label": "Hi-Vis Vest / Clothing", "icon": "vest", "default": true },
          { "id": "safety_boots", "label": "Steel-Cap Boots", "icon": "hiking", "default": true },
          { "id": "safety_glasses", "label": "Safety Glasses / Eye Protection", "icon": "visibility", "default": true },
          { "id": "gloves", "label": "Cut-Resistant Gloves", "icon": "front_hand", "default": false },
          { "id": "hearing_protection", "label": "Hearing Protection", "icon": "hearing", "default": false },
          { "id": "respirator", "label": "Dust Mask / Respirator", "icon": "masks", "default": false },
          { "id": "harness", "label": "Safety Harness / Lanyard", "icon": "accessibility_new", "default": false }
        ]
      },
      {
        "id": "hazard_table",
        "title": "Hazard Identification & 5x5 Risk Matrix Controls",
        "type": "risk_matrix_table",
        "default_rows": [
          {
            "step": "Arrival on Site & Vehicle Movement",
            "hazard": "Mobile plant, reversing vehicles, pedestrian collision",
            "initial_likelihood": 2,
            "initial_consequence": 4,
            "controls": "Park in designated trade bays, reverse park, wear hi-vis, maintain site speed limit (10km/h).",
            "residual_likelihood": 1,
            "residual_consequence": 2
          },
          {
            "step": "Power Isolation & Verification",
            "hazard": "Electric shock, arc flash, stored energy release",
            "initial_likelihood": 3,
            "initial_consequence": 5,
            "controls": "Test Before Touch protocol, lockout/tagout (LOTO) at breaker, verify multi-meter on proving unit.",
            "residual_likelihood": 1,
            "residual_consequence": 2
          },
          {
            "step": "Manual Handling & Equipment Setup",
            "hazard": "Musculoskeletal strain, dropped objects, slips/trips",
            "initial_likelihood": 3,
            "initial_consequence": 3,
            "controls": "Two-person lift for items >20kg, keep walkways clear of cables, check ladder condition prior to use.",
            "residual_likelihood": 1,
            "residual_consequence": 2
          }
        ]
      }
    ]
  }'::jsonb
),
(
  'Safe Work Method Statement (SWMS)',
  'swms',
  'High-Risk Construction Work compliance with mandatory HRCW checkboxes, PPE grid, and hierarchy of controls.',
  true,
  '{
    "sections": [
      {
        "id": "hrcw_flags",
        "title": "High-Risk Construction Work (HRCW) Triggers",
        "type": "checkbox_group",
        "options": [
          "Risk of fall from height > 2 metres",
          "Work on or near energized electrical installations",
          "Work in or near a shaft or trench depth > 1.5 metres",
          "Work in or near a confined space",
          "Work involving demolition or load-bearing structures",
          "Work in areas with movement of powered mobile plant",
          "Work on or near pressurized gas distribution mains or piping",
          "Work in telecommunications tower or high-voltage switchyard"
        ]
      },
      {
        "id": "ppe_requirements",
        "title": "Mandatory PPE Selection",
        "type": "ppe_grid",
        "items": [
          { "id": "hard_hat", "label": "Hard Hat", "icon": "engineering", "default": true },
          { "id": "hi_vis", "label": "Hi-Vis", "icon": "vest", "default": true },
          { "id": "safety_boots", "label": "Safety Boots", "icon": "hiking", "default": true },
          { "id": "safety_glasses", "label": "Eye Protection", "icon": "visibility", "default": true },
          { "id": "gloves", "label": "Gloves", "icon": "front_hand", "default": true },
          { "id": "arc_flash_suit", "label": "Arc Flash Face Shield / Suit", "icon": "shield", "default": false },
          { "id": "hearing_protection", "label": "Hearing Protection", "icon": "hearing", "default": false }
        ]
      },
      {
        "id": "swms_steps",
        "title": "Job Steps & Hierarchy of Controls",
        "type": "risk_matrix_table",
        "default_rows": [
          {
            "step": "Pre-Start & Site Hazard Induction",
            "hazard": "Uncontrolled site risks, changing weather/site conditions",
            "initial_likelihood": 3,
            "initial_consequence": 3,
            "controls": "Conduct site walk, review active SWMS with all crew, ensure sign-on before commencement.",
            "residual_likelihood": 1,
            "residual_consequence": 1
          },
          {
            "step": "Cable Pulling & High Level Working",
            "hazard": "Falls from height, pinch points, ladder tip-over",
            "initial_likelihood": 3,
            "initial_consequence": 4,
            "controls": "Use platform ladder or scissor lift with harness anchored, maintain 3 points of contact.",
            "residual_likelihood": 1,
            "residual_consequence": 2
          },
          {
            "step": "Switchboard Termination & Testing",
            "hazard": "Arc blast, accidental re-energisation, short circuit",
            "initial_likelihood": 3,
            "initial_consequence": 5,
            "controls": "Lockout switchboard, install danger tags, place insulated rubber mats, Test Before Touch.",
            "residual_likelihood": 1,
            "residual_consequence": 2
          }
        ]
      }
    ]
  }'::jsonb
),
(
  'Confined Space Entry Permit',
  'confined_space',
  'Permit for entry into pits, ceiling voids, tanks, or trenches with gas testing log and standby observer verification.',
  true,
  '{
    "sections": [
      {
        "id": "space_details",
        "title": "Confined Space Description & Controls",
        "fields": [
          { "id": "space_name", "label": "Location / Description of Space", "type": "text", "required": true, "placeholder": "e.g. Underground Cable Pit #4 / Basement Sump" },
          { "id": "standby_person", "label": "Standby Person / Safety Watch Name", "type": "text", "required": true, "placeholder": "Full name of designated observer outside space" },
          { "id": "gas_detector_model", "label": "Gas Detector Serial Number & Calibration Date", "type": "text", "placeholder": "e.g. Drager X-am 2500 (Cal: 15/01/2026)" },
          { "id": "ventilation_method", "label": "Continuous Forced Air Ventilation Active?", "type": "select", "options": ["Yes - Forced Mechanical Air Blower", "Yes - Natural Air Flow Verified", "No"] },
          { "id": "rescue_equipment", "label": "Emergency Retrieval / Harness & Tripod Ready?", "type": "select", "options": ["Yes - Tripod & Winch in Position", "Yes - Retrieval Lanyard Attached", "N/A - Direct Egress Ground Level"] }
        ]
      },
      {
        "id": "atmospheric_monitoring",
        "title": "Atmospheric Gas Monitoring Log (Pre-Entry & Continuous)",
        "type": "gas_test_table",
        "default_rows": [
          {
            "test_time": "Initial Pre-Entry",
            "oxygen": "20.9",
            "lel_flammable": "0",
            "co_carbon_monoxide": "0",
            "h2s_hydrogen_sulfide": "0",
            "tester_name": "Lead Technician",
            "result": "PASS"
          }
        ]
      }
    ]
  }'::jsonb
),
(
  'Take 5 Daily Hazard Assessment',
  'take5',
  'Rapid 5-step dynamic pre-start risk checklist for daily field operations.',
  true,
  '{
    "sections": [
      {
        "id": "take5_questions",
        "title": "5-Point Site Risk Check",
        "fields": [
          { "id": "step1_stop", "label": "1. Stop & Look: Have I walked the site and checked for live wires, overhead obstacles, and uneven ground?", "type": "select", "options": ["Yes", "No", "N/A"] },
          { "id": "step2_identify", "label": "2. Identify: Are there any other trades working nearby or energized systems present?", "type": "select", "options": ["Yes - Controlled", "No", "N/A"] },
          { "id": "step3_assess", "label": "3. Assess: Is there any risk of electric shock, fall from height, or hazardous dust?", "type": "select", "options": ["Low Risk", "Medium Risk (Controls Required)", "High Risk (Stop Work)"] },
          { "id": "step4_control", "label": "4. Control: Have all locks, tags, barriers, and required PPE been put in place?", "type": "select", "options": ["Yes", "No"] },
          { "id": "step5_proceed", "label": "5. Proceed: Is it safe to carry out the scheduled scope of work?", "type": "select", "options": ["Yes - Proceed Safely", "No - Contact Supervisor"] }
        ]
      },
      {
        "id": "notes",
        "title": "Specific Site Notes & Control Actions",
        "fields": [
          { "id": "additional_controls", "label": "Additional Precautions Taken Today", "type": "textarea", "placeholder": "e.g. Coned off driveway, notified building manager before isolating board..." }
        ]
      }
    ]
  }'::jsonb
),
(
  'Hot Work & Electrical Isolation Permit (LOTO)',
  'hot_work',
  'Permit for welding, grinding, soldering, or live testing with isolation points and fire watch period.',
  true,
  '{
    "sections": [
      {
        "id": "isolation_loto",
        "title": "Electrical Isolation & Lockout / Tagout (LOTO)",
        "fields": [
          { "id": "isolation_point", "label": "Switchboard & Circuit Isolator Reference", "type": "text", "required": true, "placeholder": "e.g. Main Switchboard MSB-1 / Breaker CB-14" },
          { "id": "lock_tag_numbers", "label": "Personal Safety Lock & Tag #", "type": "text", "placeholder": "e.g. Red Lock #42 / Danger Tag #109" },
          { "id": "test_before_touch", "label": "Test Before Touch (Live-Dead-Live) Verified with Multimeter?", "type": "select", "options": ["Yes - Verified 0V phase-to-phase & phase-to-earth", "No (DO NOT PROCEED)"] }
        ]
      },
      {
        "id": "hot_work_controls",
        "title": "Hot Work & Fire Precautions",
        "fields": [
          { "id": "flammable_materials_cleared", "label": "Flammables and combustibles removed within 10m radius?", "type": "select", "options": ["Yes", "No", "N/A"] },
          { "id": "fire_extinguisher_ready", "label": "Fire Extinguisher on hand and within reach?", "type": "select", "options": ["Yes - Dry Powder / CO2 in Position", "No"] },
          { "id": "fire_watch_minutes", "label": "Post-Work Fire Watch Period (Minutes)", "type": "select", "options": ["30 Minutes", "60 Minutes", "N/A"] }
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
