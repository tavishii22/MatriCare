import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, UserCheck, Building2, BadgeCheck } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AshaWorkerInfo {
  name: string;
  phone: string;
  email?: string;
  village?: string;
  worker_id?: string;
  /** Future-ready: health center field — not yet returned by backend */
  health_center?: string;
}

interface AshaWorkerCardProps {
  asha: AshaWorkerInfo | null;
  loading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
const AshaWorkerCard = ({ asha, loading }: AshaWorkerCardProps) => {

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 p-4 animate-pulse space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-28" />
            <div className="h-2 bg-muted rounded w-20" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 bg-muted rounded w-3/4" />
          <div className="h-2 bg-muted rounded w-2/3" />
          <div className="h-2 bg-muted rounded w-1/2" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="flex-1 h-8 bg-muted rounded-xl" />
          <div className="flex-1 h-8 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Empty / not assigned ────────────────────────────────────────────────────
  if (!asha) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-border bg-card/80 p-4 text-center"
      >
        <UserCheck className="w-7 h-7 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-xs font-semibold text-muted-foreground">No ASHA Worker Assigned</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1 leading-relaxed">
          An ASHA worker will be assigned after your first health assessment.
        </p>
      </motion.div>
    );
  }

  // ── Contact detail rows ─────────────────────────────────────────────────────
  const details = [
    asha.phone       && { icon: Phone,     text: asha.phone,         href: `tel:${asha.phone}` },
    asha.email       && { icon: Mail,      text: asha.email,         href: `mailto:${asha.email}`, truncate: true },
    asha.village     && { icon: MapPin,    text: asha.village,       href: undefined },
    asha.health_center && { icon: Building2, text: asha.health_center, href: undefined },
  ].filter(Boolean) as Array<{
    icon: React.ElementType;
    text: string;
    href?: string;
    truncate?: boolean;
  }>;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="rounded-2xl border border-primary/20 bg-card/80 p-4"
    >
      {/* Header ── avatar + name + badge */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar initials */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/25 to-primary/50 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-sm font-black text-primary leading-none select-none">
            {asha.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold font-heading text-foreground leading-tight truncate">
              {asha.name}
            </p>
            {asha.worker_id && (
              <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-0.5">
            Assigned ASHA Worker
          </p>
          {asha.worker_id && (
            <p className="text-[9px] text-muted-foreground/70 mt-0.5">ID: {asha.worker_id}</p>
          )}
        </div>
      </div>

      {/* Detail rows */}
      {details.length > 0 && (
        <div className="space-y-1.5 mb-3 px-0.5">
          {details.map(({ icon: Icon, text, href, truncate }) => {
            const inner = (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground group/row">
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className={truncate ? "truncate" : "break-words"}>{text}</span>
              </div>
            );
            return href ? (
              <a key={text} href={href} className="block hover:text-primary transition-colors">
                {inner}
              </a>
            ) : (
              <div key={text}>{inner}</div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-1">
        {/* Call — functional now */}
        {asha.phone ? (
          <motion.a
            href={`tel:${asha.phone}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
              bg-primary text-primary-foreground text-[11px] font-bold hover:opacity-90
              transition-opacity shadow-sm relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-200%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            />
            <Phone className="w-3.5 h-3.5 relative" />
            <span className="relative">Call</span>
          </motion.a>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
            bg-muted text-muted-foreground/40 text-[11px] font-bold cursor-not-allowed border border-border">
            <Phone className="w-3.5 h-3.5" />
            <span>Call</span>
          </div>
        )}

        {/* Message — future-ready (SMS for now) */}
        <motion.button
          whileHover={asha.phone ? { scale: 1.03 } : {}}
          whileTap={asha.phone ? { scale: 0.97 } : {}}
          onClick={() => asha.phone && window.open(`sms:${asha.phone}`, "_self")}
          title={asha.phone ? "Send SMS" : "No phone number available"}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
            text-[11px] font-bold border transition-colors relative overflow-hidden
            ${asha.phone
              ? "bg-muted text-foreground hover:bg-muted/70 border-border cursor-pointer"
              : "bg-muted/40 text-muted-foreground/40 border-border/40 cursor-not-allowed"
            }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Message</span>
          {/* "Coming soon" chip overlay when no phone */}
          {!asha.phone && (
            <span className="absolute top-0.5 right-1 text-[7px] text-muted-foreground/50 italic">
              future
            </span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default AshaWorkerCard;
