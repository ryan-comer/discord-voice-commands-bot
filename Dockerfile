FROM node

# Create app directory
WORKDIR /usr/src/voice-commands-bot

RUN apt-get update -y

# Git LFS
RUN curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash

# Python
RUN DEBIAN_FRONTEND=noninteractive apt-get install -yq python3
RUN apt-get install -yq python3-pip
RUN python3 -m pip install --upgrade pip
#RUN apt-get install -yq build-essential libssl-dev libffi-dev python3-dev

# Deepspeech - local speech-to-text
RUN pip install deepspeech
RUN pip install --upgrade deepspeech

# Mozilla TTS - local text-to-speech
RUN pip install TTS
RUN pip install --upgrade numpy

# Other dependecies
COPY package*.json ./
RUN yarn
RUN apt-get -y install lame
RUN apt-get -y install ffmpeg

# Run once to pull model for text-to-speech
RUN tts --text "test"

# DeepSpeech model
RUN wget https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.pbmm

# Bundle app source
COPY . .

# Environment variables
ENV GOOGLE_APPLICATION_CREDENTIALS="/usr/src/voice-commands-bot/keys/google_key.json"
ENV IBM_CREDENTIALS_FILE="/usr/src/voice-commands-bot/keys/ibm-credentials.env"

# Execute app
CMD [ "node", "./src/index.js" ]