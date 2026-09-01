import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { leetCodeService } from '@/lib/leetcode/client'
import { z } from 'zod'

const verifySchema = z.object({
  leetcode_username: z.string().min(1).max(50),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = verifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }

    const { leetcode_username } = parsed.data

    // Verify the username exists on LeetCode
    const isValid = await leetCodeService.verifyUsername(leetcode_username)

    if (!isValid) {
      return NextResponse.json({
        valid: false,
        error: 'Username not found on LeetCode. Please check the spelling.',
      })
    }

    // Save to profile (use service client to bypass any RLS on upsert)
    const serviceClient = createServiceClient()
    const { error: updateError } = await serviceClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        leetcode_username,
        leetcode_verified: true,
      })

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      return NextResponse.json({ error: 'Failed to save username: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ valid: true, username: leetcode_username })
  } catch (error) {
    console.error('Username verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
