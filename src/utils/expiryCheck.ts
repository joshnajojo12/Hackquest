export function isExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt)
}