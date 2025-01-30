-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: The profiles table is created in 20240320000000_add_username.sql

------------------------------------------
-- Groups System
------------------------------------------

-- First, drop existing tables in the correct order
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

-- ... rest of the schema remains unchanged ... 