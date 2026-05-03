/** 整数金额转中文大写（元整），用于对账单页脚。 */
const CN = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"] as const;
const UNITS = ["", "拾", "佰", "仟"] as const;

function fourDigits(n: number): string {
  if (n <= 0 || n > 9999) return "";
  const d0 = Math.floor(n / 1000) % 10;
  const d1 = Math.floor(n / 100) % 10;
  const d2 = Math.floor(n / 10) % 10;
  const d3 = n % 10;
  const digits = [d0, d1, d2, d3];
  let out = "";
  let needZero = false;
  for (let i = 0; i < 4; i++) {
    const d = digits[i];
    if (d === 0) {
      needZero = true;
      continue;
    }
    if (needZero && out) out += CN[0];
    needZero = false;
    out += CN[d] + UNITS[3 - i];
  }
  return out.replace(/零+/g, "零").replace(/零$/, "");
}

export function yuanIntegerToChineseUppercase(amount: number): string {
  if (!Number.isFinite(amount)) return "零元整";
  const neg = amount < 0;
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "零元整";

  const yi = Math.floor(n / 1_0000_0000);
  n %= 1_0000_0000;
  const wan = Math.floor(n / 1_0000);
  const ge = n % 1_0000;

  let s = "";
  if (yi) s += fourDigits(yi) + "亿";
  if (wan) {
    if (yi && wan < 1000) s += CN[0];
    s += fourDigits(wan) + "万";
  } else if (yi && ge) s += CN[0];
  if (ge) s += fourDigits(ge);

  s = s.replace(/零+万/g, "万").replace(/亿万/g, "亿").replace(/^零+/, "");
  if (!s) s = CN[0];
  return (neg ? "负" : "") + s + "元整";
}
