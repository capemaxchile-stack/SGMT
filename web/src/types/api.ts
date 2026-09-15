export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Faena extends BaseEntity {
  name: string;
  status: string;
}

export interface Asset extends BaseEntity {
  name: string;
  type: string;
  status: string;
}
