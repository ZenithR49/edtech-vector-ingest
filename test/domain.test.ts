import assert from "node:assert/strict";
import { documentPdf, ingestRequest } from "../src/edtech_ingest.js";

const valid = ingestRequest.safeParse({ courseId: "course-7", document: "lesson text", learnerDeadline: "2026-10-01T17:00:00.000Z", educator: "lead@school.edu" });
assert.equal(valid.success, true);
const invalid = ingestRequest.safeParse({ courseId: "", document: "lesson text", learnerDeadline: "tomorrow", educator: "" });
assert.equal(invalid.success, false);
const pdf = Buffer.from(await documentPdf("lesson text"), "base64");
assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
console.log("request boundary test passed");
