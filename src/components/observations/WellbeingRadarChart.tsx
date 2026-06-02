import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import type { WellbeingRadarPoint } from '@/features/service-users/observations/wellbeing-chart'

type WellbeingRadarChartProps = {
  data: WellbeingRadarPoint[]
  currentLabel?: string
  hasHistory?: boolean
}

export function WellbeingRadarChart({
  data,
  currentLabel = 'Current',
  hasHistory = false,
}: WellbeingRadarChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No wellbeing dimensions configured.
      </div>
    )
  }

  return (
    <div className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[-0.8, 1]} tickCount={10} tick={{ fontSize: 10 }} />
          {hasHistory && (
            <Radar
              name="Average"
              dataKey="Average"
              stroke="#2563eb"
              fill="#3b82f6"
              fillOpacity={0.35}
            />
          )}
          <Radar
            name={currentLabel}
            dataKey="Current"
            stroke="#ec4899"
            fill="#f472b6"
            fillOpacity={0.25}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
