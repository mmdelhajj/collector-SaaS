"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CUSTOMER_STATUSES, type Customer } from "@/lib/customers-types";
import { CustomerLocationPicker } from "@/components/customers/customer-location-picker";

type CustomerFormFieldsProps = {
  defaults?: Partial<Customer> | null;
  fieldErrors?: Record<string, string[]>;
};

export function CustomerFormFields({
  defaults,
  fieldErrors = {},
}: CustomerFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First name"
          name="first_name"
          required
          defaultValue={defaults?.first_name ?? ""}
          errors={fieldErrors.first_name}
        />
        <Field
          label="Last name"
          name="last_name"
          required
          defaultValue={defaults?.last_name ?? ""}
          errors={fieldErrors.last_name}
        />
      </div>

      <Field
        label="Phone (primary)"
        name="phone_primary"
        type="tel"
        required
        placeholder="+96170123456"
        defaultValue={defaults?.phone_primary ?? ""}
        errors={fieldErrors.phone_primary}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="WhatsApp"
          name="whatsapp_phone"
          type="tel"
          placeholder="+96170123456"
          defaultValue={defaults?.whatsapp_phone ?? ""}
          errors={fieldErrors.whatsapp_phone}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="customer@example.com"
          defaultValue={defaults?.email ?? ""}
          errors={fieldErrors.email}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={defaults?.status ?? "prospect"}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="City"
          name="city"
          placeholder="Beirut"
          defaultValue={defaults?.city ?? ""}
          errors={fieldErrors.city}
        />
        <Field
          label="Address"
          name="address_line"
          placeholder="Hamra Street 12"
          defaultValue={defaults?.address_line ?? ""}
          errors={fieldErrors.address_line}
        />
      </div>

      <CustomerLocationPicker
        defaultLat={defaults?.latitude ?? null}
        defaultLng={defaults?.longitude ?? null}
        errors={{
          latitude: fieldErrors.latitude,
          longitude: fieldErrors.longitude,
        }}
      />

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Optional internal notes…"
          defaultValue={(defaults as { notes?: string | null })?.notes ?? ""}
        />
        {fieldErrors.notes?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.notes[0]}</p>
        )}
      </div>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  errors?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={Boolean(errors?.length)}
      />
      {errors?.[0] && <p className="text-xs text-destructive">{errors[0]}</p>}
    </div>
  );
}
