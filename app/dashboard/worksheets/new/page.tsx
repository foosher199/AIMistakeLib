import { WorksheetBuilder } from '@/components/worksheets/WorksheetBuilder'

export default async function NewWorksheetPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const params = await searchParams
  const questionIds = (params.ids || '').split(',').filter(Boolean).slice(0, 100)
  return <WorksheetBuilder questionIds={questionIds} />
}
