// 日付のフォーマット関数 (YYYYMMDD -> YYYY-MM-DD)
export function formatDate(dateStr: string): string {
  if (dateStr.length === 8) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }
  return dateStr;
}

// 少数フォーマット用関数
export function formatDecimal(val: any, digits: number = 3): string {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  return num.toFixed(digits);
}

// 差分フォーマット用関数
export function formatDiff(val: any): string {
  if (val === null || val === undefined) return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  const str = num.toFixed(3);
  return num > 0 ? `+${str}` : str;
}
