// Minimal Pages Router error page to prevent Next.js from generating
// default error pages that use the Html component incorrectly.
// This file exists only to satisfy Next.js build requirements.
// The actual error handling is done via App Router (app/error.tsx, app/global-error.tsx, app/not-found.tsx)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AppError({ statusCode }: { statusCode?: number }) {
  return null; // App Router will handle all error rendering
}

AppError.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default AppError;
