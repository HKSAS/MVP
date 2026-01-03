import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CALENDLY_API_TOKEN = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzY3Mjc0MDI1LCJqdGkiOiI4YWRjZTVkMS1iMTU0LTQxZWQtYjhlMy1mZjkzZGFiZTk4NmUiLCJ1c2VyX3V1aWQiOiIxYTgzYmQyNi02YWEyLTRjYzYtYmViYS0wMWY3ZDk2NDcxMTgifQ.dJ4WblbqqNuXM2D-t0adQERjCBJ15GoCprhOY7xqyMIZrp1k0R4vDhv9vLCWcy52C-nRmcYLAmQ-XANJGfgGRw'
const CALENDLY_USER_URI = 'https://api.calendly.com/users/1a83bd26-6aa2-4cc6-beba-01f7d9647118'

/**
 * Récupère les événements Calendly
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const count = searchParams.get('count') || '100'

    // Récupérer les événements planifiés
    const response = await fetch(
      `https://api.calendly.com/scheduled_events?user=${CALENDLY_USER_URI}&status=${status}&count=${count}`,
      {
        headers: {
          'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Calendly API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Enrichir avec les détails des invités
    const eventsWithGuests = await Promise.all(
      (data.collection || []).map(async (event: any) => {
        try {
          const inviteesResponse = await fetch(
            `https://api.calendly.com/scheduled_events/${event.uri.split('/').pop()}/invitees`,
            {
              headers: {
                'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (inviteesResponse.ok) {
            const inviteesData = await inviteesResponse.json()
            return {
              ...event,
              invitees: inviteesData.collection || [],
            }
          }
          return { ...event, invitees: [] }
        } catch (error) {
          console.error('Error fetching invitees:', error)
          return { ...event, invitees: [] }
        }
      })
    )

    // Calculer les KPI
    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const todayCount = eventsWithGuests.filter(e => {
      const eventDate = new Date(e.start_time)
      return eventDate >= today
    }).length

    const weekCount = eventsWithGuests.filter(e => {
      const eventDate = new Date(e.start_time)
      return eventDate >= weekStart
    }).length

    const monthCount = eventsWithGuests.filter(e => {
      const eventDate = new Date(e.start_time)
      return eventDate >= monthStart
    }).length

    return NextResponse.json({
      events: eventsWithGuests,
      kpi: {
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        total: eventsWithGuests.length,
      },
    })
  } catch (error) {
    console.error('Error fetching Calendly events:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

