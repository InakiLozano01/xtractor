# Instant navigation rig for xtractor

- BUILD: In an isolated capped Node container, install the locked dependencies and run `EXPOSE_TESTING_API=1 npm run build`. Serve that production artifact with the standalone server, including its public and static assets.
- EXPOSE: `EXPOSE_TESTING_API=1` at build time enables the testing API. Normal release builds omit it. Do not expose the testing API to public traffic.
- RUN: In a capped Playwright container, run `BASE_URL=<isolated-server-url> npm run test:instant`. Set `PLAYWRIGHT_EXECUTABLE_PATH` only when using an existing Chromium installation.
- TEST USER: Public and anonymous for the navigation. Regression checks use disposable fixture accounts and databases. Never use a production database for the fixture tests.
- DRIFT: The isolated database contains the production schema and synthetic data. Production credentials, domains, and customer records are excluded.
- CONTRACTS: Public /login account link to /signup. Signup heading and email field are ready on navigation. Anonymous /accounts still redirects to /login. Links use their existing automatic viewport policy unless an explicit opt-out already exists.
- LOOP: Build, start, run the focused tests, stop, and repeat. The VPS orchestration for the verified run is `/home/ilozano/.local/state/next-prefetch-20261016/pipeline.py xtractor partial`.
- LIVENESS: Local build followed by a new isolated server. The orchestration records its build ID and testing configuration after the tests exit successfully.
- WALLS: Automatic prefetching requires a production build. Browser containers need process reaping and enough process slots. The verified VPS browser uses `--init`, 1536 MB memory, 2 GB memory plus swap, one CPU, and 512 process slots. Node builds use 2 GB memory, 3 GB memory plus swap, and two CPUs.
