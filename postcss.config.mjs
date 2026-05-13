/** This project uses plain CSS — no Tailwind. The empty plugin map prevents
 *  any parent-directory postcss.config.js (which loads tailwindcss) from
 *  being picked up by PostCSS's config-cosmiconfig search.
 */
export default {
  plugins: {},
};
