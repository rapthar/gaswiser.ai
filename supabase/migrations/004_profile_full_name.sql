-- Migration 004: Add full_name to profiles (column was missing from original schema)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
