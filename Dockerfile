FROM node

# Create app directory
WORKDIR /usr/src/voice-commands-bot

# Install dependencies
COPY package*.json ./
RUN yarn

# Bundle app source
COPY . .

ENV GOOGLE_APPLICATION_CREDENTIALS="/usr/src/voice-commands-bot/keys/google_key.json"

# Execute app
CMD [ "node", "./src/index.js" ]