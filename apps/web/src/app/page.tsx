import Link from 'next/link'
import { Sun, Shield, Search, Zap } from 'lucide-react'

const features = [
  { icon: Zap, title: 'Signed at source', description: 'Every meter reading is Ed25519-signed by the device before leaving hardware.' },
  { icon: Shield, title: 'Anchored on-chain', description: 'The signed reading hash is permanently recorded on Stellar alongside the minted certificate.' },
  { icon: Search, title: 'Publicly verifiable', description: 'Anyone can verify the full chain: meter → signature → ledger → certificate → retirement.' },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-20">
      <div className="mb-16 text-center">
        <div className="mb-4 flex justify-center">
          <Sun className="h-14 w-14 text-yellow-400" />
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">SolarProof</h1>
        <p className="mx-auto mb-2 max-w-xl text-lg text-gray-600">
          End-to-end cryptographic proof of renewable energy on Stellar.
        </p>
        <p className="mx-auto mb-8 max-w-xl text-sm text-gray-500">
          Every kWh signed at the meter · anchored on-chain · publicly verifiable
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/verify" className="rounded-lg bg-yellow-400 px-6 py-3 font-medium text-gray-900 hover:bg-yellow-500">
            Verify a Certificate
          </Link>
          <Link href="/dashboard" className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6">
            <f.icon className="mb-3 h-8 w-8 text-yellow-500" />
            <h3 className="mb-2 font-semibold text-gray-900">{f.title}</h3>
            <p className="text-sm text-gray-600">{f.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-gray-200 bg-white p-8">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Chain of custody</h2>
        <ol className="space-y-3 text-sm text-gray-700">
          {[
            'Smart meter signs reading with its Ed25519 private key',
            'SolarProof API verifies signature and anchors reading hash on Stellar',
            'Energy certificates minted (1 token = 1 kWh) — linked to the anchor',
            'Buyer purchases and retires certificate — burn recorded on-chain',
            'Anyone verifies the full chain at /verify with no login required',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-xs font-bold text-yellow-700">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
