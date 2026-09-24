# File: Dockerfile
# Role: Builds the isolated Syscall voice-agent runtime.
# Service: Voice agent.
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN npm install
EXPOSE 4000
CMD ["npm", "run", "voice-agent"]
