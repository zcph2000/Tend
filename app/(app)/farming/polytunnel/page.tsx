import { redirect } from "next/navigation";

// Polytunneller oprettes og vises nu sammen med resten af bedene
// (Jordbrug → Bede → Nyt bed → Sektion → placering "Polytunnel").
export default function PolytunnelPage() {
  redirect("/farming/beds");
}
