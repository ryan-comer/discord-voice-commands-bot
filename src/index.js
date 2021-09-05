const { Client, Intents, VoiceChannel } = require("discord.js");
const { joinVoiceChannel} = require('@discordjs/voice');
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]});
const Player = require('./player.js');

require('dotenv').config();

let player

// Connect to a voice channel
async function connectToChannel(channel){
    const voiceConnection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
    });

    player = new Player(voiceConnection)
}

async function leaveChannel(){
    if(player != null){
        player.voiceConnection.disconnect()
    }

    player = null
}

async function playBeep(){
    player.play('beep.wav');
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
    switch(message.content){
        case ';;join':
            connectToChannel(message.member.voice.channel)
        break;
        case ';;leave':
            leaveChannel()
        break;
        case ';;test':
            playBeep()
    }
});

client.login(process.env.BOT_TOKEN);