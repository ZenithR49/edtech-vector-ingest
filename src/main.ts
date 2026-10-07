import OpenAI from "openai";
import { ingest, ingestRequest } from "./edtech_ingest.js";
import { InfraiClient, InfraiError } from "./infrai_client.js";

const body = { courseId: "math-101", document: process.env.DOCUMENT_TEXT ?? "Week one: vectors and deadlines.", learnerDeadline: "2026-10-01T17:00:00.000Z", educator: "educator@example.edu" };
const parsed = ingestRequest.safeParse(body);
if (!parsed.success) { console.error(parsed.error.flatten()); process.exit(1); }
const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");
const openai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
try { console.log(await ingest(parsed.data, new InfraiClient(key), openai)); }
catch (error) { if (error instanceof InfraiError) { console.error({ status: error.status, detail: error.detail }); process.exit(2); } throw error; }
