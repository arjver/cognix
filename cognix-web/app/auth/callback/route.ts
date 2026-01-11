import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/'
  }

  if (code) {
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
            console.log('cookiesToSet', cookiesToSet)
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
    console.log('code', code)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      let redirectUrl: string
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        redirectUrl = `${origin}${next}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      } else {
        redirectUrl = `${origin}${next}`
      }

      // Create redirect response and copy cookies from response
      // Following the pattern from proxy.ts comments: copy cookies to redirect response
      const redirectResponse = NextResponse.redirect(redirectUrl)
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
        redirectResponse.cookies.set(cookie.name, cookie.value, options)
      })
      return redirectResponse
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}