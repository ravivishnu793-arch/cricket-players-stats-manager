import { type PlayerBadge, type PlayerBadgeId } from "@/lib/badges";

const chipClasses: Record<PlayerBadgeId, string> = {
  century: "border-accent/70 bg-accent/15 text-accent",
  "strike-king": "border-primary/70 bg-primary/15 text-primary",
  "wicket-magnet": "border-secondary/70 bg-secondary/15 text-secondary",
  fifer: "border-destructive/70 bg-destructive/15 text-destructive",
  "economy-master": "border-accent/50 bg-muted/40 text-foreground",
};

const sizeMap = {
  sm: "text-[9px] md:text-[11px] px-1.5 py-0.5 md:px-2 md:py-0.5",
  lg: "text-xs md:text-sm px-2.5 py-1.5 md:px-4 md:py-2",
};

const emojiMap = {
  sm: "text-[10px] md:text-xs",
  lg: "text-base md:text-xl",
};

/** Hall of Fame achievement chips. Render nothing when the player has no badges. */
const PlayerBadges = ({ badges, size = "sm" }: { badges: PlayerBadge[]; size?: "sm" | "lg" }) => {
  if (!badges?.length) return null;

  return (
    <div className="flex flex-wrap gap-1 md:gap-2">
      {badges.map((badge, i) => (
        <span
          key={badge.id}
          title={badge.hint}
          style={{ animation: `slideUp 0.4s ease-out ${i * 0.06}s both` }}
          className={`inline-flex items-center gap-1 rounded-full border font-semibold tracking-wide ${chipClasses[badge.id]} ${sizeMap[size]}`}
        >
          <span className={emojiMap[size]}>{badge.emoji}</span>
          {badge.label}
        </span>
      ))}
    </div>
  );
};

export default PlayerBadges;
