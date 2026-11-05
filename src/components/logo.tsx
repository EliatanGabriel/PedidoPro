import Link from "next/link";
import Image from "next/image";

type LogoProps = { className?: string; width?: number; height?: number };

export function Logo({ className = "", width = 32, height = 18 }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Image src="/logo.png" alt="Logotipo Ordexa" width={width} height={height} unoptimized />
    </Link>
  );
}
