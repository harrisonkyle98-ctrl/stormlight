export const getSkillIcon = (skill: string): string | null => {
  const skillImageMap: { [key: string]: string | null } = {
    'overall': null, // no overall image available
    'attack': 'Attack_detail.png',
    'defence': 'defence.png',
    'strength': 'strength.png',
    'constitution': 'constitution.png',
    'ranged': 'ranged.png',
    'prayer': 'Prayer.png',
    'magic': 'magic.png',
    'cooking': 'cooking.png',
    'woodcutting': 'woodcutting.png',
    'fletching': 'fletching.png',
    'fishing': 'fishing.png',
    'firemaking': 'firemaking.png',
    'crafting': 'crafting.png',
    'smithing': 'smithing.png',
    'mining': 'mining.png',
    'herblore': 'herblore.png',
    'agility': 'agility.png',
    'thieving': 'thieving.png',
    'slayer': 'slayer.png',
    'farming': 'farming.png',
    'runecrafting': 'runecrafting.png',
    'hunter': 'hunter.png',
    'construction': 'construction.png',
    'summoning': 'summoning.png',
    'dungeoneering': 'dungeoneering.png',
    'divination': 'divination.png',
    'invention': 'invention.png',
    'archaeology': 'archaeology.png',
    'necromancy': 'necromancy.png'
  }
  
  const imageName = skillImageMap[skill.toLowerCase()]
  if (imageName) {
    return `/assets/skills/${imageName}`
  }
  return null
}

export const getSkillIconWithFallback = (skill: string): string => {
  const imagePath = getSkillIcon(skill)
  if (imagePath) {
    return imagePath
  }
  
  const fallbackIcons: { [key: string]: string } = {
    'overall': '⚔️',
    'attack': '⚔️',
    'defence': '🛡️',
    'strength': '💪',
    'constitution': '❤️',
    'ranged': '🏹',
    'prayer': '🙏',
    'magic': '🔮',
    'cooking': '🍳',
    'woodcutting': '🪓',
    'fletching': '🏹',
    'fishing': '🎣',
    'firemaking': '🔥',
    'crafting': '🔨',
    'smithing': '⚒️',
    'mining': '⛏️',
    'herblore': '🧪',
    'agility': '🏃',
    'thieving': '🗡️',
    'slayer': '💀',
    'farming': '🌱',
    'runecrafting': '🔮',
    'hunter': '🏹',
    'construction': '🏠',
    'summoning': '👹',
    'dungeoneering': '🏰',
    'divination': '✨',
    'invention': '⚙️',
    'archaeology': '🏺',
    'necromancy': '💀'
  }
  
  return fallbackIcons[skill.toLowerCase()] || '📊'
}
