import Link from "next/link";
import type { ReactNode } from "react";

type NickLinkVariant = "title" | "table";

type Props = {
  name: string;
  children?: ReactNode;
  className?: string;
  variant?: NickLinkVariant;
};

export function NickLink({ name, children, className, variant = "table" }: Props) {
  const trimmed = name.trim();
  if (!trimmed) {
    return <span className={className}>{children}</span>;
  }

  const variantClass = variant === "title" ? "playerTitleLink" : "tableNickLink";
  const mergedClassName = [variantClass, className].filter(Boolean).join(" ");

  return (
    <Link className={mergedClassName} href={`/player/${encodeURIComponent(trimmed)}`}>
      {children ?? trimmed}
    </Link>
  );
}
