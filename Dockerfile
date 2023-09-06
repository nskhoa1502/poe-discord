FROM node:19.2-bullseye-slim

# Create app directory
RUN mkdir -p /usr/src/app && mkdir -p /usr/src/logs && chown node:root /usr/src/logs

WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/

# Bundle app source
COPY src /usr/src/app/

RUN npm install

USER node

CMD [ "npm", "start" ]
