export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function buildPlayerEmail(jerseyNo: number, name: string, suffix = "") {
  const slug = slugify(name) || "player";
  return `pitchiq-j${jerseyNo}-${slug}${suffix}@academy.local`;
}
