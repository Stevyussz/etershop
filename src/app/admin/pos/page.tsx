import AdminPOSClient from "./AdminPOSClient";

export const metadata = {
  title: "Kasir POS Manual - Etershop Admin",
};

export default function AdminPOSPage() {
  return (
    <div className="space-y-8">
      <AdminPOSClient />
    </div>
  );
}
