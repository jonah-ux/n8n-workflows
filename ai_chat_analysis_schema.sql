-- AI Chat Analysis Table Schema
-- Stores analysis of conversations with AI assistants to identify hallucinations and lessons

CREATE TABLE IF NOT EXISTS public.ai_chat_analysis (
  id BIGSERIAL PRIMARY KEY,

  -- Identifiers
  analysis_id TEXT NOT NULL UNIQUE,
  ai_assistant TEXT NOT NULL,  -- 'ChatGPT', 'Gemini', 'Claude', etc.
  topic TEXT NOT NULL,  -- 'n8n workflows', 'HubSpot', etc.

  -- Metadata
  chat_date DATE NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  word_count INTEGER,
  what_trying_to_do TEXT,
  final_outcome TEXT,  -- 'success', 'partial', 'failed'

  -- Analysis Results (structured data)
  hallucinations JSONB DEFAULT '[]'::jsonb,
  failed_approaches JSONB DEFAULT '[]'::jsonb,
  user_corrections JSONB DEFAULT '[]'::jsonb,
  patterns JSONB DEFAULT '[]'::jsonb,
  lessons JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,

  -- Quick reference counts
  hallucination_count INTEGER DEFAULT 0,
  failed_approach_count INTEGER DEFAULT 0,
  correction_count INTEGER DEFAULT 0,
  pattern_count INTEGER DEFAULT 0,
  lesson_count INTEGER DEFAULT 0,

  -- Original data
  original_chat TEXT,
  full_analysis_json JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_ai_chat_analysis_assistant ON public.ai_chat_analysis(ai_assistant);
CREATE INDEX IF NOT EXISTS idx_ai_chat_analysis_topic ON public.ai_chat_analysis(topic);
CREATE INDEX IF NOT EXISTS idx_ai_chat_analysis_date ON public.ai_chat_analysis(chat_date);
CREATE INDEX IF NOT EXISTS idx_ai_chat_analysis_hallucination_count ON public.ai_chat_analysis(hallucination_count);
CREATE INDEX IF NOT EXISTS idx_ai_chat_analysis_lesson_count ON public.ai_chat_analysis(lesson_count);

-- GIN index for searching within JSONB fields
CREATE INDEX IF NOT EXISTS idx_ai_chat_analysis_lessons_gin ON public.ai_chat_analysis USING gin(lessons);
CREATE INDEX IF NOT EXISTS idx_ai_chat_analysis_hallucinations_gin ON public.ai_chat_analysis USING gin(hallucinations);
CREATE INDEX IF NOT EXISTS idx_ai_chat_analysis_patterns_gin ON public.ai_chat_analysis USING gin(patterns);

-- Comments
COMMENT ON TABLE public.ai_chat_analysis IS 'Stores analysis of AI assistant conversations to identify hallucinations, errors, and actionable lessons';
COMMENT ON COLUMN public.ai_chat_analysis.hallucinations IS 'Array of instances where AI gave incorrect/non-existent information';
COMMENT ON COLUMN public.ai_chat_analysis.failed_approaches IS 'Approaches AI suggested that did not work';
COMMENT ON COLUMN public.ai_chat_analysis.user_corrections IS 'Solutions user found when AI could not help';
COMMENT ON COLUMN public.ai_chat_analysis.patterns IS 'Recurring mistakes the AI makes';
COMMENT ON COLUMN public.ai_chat_analysis.lessons IS 'Actionable knowledge to provide AI in future interactions';

-- Useful queries

-- Find all hallucinations for a specific topic
-- SELECT analysis_id, ai_assistant, jsonb_array_length(hallucinations) as count
-- FROM ai_chat_analysis
-- WHERE topic = 'n8n workflows'
-- ORDER BY hallucination_count DESC;

-- Get all high-priority lessons
-- SELECT analysis_id, topic, lesson->>'topic' as lesson_topic, lesson->>'lesson' as lesson_text
-- FROM ai_chat_analysis, jsonb_array_elements(lessons) as lesson
-- WHERE lesson->>'priority' IN ('critical', 'high')
-- ORDER BY chat_date DESC;

-- Find recurring patterns across multiple chats
-- SELECT pattern->>'pattern' as pattern, COUNT(*) as frequency
-- FROM ai_chat_analysis, jsonb_array_elements(patterns) as pattern
-- WHERE ai_assistant = 'ChatGPT'
-- GROUP BY pattern->>'pattern'
-- ORDER BY frequency DESC;
