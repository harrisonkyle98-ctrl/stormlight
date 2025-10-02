import asyncio
import aiohttp
import re
import json

async def get_boss_rare_drop_table(boss_name: str) -> list:
    """Get the complete rare drop table for a specific boss from RuneScape Wiki"""
    try:
        search_url = "https://runescape.wiki/api.php"
        
        search_params = {
            'action': 'query',
            'format': 'json',
            'list': 'search',
            'srsearch': f"{boss_name} drops",
            'srlimit': 1
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(search_url, params=search_params) as response:
                if response.status == 200:
                    search_data = await response.json()
                    
                    if search_data.get('query', {}).get('search'):
                        page_title = search_data['query']['search'][0]['title']
                        
                        content_params = {
                            'action': 'query',
                            'format': 'json',
                            'titles': page_title,
                            'prop': 'extracts|revisions',
                            'exintro': False,
                            'explaintext': True,
                            'rvprop': 'content',
                            'rvslots': 'main'
                        }
                        
                        async with session.get(search_url, params=content_params) as content_response:
                            if content_response.status == 200:
                                content_data = await content_response.json()
                                pages = content_data.get('query', {}).get('pages', {})
                                
                                rare_drops = []
                                
                                for page_id, page_data in pages.items():
                                    extract = page_data.get('extract', '').lower()
                                    revisions = page_data.get('revisions', [])
                                    
                                    if revisions:
                                        raw_content = revisions[0].get('slots', {}).get('main', {}).get('*', '').lower()
                                        content_to_search = extract + " " + raw_content
                                    else:
                                        content_to_search = extract
                                    
                                    rare_drop_patterns = [
                                        r'rare drop table',
                                        r'unique.*drop',
                                        r'very rare',
                                        r'1/\d+.*drop',
                                        r'drop.*1/\d+',
                                        r'rare.*reward'
                                    ]
                                    
                                    item_patterns = [
                                        r'\[\[([^|\]]+)\]\].*(?:rare|1/\d+|unique)',
                                        r'(?:rare|unique|very rare).*\[\[([^|\]]+)\]\]',
                                        r'\*\s*\[\[([^|\]]+)\]\].*(?:rare|1/\d+)',
                                        r'(?:drops?|loots?).*\[\[([^|\]]+)\]\]'
                                    ]
                                    
                                    for pattern in item_patterns:
                                        matches = re.findall(pattern, content_to_search, re.IGNORECASE)
                                        for match in matches:
                                            item_name = match.strip()
                                            if len(item_name) > 2 and item_name not in rare_drops:
                                                common_items = ['coins', 'bones', 'ashes', 'runes', 'arrows', 'food']
                                                if not any(common in item_name.lower() for common in common_items):
                                                    rare_drops.append(item_name)
                                
                                return rare_drops[:20]  # Limit to 20 items per boss
                
        return []
        
    except Exception as e:
        print(f"Error fetching rare drops for {boss_name}: {e}")
        return []

async def get_all_boss_rare_drops() -> dict:
    """Get rare drop tables for all major bosses"""
    bosses = [
        "Amascut, the Devourer",
        "Commander Zilyana", 
        "Kree'arra",
        "General Graardor",
        "K'ril Tsutsaroth",
        "Helwyr",
        "Vindicta",
        "Gregorovic", 
        "Twin Furies",
        "Nex",
        "Vorago",
        "Araxxor",
        "Telos",
        "Solak",
        "Raksha"
    ]
    
    boss_drops = {}
    
    for boss in bosses:
        print(f"Fetching drops for {boss}...")
        drops = await get_boss_rare_drop_table(boss)
        if drops:
            boss_drops[boss] = drops
            print(f"  Found {len(drops)} rare drops")
        else:
            print(f"  No drops found")
    
    return boss_drops

if __name__ == "__main__":
    result = asyncio.run(get_all_boss_rare_drops())
    print("\nComplete boss rare drop tables:")
    print(json.dumps(result, indent=2))
