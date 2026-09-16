-- DDL-24m — mnemonic Latin sku_code on taxonomy / attributes / brands.
-- Product SKU becomes {group}-{category}-{type}-{identityValue…}.
-- Numeric taxonomy `code` (GG/CC/TT) is retained but is no longer the Product SKU.

ALTER TABLE product_groups
  ADD COLUMN IF NOT EXISTS sku_code TEXT;

ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS sku_code TEXT;

ALTER TABLE product_types
  ADD COLUMN IF NOT EXISTS sku_code TEXT;

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS sku_code TEXT;

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS name_latin TEXT;

ALTER TABLE attribute_definitions
  ADD COLUMN IF NOT EXISTS sku_code TEXT;

-- Curated catalog codes (existing Persian names).
UPDATE product_groups SET sku_code = 'CS' WHERE name = 'مقاطع فولادی' AND sku_code IS NULL;
UPDATE product_groups SET sku_code = 'SS' WHERE name = 'استنلس استیل' AND sku_code IS NULL;
UPDATE product_groups SET sku_code = 'TW' WHERE name = 'چوب' AND sku_code IS NULL;
UPDATE product_groups SET sku_code = 'PF' WHERE name = 'اتصالات' AND sku_code IS NULL;
UPDATE product_groups SET sku_code = 'Fn' WHERE name = 'پیچ و مهره' AND sku_code IS NULL;

UPDATE product_categories c SET sku_code = v.sku
FROM (VALUES
  ('میلگرد', 'Re'),
  ('تیرآهن', 'Be'),
  ('نبشی و ناودانی', 'AC'),
  ('پروفیل', 'Pr'),
  ('لوله', 'Pi'),
  ('ورق سرد', 'CR'),
  ('ورق گرم', 'HR'),
  ('مفتول و محصولات مفتولی', 'Wi'),
  ('چهارپهلو', 'SB'),
  ('تسمه فولادی', 'Fl'),
  ('میلگرد استیل', 'Re'),
  ('ورق استیل', 'Sh'),
  ('لوله استیل', 'Pi'),
  ('پروفیل استیل', 'Pr'),
  ('نبشی استیل', 'An'),
  ('چوب طبیعی', 'NT'),
  ('فرآورده‌های چوبی', 'WD'),
  ('اتصالات جوشی درزدار', 'WS'),
  ('اتصالات جوشی مانیسمان', 'WL'),
  ('اتصالات فشار قوی و فورج', 'FG'),
  ('اتصالات دنده‌ای', 'Th'),
  ('فلنج‌ها', 'Fl'),
  ('پیچ', 'Bo'),
  ('مهره', 'Nu'),
  ('واشر', 'Wa'),
  ('انکر بولت و رول بولت', 'AB'),
  ('پیچ سرمته', 'SD')
) AS v(name, sku)
WHERE c.name = v.name AND c.sku_code IS NULL;

UPDATE product_types t SET sku_code = v.sku
FROM (VALUES
  ('میلگرد آلیاژی', 'Al'),
  ('میلگرد بستر', 'Bed'),
  ('میلگرد کلاف', 'WR'),
  ('میلگرد حرارتی', 'Th'),
  ('میلگرد ساده', 'Pl'),
  ('میلگرد آجدار', 'De'),
  ('تیرآهن IPE', 'IPE'),
  ('تیرآهن هاش سبک HEA', 'HEA'),
  ('تیرآهن هاش سنگین HEB', 'HEB'),
  ('نبشی بال مساوی', 'Eq'),
  ('نبشی بال نامساوی', 'Uq'),
  ('نبشی لقمه', 'Co'),
  ('ناودانی', 'Uc'),
  ('ناودانی هم وزن اروپا', 'UNP'),
  ('سپری', 'Ts'),
  ('پروفیل مبلی', 'Lf'),
  ('پروفیل', 'Sq'),
  ('پروفیل صنعتی', 'Hv'),
  ('پروفیل زد', 'Zp'),
  ('پروفیل گالوانیزه', 'Ga'),
  ('پروفیل چهارچوب', 'Dr'),
  ('لوله مانیسمان', 'Sm'),
  ('لوله درزدار', 'Wd'),
  ('ورق گالوانیزه', 'Gv'),
  ('ورق روغنی', 'CR'),
  ('ورق رنگی', 'Pp'),
  ('ورق آجدار', 'Ch'),
  ('ورق سیاه', 'Black'),
  ('ورق ضد سایش', 'WR'),
  ('ورق آلیاژی', 'Al'),
  ('ورق ST52', 'ST52'),
  ('ورق A516', 'A516'),
  ('ورق آتشخوار 17Mn4', 'Mn4'),
  ('ورق پانچ', 'Pe')
) AS v(name, sku)
WHERE t.name = v.name AND t.sku_code IS NULL;

UPDATE attribute_definitions SET sku_code = 'Wt' WHERE code = 'weight' AND sku_code IS NULL;

-- Leftover rows (test fixtures, unnamed latin): stable fallback from numeric code.
UPDATE product_groups
   SET sku_code = 'G' || code
 WHERE sku_code IS NULL AND code IS NOT NULL;

UPDATE product_categories
   SET sku_code = 'C' || code
 WHERE sku_code IS NULL AND code IS NOT NULL;

UPDATE product_types
   SET sku_code = 'T' || code
 WHERE sku_code IS NULL AND code IS NOT NULL;

UPDATE attribute_definitions
   SET sku_code = UPPER(SUBSTRING(code FROM 1 FOR 1)) || SUBSTRING(code FROM 2 FOR 1)
 WHERE sku_code IS NULL AND code IS NOT NULL AND length(code) >= 2;

UPDATE brands
   SET sku_code = 'B' || UPPER(SUBSTRING(regexp_replace(id, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3))
 WHERE sku_code IS NULL;

ALTER TABLE product_groups ALTER COLUMN sku_code SET NOT NULL;
ALTER TABLE product_categories ALTER COLUMN sku_code SET NOT NULL;
ALTER TABLE product_types ALTER COLUMN sku_code SET NOT NULL;
ALTER TABLE attribute_definitions ALTER COLUMN sku_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_groups_sku_code_lower
  ON product_groups (lower(sku_code));
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_sku_code_lower
  ON product_categories (group_id, lower(sku_code));
CREATE UNIQUE INDEX IF NOT EXISTS product_types_sku_code_lower
  ON product_types (category_id, lower(sku_code));
CREATE UNIQUE INDEX IF NOT EXISTS brands_sku_code_lower
  ON brands (lower(sku_code));
CREATE UNIQUE INDEX IF NOT EXISTS attribute_definitions_sku_code_lower
  ON attribute_definitions (lower(sku_code));
