export type CollectorZone = {
  id: number;
  name: string;
  color: string;
  polygon: Array<[number, number]>;
  is_active: boolean;
  default_collector: { id: number; name: string } | null;
  created_at: string | null;
  updated_at: string | null;
};
