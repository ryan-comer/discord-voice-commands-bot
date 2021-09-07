FROM node

# Create app directory
WORKDIR /usr/src/voice-commands-bot

# Insatll dependencies
COPY package*.json ./
RUN yarn

# Bundle app source
COPY . .

# Execute app
CMD [ "node", "./src/index.js" ]