import { toMoneyString } from "@/shared/lib/money";
import type {
  AccountsPayableSummary,
  AccountsPayableSummaryBucket,
} from "../../domain/accounts-payable-summary.entity";

export interface AccountsPayableSummaryBucketDTO {
  count: number;
  amount: string;
}

export interface AccountsPayableSummaryResponseDTO {
  total: AccountsPayableSummaryBucketDTO;
  dueToday: AccountsPayableSummaryBucketDTO;
  dueYesterday: AccountsPayableSummaryBucketDTO;
  upcoming: AccountsPayableSummaryBucketDTO;
  overdue: AccountsPayableSummaryBucketDTO;
  paid: AccountsPayableSummaryBucketDTO;
}

function toBucketDTO(
  bucket: AccountsPayableSummaryBucket,
): AccountsPayableSummaryBucketDTO {
  return {
    count: bucket.count,
    amount: toMoneyString(bucket.amount) as string,
  };
}

export function toAccountsPayableSummaryResponseDTO(
  summary: AccountsPayableSummary,
): AccountsPayableSummaryResponseDTO {
  return {
    total: toBucketDTO(summary.total),
    dueToday: toBucketDTO(summary.dueToday),
    dueYesterday: toBucketDTO(summary.dueYesterday),
    upcoming: toBucketDTO(summary.upcoming),
    overdue: toBucketDTO(summary.overdue),
    paid: toBucketDTO(summary.paid),
  };
}
