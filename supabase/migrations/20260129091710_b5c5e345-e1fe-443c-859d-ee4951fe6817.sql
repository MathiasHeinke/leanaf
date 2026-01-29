-- Migrate invalid necessity_tier values to valid ones
UPDATE supplement_database SET necessity_tier = 'specialist' WHERE necessity_tier IN ('advanced', 'therapeutic');
UPDATE supplement_database SET necessity_tier = 'optimizer' WHERE necessity_tier IN ('maintenance', 'aesthetic', 'performance');
UPDATE supplement_database SET necessity_tier = 'essential' WHERE necessity_tier = 'foundation';