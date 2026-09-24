-- =============================================================================
-- NEXUS AI - Supabase PostgreSQL Schema
-- Clean, dependency-safe, user-isolated schema.
-- Run this file as ONE script in Supabase SQL Editor.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Clean application tables.
-- This section makes the script safe to re-run while developing.
-- It does NOT touch auth.users.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.paper_chunks CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.research_findings CASCADE;
DROP TABLE IF EXISTS public.research_gaps CASCADE;
DROP TABLE IF EXISTS public.research_directions CASCADE;
DROP TABLE IF EXISTS public.uploaded_papers CASCADE;
DROP TABLE IF EXISTS public.research_sessions CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- profiles.id is exactly auth.users.id.
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    academic_title TEXT,
    institution TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. RESEARCH SESSIONS
-- ---------------------------------------------------------------------------
CREATE TABLE public.research_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Research Session',
    topic TEXT,
    description TEXT,
    paper_count INTEGER NOT NULL DEFAULT 0 CHECK (paper_count >= 0),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'archived')),
    research_mode TEXT NOT NULL DEFAULT 'standard'
        CHECK (research_mode IN (
            'standard',
            'literature_review',
            'gap_discovery',
            'novel_topic',
            'experiment_design',
            'proposal'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. UPLOADED PAPERS
--
-- The current backend creates paper IDs such as "paper_xxx".
-- Therefore this ID is intentionally TEXT rather than UUID.
-- session_id is nullable because the current upload flow can upload a paper
-- before creating a research session.
-- ---------------------------------------------------------------------------
CREATE TABLE public.uploaded_papers (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.research_sessions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    filename TEXT NOT NULL,
    title TEXT NOT NULL,
    authors TEXT,
    publication_year INTEGER,
    pages INTEGER DEFAULT 1 CHECK (pages IS NULL OR pages >= 0),
    file_format TEXT NOT NULL DEFAULT 'pdf'
        CHECK (file_format IN ('pdf', 'doc', 'docx', 'txt')),
    file_path TEXT,
    file_url TEXT,
    methodology TEXT,
    dataset TEXT,
    sample_size TEXT,
    evaluation_metric TEXT,
    main_result TEXT,
    limitations TEXT,
    status TEXT NOT NULL DEFAULT 'Ready'
        CHECK (status IN ('Ready', 'Processing', 'Failed')),
    extraction_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. PAPER CHUNKS
-- ---------------------------------------------------------------------------
CREATE TABLE public.paper_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paper_id TEXT NOT NULL REFERENCES public.uploaded_papers(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.research_sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    section_name TEXT,
    page_number INTEGER,
    excerpt TEXT NOT NULL,
    confidence NUMERIC(5,2) DEFAULT 98.00
        CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
    embedding TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. CONVERSATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.research_sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Research Intelligence Inquiry',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. MESSAGES
-- ---------------------------------------------------------------------------
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_strength TEXT NOT NULL DEFAULT 'SUPPORTED'
        CHECK (evidence_strength IN (
            'EXPLICIT',
            'SUPPORTED',
            'INFERRED',
            'UNCERTAIN',
            'CONFLICTING'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 7. RESEARCH FINDINGS
-- ---------------------------------------------------------------------------
CREATE TABLE public.research_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.research_sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    statement TEXT NOT NULL,
    supported_ratio TEXT,
    coverage_percent INTEGER DEFAULT 0
        CHECK (coverage_percent >= 0 AND coverage_percent <= 100),
    evidence_strength TEXT NOT NULL DEFAULT 'SUPPORTED'
        CHECK (evidence_strength IN (
            'EXPLICIT',
            'SUPPORTED',
            'INFERRED',
            'UNCERTAIN',
            'CONFLICTING'
        )),
    supporting_paper_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8. RESEARCH GAPS
-- ---------------------------------------------------------------------------
CREATE TABLE public.research_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.research_sessions(id) ON DELETE CASCADE,
    gap_type TEXT NOT NULL
        CHECK (gap_type IN ('author_identified', 'ai_synthesized')),
    category TEXT NOT NULL DEFAULT 'Methodological'
        CHECK (category IN (
            'Methodological',
            'Dataset',
            'Application',
            'Contradiction',
            'Evaluation',
            'Temporal'
        )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rationale TEXT,
    evidence_strength TEXT NOT NULL DEFAULT 'SUPPORTED'
        CHECK (evidence_strength IN (
            'EXPLICIT',
            'SUPPORTED',
            'INFERRED',
            'UNCERTAIN',
            'CONFLICTING'
        )),
    source_paper_code TEXT,
    source_section TEXT,
    source_page INTEGER,
    supporting_papers JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_coverage TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 9. RESEARCH DIRECTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE public.research_directions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.research_sessions(id) ON DELETE CASCADE,
    opportunity_type TEXT NOT NULL DEFAULT 'Methodological Extension'
        CHECK (opportunity_type IN (
            'Methodological Extension',
            'Improve methodology',
            'Test on underrepresented dataset',
            'Combine two approaches',
            'Replicate conflicting findings',
            'Apply to new domain'
        )),
    proposed_title TEXT NOT NULL,
    research_question TEXT NOT NULL,
    hypothesis TEXT,
    required_data TEXT,
    suggested_methodology TEXT,
    evaluation_metrics TEXT,
    experiment_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    impact_indicators JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 10. FEEDBACK
-- ---------------------------------------------------------------------------
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message TEXT NOT NULL,
    what_liked TEXT,
    what_could_improve TEXT,
    suggestions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- Every indexed column exists before this section runs.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_profiles_email
    ON public.profiles(email);

CREATE INDEX idx_sessions_user_id
    ON public.research_sessions(user_id);

CREATE INDEX idx_papers_user_id
    ON public.uploaded_papers(user_id);

CREATE INDEX idx_papers_session_id
    ON public.uploaded_papers(session_id);

CREATE INDEX idx_papers_code_user
    ON public.uploaded_papers(user_id, code);

CREATE INDEX idx_chunks_user_id
    ON public.paper_chunks(user_id);

CREATE INDEX idx_chunks_paper_id
    ON public.paper_chunks(paper_id);

CREATE INDEX idx_chunks_session_id
    ON public.paper_chunks(session_id);

CREATE INDEX idx_conversations_user_id
    ON public.conversations(user_id);

CREATE INDEX idx_conversations_session_id
    ON public.conversations(session_id);

CREATE INDEX idx_messages_user_id
    ON public.messages(user_id);

CREATE INDEX idx_messages_conversation_id
    ON public.messages(conversation_id);

CREATE INDEX idx_findings_user_id
    ON public.research_findings(user_id);

CREATE INDEX idx_findings_session_id
    ON public.research_findings(session_id);

CREATE INDEX idx_gaps_user_id
    ON public.research_gaps(user_id);

CREATE INDEX idx_gaps_session_id
    ON public.research_gaps(session_id);

CREATE INDEX idx_directions_user_id
    ON public.research_directions(user_id);

CREATE INDEX idx_directions_session_id
    ON public.research_directions(session_id);

CREATE INDEX idx_feedback_user_id
    ON public.feedback(user_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- POLICIES
-- DROP first so the script can be safely re-run.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

CREATE POLICY profiles_select_own
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY profiles_insert_own
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_delete_own
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS sessions_select_own ON public.research_sessions;
DROP POLICY IF EXISTS sessions_insert_own ON public.research_sessions;
DROP POLICY IF EXISTS sessions_update_own ON public.research_sessions;
DROP POLICY IF EXISTS sessions_delete_own ON public.research_sessions;

CREATE POLICY sessions_select_own ON public.research_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sessions_insert_own ON public.research_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sessions_update_own ON public.research_sessions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY sessions_delete_own ON public.research_sessions
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS papers_select_own ON public.uploaded_papers;
DROP POLICY IF EXISTS papers_insert_own ON public.uploaded_papers;
DROP POLICY IF EXISTS papers_update_own ON public.uploaded_papers;
DROP POLICY IF EXISTS papers_delete_own ON public.uploaded_papers;

CREATE POLICY papers_select_own ON public.uploaded_papers
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY papers_insert_own ON public.uploaded_papers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY papers_update_own ON public.uploaded_papers
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY papers_delete_own ON public.uploaded_papers
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS chunks_select_own ON public.paper_chunks;
DROP POLICY IF EXISTS chunks_insert_own ON public.paper_chunks;
DROP POLICY IF EXISTS chunks_update_own ON public.paper_chunks;
DROP POLICY IF EXISTS chunks_delete_own ON public.paper_chunks;

CREATE POLICY chunks_select_own ON public.paper_chunks
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY chunks_insert_own ON public.paper_chunks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY chunks_update_own ON public.paper_chunks
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY chunks_delete_own ON public.paper_chunks
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS conversations_select_own ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_own ON public.conversations;
DROP POLICY IF EXISTS conversations_update_own ON public.conversations;
DROP POLICY IF EXISTS conversations_delete_own ON public.conversations;

CREATE POLICY conversations_select_own ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY conversations_insert_own ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY conversations_update_own ON public.conversations
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY conversations_delete_own ON public.conversations
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS messages_select_own ON public.messages;
DROP POLICY IF EXISTS messages_insert_own ON public.messages;
DROP POLICY IF EXISTS messages_update_own ON public.messages;
DROP POLICY IF EXISTS messages_delete_own ON public.messages;

CREATE POLICY messages_select_own ON public.messages
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY messages_insert_own ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY messages_update_own ON public.messages
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY messages_delete_own ON public.messages
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS findings_select_own ON public.research_findings;
DROP POLICY IF EXISTS findings_insert_own ON public.research_findings;
DROP POLICY IF EXISTS findings_update_own ON public.research_findings;
DROP POLICY IF EXISTS findings_delete_own ON public.research_findings;

CREATE POLICY findings_select_own ON public.research_findings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY findings_insert_own ON public.research_findings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY findings_update_own ON public.research_findings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY findings_delete_own ON public.research_findings
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS gaps_select_own ON public.research_gaps;
DROP POLICY IF EXISTS gaps_insert_own ON public.research_gaps;
DROP POLICY IF EXISTS gaps_update_own ON public.research_gaps;
DROP POLICY IF EXISTS gaps_delete_own ON public.research_gaps;

CREATE POLICY gaps_select_own ON public.research_gaps
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY gaps_insert_own ON public.research_gaps
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY gaps_update_own ON public.research_gaps
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY gaps_delete_own ON public.research_gaps
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS directions_select_own ON public.research_directions;
DROP POLICY IF EXISTS directions_insert_own ON public.research_directions;
DROP POLICY IF EXISTS directions_update_own ON public.research_directions;
DROP POLICY IF EXISTS directions_delete_own ON public.research_directions;

CREATE POLICY directions_select_own ON public.research_directions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY directions_insert_own ON public.research_directions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY directions_update_own ON public.research_directions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY directions_delete_own ON public.research_directions
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS feedback_select_own ON public.feedback;
DROP POLICY IF EXISTS feedback_insert_own ON public.feedback;
DROP POLICY IF EXISTS feedback_update_own ON public.feedback;
DROP POLICY IF EXISTS feedback_delete_own ON public.feedback;

CREATE POLICY feedback_select_own ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY feedback_insert_own ON public.feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY feedback_update_own ON public.feedback
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY feedback_delete_own ON public.feedback
    FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- AUTH USER -> PROFILE TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            CASE
                WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1)
                ELSE 'Researcher'
            END
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS sessions_set_updated_at ON public.research_sessions;
DROP TRIGGER IF EXISTS conversations_set_updated_at ON public.conversations;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON public.research_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- END OF NEXUS SCHEMA
-- =============================================================================
