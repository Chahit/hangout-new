import { useState } from "react";
import { Upload, X } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { supabase } from "@/lib/supabase";

type ResourceUploadProps = {
  onSuccess: () => void;
};

export function ResourceUpload({ onSuccess }: ResourceUploadProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [category, setCategory] = useState<"notes" | "past_paper" | "study_material">("notes");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startUpload } = useUploadThing("messageAttachment");

  const handleAddTag = () => {
    if (currentTag && !tags.includes(currentTag)) {
      setTags([...tags, currentTag]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Upload file
      const files = await startUpload([selectedFile]);
      const res = files?.[0];

      if (!res) throw new Error("Failed to upload file");

      // Save resource metadata
      const { error: submitError } = await supabase.from("resources").insert({
        title,
        description,
        file_url: res.url,
        file_type: selectedFile.type,
        course_code: courseCode,
        category,
        tags,
      });

      if (submitError) throw submitError;

      onSuccess();
      // Reset form
      setTitle("");
      setDescription("");
      setCourseCode("");
      setCategory("notes");
      setTags([]);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload resource");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mobile-input"
            placeholder="Resource title"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mobile-input min-h-[100px]"
            placeholder="Describe your resource..."
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Course Code</label>
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="mobile-input"
            placeholder="e.g., CS101"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="mobile-input"
            required
          >
            <option value="notes">Notes</option>
            <option value="past_paper">Past Paper</option>
            <option value="study_material">Study Material</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
              className="mobile-input flex-1"
              placeholder="Add tags..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="mobile-button"
            >
              Add
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">File</label>
          <div className="flex items-center justify-center w-full">
            <label className="w-full flex flex-col items-center px-4 py-6 bg-background border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="mt-2 text-sm text-muted-foreground">
                {selectedFile ? selectedFile.name : "Click to upload a file"}
              </span>
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !selectedFile}
        className="mobile-button w-full"
      >
        {isSubmitting ? "Uploading..." : "Upload Resource"}
      </button>
    </form>
  );
} 