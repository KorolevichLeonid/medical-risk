-- Migration to add new project fields for hazard checklists and lifecycle stages
-- Run this script when the backend is stopped

ALTER TABLE projects ADD COLUMN lifecycle_stages TEXT;
ALTER TABLE projects ADD COLUMN custom_lifecycle_stages TEXT;
ALTER TABLE projects ADD COLUMN hazard_questions TEXT;
ALTER TABLE projects ADD COLUMN custom_hazard TEXT;
ALTER TABLE projects ADD COLUMN hazard_checklist_answers TEXT;
