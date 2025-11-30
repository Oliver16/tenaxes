import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildFlavorChartData, getDisplayFlavors } from './flavorDisplay.js'

const mockFlavors = [
  {
    flavor_id: 'deep_ecologist',
    name: 'Deep Ecologist',
    affinity: 0.72,
    match_strength: 'Very Strong',
    description: 'Existing archetype',
    color: '#1B5E20'
  },
  {
    flavor_id: 'eco_sovereigntist',
    name: 'Eco-Sovereigntist Steward',
    affinity: 0.55,
    match_strength: 'Strong',
    description: 'New national-control eco type',
    color: '#2E7D32'
  },
  {
    flavor_id: 'communitarian_conservationist',
    name: 'Communitarian Conservationist',
    affinity: 0.42,
    match_strength: 'Moderate',
    description: 'New local eco type',
    color: '#33691E'
  },
  {
    flavor_id: 'anthropocentric_developer',
    name: 'Anthropocentric Developer',
    affinity: -0.1,
    match_strength: 'Minimal',
    description: 'Existing archetype',
    color: '#FF9800'
  }
]

describe('flavor display helpers', () => {
  it('returns top five when showAll is false', () => {
    const display = getDisplayFlavors(mockFlavors, false)
    assert.deepEqual(display.map(f => f.flavor_id), [
      'deep_ecologist',
      'eco_sovereigntist',
      'communitarian_conservationist',
      'anthropocentric_developer'
    ])
  })

  it('filters to positive affinities for showAll', () => {
    const display = getDisplayFlavors(mockFlavors, true)
    assert.deepEqual(display.map(f => f.flavor_id), [
      'deep_ecologist',
      'eco_sovereigntist',
      'communitarian_conservationist'
    ])
  })

  it('builds chart data with truncation and labels preserved', () => {
    const chartData = buildFlavorChartData(mockFlavors, true)
    assert.deepEqual(chartData[1], {
      name: 'Eco-Sovereigntist...',
      fullName: 'Eco-Sovereigntist Steward',
      affinity: 55,
      color: '#2E7D32',
      description: 'New national-control eco type',
      matchStrength: 'Strong'
    })
    assert.equal(chartData.length, 3)
  })
})
