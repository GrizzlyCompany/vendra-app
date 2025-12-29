-- Function to calculate market averages for a specific city and property type
-- Returns: average price per m2, min/max price, and listing count
CREATE OR REPLACE FUNCTION get_market_averages(
  target_city TEXT,
  target_type TEXT
) 
RETURNS TABLE (
  average_price_m2 NUMERIC,
  min_price_m2 NUMERIC,
  max_price_m2 NUMERIC,
  total_listings BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (to access all properties)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(price / NULLIF(area, 0)), 2) as average_price_m2,
    ROUND(MIN(price / NULLIF(area, 0)), 2) as min_price_m2,
    ROUND(MAX(price / NULLIF(area, 0)), 2) as max_price_m2,
    COUNT(*) as total_listings
  FROM properties
  WHERE 
    city = target_city 
    AND type = target_type
    AND status = 'active'
    AND area > 0 -- Avoid division by zero
    AND price > 0;
END;
$$;
