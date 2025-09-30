#!/usr/bin/env python3

import asyncio
import sys
import os

sys.path.append('/home/ubuntu/repos/stormlight/stormlight-backend')

async def test_collection():
    """Test the automated collection system"""
    try:
        from app.database import collect_daily_activities_and_drops
        
        print("=== TESTING AUTOMATED COLLECTION SYSTEM ===")
        print("Starting collection test...")
        
        processed, failed = await collect_daily_activities_and_drops()
        
        print(f"\n=== COLLECTION RESULTS ===")
        print(f"✅ Processed: {processed} members")
        print(f"❌ Failed: {failed} members")
        
        if failed > 0:
            print(f"⚠️ Warning: {failed} members failed during collection")
        else:
            print("✅ All members processed successfully")
            
    except Exception as e:
        print(f"❌ Error testing collection system: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_collection())
