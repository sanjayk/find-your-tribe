-- Create the test database alongside the main 'tribe' database.
-- This script runs automatically on first container initialization
-- via the docker-entrypoint-initdb.d mechanism.

CREATE DATABASE tribe_test
    OWNER tribe
    ENCODING 'UTF8'
    LC_COLLATE 'en_US.utf8'
    LC_CTYPE 'en_US.utf8';

-- Enable pgvector extension in the test database
\c tribe_test
CREATE EXTENSION IF NOT EXISTS vector;
