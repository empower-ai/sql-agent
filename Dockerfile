FROM node:18-alpine

WORKDIR /app
COPY . .

RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    make \
    py3-pip \
    python3
RUN npm install --production
RUN npm install -g typescript

CMD ["npm", "run", "prod"]
