-- Apply only if clothing_waitlist does not already have a UNIQUE constraint
-- or unique index on email. This fails safely if duplicate email rows exist.
CREATE UNIQUE INDEX IF NOT EXISTS clothing_waitlist_email_unique_idx
  ON public.clothing_waitlist (email);
