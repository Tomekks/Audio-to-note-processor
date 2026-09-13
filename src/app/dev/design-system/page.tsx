import { notFound } from "next/navigation";
import { DesignSystemTool } from "./DesignSystemTool";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DesignSystemTool />;
}
