import { BookMarked, BookOpen, ClipboardList, FileText, GraduationCap, Landmark, Paperclip, Presentation, Video } from "lucide-react";
import type { ResourceType } from "@/lib/constants";

const ICONS = {
  book: BookOpen,
  article: FileText,
  thesis: GraduationCap,
  presentation: Presentation,
  report: ClipboardList,
  guide: BookMarked,
  recording: Video,
  supplementary: Paperclip,
  institutional: Landmark,
} satisfies Record<ResourceType, unknown>;

export function TypeIcon({ type, className = "h-4 w-4" }: { type: ResourceType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon aria-hidden="true" className={className} />;
}
