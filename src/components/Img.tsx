import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";

/** An <img> that tries each source in turn and shows `fallback` once they have all failed. */
export function Img({ sources, fallback = null, ...rest }: { sources: (string | null | undefined)[]; fallback?: ReactNode } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const list = sources.filter((s): s is string => !!s);
  const key = list.join("|");
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [key]);

  if (index >= list.length) return <>{fallback}</>;
  return <img {...rest} src={list[index]} onError={() => setIndex((i) => i + 1)} />;
}
