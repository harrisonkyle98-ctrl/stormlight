def compute_member_badges(stats_data, quest_data, clan_rank, username):
    """Compute badges for a clan member based on their stats and quest data"""
    badges = []
    
    if clan_rank:
        rank_image_map = {
            'Owner': 'owner.png',
            'Deputy Owner': 'depowner.png',
            'Overseer': 'overseer.png',
            'Coordinator': 'coordinator.png',
            'Organiser': 'organizer.png',
            'Admin': 'admin.png',
            'General': 'general.png',
            'Captain': 'captain.png',
            'Lieutenant': 'lieutenant.png',
            'Sergeant': 'sergeant.png',
            'Corporal': 'corporal.png',
            'Recruit': 'recruit.png'
        }
        
        rank_colors = {
            'Owner': '#ff6b35',
            'Deputy Owner': '#ff8c42',
            'Overseer': '#ffa726',
            'Coordinator': '#ffb74d',
            'Organiser': '#bbbbbb',
            'Admin': '#bb8970',
            'General': '#af8d4d',
            'Captain': '#888888',
            'Lieutenant': '#b46354',
            'Sergeant': '#b78d5b',
            'Corporal': '#b78d5b',
            'Recruit': '#b78d5b'
        }
        
        image_name = rank_image_map.get(clan_rank)
        if image_name:
            gradient_background = None
            
            if username and clan_rank in ['Owner', 'Deputy Owner', 'Overseer']:
                username_gradients = {
                    'Space Flyer': ['#0047ab', '#9abcf7'],
                    'Papa Cody': ['#64c2f5', '#c5e7ea'],
                    'lm Kyle': ['#9c68cc', '#c0e5f9'],
                    'Dr M MD': ['#20962e', '#2ceb4f'],
                    'RoxyPT': ['#ff7b00', '#ffcd77'],
                    'Superhypered': ['#ffd000', '#fff598'],
                    'The Unseen': ['#131313', '#e6e6e6'],
                    'lts Unseen': ['#131313', '#e6e6e6'],
                    'Wondersgal': ['#970000', '#ff0000']
                }
                
                normalized_username = username.replace('\u00A0', ' ').replace('%20', ' ').replace('  ', ' ').strip()
                if normalized_username in username_gradients:
                    color1, color2 = username_gradients[normalized_username]
                    gradient_background = f"linear-gradient(135deg, {color1}, {color2})"
            
            badge = {
                'id': f"rank-{clan_rank.lower().replace(' ', '-')}",
                'name': clan_rank,
                'backgroundColor': rank_colors.get(clan_rank, '#b78d5b'),
                'icon': f"/assets/ranks/{image_name}"
            }
            if gradient_background:
                badge['gradientBackground'] = gradient_background
            
            badges.append(badge)
    
    if stats_data and 'stats' in stats_data:
        stats = stats_data['stats']
        skills = {k: v for k, v in stats.items() if k != 'overall'}
        
        if skills:
            total_xp = sum(skill_data.get('xp', 0) for skill_data in skills.values())
            if total_xp >= 5800000000:
                badges.append({
                    'id': 'max-xp',
                    'name': 'Max XP',
                    'backgroundColor': '#bf0026',
                    'icon': '/icons/xp.png'
                })
            
            master_maxed_skills = [skill for skill, data in skills.items() if data.get('level', 0) >= 120]
            if len(master_maxed_skills) == len(skills):
                badges.append({
                    'id': 'master-maxed',
                    'name': 'Master Maxed',
                    'backgroundColor': '#99001f',
                    'icon': '/icons/overall.png'
                })
            
            maxed_skills = [skill for skill, data in skills.items() if data.get('level', 0) >= 99]
            if len(maxed_skills) == len(skills):
                badges.append({
                    'id': 'maxed',
                    'name': 'Maxed',
                    'backgroundColor': '#99003b',
                    'icon': '/icons/overall.png'
                })
    
    if quest_data and quest_data.get('quest_summary', {}).get('questsnotstarted', 1) == 0:
        badges.append({
            'id': 'quest-cape',
            'name': 'Quest Cape',
            'backgroundColor': '#438da9',
            'icon': '/assets/ranks/quest.png'
        })
    
    return badges
