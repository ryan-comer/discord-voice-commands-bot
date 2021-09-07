docker build -t voice-commands-bot .
docker run --name voice-commands-bot -v C:\\Users\\Ryan\\src\\discord\\voice-commands-bot\\recordings:/usr/src/voice-commands-bot/recordings:rw voice-commands-bot