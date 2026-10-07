import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/server";

import { processExtractionJobs } from "./regulations";

it("renvoie les jobs en échec : réponse FAILED ou appel rejeté", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  server.use(
    http.post("/api/requirements/jobs/:jobId/process", ({ params }) => {
      if (params.jobId === "rejected") {
        return HttpResponse.json({ detail: "LLM timeout" }, { status: 500 });
      }
      return HttpResponse.json({
        job_id: params.jobId,
        status: params.jobId === "failed" ? "FAILED" : "COMPLETED",
        extracted_requirement_ids: [],
        error_message: null,
        chunks_processed: 1,
      });
    }),
  );
  const onJobSettled = vi.fn();

  const failed = await processExtractionJobs(["ok", "failed", "rejected"], onJobSettled);

  expect(failed).toEqual(["failed", "rejected"]);
  expect(onJobSettled).toHaveBeenCalledTimes(3);
});
