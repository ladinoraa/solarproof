/**
 * Snapshot tests for key UI components
 * Issue #119 — catch unintended visual regressions
 *
 * Components tested:
 *  - Skeleton, StatCardSkeleton, ChartSkeleton, TableRowSkeleton, SectionSkeleton
 *  - MeterReadingRow (verified + pending states)
 *
 * To update snapshots after intentional changes:
 *   pnpm test -- --update-snapshots
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  Skeleton,
  StatCardSkeleton,
  ChartSkeleton,
  TableRowSkeleton,
  SectionSkeleton,
} from '@/components/skeleton'
import { MeterReadingRow } from '@/components/meter-reading-row'

describe('Skeleton components snapshots', () => {
  it('Skeleton renders correctly', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('Skeleton with custom className renders correctly', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('StatCardSkeleton renders correctly', () => {
    const { container } = render(<StatCardSkeleton />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('ChartSkeleton renders correctly (no title)', () => {
    const { container } = render(<ChartSkeleton />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('ChartSkeleton renders correctly (with title)', () => {
    const { container } = render(<ChartSkeleton title="Daily energy output" />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('TableRowSkeleton renders correctly (default 4 cols)', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton />
        </tbody>
      </table>
    )
    expect(container.firstChild).toMatchSnapshot()
  })

  it('TableRowSkeleton renders correctly (2 cols)', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton cols={2} />
        </tbody>
      </table>
    )
    expect(container.firstChild).toMatchSnapshot()
  })

  it('SectionSkeleton renders correctly (default 4 rows)', () => {
    const { container } = render(<SectionSkeleton />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('SectionSkeleton renders correctly (2 rows)', () => {
    const { container } = render(<SectionSkeleton rows={2} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})

describe('MeterReadingRow snapshots', () => {
  const base = {
    id: 'row-1',
    meter_id: 'meter-abc-123',
    kwh: 12.5,
    timestamp: '2024-01-15T10:30:00.000Z',
  }

  it('verified reading row renders correctly', () => {
    const { container } = render(
      <table>
        <tbody>
          <MeterReadingRow {...base} verified={true} />
        </tbody>
      </table>
    )
    expect(container.firstChild).toMatchSnapshot()
  })

  it('pending (unverified) reading row renders correctly', () => {
    const { container } = render(
      <table>
        <tbody>
          <MeterReadingRow {...base} verified={false} />
        </tbody>
      </table>
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})
