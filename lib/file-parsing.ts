const supportedExtensions = new Set(["pdf", "docx", "txt", "md", "markdown", "pptx", "xlsx", "csv", "png", "jpg", "jpeg", "json", "html"]);

export function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupportedCareerFile(name: string) {
  return supportedExtensions.has(fileExtension(name));
}

export function previewTextContent(name: string, content: string) {
  if (!isSupportedCareerFile(name)) throw new Error("Unsupported file type");
  return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
}

export function classifyConversationFormat(name: string) {
  const extension = fileExtension(name);
  if (extension === "md" || extension === "markdown") return "markdown" as const;
  if (extension === "json" || extension === "html" || extension === "txt") return extension;
  throw new Error("Unsupported conversation format");
}
