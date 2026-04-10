export function getAvatarSeed(value: string) {
  return value.trim().toLowerCase();
}

export function getRandomAvatarUrl(nameOrSeed: string) {
  const seed = encodeURIComponent(getAvatarSeed(nameOrSeed));
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}`;
}

export function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "?";

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}
