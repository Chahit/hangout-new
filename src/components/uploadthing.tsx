import { useCallback } from "react";
import { UploadButton, UploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export { UploadButton, UploadDropzone };

export function useUploadThing(endpoint: keyof OurFileRouter) {
  const startUpload = useCallback(async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch(`/api/uploadthing/${endpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.urls.map((url: string) => ({ url }));
  }, [endpoint]);

  return { startUpload };
} 