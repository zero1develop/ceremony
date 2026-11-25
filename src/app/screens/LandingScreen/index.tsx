"use client";

import { useEffect, useState } from "react";
import { getProviders } from "next-auth/react";

import { useCeremonyConfig, useLocale } from "@/hooks/useCeremonyConfig";
import { useCeremonyStatus } from "@/hooks/useCeremonyStatus";
import { useParticipant } from "@/hooks/useParticipant";
import { useParticipantEligibility } from "@/hooks/useParticipantEligibility";
import { getMyReceipts } from "@/lib/api";
import {
  getPublishedReceiptGist,
  publishReceiptGist,
} from "@/utils/attestation";
import { cn } from "@/utils/cn";
import { Button } from "@/app/components/Button";
import { ScreenWrapper } from "@/app/components/ScreenWrapper";
import styles from "./LandingScreen.module.css";

export function LandingScreen({
  onAuth,
  onBegin,
  onVerify,
}: {
  onAuth: (method: "github" | "twitter") => void;
  onBegin: () => void;
  onVerify: () => void;
}) {
  const config = useCeremonyConfig();
  const { locale } = useLocale();
  const { status } = useCeremonyStatus();
  const { isAuthenticated, authProvider } = useParticipant();
  const { eligibility, eligibilityLoading } = useParticipantEligibility();
  const [downloadingReceipts, setDownloadingReceipts] = useState(false);
  const [twitterEnabled, setTwitterEnabled] = useState(false);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [checkingGist, setCheckingGist] = useState(false);
  const [publishingGist, setPublishingGist] = useState(false);
  const [gistError, setGistError] = useState<string | null>(null);

  useEffect(() => {
    void getProviders().then((providers) => {
      setTwitterEnabled(Boolean(providers?.twitter));
    });
  }, []);

  const { copy } = config;
  const utcFormatter = new Intl.DateTimeFormat(
    locale === "zh-CN" ? "zh-CN" : "en-US",
    {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    },
  );
  const formatUtc = (value: string | number): string =>
    utcFormatter.format(new Date(value));
  const beaconTime = formatUtc(config.provenance.beaconTime);
  const startTime = formatUtc(status?.startedAt ?? config.startDate ?? 0);
  const endTime = status?.endDate
    ? formatUtc(status.endDate)
    : locale === "zh-CN"
      ? "未设置"
      : "Not set";

  // "Contributors" = how many distinct people have taken part. A participant can
  // contribute at most once per circuit, and the deposit circuit (first in the
  // array) is the entry every contributor runs, so its contribution count is the
  // contributor count. The per-circuit totals are already in the status payload.
  const depositCircuitId = config.circuits[0]?.id;
  const totalContributors =
    status?.circuits.find((c) => c.circuitId === depositCircuitId)
      ?.totalContributions ?? 0;

  const isActive = status?.isActive ?? true;
  const hasStarted = status?.hasStarted ?? true;
  const footerLines = copy.landing.footer.split("\n");
  const hasEligibleCircuits = eligibility?.hasEligibleCircuits ?? true;
  const hasReceipts = (eligibility?.contributedCircuitIds.length ?? 0) > 0;

  // Ceremony-wide progress — shown to visitors and while a participant still has
  // circuits left to contribute to.
  const totalContributions = status?.totalContributions ?? 0;
  const targetContributions =
    status?.targetContributions ?? config.targetContributions;
  const ceremonyProgress = targetContributions
    ? Math.min(
        100,
        Math.round((totalContributions / targetContributions) * 100),
      )
    : 0;
  // Once the signed-in participant has no eligible circuits left — the exact
  // state that shows the "You have already contributed" card below — their
  // personal progress is complete, so surface 100% instead of the ceremony-wide
  // figure.
  const hasContributedEverything = isAuthenticated && !hasEligibleCircuits;
  const progress = hasContributedEverything ? 100 : ceremonyProgress;
  const beginCta = eligibilityLoading
    ? copy.landing.eligibilityLoadingCta
    : copy.landing.beginCta;

  useEffect(() => {
    if (
      authProvider !== "github" ||
      !hasContributedEverything ||
      eligibilityLoading
    ) {
      return;
    }
    let cancelled = false;
    setCheckingGist(true);
    void getPublishedReceiptGist()
      .then((url) => {
        if (!cancelled) setGistUrl(url);
      })
      .catch(() => {
        if (!cancelled) setGistError(copy.complete.attestationError);
      })
      .finally(() => {
        if (!cancelled) setCheckingGist(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    authProvider,
    hasContributedEverything,
    eligibilityLoading,
    copy.complete.attestationError,
  ]);

  const handlePublishCompletedReceipt = async () => {
    if (publishingGist) return;
    setPublishingGist(true);
    setGistError(null);
    try {
      const data = await getMyReceipts();
      const url = await publishReceiptGist({
        ceremony: config.name,
        filename: copy.complete.receiptFilename,
        content: JSON.stringify(data.receipts, null, 2),
      });
      setGistUrl(url);
    } catch (error) {
      setGistError(
        error instanceof Error && error.message === "UNAUTHORIZED"
          ? copy.complete.attestationSignInError
          : copy.complete.attestationError,
      );
    } finally {
      setPublishingGist(false);
    }
  };

  const handleShareCompletedOnX = () => {
    const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(copy.complete.shareTemplate)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadReceipts = async () => {
    if (downloadingReceipts) return;
    setDownloadingReceipts(true);
    try {
      const data = await getMyReceipts();
      const payload = JSON.stringify(data.receipts, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = copy.complete.receiptFilename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      /* surfaced via re-enabling the button; no inline error UI on landing */
    } finally {
      setDownloadingReceipts(false);
    }
  };

  const statsData = [
    {
      label: copy.landing.stats.contributionsLabel,
      value: totalContributors.toLocaleString(),
    },
    {
      label: copy.landing.stats.circuitsLabel,
      value: String(config.circuits.length),
    },
    { label: copy.landing.stats.progressLabel, value: `${progress}%` },
  ];

  if (!isActive) {
    // Distinguish "contributions closed, still finalizing" from "fully
    // finalized". Only the beacon-applied state should read as truly done.
    const isFinalized = status?.beaconApplied ?? false;
    const endedSubtitle = !hasStarted
      ? copy.landing.notStartedSubtitle
      : isFinalized
        ? copy.landing.endedSubtitle
        : copy.landing.closedSubtitle;
    const endedDescription = !hasStarted
      ? copy.landing.notStartedDescription
      : isFinalized
        ? copy.landing.endedDescription
        : copy.landing.closedDescription;
    return (
      <ScreenWrapper className="screenLayout">
        <div className={styles.hero}>
          <h1 className={styles.title}>{copy.landing.title}</h1>
          <h2 className={styles.subtitleEnded}>{endedSubtitle}</h2>
        </div>

        <StatsBar stats={statsData} />

        <div className={cn("card", styles.endedCard)}>
          <p className={styles.endedText}>{endedDescription}</p>
        </div>

        <div className={cn("card", styles.provenanceCard)}>
          <dl className={styles.provenanceGrid}>
            <dt>{copy.landing.startTimeLabel}</dt>
            <dd>{startTime}</dd>
            <dt>{copy.landing.endTimeLabel}</dt>
            <dd>{endTime}</dd>
            <dt>{copy.landing.beaconCommitmentLabel}</dt>
            <dd>{beaconTime}</dd>
          </dl>
        </div>

        <Button onClick={onVerify}>{copy.landing.verifyCta}</Button>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper className="screenLayout">
      <div className={styles.hero}>
        <h1 className={styles.title}>{copy.landing.title}</h1>
        <h2 className={styles.subtitle}>{copy.landing.subtitle}</h2>
        <p className={styles.description}>{copy.landing.description}</p>
      </div>

      <StatsBar stats={statsData} />

      <div className={cn("card", styles.timeNotice)}>
        <p className={styles.timeNoticeTitle}>{copy.landing.timeNoticeTitle}</p>
        <p className={styles.timeNoticeBody}>{copy.landing.timeNoticeBody}</p>
      </div>

      <div className={cn("card", styles.provenanceCard)}>
        <h3 className={styles.provenanceTitle}>
          {copy.landing.provenanceTitle}
        </h3>
        <dl className={styles.provenanceGrid}>
          <dt>{copy.landing.startTimeLabel}</dt>
          <dd>{startTime}</dd>
          <dt>{copy.landing.endTimeLabel}</dt>
          <dd>{endTime}</dd>
          <dt>{copy.landing.circuitSourceLabel}</dt>
          <dd>
            <a href={config.provenance.circuitRepository} target="_blank" rel="noreferrer">
              zero1develop/circuits
            </a>
          </dd>
          <dt>{copy.landing.frozenCommitLabel}</dt>
          <dd>
            <a
              href={`${config.provenance.circuitRepository}/commit/${config.provenance.circuitCommit}`}
              target="_blank"
              rel="noreferrer"
              className={styles.commitLink}
            >
              {config.provenance.circuitCommit}
            </a>
          </dd>
          <dt>{copy.landing.releaseTagLabel}</dt>
          <dd>
            <a
              href={`${config.provenance.circuitRepository}/tree/${config.provenance.circuitTag}`}
              target="_blank"
              rel="noreferrer"
            >
              {config.provenance.circuitTag}
            </a>
          </dd>
          <dt>{copy.landing.beaconCommitmentLabel}</dt>
          <dd>{beaconTime}</dd>
          <dt>{copy.landing.beaconSlotLabel}</dt>
          <dd>{config.provenance.beaconSlot.toLocaleString("en-US")}</dd>
        </dl>
      </div>

      {!isAuthenticated && (
        <>
          <div className="card">{copy.landing.authNote}</div>

          <div className={styles.authButtons}>
            <Button onClick={() => onAuth("github")}>
              {copy.landing.githubCta}
            </Button>
            {twitterEnabled && (
              <Button onClick={() => onAuth("twitter")}>
                {copy.landing.twitterCta}
              </Button>
            )}
          </div>
        </>
      )}

      {isAuthenticated && (
        <>
          {!hasEligibleCircuits && (
            <div className={cn("card", styles.alreadyContributedCard)}>
              <h3 className={styles.alreadyContributedTitle}>
                {copy.landing.alreadyContributedTitle}
              </h3>
              <p className={styles.alreadyContributedText}>
                {copy.landing.alreadyContributedDescription}
              </p>
              {authProvider === "github" && (
                <>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={
                      gistUrl
                        ? () =>
                            window.open(
                              gistUrl,
                              "_blank",
                              "noopener,noreferrer",
                            )
                        : handlePublishCompletedReceipt
                    }
                    disabled={checkingGist || publishingGist}
                  >
                    {checkingGist || publishingGist
                      ? copy.complete.attestationPublishingCta
                      : gistUrl
                        ? copy.complete.attestationViewCta
                        : copy.complete.attestationPublishCta}
                  </Button>
                  {gistError && (
                    <p className={styles.alreadyContributedText}>{gistError}</p>
                  )}
                </>
              )}
              {authProvider === "twitter" && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleShareCompletedOnX}
                >
                  {copy.complete.shareCta}
                </Button>
              )}
            </div>
          )}

          {hasEligibleCircuits && (
            <Button onClick={onBegin} disabled={eligibilityLoading}>
              {beginCta}
            </Button>
          )}
        </>
      )}

      {isAuthenticated && hasReceipts && (
        <Button
          variant="secondary"
          size="small"
          onClick={handleDownloadReceipts}
          disabled={downloadingReceipts}
        >
          {downloadingReceipts
            ? copy.landing.downloadingReceiptsCta
            : copy.landing.downloadReceiptsCta}
        </Button>
      )}

      <Button variant="secondary" size="small" onClick={onVerify}>
        {copy.landing.verifyCta}
      </Button>


      <p className={styles.footer}>
        {footerLines.map((line, index) => (
          <span key={line}>
            {line}
            {index < footerLines.length - 1 && <br />}
          </span>
        ))}
      </p>

      <nav className={styles.socialLinks} aria-label="Social links">
        <a
          href="https://x.com/zero1develop"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="zero1develop on X"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>X</span>
        </a>
        <span className={styles.socialSeparator} aria-hidden="true">
          ·
        </span>
        <a
          href="https://github.com/zero1develop/ceremony"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="zero1develop ceremony on GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .7a11.3 11.3 0 0 0-3.57 22.03c.57.1.78-.25.78-.55v-2.16c-3.18.69-3.85-1.35-3.85-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.73-1.54-2.54-.29-5.21-1.27-5.21-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .96-.31 3.11 1.17A10.8 10.8 0 0 1 12 6.97c.96 0 1.93.13 2.83.38 2.15-1.48 3.1-1.17 3.1-1.17.62 1.58.23 2.74.11 3.03.73.8 1.18 1.82 1.18 3.07 0 4.4-2.68 5.36-5.23 5.65.41.35.78 1.05.78 2.12v3.14c0 .3.21.66.79.55A11.3 11.3 0 0 0 12 .7z" />
          </svg>
          <span>GitHub</span>
        </a>
      </nav>
    </ScreenWrapper>
  );
}

function StatsBar({
  stats,
}: {
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <div className={styles.statsBar}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(styles.statCell, index > 0 && styles.statCellBorder)}
        >
          <div className={styles.statValue}>{stat.value}</div>
          <div className={styles.statLabel}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
