from datetime import datetime
import json

async def log_admin_action(admin_id: str, username: str, action: str, details: str = None):
    """Log admin action to database"""
    try:
        from app.main import prisma, PRISMA_AVAILABLE
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            await prisma.adminlog.create({
                'adminId': admin_id,
                'username': username,
                'action': action,
                'details': details,
                'timestamp': datetime.now()
            })
            print(f"📝 Admin action logged: {action} by {username}")
        else:
            print(f"⚠️ Prisma not available, skipping admin action log: {action} by {username}")
    except Exception as e:
        print(f"❌ Failed to log admin action: {e}")

def calculate_rank_needed(join_date: datetime, current_rank: str) -> str:
    """Calculate rank needed based on longevity rules"""
    if not join_date:
        return "Unknown"
    
    join_date_naive = join_date.replace(tzinfo=None) if join_date.tzinfo else join_date
    days_in_clan = (datetime.now() - join_date_naive).days
    
    if days_in_clan >= 730:  # 2+ years
        return "Coordinator"
    elif days_in_clan >= 548:  # 1.5+ years  
        return "Organiser"
    elif days_in_clan >= 365:  # 1+ year
        return "Admin"
    elif days_in_clan >= 270:  # 9+ months
        return "General"
    elif days_in_clan >= 180:  # 6+ months
        return "Captain"
    elif days_in_clan >= 90:   # 3+ months
        return "Lieutenant"
    elif days_in_clan >= 60:   # 2+ months
        return "Sergeant"
    elif days_in_clan >= 30:   # 1+ month
        return "Corporal"
    else:
        return "Recruit"

def get_site_health_status():
    """Get site health metrics"""
    return {
        'snapshot_status': 'Active',
        'scheduler_status': 'Running',
        'failed_members': [],
        'total_members': 0
    }

async def create_competition_snapshot(competition_id: str, snapshot_type: str):
    """Create competition snapshot for start or end"""
    try:
        from app.main import prisma, PRISMA_AVAILABLE
        
        if not (PRISMA_AVAILABLE and prisma and prisma.is_connected()):
            print(f"⚠️ Prisma not available, skipping competition snapshot: {snapshot_type} for {competition_id}")
            return
        
        entries = await prisma.competitionentry.find_many(
            where={'competitionId': competition_id}
        )
        
        for entry in entries:
            member = await prisma.clanmember.find_unique(
                where={'username': entry.username}
            )
            
            if member and member.stats:
                stats = member.stats if isinstance(member.stats, dict) else json.loads(member.stats)
                overall_xp = stats.get('overall', {}).get('xp', 0)
                
                if snapshot_type == 'start':
                    await prisma.competitionentry.update(
                        where={'id': entry.id},
                        data={'xpStart': overall_xp}
                    )
                elif snapshot_type == 'end':
                    await prisma.competitionentry.update(
                        where={'id': entry.id},
                        data={'xpEnd': overall_xp}
                    )
        
        print(f"📸 Created {snapshot_type} snapshot for competition {competition_id}")
    except Exception as e:
        print(f"❌ Failed to create competition snapshot: {e}")
