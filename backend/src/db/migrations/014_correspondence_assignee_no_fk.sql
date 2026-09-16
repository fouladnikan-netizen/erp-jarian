-- DDL-23e: `correspondence.assignee_user_id` is a Gahshomar-internal referral /
-- org-chart reference (see src/modules/gahshomar/services/orgPeople.js) used to
-- route an INCOMING physical letter to a person inside the organization — that
-- person does not necessarily have an authenticated backend `users` row (e.g.
-- non-system staff, mock org-tree fixtures). Enforcing a hard FK to `users(id)`
-- makes routine incoming-letter creation fail (23503 foreign_key_violation).
-- Expand-only: keep the column + assignee_name label, just relax the FK.
ALTER TABLE correspondence DROP CONSTRAINT IF EXISTS correspondence_assignee_user_id_fkey;
