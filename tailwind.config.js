export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* 字体配置扩展 */
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'WenQuanYi Micro Hei',
          'Noto Sans CJK SC',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'var(--font-geist-mono)',
          'SF Mono',
          'Fira Code',
          'Consolas',
          'Monaco',
          'Courier New',
          'monospace',
        ],
      },
      /* 行高优化 */
      lineHeight: {
        'chinese': '1.6',
        'chinese-relaxed': '1.8',
      },
      /* 字间距优化 */
      letterSpacing: {
        'chinese': '0.01em',
        'chinese-wide': '0.02em',
      },
    },
  },
  plugins: [],
}