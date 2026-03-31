import path from "node:path"
import dotenv from "dotenv"
import { defineConfig } from "prisma/config"

// Load .env.local (used by Next.js for local dev secrets)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
