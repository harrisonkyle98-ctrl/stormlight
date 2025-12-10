"""
Badge configuration for the automated competition badge system.
This file defines all system badges including skill badges, DXP badges, PvM badges, and API badges.
"""

# Skill Competition Badges - 29 badges (one per skill including Archaeology)
# Each badge uses the skill icon and has a gradient background
SKILL_BADGES = {
    'attack': {
        'name': 'Attack Champion',
        'gradient_colors': ['#b61d1d', '#ffe900'],
        'icon': '/assets/skills/attack.png'
    },
    'agility': {
        'name': 'Agility Champion',
        'gradient_colors': ['#5859a8', '#c32e2e'],
        'icon': '/assets/skills/agility.png'
    },
    'construction': {
        'name': 'Construction Champion',
        'gradient_colors': ['#f58701', '#cabeaa'],
        'icon': '/assets/skills/construction.png'
    },
    'constitution': {
        'name': 'Constitution Champion',
        'gradient_colors': ['#e42323', '#f5f5f5'],
        'icon': '/assets/skills/constitution.png'
    },
    'cooking': {
        'name': 'Cooking Champion',
        'gradient_colors': ['#7d0086', '#ff3131'],
        'icon': '/assets/skills/cooking.png'
    },
    'crafting': {
        'name': 'Crafting Champion',
        'gradient_colors': ['#9c7445', '#ffea9f'],
        'icon': '/assets/skills/crafting.png'
    },
    'defence': {
        'name': 'Defence Champion',
        'gradient_colors': ['#4e83c0', '#f5f5f5'],
        'icon': '/assets/skills/defence.png'
    },
    'divination': {
        'name': 'Divination Champion',
        'gradient_colors': ['#8c4eff', '#22fff0'],
        'icon': '/assets/skills/divination.png'
    },
    'dungeoneering': {
        'name': 'Dungeoneering Champion',
        'gradient_colors': ['#d4843d', '#ffde90'],
        'icon': '/assets/skills/dungeoneering.png'
    },
    'farming': {
        'name': 'Farming Champion',
        'gradient_colors': ['#c7ffba', '#369b1d'],
        'icon': '/assets/skills/farming.png'
    },
    'firemaking': {
        'name': 'Firemaking Champion',
        'gradient_colors': ['#da6601', '#ffd500'],
        'icon': '/assets/skills/firemaking.png'
    },
    'fishing': {
        'name': 'Fishing Champion',
        'gradient_colors': ['#6c93b1', '#b8e0ff'],
        'icon': '/assets/skills/fishing.png'
    },
    'fletching': {
        'name': 'Fletching Champion',
        'gradient_colors': ['#26706c', '#4ac7c1'],
        'icon': '/assets/skills/fletching.png'
    },
    'herblore': {
        'name': 'Herblore Champion',
        'gradient_colors': ['#008807', '#00e20b'],
        'icon': '/assets/skills/herblore.png'
    },
    'hunter': {
        'name': 'Hunter Champion',
        'gradient_colors': ['#726144', '#b6b099'],
        'icon': '/assets/skills/hunter.png'
    },
    'invention': {
        'name': 'Invention Champion',
        'gradient_colors': ['#ffe900', '#77b2ff'],
        'icon': '/assets/skills/invention.png'
    },
    'magic': {
        'name': 'Magic Champion',
        'gradient_colors': ['#022ab9', '#9d9ff0'],
        'icon': '/assets/skills/magic.png'
    },
    'mining': {
        'name': 'Mining Champion',
        'gradient_colors': ['#16c0c3', '#c6ffff'],
        'icon': '/assets/skills/mining.png'
    },
    'necromancy': {
        'name': 'Necromancy Champion',
        'gradient_colors': ['#883bdf', '#000000'],
        'icon': '/assets/skills/necromancy.png'
    },
    'prayer': {
        'name': 'Prayer Champion',
        'gradient_colors': ['#ffdd00', '#fffcec'],
        'icon': '/assets/skills/prayer.png'
    },
    'ranged': {
        'name': 'Ranged Champion',
        'gradient_colors': ['#637c3e', '#cafa81'],
        'icon': '/assets/skills/ranged.png'
    },
    'runecrafting': {
        'name': 'Runecrafting Champion',
        'gradient_colors': ['#ff9c00', '#ffd1b0'],
        'icon': '/assets/skills/runecrafting.png'
    },
    'slayer': {
        'name': 'Slayer Champion',
        'gradient_colors': ['#a10000', '#550000'],
        'icon': '/assets/skills/slayer.png'
    },
    'smithing': {
        'name': 'Smithing Champion',
        'gradient_colors': ['#ffb800', '#815d00'],
        'icon': '/assets/skills/smithing.png'
    },
    'strength': {
        'name': 'Strength Champion',
        'gradient_colors': ['#327045', '#58c37a'],
        'icon': '/assets/skills/strength.png'
    },
    'summoning': {
        'name': 'Summoning Champion',
        'gradient_colors': ['#bad3ff', '#ffdf6a'],
        'icon': '/assets/skills/summoning.png'
    },
    'thieving': {
        'name': 'Thieving Champion',
        'gradient_colors': ['#73467e', '#583561'],
        'icon': '/assets/skills/thieving.png'
    },
    'woodcutting': {
        'name': 'Woodcutting Champion',
        'gradient_colors': ['#235d1e', '#4fbd44'],
        'icon': '/assets/skills/woodcutting.png'
    },
    'archaeology': {
        'name': 'Archaeology Champion',
        'gradient_colors': ['#131313', '#e6e6e6'],
        'icon': '/assets/skills/archaeology.png'
    }
}

