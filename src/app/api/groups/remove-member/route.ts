import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { group_id, user_id } = await req.json()

    if (!group_id || !user_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify current user is the owner
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only group owners can remove members' }, { status: 403 })
    }

    // Set member to inactive
    const { error } = await supabase
      .from('group_members')
      .update({ is_active: false })
      .eq('group_id', group_id)
      .eq('user_id', user_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Remove member error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
