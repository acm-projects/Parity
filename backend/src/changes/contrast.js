// Opaque sRGB colors only. Gradients, images, and transparent layers need manual review.
function luminance(hex) {
  if (typeof hex !== 'string' || !/^#[\da-f]{6}$/i.test(hex)) throw new Error('Use opaque six-digit hex colors');
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(foreground, background) {
  const a = luminance(foreground), b = luminance(background);
  const ratio = (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05);
  return { ratio, passesNormalText: ratio >= 4.5, passesLargeText: ratio >= 3,
    note: 'Valid only for the supplied opaque foreground/background pair. Not a full accessibility assessment.' };
}
module.exports = { contrast };
