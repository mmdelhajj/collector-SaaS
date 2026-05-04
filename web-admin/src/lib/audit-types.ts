export type AuditEntry = {
  id: number;
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  subject_label: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
  user: { id: number; name: string } | null;
};

export type AuditPage = {
  data: AuditEntry[];
  meta: {
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    per_page: number;
  };
};
