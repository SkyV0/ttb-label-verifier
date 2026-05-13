"use client";

import { useFormContext } from "react-hook-form";
import { useI18n } from "./I18nProvider";
import type { ApplicationData } from "@/lib/types";

interface Props {
  disabled?: boolean;
}

/**
 * Pure presentation: relies on a `react-hook-form` <FormProvider> in an
 * ancestor. The parent page owns the form instance (via useForm) so it can
 * call handleSubmit and reset; this component just registers the inputs.
 */
export function ApplicationForm({ disabled }: Props) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors, isSubmitting },
  } = useFormContext<ApplicationData>();
  const isDisabled = disabled ?? isSubmitting;

  const errorFor = (key: keyof ApplicationData) => errors[key]?.message as string | undefined;

  return (
    <div className="card">
      <h2>{t("form.heading")}</h2>
      <div className="form-grid">
        <Field id="brand_name" label={t("form.brand_name")} error={errorFor("brand_name")}>
          <input
            id="brand_name"
            type="text"
            placeholder="OLD TOM DISTILLERY"
            disabled={isDisabled}
            aria-invalid={Boolean(errorFor("brand_name")) || undefined}
            {...register("brand_name")}
          />
        </Field>

        <Field id="class_type" label={t("form.class_type")} error={errorFor("class_type")}>
          <input
            id="class_type"
            type="text"
            placeholder="Kentucky Straight Bourbon Whiskey"
            disabled={isDisabled}
            aria-invalid={Boolean(errorFor("class_type")) || undefined}
            {...register("class_type")}
          />
        </Field>

        <Field
          id="alcohol_content"
          label={t("form.alcohol_content")}
          error={errorFor("alcohol_content")}
        >
          <input
            id="alcohol_content"
            type="text"
            placeholder={t("form.alcohol_placeholder")}
            disabled={isDisabled}
            aria-invalid={Boolean(errorFor("alcohol_content")) || undefined}
            {...register("alcohol_content")}
          />
        </Field>

        <Field id="net_contents" label={t("form.net_contents")} error={errorFor("net_contents")}>
          <input
            id="net_contents"
            type="text"
            placeholder={t("form.net_placeholder")}
            disabled={isDisabled}
            aria-invalid={Boolean(errorFor("net_contents")) || undefined}
            {...register("net_contents")}
          />
        </Field>

        <Field id="producer_name" label={t("form.producer_name")} error={errorFor("producer_name")}>
          <input
            id="producer_name"
            type="text"
            placeholder="Old Tom Distillery, LLC"
            disabled={isDisabled}
            aria-invalid={Boolean(errorFor("producer_name")) || undefined}
            {...register("producer_name")}
          />
        </Field>

        <Field
          id="producer_address"
          label={t("form.producer_address")}
          error={errorFor("producer_address")}
        >
          <input
            id="producer_address"
            type="text"
            placeholder="123 Bourbon Road, Lexington, KY"
            disabled={isDisabled}
            {...register("producer_address")}
          />
        </Field>

        <Field
          id="country_of_origin"
          label={t("form.country_of_origin")}
          error={errorFor("country_of_origin")}
        >
          <input
            id="country_of_origin"
            type="text"
            placeholder="Imports only"
            disabled={isDisabled}
            {...register("country_of_origin")}
          />
        </Field>

        <Field id="beverage_type" label={t("form.beverage_type")} error={errorFor("beverage_type")}>
          <select id="beverage_type" disabled={isDisabled} {...register("beverage_type")}>
            <option value="spirits">{t("form.beverage_spirits")}</option>
            <option value="wine">{t("form.beverage_wine")}</option>
            <option value="malt">{t("form.beverage_malt")}</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <div id={`${id}-error`} className="field-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
