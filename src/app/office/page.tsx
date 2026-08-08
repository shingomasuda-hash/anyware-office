import type { Metadata } from "next";
import OfficeShell from "@/components/office/OfficeShell";

export const metadata: Metadata = {
  title: "AnyWare OFFICE",
};

export default function OfficePage() {
  return <OfficeShell />;
}
