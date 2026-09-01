import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { group_id } = await req.json()

    if (!group_id) {
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
      return NextResponse.json({ error: 'Only group owners can delete the group' }, { status: 403 })
    }

    // Delete the group using service role since RLS delete policy doesn't exist
    const serviceClient = await createServiceClient()
    const { error } = await serviceClient
      .from('groups')
      .delete()
      .eq('id', group_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete group error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
