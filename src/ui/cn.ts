export type ClassValue = string | number | false | null | undefined | ClassValue[];

/** Tiny className joiner (no dependency). */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) v.forEach(walk);
    else out.push(String(v));
  };
  values.forEach(walk);
  return out.join(' ');
}
