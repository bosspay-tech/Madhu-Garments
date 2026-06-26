"use client";

import { useState, type MouseEvent } from "react";
import { Share2 } from "lucide-react";
import { buildProductShareCheckoutUrl } from "@/lib/share-checkout";

type ProductShareButtonProps = {
  productId: string;
  productName: string;
  className?: string;
  variant?: "detail" | "icon";
};

function getProductShareUrl(productId: string) {
  if (typeof window !== "undefined") {
    return buildProductShareCheckoutUrl(productId, window.location.origin);
  }
  return buildProductShareCheckoutUrl(productId);
}

export function ProductShareButton({
  productId,
  productName,
  className = "",
  variant = "detail",
}: ProductShareButtonProps) {
  const [feedback, setFeedback] = useState("");

  const showFeedback = (message: string, duration = 2000) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), duration);
  };

  const handleShare = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const url = getProductShareUrl(productId);
    const text = `Check out ${productName} on MADHU GARMENTS`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: productName,
          text,
          url,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showFeedback("Link copied!");
        return;
      }

      showFeedback("Sharing not supported", 2500);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      showFeedback("Could not share", 2500);
    }
  };

  const isIcon = variant === "icon";

  return (
    <div className={`product-share product-share--${variant} ${className}`.trim()}>
      <button
        aria-label={`Share ${productName}`}
        className={isIcon ? "product-share-icon-button" : "product-soft-action"}
        onClick={handleShare}
        title="Share product"
        type="button"
      >
        <Share2 size={isIcon ? 16 : 17} strokeWidth={2} />
        {isIcon ? null : <span>Share</span>}
      </button>
      {feedback ? <span className="product-share-feedback">{feedback}</span> : null}
    </div>
  );
}
