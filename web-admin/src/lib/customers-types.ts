export const CUSTOMER_STATUSES = [
  "prospect",
  "active",
  "suspended",
  "terminated",
  "dormant",
] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export type Customer = {
  id: string;
  code: string;
  service_category_id: number | null;
  first_name: string;
  last_name: string;
  full_name: string;
  national_id: string | null;
  phone_primary: string;
  phone_secondary: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  address_line: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  latitude: number | null;
  longitude: number | null;
  status: CustomerStatus;
  balance_due: number;
  credit_limit: number;
  tags: string[];
  service_started_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Paginated<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
};
