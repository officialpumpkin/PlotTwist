
-- Add edit tracking fields to story_segments table
ALTER TABLE story_segments 
ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN last_edited_at TIMESTAMP,
ADD COLUMN edited_by VARCHAR REFERENCES users(id);
