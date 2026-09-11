// Money is stored as Float in SQLite; round to 2 decimals on every write and every read.
export const round2 = (n) => {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
};

export const sum = (arr) => round2(arr.reduce((a, b) => a + (Number(b) || 0), 0));

export const toNum = (v) => round2(v);