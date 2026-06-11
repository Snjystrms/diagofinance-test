"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { API_BASE_URL } from "@/lib/api-core";

interface AuthImageProps {
  src: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

export function AuthImage({ src, alt = "", className = "", fallbackClassName = "" }: AuthImageProps) {
  const { token } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src || !token) {
      setLoading(false);
      return;
    }

    let currentBlobUrl: string | null = null;
    let cancelled = false;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        const fullUrl = src.startsWith("http") ? src : `${API_BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;

        const response = await fetch(fullUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();

        if (!cancelled) {
          currentBlobUrl = URL.createObjectURL(blob);
          setBlobUrl(currentBlobUrl);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchImage();

    return () => {
      cancelled = true;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [src, token]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted animate-pulse ${fallbackClassName}`}>
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${fallbackClassName}`}>
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
