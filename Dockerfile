FROM node:16

WORKDIR /connext-monitor
COPY package.json /connext-monitor
RUN npm install
COPY . /connext-monitor
CMD ["node", "index.js"]