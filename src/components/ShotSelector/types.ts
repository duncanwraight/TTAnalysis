export type ShotType = {
  id: string;
  label: string;
  name?: string;
};

export type ShotCategory = {
  id: string;
  label: string;
  shots: ShotType[];
};