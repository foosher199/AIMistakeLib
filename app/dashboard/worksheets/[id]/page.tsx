import { SavedWorksheetLoader } from '@/components/worksheets/SavedWorksheetLoader'

export default async function WorksheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SavedWorksheetLoader id={id} />
}
