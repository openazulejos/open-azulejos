-- Historical note: a one-off production correction was originally performed
-- here by selecting the most recently created record. That operation is not
-- deterministic and must not be replayed on another database. The production
-- correction has already been preserved in later backups; this migration is an
-- intentional no-op for fresh installations.
select 1;
