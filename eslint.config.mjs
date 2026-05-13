import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  prettier,
  {
    ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"],
  },
];
