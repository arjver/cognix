import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return NextResponse.json(
      { error: 'No session found' },
      { status: 401 }
    )
  }

  // Format the response according to specification
  const formattedSession = {
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
      user: {
        id: session.user.id,
        email: session.user.email,
        user_metadata: {
          full_name: session.user.user_metadata?.full_name || null,
        },
      },
    },
  }

  // Create JSON response and copy cookies from response object
  const jsonResponse = NextResponse.json(formattedSession)
  response.cookies.getAll().forEach((cookie) => {
    const options: {
      path?: string
      domain?: string
      maxAge?: number
      expires?: Date
      httpOnly?: boolean
      secure?: boolean
      sameSite?: 'strict' | 'lax' | 'none'
      priority?: 'low' | 'medium' | 'high'
    } = {}
    if (cookie.path) options.path = cookie.path
    if (cookie.domain) options.domain = cookie.domain
    if (cookie.maxAge !== undefined) options.maxAge = cookie.maxAge
    if (cookie.expires) {
      if (cookie.expires instanceof Date) {
        options.expires = cookie.expires
      } else if (typeof cookie.expires === 'number') {
        options.expires = new Date(cookie.expires)
      }
    }
    if (cookie.httpOnly !== undefined) options.httpOnly = cookie.httpOnly
    if (cookie.secure !== undefined) options.secure = cookie.secure
    if (cookie.sameSite && typeof cookie.sameSite === 'string') {
      options.sameSite = cookie.sameSite
    }
    if (cookie.priority) options.priority = cookie.priority
    jsonResponse.cookies.set(cookie.name, cookie.value, options)
  })

  return jsonResponse
}
