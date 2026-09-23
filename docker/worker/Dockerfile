FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install
RUN mkdir -p /var/lib/syscall/raw-mail /var/lib/syscall/attachments
CMD ["npm", "run", "worker"]
