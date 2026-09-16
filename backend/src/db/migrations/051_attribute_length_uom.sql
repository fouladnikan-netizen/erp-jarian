-- Length units for numeric Attribute Definitions (size, thickness, mesh, diameter).
-- Distinct from Product Type offer/count units (شاخه / کیلو). Skip when ops already created them.
INSERT INTO uom_registry (id, code, name_fa, category, is_active)
SELECT 'uom_mm', 'MM', 'میل', 'LENGTH', true
WHERE NOT EXISTS (SELECT 1 FROM uom_registry WHERE code = 'MM' OR name_fa = 'میل');

INSERT INTO uom_registry (id, code, name_fa, category, is_active)
SELECT 'uom_inch', 'INCH', 'اینچ', 'LENGTH', true
WHERE NOT EXISTS (SELECT 1 FROM uom_registry WHERE code = 'INCH' OR name_fa = 'اینچ');
