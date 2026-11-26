
- Home-screen install uses a plain manifest only; public/sw.js is a cleanup worker — do not re-add an offline cache worker (stale copies blanked the preview).
- Keep public role-based selection screens in dedicated route pages, with deterministic selection and swap rules in pure tested helpers so roster behavior stays consistent.
