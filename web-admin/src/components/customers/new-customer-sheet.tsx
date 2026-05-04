"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  createCustomerAction,
  type CreateCustomerState,
} from "@/app/(dashboard)/customers/actions";
import { CustomerFormFields } from "@/components/customers/customer-form-fields";

export function NewCustomerSheet() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    CreateCustomerState | undefined,
    FormData
  >(createCustomerAction, undefined);

  useEffect(() => {
    if (state?.ok && state.customer) {
      toast.success(`Customer ${state.customer.code} created`, {
        description: state.customer.full_name,
      });
      setOpen(false);
    }
  }, [state]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
        <Plus className="size-4" />
        New customer
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New customer</SheetTitle>
          <SheetDescription>
            Add a customer to your tenant. A unique code (e.g. C-00042) will be
            generated automatically.
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

          <CustomerFormFields fieldErrors={state?.fieldErrors} />

          <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t px-0 pt-4">
            <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
              Cancel
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create customer"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
