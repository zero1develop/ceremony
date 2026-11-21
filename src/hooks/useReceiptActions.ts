"use client";

import { useState } from "react";
import type { ReceiptResponse } from "@/lib/api";

export function useReceiptActions(options: {
  receipts: ReceiptResponse[];
  receiptFilename: string;
  shareTemplate: string;
}) {
  const { receipts, receiptFilename, shareTemplate } = options;
  const [copied, setCopied] = useState(false);

  const receiptPayload =
    receipts.length > 0 ? JSON.stringify(receipts, null, 2) : "";

  const handleCopy = async () => {
    if (!receiptPayload) return;
    try {
      await navigator.clipboard.writeText(receiptPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write can fail in insecure contexts */
    }
  };

  const handleCopyItem = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  const handleDownload = () => {
    if (!receiptPayload) return;
    const blob = new Blob([receiptPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = receiptFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (!receiptPayload) return;
    const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareTemplate)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  };

  return {
    receiptPayload,
    copied,
    handleCopy,
    handleCopyItem,
    handleDownload,
    handleShare,
  };
}
