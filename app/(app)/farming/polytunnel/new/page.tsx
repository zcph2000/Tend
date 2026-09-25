import { redirect } from "next/navigation";

// Polytunneller oprettes nu via det almindelige bed-flow, hvor du kan vælge
// "Polytunnel" som placeringstype for en sektion — så bedene indeni bliver
// korrekt mærket og synlige for Sæsonplan og Dyrkningsguiden.
export default function NyPolytunnelPage() {
  redirect("/farming/beds/new");
}
