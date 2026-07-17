import assert from 'node:assert/strict'
import test from 'node:test'

import { AI_ASSISTED_INTERPRETATION_LABEL, DEEPER_ANALYSIS_LABEL } from './copy.ts'

test('product naming de-emphasizes AI while retaining the disclosure label', () => {
  assert.equal(DEEPER_ANALYSIS_LABEL, 'Deeper Analysis')
  assert.equal(AI_ASSISTED_INTERPRETATION_LABEL, 'AI-assisted interpretation')
})
