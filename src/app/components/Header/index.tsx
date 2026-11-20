"use client";

import type { CeremonyStep } from "@/lib/ceremony-config";
import { useCeremonyConfig, useLocale } from "@/hooks/useCeremonyConfig";
import { useCeremonyStatus } from "@/hooks/useCeremonyStatus";
import { useParticipant } from "@/hooks/useParticipant";
import { Logo } from "@/app/components/Logo";
import styles from "./Header.module.css";

export function Header({
  onLogoClick,
}: {
  step: CeremonyStep;
  onLogoClick?: () => void;
}) {
  const config = useCeremonyConfig();
  const { locale, setLocale } = useLocale();
  const { status } = useCeremonyStatus();
  const { isAuthenticated, participantName } = useParticipant();

  const { copy } = config;
  const totalContributions = status?.totalContributions;
  const displayName = isAuthenticated ? participantName : undefined;

  return (
    <header className={styles.header}>
      <button onClick={onLogoClick} className={styles.logoButton}>
        <Logo className={styles.logoIcon} />
        <div className={styles.logoDivider} />
        <span className={styles.title}>{copy.header.title}</span>
      </button>

      <div className={styles.nav}>
        <select
          className={styles.languageSelect}
          value={locale}
          onChange={(event) => setLocale(event.target.value as "en" | "zh-CN")}
          aria-label="Language"
        >
          <option value="en">English</option>
          <option value="zh-CN">简体中文</option>
        </select>
        {displayName && (
          <>
            <span className={styles.userBadge}>@{displayName}</span>
            <div className={styles.divider} />
          </>
        )}
        <div className={styles.contributions}>
          <div className="accentDot" />
          <span className={styles.contributionsLabel}>
            {(totalContributions ?? 0).toLocaleString()} {copy.header.contributionsLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
