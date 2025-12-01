import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id, user_id, responses, core_axes, facets, top_flavors } = body

    if (!session_id || !responses || !core_axes || !facets || !top_flavors) {
      return NextResponse.json({ error: 'Missing required survey data' }, { status: 400 })
    }

    const { error: responseError } = await supabaseAdmin
      .from('survey_responses')
      .insert({
        session_id,
        user_id: user_id ?? null,
        responses
      })

    if (responseError) throw responseError

    const { error: resultError } = await supabaseAdmin
      .from('survey_results')
      .insert({
        session_id,
        user_id: user_id ?? null,
        core_axes,
        facets,
        top_flavors
      })

    if (resultError) throw resultError

    return NextResponse.json({ sessionId: session_id })
  } catch (error: any) {
    console.error('Error submitting survey:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save survey results' },
      { status: 500 }
    )
  }
}
