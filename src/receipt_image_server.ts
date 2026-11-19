import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_nonprofit_client.js";
import { processDonorReceipt, receiptUploadSchema } from "./nonprofit_receipt_flow.js";

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  let body = "";
  for await (const chunk of request) body += chunk;
  return JSON.parse(body);
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/receipts") {
    response.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ message: "Use POST /receipts" }));
    return;
  }
  try {
    const input = receiptUploadSchema.parse(await readJson(request));
    const receipt = await processDonorReceipt(input);
    response.writeHead(201, { "Content-Type": "application/json" }).end(JSON.stringify(receipt));
  } catch (error) {
    const status = error instanceof ZodError ? 400 : error instanceof InfraiError ? error.status : 500;
    response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ message: error instanceof Error ? error.message : "Request failed" }));
  }
});

server.listen(3000, () => console.log("Receipt service listening at http://localhost:3000"));
