FROM node:17

COPY . .
EXPOSE 3001
RUN npm install

CMD [ "node", "./bin/www" ]