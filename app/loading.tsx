/** Root route fallback deliberately contains no second workspace shell.
 * Navigation already retains the previous shell during streaming transitions.
 */
export default function WorkspaceLoading() {
  return (
    <div className="routeLoading" role="status" aria-live="polite" aria-label="Loading screen">
      <div className="routeLoadingHeader"><span className="routeLoadingPulse" aria-hidden="true" /><span>Opening workspace…</span></div>
      <div className="routeLoadingLine" aria-hidden="true" />
      <div className="routeLoadingLine short" aria-hidden="true" />
      <div className="routeLoadingPanel" aria-hidden="true" />
    </div>
  );
}
