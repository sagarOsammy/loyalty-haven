# Local annotation edits, 10 October 2026

The four browser comments are applied locally. The annotated page remains open in the Codex inbuilt browser for further review. Publication is outside this local workstream.

| Comment | Implementation | Verification |
| --- | --- | --- |
| Cruise ship 25 percent bigger | Runtime scale changes from 1.4 to 1.75. The GLB, location, heading, waterline origin and motion remain intact. | Browser reads ship scale 1.75 and shows the larger ship afloat. |
| Forum structure 25 percent smaller | Pavilion scale changes from 1.5 to 1.125, with its circular forecourt radius reduced from 8.2 to 6.15. The original camera framing radius is retained for consistent composition. | Browser reads forum scale 1.125. Screenshot confirms the smaller pavilion and forecourt, with the entrance sign attached. |
| Remove inner alliance board | Remove the runtime display creation, updates and raycast target. The permanent Alliance Forum entrance sign is retained. | Board is absent both before alliance selection and after selecting Star Alliance. Three aircraft still load and their balances open. |
| Manrope throughout | All four previous font declarations in the interface use Manrope with a sans-serif fallback. Remove the unused font-face declarations and update active provenance. | Browser computed styles show Manrope for the page heading, dialog heading, United 98,000-point balance and all ledger totals. Source search finds no former font-name references in app, lib or docs. |

TypeScript validation and the production build pass. The build retains its existing bundle-size and route-classification notices. No captured browser warnings or errors, with scene ready and an empty asset-failure list. All browser validation used the inbuilt browser.

United remains 98,000 points and the saved overall total remains 1,262,817. All seven original font files, including the three now-unused serif files, are preserved. Model source files and GLBs are unchanged. Existing unrelated checkout work is preserved.

Evidence screenshots are retained in `outputs/annotation-edits-20261010.jpg` and `outputs/manrope-balance-panel-20261010.jpg`.

## Follow-up ship sizing

The subsequent browser comment requests a further 25 percent increase from the current ship size. Runtime scale changes from 1.75 to 2.1875. The inbuilt browser confirms scale 2.1875 with the ship loaded and no asset failures. SkyTeam and Accor selections are restored after reload. Screenshot: `outputs/cruise-ship-larger-20261010.jpg`.

## Follow-up ship placement

Sammy confirmed an approximate 80-pixel left and 30-pixel upward shift in the annotated desktop view. Projecting that shift onto the sea surface changes the motion anchor from `[-35, -1.12, -85]` to `[-46.98, -1.12, -100.72]`. Initial placement and animated horizontal drift share the same anchor. The hull stays at the sea surface, heading and model scale 2.1875 are retained. Inbuilt-browser readback confirms the updated position while animation advances, with no asset failures. TypeScript validation passes. Screenshot: `outputs/cruise-ship-position-20261010.jpg`.

## Annotated upper-left ship destination

The next annotation places the ship center at desktop pixel `(291, 171)` in the 1887-by-1278 view. Initial placement and motion now share the sea-surface anchor `[-104.737843, -1.12, -141.852496]`. Runtime scale 3.082244 compensates for the increased distance, retaining the previous approximately 358-pixel projected hull width. Heading and gentle horizontal motion remain intact. The source model and camera are unchanged.

The inbuilt browser confirms the ship at the upper-left destination, with scene ready, no asset failures and no captured browser warnings or errors. The existing Star Alliance selection is restored after reload, with Accor disabled. TypeScript validation passes. Evidence: `outputs/cruise-ship-marked-spot-20261010.jpg`.
