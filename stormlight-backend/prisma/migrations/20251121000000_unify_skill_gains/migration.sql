
ALTER TABLE player_today_gains
    ADD COLUMN IF NOT EXISTS attack_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS defence_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS strength_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS constitution_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ranged_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prayer_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS magic_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cooking_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS woodcutting_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fletching_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fishing_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS firemaking_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS crafting_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS smithing_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mining_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS herblore_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS agility_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS thieving_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS slayer_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS farming_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS runecrafting_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hunter_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS construction_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS summoning_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dungeoneering_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS divination_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invention_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS archaeology_gain BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS necromancy_gain BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'player_today_skill_gains') THEN
        UPDATE player_today_gains ptg
        SET
            attack_gain = COALESCE(s.attack_gain, attack_gain),
            defence_gain = COALESCE(s.defence_gain, defence_gain),
            strength_gain = COALESCE(s.strength_gain, strength_gain),
            constitution_gain = COALESCE(s.constitution_gain, constitution_gain),
            ranged_gain = COALESCE(s.ranged_gain, ranged_gain),
            prayer_gain = COALESCE(s.prayer_gain, prayer_gain),
            magic_gain = COALESCE(s.magic_gain, magic_gain),
            cooking_gain = COALESCE(s.cooking_gain, cooking_gain),
            woodcutting_gain = COALESCE(s.woodcutting_gain, woodcutting_gain),
            fletching_gain = COALESCE(s.fletching_gain, fletching_gain),
            fishing_gain = COALESCE(s.fishing_gain, fishing_gain),
            firemaking_gain = COALESCE(s.firemaking_gain, firemaking_gain),
            crafting_gain = COALESCE(s.crafting_gain, crafting_gain),
            smithing_gain = COALESCE(s.smithing_gain, smithing_gain),
            mining_gain = COALESCE(s.mining_gain, mining_gain),
            herblore_gain = COALESCE(s.herblore_gain, herblore_gain),
            agility_gain = COALESCE(s.agility_gain, agility_gain),
            thieving_gain = COALESCE(s.thieving_gain, thieving_gain),
            slayer_gain = COALESCE(s.slayer_gain, slayer_gain),
            farming_gain = COALESCE(s.farming_gain, farming_gain),
            runecrafting_gain = COALESCE(s.runecrafting_gain, runecrafting_gain),
            hunter_gain = COALESCE(s.hunter_gain, hunter_gain),
            construction_gain = COALESCE(s.construction_gain, construction_gain),
            summoning_gain = COALESCE(s.summoning_gain, summoning_gain),
            dungeoneering_gain = COALESCE(s.dungeoneering_gain, dungeoneering_gain),
            divination_gain = COALESCE(s.divination_gain, divination_gain),
            invention_gain = COALESCE(s.invention_gain, invention_gain),
            archaeology_gain = COALESCE(s.archaeology_gain, archaeology_gain),
            necromancy_gain = COALESCE(s.necromancy_gain, necromancy_gain),
            updated_at = NOW()
        FROM (
            SELECT
                username,
                SUM(xp_gain) FILTER (WHERE skill='attack') AS attack_gain,
                SUM(xp_gain) FILTER (WHERE skill='defence') AS defence_gain,
                SUM(xp_gain) FILTER (WHERE skill='strength') AS strength_gain,
                SUM(xp_gain) FILTER (WHERE skill='constitution') AS constitution_gain,
                SUM(xp_gain) FILTER (WHERE skill='ranged') AS ranged_gain,
                SUM(xp_gain) FILTER (WHERE skill='prayer') AS prayer_gain,
                SUM(xp_gain) FILTER (WHERE skill='magic') AS magic_gain,
                SUM(xp_gain) FILTER (WHERE skill='cooking') AS cooking_gain,
                SUM(xp_gain) FILTER (WHERE skill='woodcutting') AS woodcutting_gain,
                SUM(xp_gain) FILTER (WHERE skill='fletching') AS fletching_gain,
                SUM(xp_gain) FILTER (WHERE skill='fishing') AS fishing_gain,
                SUM(xp_gain) FILTER (WHERE skill='firemaking') AS firemaking_gain,
                SUM(xp_gain) FILTER (WHERE skill='crafting') AS crafting_gain,
                SUM(xp_gain) FILTER (WHERE skill='smithing') AS smithing_gain,
                SUM(xp_gain) FILTER (WHERE skill='mining') AS mining_gain,
                SUM(xp_gain) FILTER (WHERE skill='herblore') AS herblore_gain,
                SUM(xp_gain) FILTER (WHERE skill='agility') AS agility_gain,
                SUM(xp_gain) FILTER (WHERE skill='thieving') AS thieving_gain,
                SUM(xp_gain) FILTER (WHERE skill='slayer') AS slayer_gain,
                SUM(xp_gain) FILTER (WHERE skill='farming') AS farming_gain,
                SUM(xp_gain) FILTER (WHERE skill='runecrafting') AS runecrafting_gain,
                SUM(xp_gain) FILTER (WHERE skill='hunter') AS hunter_gain,
                SUM(xp_gain) FILTER (WHERE skill='construction') AS construction_gain,
                SUM(xp_gain) FILTER (WHERE skill='summoning') AS summoning_gain,
                SUM(xp_gain) FILTER (WHERE skill='dungeoneering') AS dungeoneering_gain,
                SUM(xp_gain) FILTER (WHERE skill='divination') AS divination_gain,
                SUM(xp_gain) FILTER (WHERE skill='invention') AS invention_gain,
                SUM(xp_gain) FILTER (WHERE skill='archaeology') AS archaeology_gain,
                SUM(xp_gain) FILTER (WHERE skill='necromancy') AS necromancy_gain
            FROM player_today_skill_gains
            GROUP BY username
        ) s
        WHERE ptg.username = s.username
          AND ptg.snapshot_date = CURRENT_DATE;
        
        RAISE NOTICE 'Backfilled skill gains from player_today_skill_gains to player_today_gains';
    END IF;
END $$;
