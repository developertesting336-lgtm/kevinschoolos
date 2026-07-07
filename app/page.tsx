import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";

export default async function Home() {
  const session = await validateSession();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
