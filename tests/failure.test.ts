import { describe, expect, it } from "vitest";
import { failureKind } from "@/lib/failure";

describe("a failed reference says what went wrong in the reader's words", () => {
  it("sorts stored errors into kinds", () => {
    expect(failureKind("Stopped before finishing. Try again.")).toBe("stopped");
    expect(failureKind("Model refused the request: cyber")).toBe("refused");
    expect(failureKind("Model returned no parseable output")).toBe("model");
    expect(failureKind("Voyage embeddings failed: 503 upstream")).toBe("model");
    // What Gemini answered in production under load: a 503, but the model's, not the address's.
    expect(failureKind('{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}')).toBe("model");
    expect(failureKind("Uploaded media not found in storage")).toBe("media");
    expect(failureKind("fetch failed")).toBe("fetch");
    expect(failureKind("Blocked address: 10.0.0.1")).toBe("fetch");
    expect(failureKind("Request failed with status 404")).toBe("fetch");
    expect(failureKind("Something nobody planned for")).toBe("generic");
    expect(failureKind(null)).toBe("generic");
  });
});
