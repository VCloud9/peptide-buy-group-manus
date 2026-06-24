export type BuyStatus =
  | "Draft"
  | "Gathering"
  | "Funded"
  | "Ordered"
  | "Testing"
  | "Distributing"
  | "Complete";

export type OrderStatus = "Committed" | "Payment Pending" | "Paid" | "Shipped";

export type TestStatus =
  | "Pending"
  | "Samples Sent"
  | "In Testing"
  | "Results Ready"
  | "Published"
  | "Failed";

export const BUY_STATUS_ORDER: BuyStatus[] = [
  "Draft",
  "Gathering",
  "Funded",
  "Ordered",
  "Testing",
  "Distributing",
  "Complete",
];

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  "Committed",
  "Payment Pending",
  "Paid",
  "Shipped",
];

export const TEST_STATUS_ORDER: TestStatus[] = [
  "Pending",
  "Samples Sent",
  "In Testing",
  "Results Ready",
  "Published",
  "Failed",
];
