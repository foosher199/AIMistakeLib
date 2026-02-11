-- ==========================================
-- AI错题本数据库 Schema (Supabase)
-- 所有表名统一添加 mistake_ 前缀
-- ==========================================
-- 创建时间: 2026-02-09
-- 数据库: Supabase PostgreSQL
-- 说明: 本文件包含所有建表语句、索引、RLS策略和触发器
--       请在 Supabase Dashboard 的 SQL Editor 中执行
-- ==========================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- 用户扩展信息表（可选）
-- 说明: 存储用户的额外信息（用户名、头像等）
--       与 auth.users 表关联，auth.users 由 Supabase Auth 自动管理
-- ==========================================
CREATE TABLE "mistake_profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "username" TEXT,
  "avatar_url" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "mistake_profiles" IS '用户扩展信息表';
COMMENT ON COLUMN "mistake_profiles"."id" IS '用户ID，关联auth.users(id)';
COMMENT ON COLUMN "mistake_profiles"."username" IS '用户名';
COMMENT ON COLUMN "mistake_profiles"."avatar_url" IS '头像URL';
COMMENT ON COLUMN "mistake_profiles"."created_at" IS '创建时间';
COMMENT ON COLUMN "mistake_profiles"."updated_at" IS '最后更新时间';

-- 启用 Row Level Security (RLS)
ALTER TABLE "mistake_profiles" ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的profile
CREATE POLICY "Users can view own profile"
  ON "mistake_profiles"
  FOR SELECT
  USING (auth.uid() = id);

-- RLS 策略：用户只能更新自己的profile
CREATE POLICY "Users can update own profile"
  ON "mistake_profiles"
  FOR UPDATE
  USING (auth.uid() = id);

-- RLS 策略：用户只能插入自己的profile
CREATE POLICY "Users can insert own profile"
  ON "mistake_profiles"
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- 错题表
-- 说明: 存储所有用户的错题记录
--       通过 user_id 关联到 auth.users
--       通过 RLS 实现数据隔离
-- ==========================================
CREATE TABLE "mistake_questions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "content" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  "answer" TEXT NOT NULL,
  "user_answer" TEXT,
  "explanation" TEXT,
  "image_url" TEXT,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "is_mastered" BOOLEAN NOT NULL DEFAULT false,
  "last_reviewed" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE "mistake_questions" IS '错题记录表';
COMMENT ON COLUMN "mistake_questions"."id" IS '错题唯一标识';
COMMENT ON COLUMN "mistake_questions"."content" IS '题目内容';
COMMENT ON COLUMN "mistake_questions"."subject" IS '学科（math/chinese/english/physics/chemistry/biology/history/geography/politics）';
COMMENT ON COLUMN "mistake_questions"."category" IS '知识点分类';
COMMENT ON COLUMN "mistake_questions"."difficulty" IS '难度（easy/medium/hard）';
COMMENT ON COLUMN "mistake_questions"."answer" IS '正确答案';
COMMENT ON COLUMN "mistake_questions"."user_answer" IS '用户答案（可选）';
COMMENT ON COLUMN "mistake_questions"."explanation" IS '题目解析（可选）';
COMMENT ON COLUMN "mistake_questions"."image_url" IS '题目图片URL（可选）';
COMMENT ON COLUMN "mistake_questions"."review_count" IS '复习次数';
COMMENT ON COLUMN "mistake_questions"."is_mastered" IS '是否已掌握';
COMMENT ON COLUMN "mistake_questions"."last_reviewed" IS '最后复习时间';
COMMENT ON COLUMN "mistake_questions"."created_at" IS '创建时间';
COMMENT ON COLUMN "mistake_questions"."updated_at" IS '最后更新时间';
COMMENT ON COLUMN "mistake_questions"."user_id" IS '所属用户ID，关联auth.users(id)';

