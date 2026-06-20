"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function AuthenticatedImage({ src, alt, className }: AuthenticatedImageProps) {
  const { token } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src || !token) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(src, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();

        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load authenticated image:", err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    void fetchImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, token]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className || ""}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted text-xs text-muted-foreground ${className || ""}`}>
        Failed to load
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
