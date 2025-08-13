# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install only server deps
COPY package*.json ./
RUN npm ci

# Copy server source
COPY . .

# Build TS -> JS (to dist/)
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine
WORKDIR /app

# Install prod deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
