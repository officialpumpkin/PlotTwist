
-- Add missing edit columns to stories table
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS edited_by VARCHAR;

-- Add foreign key constraint for edited_by if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stories_edited_by_users_id_fk'
    ) THEN
        ALTER TABLE stories 
        ADD CONSTRAINT stories_edited_by_users_id_fk 
        FOREIGN KEY (edited_by) REFERENCES users(id);
    END IF;
END $$;
