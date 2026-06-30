-- ============================================================
--  Migration 00003: Remove exec_sql SECURITY DEFINER function
--  This function allowed arbitrary SQL execution via the
--  /api/run-sql HTTP route, which has been removed.
--  Run this AFTER 00001 and 00002 have been applied.
-- ============================================================

DROP FUNCTION IF EXISTS exec_sql(text);
