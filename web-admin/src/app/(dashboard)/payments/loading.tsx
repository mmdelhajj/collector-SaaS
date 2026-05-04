import { ListPageSkeleton } from "@/components/ui/list-page-skeleton";

export default function PaymentsLoading() {
  return <ListPageSkeleton title="Payments" rows={10} />;
}
