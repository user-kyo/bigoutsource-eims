import { apiRequest } from '../lib/api';

export const siteService = {
  // Sites are a fixed set of office locations; only the list is consumed
  // (to populate dropdowns). Management endpoints were removed.
  list: () => apiRequest('/sites'),
};
