# Dockerfile
FROM node:20

RUN apt-get update \
  && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*
  
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]