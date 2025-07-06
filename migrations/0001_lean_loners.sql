CREATE TABLE "story_edit_requests" (
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
--> statement-breakpoint
ALTER TABLE "story_edit_requests" ADD CONSTRAINT "story_edit_requests_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_edit_requests" ADD CONSTRAINT "story_edit_requests_segment_id_story_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."story_segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_edit_requests" ADD CONSTRAINT "story_edit_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_edit_requests" ADD CONSTRAINT "story_edit_requests_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;