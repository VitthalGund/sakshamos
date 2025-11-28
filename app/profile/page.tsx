import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function ProfileRedirectPage() {
  const session:any = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/login");
  }

  // Use the custom userId if available, otherwise fallback to MongoDB _id
  const profileId = session.user.userId || session.user.id;

  redirect(`/profile/${profileId}`);
}
