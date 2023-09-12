
FROM node:16-buster

WORKDIR /app

COPY ./index.js ./
COPY ./package*.json ./
# COPY ./configs/config.json ./configs/config.json

RUN apk update
RUN apk upgrade

RUN apk add --no-cache udev ttf-freefont chromium

RUN apk --no-cache add tzdata && \
  cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
  echo "Asia/Seoul" > /etc/timezone

RUN npm install

CMD [ "npm", "start" ]
