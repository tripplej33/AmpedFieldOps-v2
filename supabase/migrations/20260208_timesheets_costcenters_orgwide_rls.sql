-- Org-wide SELECT policy for timesheets and cost_centers for authenticated users
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timesheets' AND policyname = 'timesheets_select_authenticated') THEN
    EXECUTE 'DROP POLICY timesheets_select_authenticated ON timesheets';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND policyname = 'cost_centers_select_authenticated') THEN
    EXECUTE 'DROP POLICY cost_centers_select_authenticated ON cost_centers';
  END IF;
END $$;

CREATE POLICY timesheets_select_authenticated ON timesheets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY cost_centers_select_authenticated ON cost_centers
  FOR SELECT
  TO authenticated
  USING (true);
