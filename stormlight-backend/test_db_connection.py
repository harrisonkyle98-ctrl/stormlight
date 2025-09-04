import asyncio
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    try:
        DATABASE_URL = os.getenv('DATABASE_URL')
        print(f'Testing connection to: {DATABASE_URL[:50]}...')
        conn = await psycopg.AsyncConnection.connect(DATABASE_URL)
        print('✅ Database connection successful!')
        
        async with conn:
            cursor = await conn.execute('SELECT version();')
            result = await cursor.fetchone()
            print(f'PostgreSQL version: {result[0][:50]}...')
        
        await conn.close()
        print('✅ Connection test completed successfully')
        
    except Exception as e:
        print(f'❌ Connection failed: {e}')

if __name__ == "__main__":
    asyncio.run(test_connection())
