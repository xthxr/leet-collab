-- ============================================================
-- LeetCollab — Initial Database Migration
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- profiles: one row per auth user
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  leetcode_username TEXT,
  leetcode_verified BOOLEAN NOT NULL DEFAULT FALSE,
  timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  email_nudges    BOOLEAN NOT NULL DEFAULT TRUE,
  email_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- groups: streak groups (2–5 members)
CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(5), 'hex'),
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_members INT NOT NULL DEFAULT 5 CHECK (max_members BETWEEN 2 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- group_members: membership table
CREATE TABLE IF NOT EXISTS group_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- group_streaks: one row per group (streak state)
CREATE TABLE IF NOT EXISTS group_streaks (
  group_id          UUID PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  current_streak    INT NOT NULL DEFAULT 0,
  longest_streak    INT NOT NULL DEFAULT 0,
  last_active_date  DATE,
  broken_at         TIMESTAMPTZ,
  total_days_active INT NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- daily_activity: one row per user per group per day
CREATE TABLE IF NOT EXISTS daily_activity (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  verified_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submission_id  TEXT,
  problem_title  TEXT,
  problem_slug   TEXT,
  language       TEXT,
  UNIQUE (group_id, user_id, activity_date)
);

-- nudges: friend nudge records
CREATE TABLE IF NOT EXISTS nudges (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nudge_type   TEXT NOT NULL DEFAULT 'manual' CHECK (nudge_type IN ('manual', 'auto')),
  sent_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- one manual nudge per sender→recipient per group per day
  UNIQUE (group_id, from_user_id, to_user_id, sent_date)
);

-- email_queue: transactional email jobs
CREATE TABLE IF NOT EXISTS email_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  subject         TEXT NOT NULL,
  html_body       TEXT NOT NULL,
  text_body       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  email_type      TEXT NOT NULL DEFAULT 'nudge' CHECK (email_type IN ('nudge', 'reminder', 'system')),
  attempts        INT NOT NULL DEFAULT 0,
  last_attempted  TIMESTAMPTZ,
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- streak_history: immutable log of streak events
CREATE TABLE IF NOT EXISTS streak_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('extended', 'broken', 'started', 'reset')),
  streak_day  INT NOT NULL,
  event_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_group_date ON daily_activity(group_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_nudges_date ON nudges(group_id, to_user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_streak_history_group ON streak_history(group_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

-- Helper: check if a user is an active member of a group
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if a user is the owner of a group
CREATE OR REPLACE FUNCTION is_group_owner(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role = 'owner'
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles RLS
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_group_members" ON profiles;
CREATE POLICY "profiles_select_group_members" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = profiles.id
      AND gm1.is_active = TRUE
      AND gm2.is_active = TRUE
  )
);

-- groups RLS
DROP POLICY IF EXISTS "groups_select_members" ON groups;
CREATE POLICY "groups_select_members" ON groups FOR SELECT USING (
  is_group_member(id, auth.uid())
);

DROP POLICY IF EXISTS "groups_insert_authenticated" ON groups;
CREATE POLICY "groups_insert_authenticated" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "groups_update_owner" ON groups;
CREATE POLICY "groups_update_owner" ON groups FOR UPDATE USING (is_group_owner(id, auth.uid()));

DROP POLICY IF EXISTS "groups_select_by_invite" ON groups;
CREATE POLICY "groups_select_by_invite" ON groups FOR SELECT USING (TRUE);

-- group_members RLS
DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT USING (
  user_id = auth.uid() OR is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "group_members_insert_own" ON group_members;
CREATE POLICY "group_members_insert_own" ON group_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "group_members_update_owner" ON group_members;
CREATE POLICY "group_members_update_owner" ON group_members FOR UPDATE USING (
  is_group_owner(group_id, auth.uid()) OR user_id = auth.uid()
);

-- group_streaks RLS
DROP POLICY IF EXISTS "group_streaks_select" ON group_streaks;
CREATE POLICY "group_streaks_select" ON group_streaks FOR SELECT USING (
  is_group_member(group_id, auth.uid())
);
-- streaks are only updated via service role / db functions

-- daily_activity RLS
DROP POLICY IF EXISTS "daily_activity_select" ON daily_activity;
CREATE POLICY "daily_activity_select" ON daily_activity FOR SELECT USING (
  is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "daily_activity_insert_own" ON daily_activity;
CREATE POLICY "daily_activity_insert_own" ON daily_activity FOR INSERT WITH CHECK (
  user_id = auth.uid() AND is_group_member(group_id, auth.uid())
);

-- nudges RLS
DROP POLICY IF EXISTS "nudges_select" ON nudges;
CREATE POLICY "nudges_select" ON nudges FOR SELECT USING (
  to_user_id = auth.uid() OR from_user_id = auth.uid()
);

DROP POLICY IF EXISTS "nudges_insert" ON nudges;
CREATE POLICY "nudges_insert" ON nudges FOR INSERT WITH CHECK (
  from_user_id = auth.uid() AND is_group_member(group_id, auth.uid())
);

-- email_queue RLS — service role only (no user access)
DROP POLICY IF EXISTS "email_queue_service_only" ON email_queue;
CREATE POLICY "email_queue_service_only" ON email_queue FOR ALL USING (FALSE);

-- streak_history RLS
DROP POLICY IF EXISTS "streak_history_select" ON streak_history;
CREATE POLICY "streak_history_select" ON streak_history FOR SELECT USING (
  is_group_member(group_id, auth.uid())
);

-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS groups_updated_at ON groups;
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CORE: recalculate_group_streak
-- Idempotent, server-side streak engine.
-- Called after every daily_activity insert.
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_group_streak(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
  v_today          DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_yesterday      DATE := v_today - INTERVAL '1 day';
  v_active_members INT;
  v_done_today     INT;
  v_streak         RECORD;
  v_new_streak     INT;
  v_new_longest    INT;
  v_event_type     TEXT;
BEGIN
  -- Count active members
  SELECT COUNT(*) INTO v_active_members
  FROM group_members
  WHERE group_id = p_group_id
    AND is_active = TRUE;

  IF v_active_members = 0 THEN
    RETURN;
  END IF;

  -- Count how many of those members have submitted today
  SELECT COUNT(DISTINCT da.user_id) INTO v_done_today
  FROM daily_activity da
  JOIN group_members gm ON gm.user_id = da.user_id AND gm.group_id = da.group_id
  WHERE da.group_id = p_group_id
    AND da.activity_date = v_today
    AND gm.is_active = TRUE;

  -- Not all members done yet — no streak change
  IF v_done_today < v_active_members THEN
    RETURN;
  END IF;

  -- All members done today. Fetch current streak state.
  SELECT * INTO v_streak FROM group_streaks WHERE group_id = p_group_id;

  IF NOT FOUND THEN
    -- Initialize streak row
    INSERT INTO group_streaks (group_id, current_streak, longest_streak, last_active_date, total_days_active)
    VALUES (p_group_id, 1, 1, v_today, 1);
    INSERT INTO streak_history (group_id, event_type, streak_day, event_date)
    VALUES (p_group_id, 'started', 1, v_today);
    RETURN;
  END IF;

  -- Already recorded today — idempotent guard
  IF v_streak.last_active_date = v_today THEN
    RETURN;
  END IF;

  -- Determine new streak value
  IF v_streak.last_active_date = v_yesterday THEN
    -- Consecutive day
    v_new_streak := v_streak.current_streak + 1;
    v_event_type := 'extended';
  ELSE
    -- Streak broken (gap > 1 day) — reset to 1
    v_new_streak := 1;
    v_event_type := 'started';
  END IF;

  v_new_longest := GREATEST(v_streak.longest_streak, v_new_streak);

  -- Write broken event if streak was active and just got reset
  IF v_event_type = 'started' AND v_streak.current_streak > 0 AND v_streak.last_active_date IS NOT NULL THEN
    INSERT INTO streak_history (group_id, event_type, streak_day, event_date)
    VALUES (p_group_id, 'broken', v_streak.current_streak, v_today)
    ON CONFLICT DO NOTHING;
    -- Mark broken_at on the day AFTER last_active_date (the day they missed)
    UPDATE group_streaks
    SET broken_at = (v_streak.last_active_date + INTERVAL '1 day')::TIMESTAMPTZ
    WHERE group_id = p_group_id;
  END IF;

  -- Update streak
  UPDATE group_streaks SET
    current_streak   = v_new_streak,
    longest_streak   = v_new_longest,
    last_active_date = v_today,
    total_days_active = total_days_active + 1,
    updated_at       = NOW()
  WHERE group_id = p_group_id;

  -- Log streak event
  INSERT INTO streak_history (group_id, event_type, streak_day, event_date)
  VALUES (p_group_id, v_event_type, v_new_streak, v_today)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- join_group_by_invite: atomic join with cap enforcement
-- ============================================================
CREATE OR REPLACE FUNCTION join_group_by_invite(p_invite_code TEXT, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_group       RECORD;
  v_member_count INT;
  v_existing    RECORD;
BEGIN
  -- Find group
  SELECT * INTO v_group FROM groups WHERE invite_code = p_invite_code;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Group not found', 'code', 'NOT_FOUND');
  END IF;

  -- Check existing membership
  SELECT * INTO v_existing FROM group_members
  WHERE group_id = v_group.id AND user_id = p_user_id;

  IF FOUND THEN
    IF v_existing.is_active THEN
      RETURN json_build_object('error', 'Already a member', 'code', 'ALREADY_MEMBER', 'group_id', v_group.id);
    ELSE
      -- Rejoin
      UPDATE group_members SET is_active = TRUE, joined_at = NOW()
      WHERE group_id = v_group.id AND user_id = p_user_id;
      RETURN json_build_object('success', TRUE, 'group_id', v_group.id, 'group_name', v_group.name);
    END IF;
  END IF;

  -- Count current active members
  SELECT COUNT(*) INTO v_member_count FROM group_members
  WHERE group_id = v_group.id AND is_active = TRUE;

  IF v_member_count >= v_group.max_members THEN
    RETURN json_build_object('error', 'Group is full', 'code', 'GROUP_FULL');
  END IF;

  -- Insert member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group.id, p_user_id, 'member');

  RETURN json_build_object('success', TRUE, 'group_id', v_group.id, 'group_name', v_group.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- get_group_dashboard: single query for dashboard data
-- ============================================================
CREATE OR REPLACE FUNCTION get_group_dashboard(p_group_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_result JSON;
BEGIN
  -- Verify caller is a member
  IF NOT is_group_member(p_group_id, p_user_id) THEN
    RETURN json_build_object('error', 'Not a member');
  END IF;

  SELECT json_build_object(
    'group', (SELECT row_to_json(g) FROM groups g WHERE g.id = p_group_id),
    'streak', (SELECT row_to_json(gs) FROM group_streaks gs WHERE gs.group_id = p_group_id),
    'members', (
      SELECT json_agg(json_build_object(
        'user_id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'leetcode_username', p.leetcode_username,
        'role', gm.role,
        'joined_at', gm.joined_at,
        'done_today', EXISTS(
          SELECT 1 FROM daily_activity da
          WHERE da.group_id = p_group_id
            AND da.user_id = p.id
            AND da.activity_date = v_today
        ),
        'nudged_today', EXISTS(
          SELECT 1 FROM nudges n
          WHERE n.group_id = p_group_id
            AND n.to_user_id = p.id
            AND n.from_user_id = p_user_id
            AND n.sent_at::DATE = v_today
        )
      ))
      FROM group_members gm
      JOIN profiles p ON p.id = gm.user_id
      WHERE gm.group_id = p_group_id AND gm.is_active = TRUE
    ),
    'today', v_today
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- pg_cron schedules (run AFTER enabling pg_cron extension)
-- These are set up manually in the Supabase dashboard SQL editor
-- after deploying Edge Functions.
-- ============================================================
-- SELECT cron.schedule('process-emails', '*/5 * * * *',
--   $$SELECT net.http_post(url := current_setting('app.supabase_url') || '/functions/v1/send-emails',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
--     body := '{}'::jsonb)$$
-- );
-- SELECT cron.schedule('deadline-reminder', '0 21 * * *',
--   $$SELECT net.http_post(url := current_setting('app.supabase_url') || '/functions/v1/deadline-reminder',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
--     body := '{}'::jsonb)$$
-- );
