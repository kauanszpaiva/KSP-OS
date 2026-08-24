export const BUSINESS_UNIT_COOKIE = 'ksp_business_unit';
export const ALL_BUSINESS_UNITS = 'all';

export interface BusinessUnitRef {
  id: string;
  key: string;
  name: string;
  focus: string | null;
}
