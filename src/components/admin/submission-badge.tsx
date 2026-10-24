import { Badge } from "@/components/ui/misc";
import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from "@/lib/constants";

export function SubmissionBadge({ status }: { status: SubmissionStatus }) {
  const tone = status === "pending" ? "warning" : status === "under_review" ? "blue" : status === "accepted" ? "green" : "danger";
  return <Badge tone={tone}>{SUBMISSION_STATUS_LABELS[status]}</Badge>;
}
