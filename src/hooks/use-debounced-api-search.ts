"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseDebounceApiSearchOptions<T> {
  searchFunction: (query: string, signal?: AbortSignal) => Promise<T[]>;
  minimumLength?: number;
  delay?: number;
  token?: string;
  initialQuery?: string;
}

interface UseDebounceApiSearchReturn<T> {
  searchQuery: string;
  searchResults: T[];
  isSearching: boolean;
  searchError: string | null;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  retrySearch: () => void;
}

export function useDebounceApiSearch<T>({
  searchFunction,
  minimumLength = 3,
  delay = 300,
  token,
  initialQuery = "",
}: UseDebounceApiSearchOptions<T>): UseDebounceApiSearchReturn<T> {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(
    async (query: string) => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Don't search if query is too short
      if (!query || query.length < minimumLength) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }

      // Don't search if no token when required
      if (!token) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchError("Authentication required");
        return;
      }

      try {
        setIsSearching(true);
        setSearchError(null);

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        
        const results = await searchFunction(query.trim(), abortControllerRef.current.signal);
        
        if (!abortControllerRef.current.signal.aborted) {
          setSearchResults(results || []);
        }
      } catch (error) {
        if (!abortControllerRef.current?.signal.aborted) {
          console.error("Search error:", error);
          setSearchError(error instanceof Error ? error.message : "Search failed");
          setSearchResults([]);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [searchFunction, minimumLength, token]
  );

  const debouncedSearch = useCallback(
    (query: string) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        void performSearch(query);
      }, delay);
    },
    [performSearch, delay]
  );

  // Handle search query changes
  useEffect(() => {
    debouncedSearch(searchQuery);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, debouncedSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setIsSearching(false);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const retrySearch = useCallback(() => {
    if (searchQuery && searchQuery.length >= minimumLength) {
      void performSearch(searchQuery);
    }
  }, [searchQuery, minimumLength, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    setSearchQuery,
    clearSearch,
    retrySearch,
  };
}