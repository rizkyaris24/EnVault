/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        palette: {
          // Brand Colors (EnVault Design Spec)
          void: '#030607',       // Void Black: Main background
          navy: '#0B101A',       // Deep Navy / Slate: Icon shadows and depth, sidebar
          charcoal: '#101820',   // Deep Charcoal: Lock and dark icon elements, cards
          slate: '#293241',      // Dark Slate: Back layer of vault, borders, dividers
          white: '#F1F1F1',      // Soft White: "En" wordmark, primary text
          mint: '#76E6A8',       // Mint Green: Main accent, primary CTA
          teal: '#35C9B5',       // Aqua Teal: Gradient accent / lower Vault, hover

          // Theme Structural Roles
          base: '#030607',       // Void Black - main background
          deep: '#0B101A',       // Deep Navy/Slate - sidebar background
          surface: '#101820',    // Deep Charcoal - elevated cards, dialogs, modals
          night: '#16222F',      // Elevated container, active item highlights
          olive: '#293241',      // Dark Slate - borders, dividers, outlines
          wood: '#070C12',       // Shadows & depth backdrop

          // Typography & Iconography
          linen: '#F1F1F1',      // Soft White - primary text, titles, variable keys
          bright: '#F1F1F1',     // Soft White - high-contrast highlights
          stone: '#8B9BB4',      // Secondary text, metadata, timestamps, paths
          moss: '#4A5B73',       // Tertiary muted text, inactive icons, subtle hints
          sand: '#76E6A8',       // Mint Green - accents, active icons, badges
          sage: '#76E6A8',       // Mint Green - additions, encrypted badges, success status

          // Interactive & Buttons
          russet: '#76E6A8',     // Mint Green - primary CTA button fill
          bronze: '#35C9B5',     // Aqua Teal - primary CTA hover / gradient partner
        }
      }
    }
  },
  plugins: []
}
