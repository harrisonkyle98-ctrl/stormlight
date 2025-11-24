/**
 * Skill category mapping for RuneScape skills
 * Used to display category tags in skill tooltips
 */

export type SkillCategory = 'combat' | 'artisan' | 'gathering' | 'support' | 'elite';

export interface SkillCategoryInfo {
  category: SkillCategory;
  label: string;
  className: string;
}

const SKILL_CATEGORIES: Record<string, SkillCategoryInfo> = {
  attack: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },
  constitution: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },
  defence: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },
  magic: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },
  necromancy: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },
  prayer: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },
  ranged: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },
  strength: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },
  summoning: { category: 'combat', label: 'Combat', className: 'tooltip-skill-tag--combat' },

  construction: { category: 'artisan', label: 'Artisan', className: 'tooltip-skill-tag--artisan' },
  cooking: { category: 'artisan', label: 'Artisan', className: 'tooltip-skill-tag--artisan' },
  crafting: { category: 'artisan', label: 'Artisan', className: 'tooltip-skill-tag--artisan' },
  firemaking: { category: 'artisan', label: 'Artisan', className: 'tooltip-skill-tag--artisan' },
  fletching: { category: 'artisan', label: 'Artisan', className: 'tooltip-skill-tag--artisan' },
  herblore: { category: 'artisan', label: 'Artisan', className: 'tooltip-skill-tag--artisan' },
  runecrafting: { category: 'artisan', label: 'Artisan', className: 'tooltip-skill-tag--artisan' },
  smithing: { category: 'artisan', label: 'Artisan', className: 'tooltip-skill-tag--artisan' },

  archaeology: { category: 'gathering', label: 'Gathering', className: 'tooltip-skill-tag--gathering' },
  divination: { category: 'gathering', label: 'Gathering', className: 'tooltip-skill-tag--gathering' },
  farming: { category: 'gathering', label: 'Gathering', className: 'tooltip-skill-tag--gathering' },
  fishing: { category: 'gathering', label: 'Gathering', className: 'tooltip-skill-tag--gathering' },
  hunter: { category: 'gathering', label: 'Gathering', className: 'tooltip-skill-tag--gathering' },
  mining: { category: 'gathering', label: 'Gathering', className: 'tooltip-skill-tag--gathering' },
  woodcutting: { category: 'gathering', label: 'Gathering', className: 'tooltip-skill-tag--gathering' },

  agility: { category: 'support', label: 'Support', className: 'tooltip-skill-tag--support' },
  dungeoneering: { category: 'support', label: 'Support', className: 'tooltip-skill-tag--support' },
  slayer: { category: 'support', label: 'Support', className: 'tooltip-skill-tag--support' },
  thieving: { category: 'support', label: 'Support', className: 'tooltip-skill-tag--support' },

  invention: { category: 'elite', label: 'Elite', className: 'tooltip-skill-tag--elite' },
};

/**
 * Get category information for a skill
 * @param skillName - The name of the skill (case-insensitive)
 * @returns Category info or undefined if skill not found
 */
export function getSkillCategory(skillName: string): SkillCategoryInfo | undefined {
  const normalizedName = skillName.toLowerCase().trim();
  return SKILL_CATEGORIES[normalizedName];
}
