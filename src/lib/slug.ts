export function slugify(value: string, maxLength = 80) {
  const slug = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug || "item";
  return slug.slice(0, maxLength).replace(/-[^-]*$/, "").replace(/-+$/, "") || slug.slice(0, maxLength);
}

export function isValidSlug(value: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length <= 120;
}
