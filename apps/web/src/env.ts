import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    MINTER_SECRET_KEY: z.string().min(56),
    READINGS_RATE_LIMIT_PER_MINUTE: z.string().default('60'),
    READINGS_RATE_LIMIT_WINDOW_SECONDS: z.string().default('60'),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_STELLAR_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
    NEXT_PUBLIC_ENERGY_TOKEN_ID: z.string().min(1),
    NEXT_PUBLIC_AUDIT_REGISTRY_ID: z.string().min(1),
    NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID: z.string().min(1),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    MINTER_SECRET_KEY: process.env.MINTER_SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_ENERGY_TOKEN_ID: process.env.NEXT_PUBLIC_ENERGY_TOKEN_ID,
    NEXT_PUBLIC_AUDIT_REGISTRY_ID: process.env.NEXT_PUBLIC_AUDIT_REGISTRY_ID,
    NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID: process.env.NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID,
    READINGS_RATE_LIMIT_PER_MINUTE: process.env.READINGS_RATE_LIMIT_PER_MINUTE,
    READINGS_RATE_LIMIT_WINDOW_SECONDS: process.env.READINGS_RATE_LIMIT_WINDOW_SECONDS,
  },
})
