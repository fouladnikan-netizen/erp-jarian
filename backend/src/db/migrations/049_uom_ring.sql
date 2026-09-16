-- Operator offer-unit table: سیم فولادی counts in حلقه (RING).
-- Skip insert when RING already exists (dev seed may have created it).
INSERT INTO uom_registry (id, code, name_fa, category, is_active)
SELECT 'uom_ring', 'RING', 'حلقه', 'COUNT', true
WHERE NOT EXISTS (SELECT 1 FROM uom_registry WHERE code = 'RING' OR name_fa = 'حلقه');
