-- Migration: Add educational_content field to questions table
-- Date: 2025-11-30
-- Description: Adds a TEXT field to store educational content/examples for each question

-- Add the educational_content column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS educational_content TEXT;

-- Note: This migration is safe to run multiple times due to IF NOT EXISTS
