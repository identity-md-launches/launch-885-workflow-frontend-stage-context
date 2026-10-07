import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import { loadRuntime } from "./config";
import "./styles.css";
import "./v2.css";
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="fatal">
        <h1>The observatory could not render.</h1>
        <p>
          Reload to try again. Check your wallet for any submitted transaction
          before retrying an action.
        </p>
        <button onClick={() => location.reload()}>Reload page</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const root = createRoot(document.getElementById("root")!);
root.render(
  <div className="fatal" role="status">
    <h1>Quantum Observatory</h1>
    <p>Verifying deployment & ABI hashes…</p>
  </div>,
);
loadRuntime()
  .then((runtime) =>
    root.render(
      <Boundary>
        <App runtime={runtime} />
      </Boundary>,
    ),
  )
  .catch((error) =>
    root.render(
      <div className="fatal" role="alert">
        <h1>Deployment unavailable</h1>
        <p>{error.message}</p>
        <button onClick={() => location.reload()}>Retry loading</button>
      </div>,
    ),
  );
