import { ListPageSkeleton } from "@/components/ui/list-page-skeleton";

export default function CustomersLoading() {
  return <ListPageSkeleton title="Customers" rows={10} />;
}
