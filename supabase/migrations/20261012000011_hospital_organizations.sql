-- Migration 20261012000011: Multi-User Hospital Organizations & Department Ordering
-- Governed by PRD Section 2.3 (Ramesh Persona), Section 10 (Decision #2), and Planning/VARIABLE_REGISTRY.md

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gstin text,
  billing_address text,
  city text,
  state text,
  pincode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'purchaser' CHECK (member_role IN ('admin', 'purchaser', 'surgeon')),
  department text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

-- 3. Add organization attribution columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_name text,
  ADD COLUMN IF NOT EXISTS on_behalf_of_doctor text;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_org ON public.orders(organization_id);

-- 5. Row-Level Security (RLS) Policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations Policies
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
CREATE POLICY "organizations_select_policy" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organizations.id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
CREATE POLICY "organizations_insert_policy" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
CREATE POLICY "organizations_update_policy" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organizations.id AND user_id = auth.uid() AND member_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations;
CREATE POLICY "organizations_delete_policy" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Organization Members Policies
DROP POLICY IF EXISTS "org_members_select_policy" ON public.organization_members;
CREATE POLICY "org_members_select_policy" ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR 
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org_members_insert_policy" ON public.organization_members;
CREATE POLICY "org_members_insert_policy" ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR 
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organization_members.organization_id AND user_id = auth.uid() AND member_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "org_members_update_policy" ON public.organization_members;
CREATE POLICY "org_members_update_policy" ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.member_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "org_members_delete_policy" ON public.organization_members;
CREATE POLICY "org_members_delete_policy" ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (
    is_admin() OR 
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.member_role = 'admin'
    )
  );
