import discord

class Bot(discord.Client):
    def __init__(self):
        pass

    async def on_ready(self):
        print('Logged on as', self.user)

    async def on_message(self, message):
        # Skip over yourself
        if message.author == self.user:
            return

        if message.content == 'ping':
            await message.channel.send('pong')