import { motion } from "framer-motion";

interface HealthScoreCardProps {
  score: number | null;
  status: string | null;
  color: "green" | "yellow" | "orange" | "red" | null;
  recommendation: string | null;
  loading?: boolean;
}

const colorConfig = {
  green:  { stroke: "#22c55e", bg: "bg-green-500/10",  text: "text-green-600",  border: "border-green-500/30" },
  yellow: { stroke: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-600", border: "border-yellow-500/30" },
  orange: { stroke: "#f97316", bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/30" },
  red:    { stroke: "#ef4444", bg: "bg-red-500/10",    text: "text-red-600",    border: "border-red-500/30" },
};

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const HealthScoreCard = ({ score, status, color, recommendation, loading }: HealthScoreCardProps) => {
  const cfg = colorConfig[color ?? "green"];
  const pct = (score ?? 0) / 100;
  const dashOffset = CIRCUMFERENCE * (1 - pct);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 p-5 flex items-center gap-5 animate-pulse">
        <div className="w-[128px] h-[128px] rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (score === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 flex items-center gap-5`}
    >
      {/* Circular arc */}
      <div className="relative shrink-0 w-[128px] h-[128px]">
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="10"
            className="text-muted/30" />
          <motion.circle
            cx="64" cy="64" r={RADIUS} fill="none"
            stroke={cfg.stroke} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${cfg.text}`}>{score}</span>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">/ 100</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
            {status}
          </span>
        </div>
        <p className="text-lg font-bold font-heading text-foreground mb-1">Health Score</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{recommendation}</p>
      </div>
    </motion.div>
  );
};

export default HealthScoreCard;
