export interface RouteDeps {
  userOwnsBusiness: (userId: string, businessId?: string | null) => Promise<boolean>;
}
