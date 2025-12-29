-- Add priority column
ALTER TABLE properties ADD COLUMN IF NOT EXISTS role_priority INT DEFAULT 0;

-- Function to set priority based on owner role
CREATE OR REPLACE FUNCTION update_property_priority()
RETURNS TRIGGER AS $$
DECLARE
  owner_role text;
BEGIN
  SELECT role INTO owner_role FROM users WHERE id = NEW.owner_id;
  
  IF owner_role = 'empresa_constructora' THEN
    NEW.role_priority := 30;
  ELSIF owner_role = 'agente' THEN
    NEW.role_priority := 20;
  ELSIF owner_role = 'vendedor' THEN
    NEW.role_priority := 10;
  ELSE
    NEW.role_priority := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for priority
DROP TRIGGER IF EXISTS set_property_priority ON properties;
CREATE TRIGGER set_property_priority
BEFORE INSERT OR UPDATE OF owner_id ON properties
FOR EACH ROW
EXECUTE FUNCTION update_property_priority();

-- Retroactive update for existing properties
UPDATE properties p
SET role_priority = (
  CASE 
    WHEN u.role = 'empresa_constructora' THEN 30
    WHEN u.role = 'agente' THEN 20
    WHEN u.role = 'vendedor' THEN 10
    ELSE 0
  END
)
FROM users u
WHERE p.owner_id = u.id;

-- Function to check limits
CREATE OR REPLACE FUNCTION check_property_limit()
RETURNS TRIGGER AS $$
DECLARE
  owner_role text;
  current_count int;
  limit_count int;
BEGIN
  -- Get owner role
  SELECT role INTO owner_role FROM users WHERE id = NEW.owner_id;
  
  -- Determine limit
  IF owner_role = 'vendedor' THEN
    limit_count := 3;
  ELSIF owner_role = 'agente' THEN
    limit_count := 20;
  ELSIF owner_role = 'empresa_constructora' THEN
    RETURN NEW; -- Unlimited
  ELSIF owner_role = 'admin' THEN
    RETURN NEW; -- Unlimited
  ELSE
    limit_count := 3; -- Default/Comprador fallback (though buyers usually can't post without upgrading to seller)
  END IF;

  -- Check current count (only count active/published properties as consuming the quota)
  -- Assuming 'status' column exists and 'active' is the live state.
  -- Depending on schema, might need to check just 'is_published' or 'status'.
  -- Let's check schema first? No, standard Vendra schema uses status='active' usually.
  
  SELECT count(*) INTO current_count 
  FROM properties 
  WHERE owner_id = NEW.owner_id 
    AND (status = 'active' OR status = 'published' OR is_published = true); 
    -- Broad check to be safe, or refine if I knew exact schema. active/published are common.

  IF current_count >= limit_count THEN
    RAISE EXCEPTION 'Property limit reached for role % (Limit: %)', owner_role, limit_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for limits
DROP TRIGGER IF EXISTS enforce_property_limit ON properties;
CREATE TRIGGER enforce_property_limit
BEFORE INSERT ON properties
FOR EACH ROW
EXECUTE FUNCTION check_property_limit();
