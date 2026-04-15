-- Add expiry date support for manual tenant app activations
-- Clients activated via Stripe use subscription.current_period_end
-- Clients activated manually need fecha_vencimiento for automatic deactivation

ALTER TABLE tenant_apps
ADD COLUMN fecha_vencimiento TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN motivo_desactivacion TEXT NULL;

-- Update has_effective_app_access to check expiry
CREATE OR REPLACE FUNCTION has_effective_app_access(
  p_tenant_id BIGINT,
  p_auth_user_id UUID,
  p_app_slug TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM tenant_apps ta
    JOIN apps a ON a.id = ta.app_id
    JOIN user_app_access uaa ON uaa.tenant_id = ta.tenant_id AND uaa.app_id = ta.app_id
    JOIN tenant_users tu ON tu.id = uaa.tenant_user_id
    WHERE ta.tenant_id = p_tenant_id
      AND tu.auth_user_id = p_auth_user_id
      AND a.slug = p_app_slug
      AND ta.activa = TRUE
      -- Check expiry: either no expiry date (Stripe manages it) or expiry date in future
      AND (ta.fecha_vencimiento IS NULL OR ta.fecha_vencimiento > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON COLUMN tenant_apps.fecha_vencimiento IS 'Expiry date for manually activated apps. If NULL, app is active indefinitely (or Stripe manages it). If set, app becomes inactive after this timestamp.';
