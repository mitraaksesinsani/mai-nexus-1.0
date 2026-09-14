import { redirect } from 'next/navigation';

export default async function DeprecatedWarehouseDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/owner-dashboard/warehouse-list/${id}`);
}
