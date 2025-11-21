"""
Centralized skill-to-column mapping for unified player_today_gains table.
This ensures consistent skill name handling across the application.
"""

SKILL_NAMES = [
    'attack',
    'defence',
    'strength',
    'constitution',
    'ranged',
    'prayer',
    'magic',
    'cooking',
    'woodcutting',
    'fletching',
    'fishing',
    'firemaking',
    'crafting',
    'smithing',
    'mining',
    'herblore',
    'agility',
    'thieving',
    'slayer',
    'farming',
    'runecrafting',
    'hunter',
    'construction',
    'summoning',
    'dungeoneering',
    'divination',
    'invention',
    'archaeology',
    'necromancy'
]

SKILL_TO_COLUMN = {skill: f"{skill}_gain" for skill in SKILL_NAMES}

SKILL_TO_COLUMN['overall'] = 'overall_gain'

COLUMN_TO_SKILL = {v: k for k, v in SKILL_TO_COLUMN.items()}

ALL_GAIN_COLUMNS = [f"{skill}_gain" for skill in SKILL_NAMES] + ['overall_gain']


def get_column_name(skill: str) -> str:
    """
    Get the column name for a given skill.
    
    Args:
        skill: Skill name (lowercase, e.g., 'attack', 'overall')
    
    Returns:
        Column name (e.g., 'attack_gain', 'overall_gain')
    
    Raises:
        ValueError: If skill name is not recognized
    """
    skill_normalized = skill.lower()
    if skill_normalized not in SKILL_TO_COLUMN:
        raise ValueError(f"Unknown skill: {skill}")
    return SKILL_TO_COLUMN[skill_normalized]


def get_skill_name(column: str) -> str:
    """
    Get the skill name for a given column.
    
    Args:
        column: Column name (e.g., 'attack_gain', 'overall_gain')
    
    Returns:
        Skill name (e.g., 'attack', 'overall')
    
    Raises:
        ValueError: If column name is not recognized
    """
    if column not in COLUMN_TO_SKILL:
        raise ValueError(f"Unknown column: {column}")
    return COLUMN_TO_SKILL[column]


def normalize_skill_name(skill: str) -> str:
    """
    Normalize skill name to match our standard naming.
    Handles common variations like 'hitpoints' -> 'constitution', 'range' -> 'ranged'.
    
    Args:
        skill: Skill name (any case, may be variation)
    
    Returns:
        Normalized skill name (lowercase)
    """
    skill_lower = skill.lower()
    
    variations = {
        'hitpoints': 'constitution',
        'hp': 'constitution',
        'range': 'ranged',
        'runecraft': 'runecrafting',
        'dung': 'dungeoneering',
        'div': 'divination',
        'inv': 'invention',
        'arch': 'archaeology',
        'necro': 'necromancy'
    }
    
    return variations.get(skill_lower, skill_lower)
