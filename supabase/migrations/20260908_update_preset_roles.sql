-- Update Administrator Role with Full Granular System Privileges
UPDATE public.roles
SET permissions = '[
  "projects.view", "projects.view_all", "projects.view_assigned", "projects.create", "projects.edit", "projects.delete", "projects.assign_members",
  "clients.view", "clients.manage",
  "purchase_orders.view", "purchase_orders.create", "purchase_orders.approve",
  "materials.view", "materials.log", "van_stock.manage",
  "inventory.view", "inventory.manage", "inventory.locations_manage",
  "timesheets.view_own", "timesheets.view_all", "timesheets.create", "timesheets.approve", "timesheets.delete",
  "financials.view", "financials.export", "invoices.view", "invoices.create", "invoices.sync_xero", "xero.manage",
  "snags.manage", "fleet.manage",
  "safety.view", "safety.create_edit", "safety.sign", "safety.manage",
  "compliance.view", "compliance.manage",
  "switchboards.view", "switchboards.manage",
  "schedules.view", "schedules.manage",
  "files.view", "files.upload", "files.rename", "files.create_folder", "files.delete",
  "users.manage", "users.disable", "users.delete", "roles.manage", "settings.manage", "audit_logs.view"
]'::jsonb
WHERE id = 'admin';

-- Update Project / Operations Manager Role
UPDATE public.roles
SET permissions = '[
  "projects.view", "projects.view_all", "projects.view_assigned", "projects.create", "projects.edit", "projects.assign_members",
  "clients.view", "clients.manage",
  "purchase_orders.view", "purchase_orders.create", "purchase_orders.approve",
  "materials.view", "materials.log", "van_stock.manage",
  "inventory.view", "inventory.manage", "inventory.locations_manage",
  "timesheets.view_own", "timesheets.view_all", "timesheets.create", "timesheets.approve",
  "financials.view", "financials.export", "invoices.view", "invoices.create", "invoices.sync_xero",
  "snags.manage", "fleet.manage",
  "safety.view", "safety.create_edit", "safety.sign", "safety.manage",
  "compliance.view", "compliance.manage",
  "switchboards.view", "switchboards.manage",
  "schedules.view", "schedules.manage",
  "files.view", "files.upload", "files.rename", "files.create_folder",
  "users.manage", "users.disable", "settings.manage"
]'::jsonb
WHERE id = 'manager';

-- Update Field Technician Role
UPDATE public.roles
SET permissions = '[
  "projects.view_assigned",
  "clients.view",
  "purchase_orders.view", "purchase_orders.create",
  "materials.view", "materials.log", "van_stock.manage",
  "inventory.view",
  "timesheets.view_own", "timesheets.create",
  "snags.manage", "fleet.manage",
  "safety.view", "safety.sign",
  "compliance.view", "compliance.manage",
  "switchboards.view", "switchboards.manage",
  "schedules.view",
  "files.view", "files.upload"
]'::jsonb
WHERE id = 'technician';

-- Update Apprentice Role
UPDATE public.roles
SET permissions = '[
  "projects.view_assigned",
  "materials.view", "materials.log",
  "timesheets.view_own", "timesheets.create",
  "snags.manage", "fleet.manage",
  "safety.view", "safety.sign",
  "switchboards.view",
  "schedules.view",
  "files.view", "files.upload"
]'::jsonb
WHERE id = 'apprentice';

-- Update Office Admin Role
UPDATE public.roles
SET permissions = '[
  "projects.view", "projects.view_all", "projects.create", "projects.edit",
  "clients.view", "clients.manage",
  "purchase_orders.view", "purchase_orders.create",
  "timesheets.view_all", "timesheets.create",
  "financials.view", "financials.export", "invoices.view", "invoices.create",
  "schedules.view", "schedules.manage",
  "files.view", "files.upload",
  "users.manage"
]'::jsonb
WHERE id = 'office';
