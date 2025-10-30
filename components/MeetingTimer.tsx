'use client'

import { useState, useEffect } from 'react'

interface MeetingTimerProps {
  startTime: string // ISO timestamp of when meeting started
  durationMinutes?: number // Duration in minutes (default 10)
  className?: string
}

export default function MeetingTimer({ startTime, durationMinutes = 10, className = '' }: MeetingTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isOvertime, setIsOvertime] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const start = new Date(startTime).getTime()
      const endTime = start + (durationMinutes * 60 * 1000)
      const now = Date.now()
      const remaining = endTime - now

      if (remaining <= 0) {
        setIsOvertime(true)
        setTimeRemaining(Math.abs(remaining))
      } else {
        setIsOvertime(false)
        setTimeRemaining(remaining)
      }
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [startTime, durationMinutes])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Warning states based on time remaining
  const getColorClass = () => {
    if (isOvertime) return 'bg-red-100 border-red-300 text-red-800'
    if (timeRemaining < 2 * 60 * 1000) return 'bg-orange-100 border-orange-300 text-orange-800' // Less than 2 minutes
    if (timeRemaining < 5 * 60 * 1000) return 'bg-yellow-100 border-yellow-300 text-yellow-800' // Less than 5 minutes
    return 'bg-green-100 border-green-300 text-green-800'
  }

  return (
    <div className={`p-3 rounded-lg border-2 ${getColorClass()} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏱️</span>
          <div>
            <p className="text-sm font-medium">
              {isOvertime ? 'Overtime' : 'Time Remaining'}
            </p>
            <p className="text-2xl font-bold font-mono">
              {isOvertime && '+'}{formatTime(timeRemaining)}
            </p>
          </div>
        </div>
        {!isOvertime && timeRemaining < 2 * 60 * 1000 && (
          <div className="text-xs font-medium">
            Please wrap up!
          </div>
        )}
        {isOvertime && (
          <div className="text-xs font-medium">
            Meeting over
          </div>
        )}
      </div>
      <div className="mt-2 text-xs">
        10-minute session {isOvertime ? 'ended' : 'ends'} at {new Date(new Date(startTime).getTime() + durationMinutes * 60 * 1000).toLocaleTimeString()}
      </div>
    </div>
  )
}
