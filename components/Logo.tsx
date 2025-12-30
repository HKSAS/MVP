'use client'

import Image from "next/image";
import { cn } from "@/components/ui/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const sizeClasses = {
    sm: "h-12",
    md: "h-16",
    lg: "h-20",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const imageSize = {
    sm: 48,
    md: 64,
    lg: 80,
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt="Autoval IA Logo"
        width={imageSize[size]}
        height={imageSize[size]}
        className={cn(sizeClasses[size], "w-auto object-contain")}
        priority
        style={{
          filter: 'brightness(2.2) contrast(1.8) saturate(2.2) drop-shadow(0 0 25px rgba(59, 130, 246, 1))'
        }}
      />
      {showText && (
        <span className={cn("text-gray-900 font-semibold", textSizeClasses[size])}>
          Autoval IA
        </span>
      )}
    </div>
  );
}

