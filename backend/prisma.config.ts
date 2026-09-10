import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    // Session-mode pooler URL supports DDL (prisma db push)
    // Runtime uses DATABASE_URL (transaction mode) for connection pooling
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/lifelink',
  },
});
