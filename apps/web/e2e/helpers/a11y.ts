/**
 * Accessibility testing helper using @axe-core/playwright — issue #124.
 *
 * Usage in any Playwright test:
 *   import { checkA11y } from '../e2e/helpers/a11y'
 *   await checkA11y(page)
 */

import { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

export interface A11yViolation {
  id: string
  impact: string | null
  description: string
  nodes: { target: string[] }[]
}

/**
 * Run axe-core on the current page and throw if critical or serious violations
 * are found. Violations are reported with element selector and fix guidance.
 *
 * @param page     - Playwright Page object.
 * @param options  - Optional AxeBuilder configuration overrides.
 */
export async function checkA11y(
  page: Page,
  options: { disableRules?: string[] } = {}
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])

  if (options.disableRules?.length) {
    builder = builder.disableRules(options.disableRules)
  }

  const results = await builder.analyze()

  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  )

  if (blocking.length === 0) return

  const report = blocking
    .map((v) => {
      const selectors = v.nodes.map((n) => n.target.join(' > ')).join('\n    ')
      return `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n  Fix: ${v.helpUrl}\n  Elements:\n    ${selectors}`
    })
    .join('\n\n')

  throw new Error(
    `${blocking.length} accessibility violation(s) found:\n\n${report}`
  )
}
