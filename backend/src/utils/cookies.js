export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [part, ''];
      try {
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      } catch {
        return [part.slice(0, separator), ''];
      }
    }),
  );
}

export function sessionCookie(name, value, { secure, maxAgeSeconds }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
