from bot import Bot
from dotenv import load_dotenv
import os

load_dotenv()

def main():
    bot = Bot()
    bot.run(os.getenv('BOT_TOKEN'))

if __name__ == '__main__':
    main()