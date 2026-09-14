import { redirect } from 'next/navigation';

export default function DeprecatedWarehouseRedirect() {
  redirect('/owner-dashboard/warehouse-list');
}
