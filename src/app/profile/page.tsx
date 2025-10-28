import ProfileHeader from "@/components/profile-header";
import ProfileContent from "@/components/profile-content";
import { MainLayout } from "@/components/main-layout";

export default function Page() {
  return (
    <MainLayout>
      <div className="container mx-auto space-y-6 px-4 py-10">
        <ProfileHeader />
        <ProfileContent />
      </div>
    </MainLayout>
  );
}