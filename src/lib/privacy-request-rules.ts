export type PrivacyRequestStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "DECLINED";
const transitions: Record<PrivacyRequestStatus, readonly PrivacyRequestStatus[]> = {
  OPEN: ["IN_PROGRESS", "DECLINED"],
  IN_PROGRESS: ["COMPLETED", "DECLINED"],
  COMPLETED: [],
  DECLINED: [],
};

export function canTransitionPrivacyRequest(from: PrivacyRequestStatus, to: PrivacyRequestStatus) {
  return transitions[from].includes(to);
}

export function customerIsAnonymized(customer: { name: string; phone: string | null; email: string | null; taxId: string | null; address: string | null; city: string | null; state: string | null; postalCode: string | null; notes: string | null }) {
  return customer.name.startsWith("Cliente anonimizado ") && [customer.phone, customer.email, customer.taxId, customer.address, customer.city, customer.state, customer.postalCode, customer.notes].every((value) => value === null);
}
