FROM node:17

COPY . .
EXPOSE 3001

CMD [ "node", "./bin/www" ]