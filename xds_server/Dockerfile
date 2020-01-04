FROM node:10-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . /app
CMD [ "npm", "start" ]