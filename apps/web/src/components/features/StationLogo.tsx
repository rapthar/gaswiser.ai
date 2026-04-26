'use client';

import Image from 'next/image';

const BRAND_LOGOS: Array<[string[], string]> = [
  [['arco'], '/logos/arco.png'],
  [["bj's", 'bjs', 'bj\'s'], '/logos/bjs.png'],
  [['bp'], '/logos/bp.png'],
  [['casey'], '/logos/caseys.png'],
  [['chevron'], '/logos/chevron.png'],
  [['circle k', 'circlek'], '/logos/circlek.png'],
  [['costco'], '/logos/costco.png'],
  [['getgo', 'get-go', 'get go'], '/logos/getgo.png'],
  [['kroger'], '/logos/kroger.png'],
  [['marathon'], '/logos/marathon.png'],
  [['murphy'], '/logos/murphy.png'],
  [['safeway'], '/logos/safeway.png'],
  [["sam's club", 'samsclub', 'sams club'], '/logos/samsclub.webp'],
  [['7-eleven', '7eleven', '7 eleven', 'seven-eleven'], '/logos/seveneleven.png'],
  [['sheetz'], '/logos/sheetz.png'],
  [['shell'], '/logos/shell.png'],
  [['sunoco'], '/logos/sunoco.png'],
  [['wal-mart', 'walmart'], '/logos/walmart.png'],
  [['wawa'], '/logos/wawa.png'],
];

export function getLogoPath(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keys, path] of BRAND_LOGOS) {
    if (keys.some(k => lower.includes(k))) return path;
  }
  return null;
}

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export function StationLogo({ name, size = 36, className = '' }: Props) {
  const logo = getLogoPath(name);
  if (!logo) return null;
  return (
    <div
      className={`rounded-lg bg-white border border-border overflow-hidden flex items-center justify-center shrink-0 p-1 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={logo}
        alt={name}
        width={size - 8}
        height={size - 8}
        className="object-contain w-full h-full"
      />
    </div>
  );
}
