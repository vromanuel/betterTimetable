import { validateSession } from "../auth/sessionManager";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  // const { user } = await validateSession();
  // if (!user) {
  // }
  return redirect("/generate");
}
