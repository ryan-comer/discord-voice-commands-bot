import discord

class Bot(discord.Client):
    async def on_ready(self):
        print('Logged on as', self.user)

    async def on_message(self, message):
        # Skip over yourself
        if message.author == self.user:
            return

        # Join channel
        if message.content == ';;join':
            if message.author.voice.channel == None:
                return
            self.voiceClient = await message.author.voice.channel.connect()
        # Leave channel
        elif message.content == ';;leave' and self.voiceClient != None:
            self.voiceClient.disconnect()
            self.voiceClient = None