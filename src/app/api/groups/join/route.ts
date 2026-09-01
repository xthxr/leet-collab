import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const joinSchema = z.object({
  invite_code: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Check LeetCode is verified
    const { data: profile } = await supabase
      .from('profiles')
      .select('leetcode_verified')
      .eq('id', user.id)
      .single()

    if (!profile?.leetcode_verified) {
      return NextResponse.json(
        { error: 'Please verify your LeetCode username first', code: 'NOT_VERIFIED' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = joinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
    }

    const { invite_code } = parsed.data

    const serviceClient = await createServiceClient()

    // Use the atomic join function
    const { data: result, error } = await serviceClient.rpc('join_group_by_invite', {
      p_invite_code: invite_code,
      p_user_id: user.id,
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
    }

    const joinResult = result as { success?: boolean; error?: string; code?: string; group_id?: string; group_name?: string }

    if (joinResult.error) {
      return NextResponse.json(joinResult, {
        status: joinResult.code === 'GROUP_FULL' ? 409 : 400,
      })
    }

    return NextResponse.json(joinResult)
  } catch (error) {
    console.error('Join group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
