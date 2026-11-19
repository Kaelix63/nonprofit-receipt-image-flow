import { processDonorReceipt } from "./nonprofit_receipt_flow.js";

const receipt = await processDonorReceipt({
  receiptId: "rcpt_2026_001",
  donorEmail: "donor@example.org",
  campaignId: "winter-meals",
  filename: "donation-receipt.png",
  receiptImage: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  volunteer: { email: "volunteer@example.org", shiftStartsAt: "2026-12-15T10:00:00.000Z" }
});

console.log(JSON.stringify(receipt, null, 2));
