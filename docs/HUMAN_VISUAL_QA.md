# Human visual QA

Browser automation is not installed in this worktree (`npm run test:browser` returns `playwright: not found`). Serve the `public` directory locally, then verify at desktop and 360px, 390px and 430px wide:

1. Initial load: Transit is selected; road/town context is legible, transport lines lead, map-style control and Report map feedback remain reachable.
2. California → San Fernando: select the local Route 3 result/pattern. Its line must run California, Claxton Bay, Marabella, San Fernando in that order; it must not take the Solomon Hochoy Highway as an endpoint-only shortcut.
3. Couva → San Fernando: local Route 3 must include California, Claxton Bay and Marabella.
4. Chaguanas → San Fernando: local Route 3 must include Chase Village, Couva, California, Claxton Bay and Marabella in order. Check reverse selection follows reverse order.
5. Select a Route 4 / Black Band corridor: the line and route card swatch remain black, not remapped by map style.
6. Plan one PTSC trip and one water service trip: route colours, journey details and map overlays remain visible.
7. With an active journey and results panel, switch Transit → Standard → Satellite → Transit. Inputs, selected alternative, markers, overlays, result panel and current map context should survive. If imagery fails, confirm Standard comes back without clearing state.
8. At 360/390/430px, confirm the planner, map modes, route alternatives and feedback action are not overlapped and can be reached without a desktop-only interaction.

Local serve command:

  cd /home/bpiper02/.workbench/worktrees/a9090e4c5607 && python3 -m http.server 8000 --directory public

Open http://localhost:8000/.
