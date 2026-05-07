function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function lerpHsl(
  [h1, s1, l1]: [number, number, number],
  [h2, s2, l2]: [number, number, number],
  t: number
): [number, number, number] {
  return [h1 + (h2 - h1) * t, s1 + (s2 - s1) * t, l1 + (l2 - l1) * t];
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function masteryToColor(score: number): string {
  const low = getCssVar('--mastery-low') || '#a8453a';
  const mid = getCssVar('--mastery-mid') || '#d4924a';
  const high = getCssVar('--mastery-high') || '#5a7a4a';
  const brightness = parseFloat(getCssVar('--mastery-brightness') || '1');

  const hslLow = hexToHsl(low);
  const hslMid = hexToHsl(mid);
  const hslHigh = hexToHsl(high);

  const clamped = Math.max(0, Math.min(1, score));
  let h = 0;
  let s = 0;
  let l = 0;

  if (clamped <= 0.5) {
    [h, s, l] = lerpHsl(hslLow, hslMid, clamped / 0.5);
  } else {
    [h, s, l] = lerpHsl(hslMid, hslHigh, (clamped - 0.5) / 0.5);
  }

  l = Math.max(0, Math.min(100, l * brightness));
  return hslToHex(h, s, l);
}