-- Rename TopicKind enum value 'triad' → 'inversion'
-- Supported in PostgreSQL 10+. No data migration needed; existing rows
-- referencing this enum value are updated automatically by the engine.
ALTER TYPE "TopicKind" RENAME VALUE 'triad' TO 'inversion';
