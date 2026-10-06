FROM node:26-alpine3.23
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE "3000"
CMD ['node', 'app.js']