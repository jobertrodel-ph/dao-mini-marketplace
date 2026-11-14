"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getSupabaseClient,
  TREASURE_CATEGORIES,
  type TreasureCategory,
} from "@/lib/supabase";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function CreateListingForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TreasureCategory>(
    TREASURE_CATEGORIES[0],
  );
  const [price, setPrice] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setErrorMsg(null);

    if (!selected) {
      setImageFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (PNG, JPG, WebP, or GIF).");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg("Image size must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setImageFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedEmail = sellerEmail.trim();
    const numericPrice = Number(price);

    if (!imageFile) {
      setErrorMsg("Please upload a photo of your treasure.");
      return;
    }

    if (trimmedTitle.length < 2) {
      setErrorMsg("Title must be at least 2 characters.");
      return;
    }

    if (trimmedDesc.length < 5) {
      setErrorMsg("Description must be at least 5 characters.");
      return;
    }

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg("Please enter a valid price (0 or greater).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const supabase = getSupabaseClient();
      const extension = imageFile.name.split(".").pop()?.toLowerCase() ?? "png";
      const safeExt = extension.replace(/[^a-z0-9]/g, "") || "png";
      const filePath = `${crypto.randomUUID()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setErrorMsg(`Photo upload failed: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(filePath);

      const { data: inserted, error: insertError } = await supabase
        .from("listings")
        .insert({
          title: trimmedTitle,
          description: trimmedDesc,
          price: numericPrice,
          seller_email: trimmedEmail,
          category,
          image_url: publicUrlData.publicUrl,
        })
        .select("id")
        .single();

      if (insertError) {
        setErrorMsg(`Could not save listing: ${insertError.message}`);
        return;
      }

      router.push(`/listings/${inserted.id}`);
      router.refresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Unexpected error while publishing your listing.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bazaar-container bazaar-container--narrow">
      <Link href="/" className="back-link">
        ← Back to Immortal Bazaar
      </Link>

      <section className="form-scroll-card">
        <div className="form-header">
          <span className="hero-eyebrow">AUCTION PAVILION SUBMISSION</span>
          <h1 className="form-title">Offer a Treasure</h1>
          <p className="form-subtitle">
            Inscribe the relic&apos;s details and upload a spirit imprint photo
            to publish it on the bazaar.
          </p>
        </div>

        <form className="listing-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="treasure-photo" className="field-label">
              Treasure Photo
            </label>
            <input
              id="treasure-photo"
              type="file"
              accept="image/*"
              className="file-input"
              onChange={handleFileChange}
              disabled={isSubmitting}
              required
            />
            {previewUrl && (
              <div className="upload-preview-box">
                <Image
                  src={previewUrl}
                  alt="Selected treasure preview"
                  fill
                  unoptimized
                  className="upload-preview-img"
                />
              </div>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="treasure-title" className="field-label">
              Title
            </label>
            <input
              id="treasure-title"
              type="text"
              className="text-input"
              minLength={2}
              maxLength={120}
              placeholder="e.g., Azure Dragon Spirit Sabre"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="treasure-category" className="field-label">
                Category
              </label>
              <select
                id="treasure-category"
                className="select-input"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as TreasureCategory)
                }
                disabled={isSubmitting}
              >
                {TREASURE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="treasure-price" className="field-label">
                Price (Spirit Stones)
              </label>
              <input
                id="treasure-price"
                type="number"
                className="text-input"
                min="0"
                step="0.01"
                placeholder="150"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="seller-email" className="field-label">
              Seller Email
            </label>
            <input
              id="seller-email"
              type="email"
              className="text-input"
              placeholder="elder@azuresect.org"
              value={sellerEmail}
              onChange={(event) => setSellerEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="treasure-description" className="field-label">
              Description
            </label>
            <textarea
              id="treasure-description"
              className="textarea-input"
              rows={4}
              minLength={5}
              maxLength={2000}
              placeholder="Describe origin realm, refinement grade, and spirit properties..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {errorMsg && (
            <p className="bazaar-error" role="alert">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary-gold"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing to Bazaar..." : "Publish Listing"}
          </button>
        </form>
      </section>
    </main>
  );
}
