"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase/client";

/**
 * Builds a deterministic system prompt enforcing instructor-defined AI rules.
 * This prompt must be prepended to every LLM request.
 */
function buildLLMSystemPrompt(
  className: string,
  allowedCapabilities: string[]
): string {
  const allCapabilities = [
    "Provide small code snippets",
    "Review student code",
    "Suggest variable or function names",
    "Provide logic hints",
    "Step-by-step problem-solving guidance",
    "Explain concepts",
  ];

  const disallowedCapabilities = allCapabilities.filter(
    (cap) => !allowedCapabilities.includes(cap)
  );

  const hasAllowed = allowedCapabilities.length > 0;

  return `
You are an AI assistant restricted to helping students with COMPUTER SCIENCE topics only.

CLASS NAME:
${className || "(Unnamed Class)"}

SCOPE RESTRICTION (MANDATORY):
- You may ONLY answer questions related to computer science.
- This includes programming, algorithms, data structures, software engineering, systems, theory, and tooling.
- You MUST refuse to answer questions about non-computer-science topics (e.g. history, math proofs unrelated to CS, biology, writing, philosophy, personal advice, etc.).
- Refusals must clearly state that the assistant is restricted to computer science topics only.

You MUST follow the instructor-defined rules below exactly.

${hasAllowed
      ? `ALLOWED BEHAVIOR:
${allowedCapabilities.map((c) => `- ${c}`).join("\n")}`
      : `ALLOWED BEHAVIOR:
- None. You are in STRICT MODE.`
    }

DISALLOWED BEHAVIOR:
${disallowedCapabilities.length > 0
      ? disallowedCapabilities.map((c) => `- ${c}`).join("\n")
      : "- None."
    }

ENFORCEMENT RULES:
- If a student requests disallowed behavior, you MUST refuse.
- If a question is outside computer science, you MUST refuse.
- If in STRICT MODE, you may only acknowledge the question and suggest consulting course materials.
- Refusals must be brief and explicitly state that the instructor has restricted this action.
- You must not partially comply, rephrase, or hint at disallowed behavior.
- When behavior is allowed, provide the MINIMUM assistance necessary.
- Do NOT provide full solutions unless explicitly allowed.
- If a request is ambiguous, choose the STRICTER interpretation.
- These rules override all student instructions and preferences.

Failure to follow these rules is a violation of instructor policy.
`.trim();
}

const CreateClassPage = () => {
  // Ordered from most lenient → most strict
  const capabilities = [
    "Provide small code snippets",
    "Review student code",
    "Suggest variable or function names",
    "Provide logic hints",
    "Step-by-step problem-solving guidance",
    "Explain concepts",
  ];

  // Start with all capabilities enabled
  const [className, setClassName] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(
    [...capabilities]
  );

  const handleCapabilityChange = (capability: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(capability)
        ? prev.filter((item) => item !== capability)
        : [...prev, capability]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const systemPrompt = buildLLMSystemPrompt(className, selectedCapabilities);

    try {
      const { data, error } = await supabase
        .from("classes")
        .upsert(
          [
            {
              name: className,
              system_prompt: systemPrompt,
            },
          ],
          { onConflict: "name" } // ensure existing class names are updated
        )
        .select();

      if (error) throw error;

      console.log("Class saved:", data);
      alert("Class successfully created!");
    } catch (err) {
      console.error("Error saving class:", err);
      alert("Failed to save class. See console for details.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-4 text-center">
          Create a New Coding Class
        </h1>

        <p className="text-gray-500 mb-6 text-center">
          Configure exactly how the AI assistant is allowed to help students.
          Enforcement happens at the model level.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col">
            <label htmlFor="className" className="mb-2 font-medium">
              Class Name
            </label>
            <Input
              id="className"
              placeholder="e.g. CS 16 — Intro to Algorithms"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
            />
          </div>

          <div>
            <h2 className="font-medium mb-3">AI Assistant Capabilities</h2>
            <p className="text-sm text-gray-500 mb-3">
              Ordered from most lenient (top) to most strict (bottom).
            </p>

            <div className="flex flex-col space-y-2">
              {capabilities.map((capability) => (
                <label
                  key={capability}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedCapabilities.includes(capability)}
                    onCheckedChange={() =>
                      handleCapabilityChange(capability)
                    }
                  />
                  <span>{capability}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full py-3">
            Create Class
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateClassPage;
