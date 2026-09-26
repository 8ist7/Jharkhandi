FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
ENV PORT=5620
EXPOSE 5620
CMD ["node","server.mjs"]
