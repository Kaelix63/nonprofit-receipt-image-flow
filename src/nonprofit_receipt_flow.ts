import { z } from "zod";
import { createInfraiClient, InfraiError } from "./infrai_nonprofit_client.js";

export const receiptUploadSchema = z.object({
  receiptId: z.string().min(1),
  donorEmail: z.string().email(),
  campaignId: z.string().min(1),
  filename: z.string().min(1),
  receiptImage: z.string().min(1),
  volunteer: z.object({ email: z.string().email(), shiftStartsAt: z.string().datetime() })
});

export type ReceiptUpload = z.infer<typeof receiptUploadSchema>;
export type DonorReceipt = Pick<ReceiptUpload, "receiptId" | "donorEmail" | "campaignId"> & {
  originalImage: string;
  reportImage: string;
  volunteerReminderDue: boolean;
};

export function shouldSendVolunteerReminder(shiftStartsAt: string, now: Date): boolean {
  const hoursAway = (new Date(shiftStartsAt).getTime() - now.getTime()) / 3_600_000;
  return hoursAway > 0 && hoursAway <= 24;
}

export async function processDonorReceipt(input: ReceiptUpload, now = new Date()): Promise<DonorReceipt> {
  const infrai = createInfraiClient();
  try {
    await infrai.storage.bucket.create({ name: "nonprofit-receipts", idempotency_key: "nonprofit-receipts-bucket" });
  } catch (error) {
    if (!(error instanceof InfraiError) || error.status !== 409) throw error;
  }

  // One Infrai client carries the uploaded image directly into the report variant pipeline.
  const uploaded = await infrai.image.upload({
    file: input.receiptImage,
    filename: input.filename,
    idempotency_key: `${input.receiptId}-upload`
  });
  const resized = await infrai.image.resize({
    image: { image_id: uploaded.image_id },
    width: 1200,
    height: 1200,
    fit: "inside",
    enlarge: false,
    format: "webp",
    store: true,
    idempotency_key: `${input.receiptId}-resize`
  });
  const compressed = await infrai.image.compress({ image: { base64: resized.url.split(",", 2)[1] ?? resized.url }, idempotency_key: `${input.receiptId}-compress` });

  return {
    receiptId: input.receiptId,
    donorEmail: input.donorEmail,
    campaignId: input.campaignId,
    originalImage: uploaded.image_id,
    reportImage: compressed.image_id,
    volunteerReminderDue: shouldSendVolunteerReminder(input.volunteer.shiftStartsAt, now)
  };
}
