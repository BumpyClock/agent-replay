FROM oven/bun:1.3.11-alpine

RUN bun add -g claude-replay

EXPOSE 7331

ENTRYPOINT ["claude-replay", "--host", "0.0.0.0"]
