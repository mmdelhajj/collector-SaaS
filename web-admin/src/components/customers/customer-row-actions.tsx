"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomerFormFields } from "@/components/customers/customer-form-fields";
import {
  updateCustomerAction,
  deleteCustomerAction,
  type UpdateCustomerState,
} from "@/app/(dashboard)/customers/actions";
import type { Customer } from "@/lib/customers-types";

const ICON_BTN =
  "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CustomerRowActions({ customer }: { customer: Customer }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <EditSheet customer={customer} />
      <DeleteDialog customer={customer} />
    </div>
  );
}

function EditSheet({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = updateCustomerAction.bind(null, customer.id);
  const [state, formAction, isPending] = useActionState<
    UpdateCustomerState | undefined,
    FormData
  >(action, undefined);

  useEffect(() => {
    if (!state) return;
    if (state.ok && state.customer) {
      toast.success("Changes saved", {
        description: `${state.customer.code} · ${state.customer.full_name}`,
      });
      setOpen(false);
      router.refresh();
      return;
    }
    // Customer no longer exists — likely deleted in another tab or by another
    // user. Close the stale sheet and refresh the table so the row disappears.
    if (state.error === "Customer not found.") {
      toast.error("This customer was already deleted", {
        description: "Refreshing the list so it stays in sync.",
      });
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={ICON_BTN}
        aria-label={`Edit ${customer.full_name}`}
        title="Edit"
      >
        <Pencil className="size-4" />
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit customer</SheetTitle>
          <SheetDescription>
            <span className="font-mono text-xs">{customer.code}</span> ·{" "}
            {customer.full_name}
          </SheetDescription>
        </SheetHeader>

        <form
          action={formAction}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2"
        >
          {state?.error && !state.ok && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <CustomerFormFields
            defaults={customer}
            fieldErrors={state?.fieldErrors}
          />

          <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t px-0 pt-4">
            <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
              Cancel
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DeleteDialog({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await deleteCustomerAction(customer.id);
      if (res.ok) {
        toast.success(`${customer.full_name} deleted`, {
          description: `Customer ${customer.code} can be restored from the trash.`,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not delete customer.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`${ICON_BTN} hover:bg-destructive/10 hover:text-destructive`}
        aria-label={`Delete ${customer.full_name}`}
        title="Delete"
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this customer?</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{customer.code}</span> ·{" "}
            {customer.full_name} will be soft-deleted. Their invoices and
            payments stay on file. You can restore them from the trash later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Delete customer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
