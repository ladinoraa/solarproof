'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, MinusCircle, Clock } from 'lucide-react'

type VoteChoice = 'for' | 'against' | 'abstain'
type ProposalStatus = 'Active' | 'Passed' | 'Rejected' | 'Expired'

interface Proposal {
  id: number
  title: string
  description: string
  yesVotes: number
  noVotes: number
  abstainVotes: number
  endLedger: number
  currentLedger: number
  status: ProposalStatus
}

// Mock proposals — replace with contract calls via Stellar SDK
const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: 'Increase minting fee to 0.5%',
    description: 'Proposal to raise the cooperative minting fee from 0.1% to 0.5% to fund infrastructure.',
    yesVotes: 42,
    noVotes: 18,
    abstainVotes: 5,
    endLedger: 5000,
    currentLedger: 4800,
    status: 'Active',
  },
  {
    id: 2,
    title: 'Add new meter type: wind turbine',
    description: 'Extend the audit_registry to support wind turbine meter readings alongside solar.',
    yesVotes: 71,
    noVotes: 9,
    abstainVotes: 2,
    endLedger: 4500,
    currentLedger: 4800,
    status: 'Passed',
  },
  {
    id: 3,
    title: 'Reduce voting period to 50 ledgers',
    description: 'Shorten the default voting period from 100 ledgers to 50 for faster governance.',
    yesVotes: 10,
    noVotes: 30,
    abstainVotes: 8,
    endLedger: 4600,
    currentLedger: 4800,
    status: 'Rejected',
  },
]

const STATUS_STYLES: Record<ProposalStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Passed: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-red-100 text-red-700',
  Expired: 'bg-gray-100 text-gray-600',
}

function ledgersToTime(remaining: number): string {
  if (remaining <= 0) return 'Ended'
  // ~5 seconds per ledger on Stellar
  const seconds = remaining * 5
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `~${h}h ${m}m remaining` : `~${m}m remaining`
}

function VoteBar({ yes, no, abstain }: { yes: number; no: number; abstain: number }) {
  const total = yes + no + abstain || 1
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="bg-green-500" style={{ width: `${(yes / total) * 100}%` }} />
      <div className="bg-red-400" style={{ width: `${(no / total) * 100}%` }} />
      <div className="bg-gray-300" style={{ width: `${(abstain / total) * 100}%` }} />
    </div>
  )
}

export default function GovernancePage() {
  const [votes, setVotes] = useState<Record<number, VoteChoice>>({})
  const [pending, setPending] = useState<number | null>(null)

  async function castVote(proposalId: number, choice: VoteChoice) {
    if (votes[proposalId]) return
    setPending(proposalId)
    try {
      // TODO: connect Freighter wallet and call community_governance.vote()
      // const kit = new StellarWalletsKit(...)
      // await kit.openModal(...)
      // const { address } = await kit.getAddress()
      // sign + submit tx to community_governance contract
      await new Promise((r) => setTimeout(r, 800)) // simulate wallet round-trip
      setVotes((v) => ({ ...v, [proposalId]: choice }))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Governance</h1>
      <p className="mb-8 text-sm text-gray-500">
        Vote on cooperative proposals. Wallet signature required.
      </p>

      <div className="space-y-6">
        {MOCK_PROPOSALS.map((p) => {
          const voted = votes[p.id]
          const isActive = p.status === 'Active'
          const loading = pending === p.id
          const remaining = p.endLedger - p.currentLedger

          return (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-gray-400">#{p.id}</span>
                  <h2 className="font-semibold text-gray-900">{p.title}</h2>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                  {p.status}
                </span>
              </div>

              <p className="mb-4 text-sm text-gray-600">{p.description}</p>

              <VoteBar yes={p.yesVotes} no={p.noVotes} abstain={p.abstainVotes} />
              <div className="mt-1 flex gap-4 text-xs text-gray-500">
                <span className="text-green-600">For {p.yesVotes}</span>
                <span className="text-red-500">Against {p.noVotes}</span>
                <span>Abstain {p.abstainVotes}</span>
              </div>

              {isActive && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  {ledgersToTime(remaining)}
                </div>
              )}

              {isActive && (
                <div className="mt-4 flex gap-2">
                  {voted ? (
                    <p className="text-sm font-medium text-gray-700">
                      ✓ You voted <span className="capitalize">{voted}</span>
                    </p>
                  ) : (
                    <>
                      <button
                        onClick={() => castVote(p.id, 'for')}
                        disabled={loading}
                        className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" /> For
                      </button>
                      <button
                        onClick={() => castVote(p.id, 'against')}
                        disabled={loading}
                        className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> Against
                      </button>
                      <button
                        onClick={() => castVote(p.id, 'abstain')}
                        disabled={loading}
                        className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                      >
                        <MinusCircle className="h-4 w-4" /> Abstain
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
