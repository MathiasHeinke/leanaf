-- Phase 1: ARES Cycling Management System - Database Schema

-- 1.1 Add cycling default columns to supplement_database
ALTER TABLE supplement_database 
  ADD COLUMN IF NOT EXISTS default_cycle_on_days INTEGER,
  ADD COLUMN IF NOT EXISTS default_cycle_off_days INTEGER,
  ADD COLUMN IF NOT EXISTS cycling_reason TEXT;

-- 1.2 Update cycling defaults for key substances
-- NMN
UPDATE supplement_database 
SET default_cycle_on_days = 30, default_cycle_off_days = 7, cycling_reason = 'NAD+ Rezeptor-Sensitivität erhalten'
WHERE name ILIKE '%NMN%' OR name ILIKE '%Nicotinamide Mononucleotide%';

-- Nicotinamid Riboside
UPDATE supplement_database 
SET default_cycle_on_days = 30, default_cycle_off_days = 7, cycling_reason = 'NAD+ Rezeptor-Sensitivität erhalten'
WHERE name ILIKE '%Nicotinamid Riboside%' OR name ILIKE '%Nicotinamide Riboside%' OR name ILIKE '%NR%';

-- Ashwagandha
UPDATE supplement_database 
SET default_cycle_on_days = 60, default_cycle_off_days = 14, cycling_reason = 'Schilddrüsen-Adaptation vermeiden'
WHERE name ILIKE '%Ashwagandha%';

-- Rhodiola Rosea
UPDATE supplement_database 
SET default_cycle_on_days = 60, default_cycle_off_days = 14, cycling_reason = 'Adaptogen-Toleranz Reset'
WHERE name ILIKE '%Rhodiola%';

-- Alpha-GPC
UPDATE supplement_database 
SET default_cycle_on_days = 56, default_cycle_off_days = 14, cycling_reason = 'Cholin-Rezeptor Downregulation vermeiden'
WHERE name ILIKE '%Alpha-GPC%' OR name ILIKE '%Alpha GPC%';

-- BPC-157
UPDATE supplement_database 
SET default_cycle_on_days = 28, default_cycle_off_days = 14, cycling_reason = 'Rezeptor-Desensibilisierung vermeiden'
WHERE name ILIKE '%BPC-157%' OR name ILIKE '%BPC157%';

-- TB-500
UPDATE supplement_database 
SET default_cycle_on_days = 28, default_cycle_off_days = 28, cycling_reason = 'Angiogenese-Sättigung vermeiden'
WHERE name ILIKE '%TB-500%' OR name ILIKE '%TB500%' OR name ILIKE '%Thymosin Beta%';

-- MK-677 (Ibutamoren)
UPDATE supplement_database 
SET default_cycle_on_days = 60, default_cycle_off_days = 30, cycling_reason = 'GH-Rezeptor Downregulation vermeiden'
WHERE name ILIKE '%MK-677%' OR name ILIKE '%MK677%' OR name ILIKE '%Ibutamoren%';

-- Ipamorelin
UPDATE supplement_database 
SET default_cycle_on_days = 90, default_cycle_off_days = 30, cycling_reason = 'GHRH-Rezeptor Reset'
WHERE name ILIKE '%Ipamorelin%';

-- CJC-1295
UPDATE supplement_database 
SET default_cycle_on_days = 90, default_cycle_off_days = 30, cycling_reason = 'GHRH-Rezeptor Reset'
WHERE name ILIKE '%CJC-1295%' OR name ILIKE '%CJC1295%';

-- Semax
UPDATE supplement_database 
SET default_cycle_on_days = 21, default_cycle_off_days = 7, cycling_reason = 'BDNF-Rezeptor Sensitivität erhalten'
WHERE name ILIKE '%Semax%';

-- Selank
UPDATE supplement_database 
SET default_cycle_on_days = 21, default_cycle_off_days = 7, cycling_reason = 'GABA-Modulation Reset'
WHERE name ILIKE '%Selank%';

-- Epitalon
UPDATE supplement_database 
SET default_cycle_on_days = 20, default_cycle_off_days = 180, cycling_reason = 'Telomerase-Aktivierung (2x/Jahr Protokoll)'
WHERE name ILIKE '%Epitalon%' OR name ILIKE '%Epithalon%';

-- Rapamycin
UPDATE supplement_database 
SET default_cycle_on_days = 1, default_cycle_off_days = 6, cycling_reason = 'Weekly Pulse (Mannick Protocol)'
WHERE name ILIKE '%Rapamycin%' OR name ILIKE '%Sirolimus%';

-- Modafinil
UPDATE supplement_database 
SET default_cycle_on_days = 5, default_cycle_off_days = 2, cycling_reason = 'Dopamin-Rezeptor Sensitivität'
WHERE name ILIKE '%Modafinil%';

-- DHEA
UPDATE supplement_database 
SET default_cycle_on_days = 90, default_cycle_off_days = 30, cycling_reason = 'Hormon-Homöostase erhalten'
WHERE name ILIKE '%DHEA%';

-- Pregnenolone
UPDATE supplement_database 
SET default_cycle_on_days = 90, default_cycle_off_days = 30, cycling_reason = 'Neurosteroid-Balance'
WHERE name ILIKE '%Pregnenolone%' OR name ILIKE '%Pregnenolon%';

-- Also set cycling_required = true for substances with cycling protocols
UPDATE supplement_database 
SET cycling_required = true
WHERE default_cycle_on_days IS NOT NULL AND default_cycle_off_days IS NOT NULL;