'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface Reading {
  id: string
  meter_id: string
  kwh: number
  timestamp: string
  verified: boolean
}

export function useRealtimeReadings() {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const queryClient = useQueryClient()

  useEffect(() => {
    let mounted = true

    function connect() {
      if (!mounted) return

      try {
        // Use wss:// for production, ws:// for local development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/api/ws/readings`
        
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!mounted) return
          setIsConnected(true)
          setError(null)
          console.log('[WebSocket] Connected to readings feed')
        }

        ws.onmessage = (event) => {
          if (!mounted) return
          
          try {
            const reading: Reading = JSON.parse(event.data)
            
            // Update readings query cache
            queryClient.setQueryData<Reading[]>(['readings'], (old) => {
              if (!old) return [reading]
              return [reading, ...old]
            })

            // Invalidate stats to refresh totals
            queryClient.invalidateQueries({ queryKey: ['stats'] })
          } catch (err) {
            console.error('[WebSocket] Failed to parse message:', err)
          }
        }

        ws.onerror = (event) => {
          if (!mounted) return
          console.error('[WebSocket] Error:', event)
          setError('Connection error')
        }

        ws.onclose = () => {
          if (!mounted) return
          setIsConnected(false)
          console.log('[WebSocket] Disconnected, attempting reconnect in 5s...')
          
          // Attempt reconnection after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mounted) {
              connect()
            }
          }, 5000)
        }
      } catch (err) {
        console.error('[WebSocket] Failed to connect:', err)
        setError('Failed to establish connection')
        
        // Fallback to polling if WebSocket fails
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mounted) {
            connect()
          }
        }, 10000)
      }
    }

    connect()

    return () => {
      mounted = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [queryClient])

  return { isConnected, error }
}