-- 启用 Row Level Security (RLS)
ALTER TABLE "mistake_questions" ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的错题
CREATE POLICY "Users can view own questions"
  ON "mistake_questions"
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 策略：用户只能插入自己的错题
CREATE POLICY "Users can insert own questions"
  ON "mistake_questions"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户只能更新自己的错题
CREATE POLICY "Users can update own questions"
  ON "mistake_questions"
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS 策略：用户只能删除自己的错题
CREATE POLICY "Users can delete own questions"
  ON "mistake_questions"
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 索引（性能优化）
-- 说明: 为常用查询创建索引，提升查询性能
-- ==========================================

-- mistake_profiles 表索引
CREATE INDEX "mistake_profiles_id_idx"
  ON "mistake_profiles"("id");

-- mistake_questions 表索引
-- 基础索引：按用户查询
CREATE INDEX "mistake_questions_user_id_idx"
  ON "mistake_questions"("user_id");

-- 复合索引：按用户和创建时间倒序查询（最常用）
CREATE INDEX "mistake_questions_user_id_created_at_idx"
  ON "mistake_questions"("user_id", "created_at" DESC);

-- 复合索引：按用户和学科筛选
CREATE INDEX "mistake_questions_user_id_subject_idx"
  ON "mistake_questions"("user_id", "subject");

-- 复合索引：按用户和难度筛选
CREATE INDEX "mistake_questions_user_id_difficulty_idx"
  ON "mistake_questions"("user_id", "difficulty");

-- 复合索引：按用户和掌握状态筛选
CREATE INDEX "mistake_questions_user_id_is_mastered_idx"
  ON "mistake_questions"("user_id", "is_mastered");

-- 复合索引：按用户和最后复习时间查询（空值排在后面）
CREATE INDEX "mistake_questions_user_id_last_reviewed_idx"
  ON "mistake_questions"("user_id", "last_reviewed" DESC NULLS LAST);

-- 全文搜索索引：题目内容模糊搜索（使用 pg_trgm 扩展）
CREATE INDEX "mistake_questions_content_trgm_idx"
  ON "mistake_questions" USING gin (content gin_trgm_ops);

-- 全文搜索索引：知识点分类模糊搜索
CREATE INDEX "mistake_questions_category_trgm_idx"
  ON "mistake_questions" USING gin (category gin_trgm_ops);

-- ==========================================
-- 触发器（自动更新时间戳）
-- 说明: 每次UPDATE时自动更新 updated_at 字段
-- ==========================================

-- 创建通用的时间戳更新函数
CREATE OR REPLACE FUNCTION mistake_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mistake_update_updated_at_column() IS '自动更新updated_at字段的触发器函数';

-- 为 mistake_profiles 表添加触发器
CREATE TRIGGER mistake_update_profiles_updated_at
  BEFORE UPDATE ON mistake_profiles
  FOR EACH ROW
  EXECUTE FUNCTION mistake_update_updated_at_column();

-- 为 mistake_questions 表添加触发器
CREATE TRIGGER mistake_update_questions_updated_at
  BEFORE UPDATE ON mistake_questions
  FOR EACH ROW
  EXECUTE FUNCTION mistake_update_updated_at_column();

-- ==========================================
-- 完成
-- ==========================================

-- 显示创建的表
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename LIKE 'mistake_%'
ORDER BY tablename;

-- 显示创建的索引
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE indexname LIKE 'mistake_%'
ORDER BY tablename, indexname;

-- 显示RLS策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename LIKE 'mistake_%'
ORDER BY tablename, policyname;

-- 部署说明
COMMENT ON SCHEMA public IS '
AI错题本数据库部署完成！

已创建的表：
- mistake_profiles: 用户扩展信息表
- mistake_questions: 错题记录表

已创建的索引：共10个索引，优化查询性能
已配置RLS策略：确保用户数据隔离
已创建触发器：自动更新updated_at字段

下一步：
1. 在 Supabase Dashboard 验证表结构
2. 在 Authentication → Settings 中禁用邮箱验证
3. 在 Authentication → Providers 中启用 Anonymous 登录
4. 开始开发 Next.js 应用
';
