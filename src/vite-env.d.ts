/// <reference types="vite/client" />

// html2pdf.js ships types only for its prebuilt bundle; the source is the same API
declare module 'html2pdf.js/src/index.js' {
  import html2pdf from 'html2pdf.js';
  export default html2pdf;
}
