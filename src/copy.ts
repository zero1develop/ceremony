import type { CeremonyCopy } from "./types/ceremony";

export const defaultCopy: CeremonyCopy = {
  header: {
    title: "ZERO1DEVELOP · TRUSTED SETUP",
    contributionsLabel: "contributions",
    signOutLabel: "Sign out",
    steps: {
      landing: "Welcome",
      entropy: "Entropy",
      tier: "Select Tier",
      progress: "Progress",
      complete: "Complete",
      verify: "Verify",
    },
  },
  landing: {
    title: "Zero1develop",
    subtitle: "Trusted Setup Ceremony",
    description:
      "Contribute your randomness to the Zero1develop trusted setup. Your contribution strengthens the ceremony — only one honest participant is needed.",
    stats: {
      contributionsLabel: "Contributors",
      circuitsLabel: "Circuits",
      progressLabel: "Progress",
    },
    authNote: "Sign in with GitHub or X to prevent spam and join the queue.",
    githubCta: "CONTINUE WITH GITHUB",
    twitterCta: "CONTINUE WITH X",
    beginCta: "BEGIN CONTRIBUTION",
    eligibilityLoadingCta: "CHECKING ELIGIBILITY...",
    downloadReceiptsCta: "DOWNLOAD MY RECEIPTS",
    downloadingReceiptsCta: "PREPARING DOWNLOAD...",
    timeNoticeTitle: "Set aside 30–60 minutes",
    timeNoticeBody:
      "Contributing to all circuits takes roughly 30 to 60 minutes and runs entirely in your browser. Use a desktop browser, and keep this tab open and your device awake until you are finished.",
    alreadyContributedTitle: "You have already contributed",
    alreadyContributedDescription:
      "This account has contributed to every available circuit. You can still verify your receipts.",
    closedSubtitle: "Contributions are closed",
    closedDescription:
      "The ceremony has reached its target and is no longer accepting contributions. It is now being finalized — the final parameters and verification beacon are being prepared. You can verify existing receipts below.",
    endedSubtitle: "This ceremony is complete",
    endedDescription:
      "Thank you to everyone who contributed. The final parameters and verification beacon have been published. You can still verify existing receipts below.",
    verifyCta: "VERIFY A RECEIPT",
    footer:
      "GitHub or X sign-in required to prevent spam. No other data collected.",
    provenanceTitle: "PUBLIC CEREMONY COMMITMENTS",
    circuitSourceLabel: "Circuit source",
    frozenCommitLabel: "Frozen commit (SHA-1)",
    releaseTagLabel: "Release tag",
    beaconCommitmentLabel: "Final beacon time (UTC)",
    beaconSlotLabel: "Ethereum beacon slot",
    startTimeLabel: "Ceremony starts (UTC)",
    endTimeLabel: "Contributions close (UTC)",
    notStartedSubtitle: "This ceremony has not started yet",
    notStartedDescription:
      "The ceremony has been initialized, but contributions will remain closed until the published start time.",
  },
  entropy: {
    topBarTitle: "ENTROPY COLLECTION",
    topBarHint: "Move around & tap for bursts",
    strengthLabel: "Entropy strength",
    readyCta: "CONTINUE",
    collectingCta: "COLLECTING ENTROPY...",
    helper:
      "Your movements are being mixed into cryptographic randomness that will help secure the ceremony.",
    overlayTitle: "Entropy collected",
    overlaySubtitle: "Your unique randomness is ready",
  },
  tier: {
    title: "Select contribution level",
    description:
      "Choose how many circuits to contribute to. More circuits = stronger ceremony.",
    cta: "JOIN QUEUE",
    joiningCta: "JOINING QUEUE...",
    tierLabelPrefix: "Tier",
    timeSuffix: "min",
    pillWillRun: "will run",
    pillAlreadyContributed: "already contributed",
    pillTargetReached: "target reached",
    pillNextAvailable: "next available",
  },
  progress: {
    title: "Contribution in progress",
    subtitle: "We will run each circuit in sequence. Keep this tab open.",
    listTitle: "Your circuits",
    activeTitle: "Active circuit",
    constraintsLabel: "constraints",
    queueAhead: "{{count}} ahead of you in line",
    queueNext: "You're next in line",
    etaLabel: "ETA",
    etaEstimating: "Estimating time remaining…",
    etaRemaining: "≈ {{time}} remaining",
    statusLabels: {
      waiting: "Waiting",
      active: "Active",
      done: "Done",
      error: "Error",
    },
    phaseLabels: {
      downloading: "Download",
      computing: "Compute",
      uploading: "Upload",
      verifying: "Verify",
    },
    phaseStatus: {
      downloading: "Downloading zkey...",
      computing: "Computing contribution...",
      uploading: "Uploading result...",
      verifying: "Verifying contribution on the server...",
    },
    retryCta: "Retry",
    cancelCta: "Cancel",
    errorTitle: "Contribution failed",
    autoRetryLabel: "Retrying automatically… (attempt {{attempt}} of {{total}})",
    completeTitle: "All circuits complete",
    completeSubtitle: "Review your receipts and finalize.",
  },
  complete: {
    title: "Contribution Complete",
    subtitle: "Your randomness is now permanently woven into the ceremony.",
    contributionsTitle: "Your contributions",
    emptyContributions: "No receipts recorded yet.",
    downloadCta: "Download",
    verifyCta: "Verify",
    copyCta: "Copy Receipt",
    copiedCta: "Copied!",
    copyItemCta: "Copy hash",
    shareCta: "Share on X",
    receiptFilename: "ceremony-receipt.json",
    shareTemplate:
      "I completed the Zero1develop Trusted Setup Ceremony 🔐\nMy contribution is now part of the ceremony.",
    toxicTitle: "Toxic waste destroyed",
    toxicBody:
      "Your secret randomness was generated in memory, used to transform the circuit keys, and immediately zeroed. No entropy was written to disk or transmitted to the coordinator.",
    toxicTags: [
      "WASM memory zeroed",
      "Entropy buffers cleared",
      "No disk writes",
    ],
    thankYouTitle: "Thank you for strengthening the ceremony.",
    thankYouBody:
      "Only one honest participant is needed. You might be that one.",
    attestationTitle: "Publish receipt to GitHub Gist (optional)",
    attestationBody:
      "Publish the complete ceremony-receipt.json as a public Gist under your GitHub account.",
    attestationPublishCta: "Publish receipt as Gist",
    attestationRepublishCta: "Publish another Gist backup",
    attestationPublishingCta: "Publishing…",
    attestationViewCta: "View Gist",
    attestationError: "Could not publish the Gist. Please try again.",
    attestationSignInError:
      "Sign in with GitHub again to grant Gist access, then retry.",
  },
  verify: {
    title: "Verify a receipt",
    subtitle:
      "Paste a receipt JSON to confirm it exists in the coordinator state.",
    label: "Receipt JSON",
    placeholder:
      '{"circuitId":"multiplier","participantId":"...","contributionIndex":1}',
    cta: "VERIFY RECEIPT",
    verifyingCta: "VERIFYING...",
    note: "This check confirms that the receipt's contribution hash matches the coordinator's record.",
    successTitle: "Receipt verified",
    invalidReceipt: "Receipt JSON is missing required fields.",
    duplicateReceipt:
      "Receipt list contains duplicate entries for the same contribution.",
    hashMismatch:
      "Submitted hash does not match the coordinator's record for {{circuitId}} #{{contributionIndex}}.",
    errorLabel: "Error",
    backCta: "BACK TO LANDING",
  },
};
