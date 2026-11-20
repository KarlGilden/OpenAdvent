export function App() {
  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <span className="welcome-card__star" aria-hidden="true">
          ✦
        </span>
        <h1 id="welcome-title">OpenAdvent</h1>
        <p className="welcome-card__intro">
          Twenty-five little moments, waiting behind the doors.
        </p>
        <p className="welcome-card__note">The first door will be here soon.</p>
      </section>
    </main>
  )
}

