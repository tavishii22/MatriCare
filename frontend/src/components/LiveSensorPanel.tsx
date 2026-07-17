import { motion } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SensorValue {
  value: string | number;
  unit: string;
}

// ── Placeholder demo values ───────────────────────────────────────────────────
// To connect real IoT data, replace / supplement with live values via props.
const DEMO_VALUES: Record<string, SensorValue> = {
  heartRate:     { value: "72",     unit: "bpm"  },
  bloodPressure: { value: "118/76", unit: "mmHg" },
  bodyTemp:      { value: "98.4",   unit: "°F"   },
  spo2:          { value: "98",     unit: "%"    },
  fetalHR:       { value: "--",     unit: "bpm"  },
};

// ── Sensor definitions ────────────────────────────────────────────────────────
// Add or remove sensors here; future live keys must match the "key" field.
const SENSORS = [
  {
    key: "heartRate",
    icon: "❤️",
    label: "Heart Rate",
    accentColor: "#ef4444",
    bgColor: "rgba(239,68,68,0.08)",
    demo: DEMO_VALUES.heartRate,
  },
  {
    key: "bloodPressure",
    icon: "🩸",
    label: "Blood Pressure",
    accentColor: "#8b5cf6",
    bgColor: "rgba(139,92,246,0.08)",
    demo: DEMO_VALUES.bloodPressure,
  },
  {
    key: "bodyTemp",
    icon: "🌡️",
    label: "Body Temp",
    accentColor: "#f97316",
    bgColor: "rgba(249,115,22,0.08)",
    demo: DEMO_VALUES.bodyTemp,
  },
  {
    key: "spo2",
    icon: "🫁",
    label: "SpO₂",
    accentColor: "#06b6d4",
    bgColor: "rgba(6,182,212,0.08)",
    demo: DEMO_VALUES.spo2,
  },
  {
    key: "fetalHR",
    icon: "🤰",
    label: "Fetal Heart Rate",
    accentColor: "#ec4899",
    bgColor: "rgba(236,72,153,0.08)",
    demo: DEMO_VALUES.fetalHR,
    optional: true,
  },
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────
interface LiveSensorPanelProps {
  /**
   * Future: pass live IoT values keyed by sensor key.
   * Any key present here will override the placeholder demo value.
   * Example: liveValues={{ heartRate: { value: 88, unit: "bpm" } }}
   */
  liveValues?: Partial<Record<string, SensorValue>>;
}

// ── Component ─────────────────────────────────────────────────────────────────
const LiveSensorPanel = ({ liveValues }: LiveSensorPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.15, type: "spring" }}
      className="rounded-2xl border border-border bg-card/80 p-4 w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-xs font-bold font-heading text-foreground leading-tight">
          Live Sensor Readings
        </h4>
        {/* "Awaiting" badge */}
        <span
          className="shrink-0 text-[8px] font-bold uppercase tracking-wide px-2 py-1 rounded-full
            bg-amber-500/10 text-amber-600 border border-amber-500/25 flex items-center gap-1 whitespace-nowrap"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
          Awaiting Live Sensor Integration
        </span>
      </div>

      {/* Sensor rows */}
      <div className="flex flex-col gap-1.5">
        {SENSORS.map((sensor, i) => {
          const val = liveValues?.[sensor.key] ?? sensor.demo;
          const isLive = Boolean(liveValues?.[sensor.key]);
          const isPlaceholder = !isLive;
          const isOffline = val.value === "--";

          return (
            <motion.div
              key={sensor.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl border border-border/40 relative overflow-hidden"
              style={{ backgroundColor: sensor.bgColor }}
            >
              {/* Scanning shimmer on placeholder rows */}
              {isPlaceholder && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: "linear" }}
                />
              )}

              {/* Left: icon + label */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm leading-none shrink-0">{sensor.icon}</span>
                <span className="text-[11px] font-medium text-foreground/80 truncate">
                  {sensor.label}
                  {"optional" in sensor && sensor.optional && (
                    <span className="ml-1 text-[8px] text-muted-foreground/60 font-normal">(opt)</span>
                  )}
                </span>
              </div>

              {/* Right: value + unit + status dot */}
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`text-sm font-black font-heading ${
                    isOffline
                      ? "text-muted-foreground/40"
                      : isLive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {val.value}
                </span>
                <span className="text-[9px] text-muted-foreground">{val.unit}</span>

                {/* Live = green pulse | Placeholder = amber pulse | Offline = grey */}
                <span
                  className={`w-1.5 h-1.5 rounded-full ml-0.5 ${
                    isOffline
                      ? "bg-muted-foreground/30"
                      : isLive
                      ? "bg-green-500 animate-pulse"
                      : "bg-amber-400 animate-pulse"
                  }`}
                  title={isLive ? "Live" : isOffline ? "No signal" : "Demo value"}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-[8.5px] text-muted-foreground/50 text-center mt-3 leading-relaxed">
        Values shown are demo placeholders. IoT sensors not yet connected.
      </p>
    </motion.div>
  );
};

export default LiveSensorPanel;
