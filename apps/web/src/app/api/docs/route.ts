import { readFileSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'

/**
 * GET /api/docs
 * Serves openapi.yaml with content-type text/yaml.
 * Swagger UI and other tooling can consume this URL directly.
 */
export async function GET() {
  const specPath = join(process.cwd(), '..', '..', 'openapi.yaml')
  const raw = readFileSync(specPath, 'utf8')
  return new NextResponse(raw, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
