-- Create function to raise exception on update/delete
CREATE OR REPLACE FUNCTION audit_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

-- Create triggers on audit_log
DROP TRIGGER IF EXISTS audit_log_prevent_update ON audit_log;
CREATE TRIGGER audit_log_prevent_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION audit_log_append_only();

DROP TRIGGER IF EXISTS audit_log_prevent_delete ON audit_log;
CREATE TRIGGER audit_log_prevent_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION audit_log_append_only();
