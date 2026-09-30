-- Data-only: no DDL, so schema.sql is unchanged.
-- Wanted's apply_time has no offset and is Korea Standard Time, but the history sync stored it
-- verbatim as applied_at (and as created_at for inserted rows) next to the UTC ISO strings every
-- other source writes. Convert the stored naive 'YYYY-MM-DDTHH:MM:SS' values to UTC ISO in place.
-- Only exact 19-character naive values change: Z-suffixed, offset-bearing, date-only and NULL
-- values, and every other source, are left alone, so a second run is a no-op. The shape is checked
-- with length()/substr() because D1 rejects a GLOB character-class pattern this long as too complex.
UPDATE applications
SET applied_at = strftime('%Y-%m-%dT%H:%M:%fZ', applied_at, '-9 hours')
WHERE source = 'wanted'
  AND length(applied_at) = 19
  AND substr(applied_at, 5, 1) = '-'
  AND substr(applied_at, 11, 1) = 'T';

UPDATE applications
SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '-9 hours')
WHERE source = 'wanted'
  AND length(created_at) = 19
  AND substr(created_at, 5, 1) = '-'
  AND substr(created_at, 11, 1) = 'T';
