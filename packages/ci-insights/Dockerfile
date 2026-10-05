FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Lockfile-pinned prisma CLI with its own dependency closure, without the web app deps.
# dotenv is a devDependency in the lockfile but prisma.config.ts imports it, so copy it in.
FROM node:22-alpine AS prisma-cli
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm rm --no-save next react react-dom @octokit/rest @octokit/types
COPY --from=deps /app/node_modules/dotenv node_modules/dotenv/

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules node_modules/
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static .next/static/
COPY --from=builder /app/prisma prisma/
# Prisma CLI for the startup schema push, resolved from package-lock.json by the
# prisma-cli stage (the standalone output does not trace the CLI).
COPY --from=prisma-cli /app/node_modules node_modules/
# Copied after the CLI so the generated client and the built app's @prisma files win.
COPY --from=builder /app/node_modules/.prisma node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma node_modules/@prisma/
COPY --from=builder /app/prisma.config.ts ./
USER app
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000 || exit 1
# Fail fast: if the schema push fails (DB unreachable, bad URL), the error is printed
# and the container exits non-zero instead of serving against a missing schema.
CMD ["sh", "-c", "set -e; node node_modules/prisma/build/index.js db push --skip-generate; exec node server.js"]
