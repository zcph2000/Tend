import {
  Syringe, Pill, Heart, Baby, Scale, Stethoscope, Eye,
  FileText, ClipboardList, RefreshCw,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  vaccination: Syringe,
  worming:     Pill,
  tupping:     Heart,
  lambing:     Baby,
  weighing:    Scale,
  treatment:   Stethoscope,
  observation: Eye,
  note:        FileText,
  move:        RefreshCw,
};

export default function EventIcon({ type, ...props }: { type: string } & LucideProps) {
  const Icon = iconMap[type] ?? ClipboardList;
  return <Icon {...props} />;
}
