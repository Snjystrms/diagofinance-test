"use client"

import * as React from "react"
import type {
  Control,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
  ControllerFieldState,
  RegisterOptions,
} from "react-hook-form"

import { PasswordInput } from "@/components/password-input"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export const sanitizeDigits = (value: string, maxLength?: number) => {
  const digits = value.replace(/\D/g, "")
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits
}

export const sanitizePersonText = (value: string) =>
  value.replace(/[^a-zA-Z\s'-]/g, "")

export const sanitizeUppercase = (value: string, maxLength?: number) => {
  const normalized = value.toUpperCase()
  return typeof maxLength === "number" ? normalized.slice(0, maxLength) : normalized
}

type RenderFieldArgs<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  field: ControllerRenderProps<TFieldValues, TName>
  fieldState: ControllerFieldState
}

type ValidatedFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>
  name: TName
  label: React.ReactNode
  className?: string
  messageClassName?: string
  rules?: RegisterOptions<TFieldValues, TName>
  renderControl: (args: RenderFieldArgs<TFieldValues, TName>) => React.ReactNode
}

export function ValidatedFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  className,
  messageClassName,
  rules,
  renderControl,
}: ValidatedFormFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>{renderControl({ field, fieldState })}</FormControl>
          <FormMessage className={cn("mt-1 text-xs", messageClassName)} />
        </FormItem>
      )}
    />
  )
}

type ValidatedTextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<ValidatedFormFieldProps<TFieldValues, TName>, "renderControl"> & {
  inputProps?: Omit<React.ComponentProps<typeof Input>, "name" | "value" | "onChange" | "onBlur" | "ref">
  transformValue?: (value: string) => string
}

export function ValidatedTextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  inputProps,
  transformValue,
  ...props
}: ValidatedTextFieldProps<TFieldValues, TName>) {
  return (
    <ValidatedFormField
      {...props}
      renderControl={({ field }) => (
        <Input
          {...field}
          {...inputProps}
          value={field.value ?? ""}
          onChange={(event) => {
            const nextValue = transformValue ? transformValue(event.target.value) : event.target.value
            field.onChange(nextValue)
          }}
        />
      )}
    />
  )
}

type ValidatedPasswordFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<ValidatedFormFieldProps<TFieldValues, TName>, "renderControl"> & {
  inputProps?: Omit<React.ComponentProps<typeof PasswordInput>, "name" | "value" | "onChange" | "onBlur" | "ref" | "type">
}

export function ValidatedPasswordField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  inputProps,
  ...props
}: ValidatedPasswordFieldProps<TFieldValues, TName>) {
  return (
    <ValidatedFormField
      {...props}
      renderControl={({ field }) => <PasswordInput {...field} {...inputProps} />}
    />
  )
}
