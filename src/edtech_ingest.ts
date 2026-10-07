import { z } from "zod";
import OpenAI from "openai";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { InfraiClient } from "./infrai_client.js";

export const ingestRequest = z.object({
  courseId: z.string().min(1), document: z.string().min(1), learnerDeadline: z.string().datetime(), educator: z.string().min(1)
});
export type IngestRequest = z.infer<typeof ingestRequest>;
type Parsed = { text: string };

function chunks(text: string, size = 500): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];
  for (let i = 0; i < words.length; i += size) result.push(words.slice(i, i + size).join(" "));
  return result;
}

export async function documentPdf(document: string): Promise<string> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(document, { x: 50, y: page.getHeight() - 50, font, size: 12, maxWidth: page.getWidth() - 100 });
  return Buffer.from(await pdf.save()).toString("base64");
}

export async function ingest(input: IngestRequest, client: InfraiClient, openai: OpenAI): Promise<{ collection: string; chunks: number; deadline: string }> {
  const parsed = await client.request<Parsed>("/v1/pdf/parse", { pdf: await documentPdf(input.document) });
  const pieces = chunks(parsed.text);
  const collection = `course-${input.courseId}`;
  const embeddingResponse = await openai.embeddings.create({ model: "text-embedding-3-small", input: pieces });
  await client.request("/v1/vector/collection/create", { collection, dimension: embeddingResponse.data[0].embedding.length, metric: "cosine", metadata: { courseId: input.courseId, educator: input.educator } });
  await client.request("/v1/vector/upsert", { collection, vectors: embeddingResponse.data.map((item, index) => ({ id: `${input.courseId}-${index}`, embedding: item.embedding, metadata: { text: pieces[index], learnerDeadline: input.learnerDeadline } })) });
  return { collection, chunks: pieces.length, deadline: input.learnerDeadline };
}
