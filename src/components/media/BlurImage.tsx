import { useState } from "react";

interface BlurImageProps {
  src: string;
  alt: string;
  w: number;
  h: number;
  className?: string;
  sizes?: string;
}

export default function BlurImage({ src, alt, w, h, className, sizes }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      width={w}
      height={h}
      sizes={sizes || "(max-width: 768px) 150px, 200px"}
      loading="lazy"
      decoding="async"
      className={`${className || ""} ${loaded ? "blur-0" : "blur-sm"} transition-[filter] duration-300 ${
        error ? "opacity-50" : ""
      }`}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
    />
  );
}