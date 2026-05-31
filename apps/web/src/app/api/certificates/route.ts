import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/certificates
 *
 * Returns the 50 most recently issued certificates.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('certificates')
    .select('id, kwh, issued_at, retired, retired_at, mint_tx_hash')
    .order('issued_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
