
FROM node:16-alpine

WORKDIR /app

COPY index.js ./
COPY config.js ./
COPY var.js ./
COPY auth.js ./
COPY crowl.js ./
COPY post.png ./
COPY ./package*.json ./
COPY env.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV LANG=ko_KR.UTF-8
ENV LANGUAGE=ko_KR.UTF-8

RUN apk update
RUN apk upgrade

# korean download
RUN mkdir -p /usr/share/fonts/nanumfont
RUN wget http://cdn.naver.com/naver/NanumFont/fontfiles/NanumFont_TTF_ALL.zip
RUN unzip NanumFont_TTF_ALL.zip -d /usr/share/fonts/nanumfont
# RUN fc-cache -f -v

# chrome download
RUN apk add --no-cache udev ttf-freefont chromium

RUN apk --no-cache add tzdata && \
  cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
  echo "Asia/Seoul" > /etc/timezone

RUN npm install

CMD [ "npm", "start" ]
