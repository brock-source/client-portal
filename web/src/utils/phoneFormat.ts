export function formatPhoneNumber(input: string): string {
  const cleaned = input.replace(/\D/g, "");
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

export function phoneToE164(input: string): string {
  const cleaned = input.replace(/\D/g, "");
  if (cleaned.length !== 10 && cleaned.length !== 11) return "";
  const digits = cleaned.length === 11 ? cleaned.slice(1) : cleaned;
  return `+1${digits}`;
}

export function isValidPhoneNumber(phone: string): boolean {
  const e164 = phoneToE164(phone);
  return /^\+1\d{10}$/.test(e164);
}

export function maskPhoneNumber(e164: string): string {
  if (!/^\+1\d{10}$/.test(e164)) return e164;
  return `${e164.slice(0, 6)}***${e164.slice(-4)}`;
}
