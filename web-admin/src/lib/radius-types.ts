export const RADIUS_STATUSES = [
  "active",
  "suspended",
  "throttled",
  "terminated",
] as const;
export type RadiusStatus = (typeof RADIUS_STATUSES)[number];

export type RadiusUser = {
  id: number;
  customer_id: string;
  subscription_id: number | null;
  username: string;
  mac_address: string | null;
  ip_assigned: string | null;
  radius_group: string | null;
  status: RadiusStatus;
  data_used_mb_current_period: number;
  last_seen_at: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  last_login_nas: string | null;
  customer?: {
    id: string;
    code: string;
    full_name: string;
    phone_primary: string | null;
    status: string;
  } | null;
  created_at: string | null;
};