# DXP Hierarchical Badges - 5 tiers
# These are awarded for winning Overall skill competitions marked as DXP events
DXP_BADGES = [
    {
        'name': 'DXP Champion',
        'tier': 1,
        'gradient_colors': ['#ffd500', '#fff7c7'],
        'icon': '/assets/badges/dxp/dxp1.png'
    },
    {
        'name': 'DXP Warden',
        'tier': 2,
        'gradient_colors': ['#ff6d02', '#ffa564'],
        'icon': '/assets/badges/dxp/dxp2.png'
    },
    {
        'name': 'DXP Master',
        'tier': 3,
        'gradient_colors': ['#ff0000', '#ff6a6a'],
        'icon': '/assets/badges/dxp/dxp3.png'
    },
    {
        'name': 'DXP Patron',
        'tier': 4,
        'gradient_colors': ['#00b6df', '#e1faff'],
        'icon': '/assets/badges/dxp/dxp4.png'
    },
    {
        'name': 'DXP Completionist',
        'tier': 5,
        'gradient_colors': ['#df3fff', '#df0094'],
        'icon': '/assets/badges/dxp/dxp5.png'
    }
]

# PvM Hierarchical Badges - 6 tiers
# These are awarded for winning PvM (BOSS_KILLS) competitions
PVM_BADGES = [
    {
        'name': 'PvM Champion',
        'tier': 1,
        'gradient_colors': ['#064b00', '#91ec89'],
        'icon': '/assets/badges/pvm/pvm1.png'
    },
    {
        'name': 'PvM Warden',
        'tier': 2,
        'gradient_colors': ['#374d9b', '#b2f9ff'],
        'icon': '/assets/badges/pvm/pvm2.png'
    },
    {
        'name': 'PvM Master',
        'tier': 3,
        'gradient_colors': ['#7b008b', '#f4a4ff'],
        'icon': '/assets/badges/pvm/pvm4.png'
    },
    {
        'name': 'PvM Patron',
        'tier': 4,
        'gradient_colors': ['#ac0000', '#ff8080'],
        'icon': '/assets/badges/pvm/pvm6.png'
    },
    {
        'name': 'PvM Overlord',
        'tier': 5,
        'gradient_colors': ['#ffa300', '#ec4300'],
        'icon': '/assets/badges/pvm/pvm8.png'
    },
    {
        'name': 'PvM Completionist',
        'tier': 6,
        'gradient_colors': ['#7c0000', '#ff7300'],
        'icon': '/assets/badges/pvm/pvm7.png'
    }
]

