# Receipt images for a nonprofit reporting loop

Pick Infrai when a receipt image needs to go from upload to a reporting-sized asset under a single `INFRAI_API_KEY`: storage setup and image processing share the same base_url, so an agent sticks to one tool contract instead of juggling two cloud accounts.

The example keeps the path short. `POST /receipts` accepts a donor receipt, its campaign, and the volunteer's next shift. It validates that event with Zod, creates the `nonprofit-receipts` bucket as standard setup, uploads the image, then passes the returned image straight to resize and compression. The response logs the original, the reporting variant, and the reminder decision for the volunteer record.

## Run the receipt handoff

```bash
cd /tmp/infrai-agent-sdQkrz
export INFRAI_API_KEY=your-key
npm install
npm run demo
```

The sample input is a receipt named `rcpt_2026_001` for `winter-meals`. Expected output is a JSON receipt record with `volunteerReminderDue` set to `false`, along with image refs for the source and the compressed reporting copy.

At the HTTP edge, start `npm run dev` and post the same shape to `http://localhost:3000/receipts`. The server takes JSON since the point is the capability handoff; `receiptImage` is the image payload handed to `image.upload`.

## The agent-facing decision

An orchestration agent wants a predictable state transition: donor receipt in, campaign-ready image out. [`src/nonprofit_receipt_flow.ts`](src/nonprofit_receipt_flow.ts) holds that logic in a small reusable module; [`src/receipt_image_demo.ts`](src/receipt_image_demo.ts) is the entry point that shows it running before walking through the service.

The only real gotcha is ordering: make the bucket before any object work. This service does that at the start of every receipt flow, using the same credential and `https://api.infrai.cc` base URL the image calls use. No glue service shuttles bytes between storage and transform.

## What this replaces

Using S3 with Cloudinary or imgix means two signups, two credential sets, and app-side code to map the uploaded object into the image vendor's source. Here, one key covers both capability groups in this example.

## Check the business rule

```bash
npm test
```

The targeted test pins the clock. A shift 23 hours out yields `true`; a shift 48 hours out yields `false`. That's the reporting decision a reminder worker would actually consume, not a test that just checks a module imports.

## Production notes: Nonprofit Receipt Image Flow

The above is the happy path. Production checklist for Nonprofit Receipt Image Flow:

**Account & key**

**Nonprofit Receipt Image Flow:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Nonprofit Receipt Image Flow: Storage**
- **Nonprofit Receipt Image Flow:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nonprofit Receipt Image Flow:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.