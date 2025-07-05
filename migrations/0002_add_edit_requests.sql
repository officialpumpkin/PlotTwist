
CREATE TABLE IF NOT EXISTS "story_edit_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"segment_id" integer,
	"requester_id" varchar NOT NULL,
	"author_id" varchar NOT NULL,
	"edit_type" varchar NOT NULL,
	"original_content" text NOT NULL,
	"proposed_content" text NOT NULL,
	"proposed_title" text,
	"proposed_description" text,
	"proposed_genre" varchar,
	"reason" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

ALTER TABLE "story_edit_requests" ADD CONSTRAINT "story_edit_requests_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "story_edit_requests" ADD CONSTRAINT "story_edit_requests_segment_id_story_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "story_segments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "story_edit_requests" ADD CONSTRAINT "story_edit_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "story_edit_requests" ADD CONSTRAINT "story_edit_requests_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
