CREATE TABLE IF NOT EXISTS player_today_skill_gains (
    username TEXT NOT NULL,
    skill TEXT NOT NULL,
    current_xp BIGINT NOT NULL,
    xp_gain BIGINT NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (username, skill)
);

CREATE INDEX IF NOT EXISTS idx_skill_gains_skill ON player_today_skill_gains(skill);
