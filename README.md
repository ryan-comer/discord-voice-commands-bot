# Overview
This repo is a framework for a voice command Discord bot.

# Building
This project is built and run using Docker. There are scripts in the repo to build the docker image and run a new container (buildandrundocker.ps1). Look at the top of the script for configuration parameters. The following parameters are available:

|Parameter Name|Description|
|---|---|
|CONTAINER_NAME|The name of the Docker container that is created|
|RECORDINGS_PATH|OPTIONAL: Absolute path to the recordings folder in the repo. This folder holds the {user_id}.wav command files that are processed for commands. If this variable is set, the recordings folder will be mounted to the Docker host|

# Configuration
You need to create a .env file at the root directory of the bot and set the desired values. The .env file holds the configuration values for the bot. The following table describes each value:

Rename the .env.example file to .env

|PROPERTY_NAME|Description|Optional?|Default Value|
|---|---|---|---|
|BOT_TOKEN|The bot token for the Discord bot. This is used so that the Discord servers knows which bot account this bot is logging in to. You can get this by creating a bot at https://discord.com/developers/applications.|Required||
|SPEECH_TO_TEXT_METHOD|What method to use for speech to text (some require API keys). Possible values are: (LOCAL/GOOGLE/IBM_WATSON)|Optional|LOCAL|
|TEXT_TO_SPEECH_METHOD|What method to use for text to speech (some require API keys). Possible values are: (GOOGLE)|Optional|GOOGLE|
|TEXT_TO_SPEECH_VOLUME_GAIN_DB|Optional parameter for Google text-to-speech. Default value is 0, range is (-10, 10). 6dB is approximately twice as loud as 0. -6dB is approximately half as loud as 0.|Optional|0|
|WAKE_WORD_SENSITIVITY|Value from 0.0-1.0 that determines how sensitive the wake work detection is. 0.0 is not sensitive at all and 1.0 is very sensitive.|Optional|0.5|
|IBM_WATSON_SERVICE_URL|Service URL for the IBM Speech to Text service. Get from https://cloud.ibm.com/apidocs/assistant/assistant-v2?code=node#endpoint-cloud depending on where you set up your service.|Required if SPEECH_TO_TEXT_METHOD is set to IBM_WATSON||
|MUSIC_CHANNEL_NAME|Name of the music channel for the server. Used to post messages about playlists.|Optional|music|
|BOT_CHANNEL_NAME|Name of the bot channel for the discord. Used to post generic bot messages (e.g. `Processing Command: ${command_text}`)|Optional|bot|

# Running
To run the bot, run the buildandrundocker.ps1 script in the root directory. This will build the docker image and run it in a new container. After the container is running, the bot should log in to the bot account, and listen for chat messages on any of the joined servers

# Voice Commands
After joining a voice channel, the bot will listen for a wake word from any user (each user audio stream is separate). If the wake word is heard on the user's audio stream, the bot will play a beep. After the beep, the bot will listen for a command on that user audio stream. The command audio will be saved to ./recordings/{userId}.wav. After 2 seconds of silence, the command audio will be processed using speech-to-text. The first word of the command denotes the command type (e.g. 'play').

# Text Commands
Voice and text commands are handled through the same command handler. This means that any voice command can also be a text command. For example, you can say 'Jarvis. Play music best hits' or simply type ';;play music best hits' to achieve the same result.

# Commands

|Name|Description|Example|
|---|---|---|
|join|Have the bot join the voice channel of the user who typed the command|;;join|
|leave|Have the bot leave the current voice channel|;;leave|
|play|Stream the audio for a YouTube video to the channel|;;play music best hits|
|who, what, when, where, why, how, is, do, was, will, would, can, could, did, should, whose, which, whom, are|Ask a question to the bot. The bot will search Google and speak the snippet to the channel|;;what is the largest tech company in the world|