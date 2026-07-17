import { motion } from "framer-motion";

interface GestationalProgressProps {
  weeks: number | null;
  loading?: boolean;
}

const TOTAL_WEEKS = 40;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const GestationalProgress = ({ weeks, loading }: GestationalProgressProps) => {
  const safeWeeks = typeof weeks === "number" ? Math.min(Math.max(weeks, 0), TOTAL_WEEKS) : 0;
  const pct = safeWeeks / TOTAL_WEEKS;
  const dashOffset = CIRCUMFERENCE * (1 - pct);

  const trimester =
    safeWeeks <= 13 ? "1st Trimester" :
    safeWeeks <= 26 ? "2nd Trimester" :
    "3rd Trimester";

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 p-5 flex flex-col items-center gap-3 animate-pulse">
        <div className="w-[148px] h-[148px] rounded-full bg-muted" />
        <div className="h-3 bg-muted rounded w-24" />
        <div className="h-2 bg-muted rounded w-16" />
      </div>
    );
  }

  if (weeks === null || weeks === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 p-5 flex flex-col items-center gap-2 text-center h-full justify-center min-h-[220px]">
        <div className="relative w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-2">
          <span className="text-3xl animate-pulse">🤰</span>
        </div>
        <p className="text-xs font-bold text-slate-700">Gestational Weeks Not Set</p>
        <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
          Please edit your profile and set your current gestational weeks under obstetric history.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border bg-card/80 p-5 flex flex-col items-center gap-2 text-center"
    >
      {/* Donut ring — 148×148 to fit RADIUS=54 + strokeWidth=11 with headroom */}
      <div className="relative w-[148px] h-[148px]">
        <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
          {/* Track ring */}
          <circle cx="74" cy="74" r={RADIUS} fill="none" stroke="currentColor"
            strokeWidth="11" className="text-muted/20" />
          {/* Subtle glow duplicate (thicker, blurred via opacity) */}
          <motion.circle
            cx="74" cy="74" r={RADIUS} fill="none"
            stroke="hsl(340, 82%, 52%)" strokeWidth="16"
            strokeLinecap="round" opacity={0.12}
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
          {/* Main progress arc */}
          <motion.circle
            cx="74" cy="74" r={RADIUS} fill="none"
            stroke="hsl(340, 82%, 52%)" strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1px]">
          <motion.span
            className="text-[28px] font-black text-primary leading-none"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            {safeWeeks}
          </motion.span>
          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Weeks</span>
          <motion.span
            className="text-[13px] font-extrabold mt-0.5"
            style={{ color: "hsl(340, 82%, 52%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {Math.round(pct * 100)}%
          </motion.span>
          <span className="text-[8px] text-muted-foreground/70">complete</span>
        </div>
      </div>

      {/* Labels */}
      <div>
        <p className="text-sm font-bold font-heading text-foreground">Gestational Progress</p>
        <p className="text-xs text-primary font-semibold">{trimester}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">of {TOTAL_WEEKS} total weeks</p>
      </div>
    </motion.div>
  );
};

export default GestationalProgress;
