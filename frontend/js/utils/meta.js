export default function(id, fallback) {
  const element = document.getElementById(id)
  if (element) return element.content
  return fallback
}
