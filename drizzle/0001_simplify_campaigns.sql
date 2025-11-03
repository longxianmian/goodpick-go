-- Simplify campaigns table - rename title_source to title and description_source to description
-- Keep existing data by renaming columns instead of dropping

-- Rename title_source to title
ALTER TABLE campaigns RENAME COLUMN title_source TO title;

-- Rename description_source to description  
ALTER TABLE campaigns RENAME COLUMN description_source TO description;

-- Drop old multi-language columns that are no longer needed
ALTER TABLE campaigns DROP COLUMN IF EXISTS title_source_lang;
ALTER TABLE campaigns DROP COLUMN IF EXISTS description_source_lang;
ALTER TABLE campaigns DROP COLUMN IF EXISTS title_zh;
ALTER TABLE campaigns DROP COLUMN IF EXISTS title_en;
ALTER TABLE campaigns DROP COLUMN IF EXISTS title_th;
ALTER TABLE campaigns DROP COLUMN IF EXISTS description_zh;
ALTER TABLE campaigns DROP COLUMN IF EXISTS description_en;
ALTER TABLE campaigns DROP COLUMN IF EXISTS description_th;
