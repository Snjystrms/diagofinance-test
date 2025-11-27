'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Input } from './input';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
}

export function OtpInput({ 
  value, 
  onChange, 
  length = 6, 
  disabled = false,
  className = '' 
}: OtpInputProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus the first empty input or the last filled input
    const focusIndex = value.length < length ? value.length : length - 1;
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus();
      setActiveIndex(focusIndex);
    }
  }, [value, length]);

  const handleChange = (index: number, inputValue: string) => {
    if (disabled) return;

    const newValue = value.split('');
    newValue[index] = inputValue;
    const result = newValue.join('').slice(0, length);
    onChange(result);

    // Move to next input if current input is filled
    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (value[index]) {
        // Clear current input
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length);
    onChange(pastedData);
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length }, (_, index) => (
        <React.Fragment key={index}>
          <Input
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            className={`
              w-12 h-12 text-center text-lg font-semibold
              border-2 rounded-lg
              ${activeIndex === index 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'border-input'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus:outline-none'}
            `}
          />
          {index === 2 && (
            <div className="w-4 h-0.5 bg-border mx-2"></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
} 