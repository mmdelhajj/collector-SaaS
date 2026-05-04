import { ListPageSkeleton } from "@/components/ui/list-page-skeleton";

export default function InvoicesLoading() {
  return <ListPageSkeleton title="Invoices" rows={10} />;
}
