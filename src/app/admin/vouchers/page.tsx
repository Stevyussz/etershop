/**
 * @file src/app/admin/vouchers/page.tsx
 */

import { getVouchers } from "./voucher-actions";
import VoucherManagerClient from "./VoucherManagerClient";

export default async function AdminVoucherPage() {
  const vouchers = await getVouchers();

  return (
    <div className="container mx-auto px-6 py-10">
      <VoucherManagerClient initialVouchers={vouchers as any} />
    </div>
  );
}