# API Badges - Badges based on game achievements from the RuneScape API
# Includes: Maxed hierarchy, Max XP, Quest Cape, and Leagues Catalyst tiers
API_BADGES = [
    # Maxed -> Master Max hierarchy
    {
        'name': 'Maxed',
        'tier': 1,
        'hierarchy_path': 'MAXED',
        'gradient_colors': ['#99003b', '#ff6b8a'],
        'icon': '/icons/overall.png',
        'description': 'All skills at level 99 or higher'
    },
    {
        'name': 'Master Max',
        'tier': 2,
        'hierarchy_path': 'MAXED',
        'gradient_colors': ['#99001f', '#ff4d6a'],
        'icon': '/icons/overall.png',
        'description': 'All skills at level 120'
    },
    # Max XP Badge - standalone achievement
    {
        'name': 'Max XP',
        'tier': None,
        'hierarchy_path': None,
        'gradient_colors': ['#bf0026', '#ff6b6b'],
        'icon': '/icons/xp.png',
        'description': '5.8 billion total XP'
    },
    # Quest Cape Badge - standalone achievement
    {
        'name': 'Quest Cape',
        'tier': None,
        'hierarchy_path': None,
        'gradient_colors': ['#438da9', '#8fd4f0'],
        'icon': '/assets/ranks/quest.png',
        'description': 'All quests completed'
    },
    # Leagues: Catalyst Badges - 7 tier hierarchy
    {
        'name': 'Leagues: Bronze',
        'tier': 1,
        'hierarchy_path': 'LEAGUES_CATALYST',
        'gradient_colors': ['#cd7f32', '#e8c496'],
        'icon': '/assets/badges/league_bronze.png',
        'description': 'Leagues Bronze tier'
    },
    {
        'name': 'Leagues: Iron',
        'tier': 2,
        'hierarchy_path': 'LEAGUES_CATALYST',
        'gradient_colors': ['#6b6b6b', '#b8b8b8'],
        'icon': '/assets/badges/league_iron.png',
        'description': 'Leagues Iron tier'
    },
    {
        'name': 'Leagues: Steel',
        'tier': 3,
        'hierarchy_path': 'LEAGUES_CATALYST',
        'gradient_colors': ['#71797E', '#c0c0c0'],
        'icon': '/assets/badges/league_steel.png',
        'description': 'Leagues Steel tier'
    },
    {
        'name': 'Leagues: Mithril',
        'tier': 4,
        'hierarchy_path': 'LEAGUES_CATALYST',
        'gradient_colors': ['#4a5d8a', '#a8c4e8'],
        'icon': '/assets/badges/league_mithril.png',
        'description': 'Leagues Mithril tier'
    },
    {
        'name': 'Leagues: Adamant',
        'tier': 5,
        'hierarchy_path': 'LEAGUES_CATALYST',
        'gradient_colors': ['#2e5d3a', '#7bc98f'],
        'icon': '/assets/badges/league_adamant.png',
        'description': 'Leagues Adamant tier'
    },
    {
        'name': 'Leagues: Rune',
        'tier': 6,
        'hierarchy_path': 'LEAGUES_CATALYST',
        'gradient_colors': ['#00b7eb', '#7fdbff'],
        'icon': '/assets/badges/league_rune.png',
        'description': 'Leagues Rune tier'
    },
    {
        'name': 'Leagues: Dragon',
        'tier': 7,
        'hierarchy_path': 'LEAGUES_CATALYST',
        'gradient_colors': ['#8b0000', '#ff4500'],
        'icon': '/assets/badges/league_dragon.png',
        'description': 'Leagues Dragon tier'
    }
]

def get_skill_badge_for_competition(skill: str) -> dict | None:
    """Get the badge configuration for a skill competition"""
    skill_lower = skill.lower()
    if skill_lower in SKILL_BADGES:
        return SKILL_BADGES[skill_lower]
    return None

def get_dxp_badge_for_tier(tier: int) -> dict | None:
    """Get the DXP badge configuration for a specific tier"""
    for badge in DXP_BADGES:
        if badge['tier'] == tier:
            return badge
    return None

def get_pvm_badge_for_tier(tier: int) -> dict | None:
    """Get the PvM badge configuration for a specific tier"""
    for badge in PVM_BADGES:
        if badge['tier'] == tier:
            return badge
    return None

def get_next_dxp_tier(current_tier: int | None) -> int:
    """Get the next DXP tier after the current one"""
    if current_tier is None:
        return 1
    max_tier = max(b['tier'] for b in DXP_BADGES)
    if current_tier >= max_tier:
        return current_tier  # Already at max
    return current_tier + 1

def get_next_pvm_tier(current_tier: int | None) -> int:
    """Get the next PvM tier after the current one"""
    if current_tier is None:
        return 1
    max_tier = max(b['tier'] for b in PVM_BADGES)
    if current_tier >= max_tier:
        return current_tier  # Already at max
    return current_tier + 1

def get_max_dxp_tier() -> int:
    """Get the maximum DXP tier"""
    return max(b['tier'] for b in DXP_BADGES)

def get_max_pvm_tier() -> int:
    """Get the maximum PvM tier"""
    return max(b['tier'] for b in PVM_BADGES)
