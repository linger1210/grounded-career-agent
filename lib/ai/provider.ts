import { careerAdviceSchema } from "../domain";

export type StructuredCareerAdvice = ReturnType<typeof careerAdviceSchema.parse>;

export interface AIProvider {
  id: string;
  label: string;
  estimateCost(inputCharacters: number): number;
  generateCareerAdvice(input: unknown): Promise<StructuredCareerAdvice>;
  testCredential?(): Promise<{ ok: boolean; message: string }>;
}

export class DemoStructuredProvider implements AIProvider {
  id = "demo-structured-provider";
  label = "Limited platform-provided AI (demonstration)";

  estimateCost() {
    return 0;
  }

  async generateCareerAdvice() {
    return careerAdviceSchema.parse({
      decision: "Apply",
      interviewChance: "Medium",
      strengths: ["Strong confirmed SQL evidence", "Cross-functional ownership"],
      gaps: ["Direct fintech experience"],
      evidenceIds: ["ev-impact", "ev-skills"],
      model: this.id,
      promptVersion: "match-v1",
    });
  }
}
