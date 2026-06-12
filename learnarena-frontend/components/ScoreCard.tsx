"use client"

interface ScoreCardProps {
  label: string
  score: number          // 0–100
  color: string          // tailwind color class like "text-indigo-500"
  ringColor: string      // hex for SVG stroke
  description?: string
}

export default function ScoreCard({ label, score, color, ringColor, description }: ScoreCardProps) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const filled = ((score ?? 0) / 100) * circumference
  const gap = circumference - filled

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center gap-3">
      {/* Ring */}
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Track */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${gap}`}
          strokeDashoffset={circumference / 4}
          transform="rotate(-90 50 50)"
        />
        {/* Score text */}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-bold"
          fontSize="18"
          fontWeight="700"
          fill="#1e293b"
        >
          {Math.round(score ?? 0)}
        </text>
      </svg>

      <div className="text-center">
        <p className={`font-semibold text-sm ${color}`}>{label}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}
