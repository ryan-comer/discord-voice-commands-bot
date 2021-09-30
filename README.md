# Overview
This repo is a framework for a voice command Discord bot. Voice and text commands follow the command pattern, and adding new commands is simple.

# Building
This project is built and run using Docker. There are scripts in the repo to build the docker image and run a new container (buildandrundocker.ps1). Before building - go through [Configuration](#configuration) to set up your .env file and [Cloud Services](#cloud-services) for any cloud services you're using. Look at the top of the script for configuration parameters. The following parameters are available:

|Parameter Name|Description|
|---|---|
|CONTAINER_NAME|The name of the Docker container that is created|
|RECORDINGS_PATH|OPTIONAL: Absolute path to the recordings folder in the repo. This folder holds the {user_id}.wav command files that are processed for commands. If this variable is set, the recordings folder will be mounted to the Docker host|

# Configuration
You need to create a .env file at the root directory of the bot and set the values marked as 'Required'. If .env values are set to use cloud services, those services must be set up correctly. See [Cloud Services](#cloud-services). The .env file holds the configuration values for the bot. The following table describes each value:

Rename the '.env.example' file to '.env' to get started.

|PROPERTY_NAME|Description|Required?|Default Value|
|---|---|---|---|
|BOT_TOKEN|The bot token for the Discord bot. This is used so that the Discord servers knows which bot account this bot is logging in to. You can get this by creating a bot at https://discord.com/developers/applications.|Required||
|SPEECH_TO_TEXT_METHOD|What method to use for speech to text (some require API keys). Possible values are: (LOCAL/GOOGLE/IBM_WATSON)|Optional|LOCAL|
|TEXT_TO_SPEECH_METHOD|What method to use for text to speech (some require API keys). Possible values are: (GOOGLE)|Optional|GOOGLE|
|TEXT_TO_SPEECH_VOLUME_GAIN_DB|Optional parameter for Google text-to-speech. Default value is 0, range is (-10, 10). 6dB is approximately twice as loud as 0. -6dB is approximately half as loud as 0.|Optional|0|
|WAKE_WORD_SENSITIVITY|Value from 0.0-1.0 that determines how sensitive the wake work detection is. 0.0 is not sensitive at all and 1.0 is very sensitive.|Optional|0.5|
|IBM_WATSON_SERVICE_URL|Service URL for the IBM Speech to Text service. Get from https://cloud.ibm.com/apidocs/assistant/assistant-v2?code=node#endpoint-cloud depending on where you set up your service.|Required if SPEECH_TO_TEXT_METHOD is set to IBM_WATSON||
|MUSIC_CHANNEL_NAME|Name of the music channel for the server. Used to post messages about playlists.|Optional|music|
|BOT_CHANNEL_NAME|Name of the bot channel for the discord. Used to post generic bot messages (e.g. `Processing Command: ${command_text}`)|Optional|bot|
|SPOTIFY_CLIENT_ID|Client ID for access to the Spotify API. This is used to find similar songs in the radio command|Required for the radio command||
|SPOTIFY_CLIENT_SECRET|Client Secret for access to the Spotify API. This is used to find similar songs in the radio command|Required for the radio command||

# Cloud Services

## Google
Google cloud services are used for speech-to-text (if GOOGLE is set as the TEXT_TO_SPEECH_METHOD) and text-to-speech (if GOOGLE is set as the TEXT_TO_SPEECH_METHOD). To use those services, you need to create a Google cloud account, create a new project and enable the text-to-speech and speech-to-text APIs. See [APIs Dashboard](https://console.cloud.google.com/apis/dashboard) for enabling Google APIs. See [Creating an API key](https://cloud.google.com/docs/authentication/api-keys#creating_an_api_key)

Once the key is created, you need to download the google_key.json file into your keys/ folder in the root of the project - /keys/google_key.json

## IBM Watson
IBM Watson cloud services are used for speech-to-text (if IBM_WATSON is set as the speech-to-text method). See [IBM Watson speech-to-text](https://cloud.ibm.com/catalog/services/speech-to-text) to create a speech-to-text service instance. After you created the instance, visit the service instance overview page. Click on the 'Manage' tab and find the 'Credentials' section. Click the 'Download' button to get the ibm_credentials.env credentials file.

Place the ibm_credentials.env file in the keys/ folder in the rood of the project - /keys/ibm_credentials.env

## Spotify
Spotify is used to find similar songs for the radio command. This is a free service, and just requires you to create an application in the Spotify developer portal. See [Spotify Developer Portal](https://developer.spotify.com/dashboard/applications) to create an application. Once the application is created, copy the client ID and client secret to the .env file at the root of the project.

# Running
To run the bot, run the buildandrundocker.ps1 script in the root directory. This will build the docker image and run it in a new container. After the container is running, the bot should log in to the bot account, and listen for chat messages on any of the joined servers

# Voice Commands
After joining a voice channel, the bot will listen for a wake word from any user (each user audio stream is separate). If the wake word is heard on the user's audio stream, the bot will respond with "Yes {USER_NAME}". The bot will then listen for a command on that user audio stream. The command audio will be saved to ./recordings/{userId}.wav. After 2 seconds of silence, the command audio will be processed using speech-to-text. The first word of the command denotes the command type (e.g. 'play').

Some commands have special behavior is the wake word is detected:

* Play command - Stop the song if a song is currently playing
   * If a song is stopped, the bot will stop listening for commands (you have to say the wake word again for a command)
* Radio command - Stop the radio if the radio is currently playing
   * If the radio is stopped, the bot will stop listening for commands (you have to say the wake word again for a command)

# Text Commands
Voice and text commands are handled through the same command handler. This means that any voice command can also be a text command. For example, you can say 'Jarvis. Play music best hits' or simply type ';;play music best hits' to achieve the same result.

# Commands

|Name|Description|Example|
|---|---|---|
|join|Have the bot join the voice channel of the user who typed the command|;;join|
|leave|Have the bot leave the current voice channel|;;leave|
|play|Stream the audio for a YouTube video to the channel|;;play music best hits|
|radio|Generate and play a radio station based on a song query. The bot will check Spotify for similar songs based on your query, and queue them up in the song queue. The music channel will show the current radio station and what the currently played song is|;;radio lincoln park in the end|
|who, what, when, where, why, how, is, do, was, will, would, can, could, did, should, whose, which, whom, are|Ask a question to the bot. The bot will search Google and speak the snippet to the channel|;;what is the largest tech company in the world|