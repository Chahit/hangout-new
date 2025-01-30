import { createUploadthing, type FileRouter } from "uploadthing/next";
import { generateReactHelpers } from "@uploadthing/react";

const uploadthing = createUploadthing();

export const ourFileRouter = {
  messageAttachment: uploadthing(["image", "pdf", "audio"])
    .middleware(async (): Promise<{ userId: string }> => {
      return { userId: "test" };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

export const { useUploadThing } = generateReactHelpers<OurFileRouter>();