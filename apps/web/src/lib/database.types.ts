export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      cooperatives: {
        Row: { id: string; name: string; admin_address: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['cooperatives']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cooperatives']['Insert']>
      }
      meters: {
        Row: {
          id: string; cooperative_id: string; serial_number: string
          pubkey_hex: string; active: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['meters']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['meters']['Insert']>
      }
      readings: {
        Row: {
          id: string; meter_id: string; kwh: number; timestamp: string
          reading_hash: string; signature_hex: string
          anchor_tx_hash: string | null; mint_tx_hash: string | null
          anchored: boolean; minted: boolean
        }
        Insert: Omit<Database['public']['Tables']['readings']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['readings']['Insert']>
      }
      certificates: {
        Row: {
          id: string; cooperative_id: string; reading_id: string
          reading_hash: string; mint_tx_hash: string; anchor_tx_hash: string
          kwh: number; issued_at: string; retired: boolean
          retired_at: string | null; retired_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['certificates']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['certificates']['Insert']>
      }
      webhook_endpoints: {
        Row: {
          id: string; cooperative_id: string; url: string; secret: string
          events: string[]; active: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['webhook_endpoints']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['webhook_endpoints']['Insert']>
      }
      webhook_logs: {
        Row: {
          id: string; endpoint_id: string; event: string; payload: Json
          status: string; attempts: number; response_status: number | null; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['webhook_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['webhook_logs']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
