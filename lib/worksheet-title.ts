export function normalizeWorksheetTitle(title: string) {
  return title.replace(/复习卷/g, '练习卷')
}
