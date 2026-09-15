-- SGMT - Initial database setup
-- This runs automatically on first container start

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure UTF-8 collation
SET client_encoding = 'UTF8';
