import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createGroupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid group name' }, { status: 400 })
    }

    const { name } = parsed.data

    const serviceClient = await createServiceClient()

    // Create the group
    const { data: group, error: groupError } = await serviceClient
      .from('groups')
      .insert({ name, created_by: user.id })
      .select()
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    // Add creator as owner
    await serviceClient.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'owner',
    })

    // Initialize streak row
    await serviceClient.from('group_streaks').insert({
      group_id: group.id,
      current_streak: 0,
      longest_streak: 0,
      total_days_active: 0,
    })

    return NextResponse.json({ group_id: group.id, invite_code: group.invite_code })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
