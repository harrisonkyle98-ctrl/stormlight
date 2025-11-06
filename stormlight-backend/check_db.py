import asyncio
from prisma import Prisma

async def main():
    prisma = Prisma()
    await prisma.connect()
    
    # Check if user exists
    user = await prisma.user.find_first(where={'username': 'lm Kyle'})
    if user:
        print(f"User found: {user.username}")
        print(f"Discord ID: {user.discordId}")
        print(f"Selected Badge ID: {user.selectedBadgeId}")
    else:
        print("User not found")
    
    # Check custom badges
    badges = await prisma.custombadge.find_many()
    print(f"\nFound {len(badges)} custom badges:")
    for badge in badges:
        print(f"  - {badge.name}: allowUsernameColorOverride={badge.allowUsernameColorOverride}")
    
    await prisma.disconnect()

asyncio.run(main())
