"use client";

import { useI18n } from "./I18nProvider";
import type { ApplicationData, BeverageType } from "@/lib/types";

interface Props {
  value: ApplicationData;
  onChange: (value: ApplicationData) => void;
  disabled?: boolean;
}

export function ApplicationForm({ value, onChange, disabled }: Props) {
  const { t } = useI18n();
  const update = <K extends keyof ApplicationData>(key: K, v: ApplicationData[K]) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{t("form.heading")}</h2>
      <div className="form-grid">
        <div>
          <label htmlFor="brand_name">{t("form.brand_name")}</label>
          <input id="brand_name" type="text" value={value.brand_name} onChange={(e) => update("brand_name", e.target.value)} disabled={disabled} />
        </div>
        <div>
          <label htmlFor="class_type">{t("form.class_type")}</label>
          <input id="class_type" type="text" value={value.class_type} onChange={(e) => update("class_type", e.target.value)} disabled={disabled} />
        </div>
        <div>
          <label htmlFor="alcohol_content">{t("form.alcohol_content")}</label>
          <input
            id="alcohol_content"
            type="text"
            placeholder={t("form.alcohol_placeholder")}
            value={value.alcohol_content}
            onChange={(e) => update("alcohol_content", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="net_contents">{t("form.net_contents")}</label>
          <input
            id="net_contents"
            type="text"
            placeholder={t("form.net_placeholder")}
            value={value.net_contents}
            onChange={(e) => update("net_contents", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="producer_name">{t("form.producer_name")}</label>
          <input id="producer_name" type="text" value={value.producer_name} onChange={(e) => update("producer_name", e.target.value)} disabled={disabled} />
        </div>
        <div>
          <label htmlFor="producer_address">{t("form.producer_address")}</label>
          <input id="producer_address" type="text" value={value.producer_address} onChange={(e) => update("producer_address", e.target.value)} disabled={disabled} />
        </div>
        <div>
          <label htmlFor="country_of_origin">{t("form.country_of_origin")}</label>
          <input id="country_of_origin" type="text" value={value.country_of_origin} onChange={(e) => update("country_of_origin", e.target.value)} disabled={disabled} />
        </div>
        <div>
          <label htmlFor="beverage_type">{t("form.beverage_type")}</label>
          <select id="beverage_type" value={value.beverage_type} onChange={(e) => update("beverage_type", e.target.value as BeverageType)} disabled={disabled}>
            <option value="spirits">{t("form.beverage_spirits")}</option>
            <option value="wine">{t("form.beverage_wine")}</option>
            <option value="malt">{t("form.beverage_malt")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
