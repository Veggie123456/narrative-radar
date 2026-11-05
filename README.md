# Narrative Radar

Live-source scanner for token profiles, boosts, and public news RSS, with a five-minute best-effort GitHub Actions schedule. Output is saved to data.json.

## Operation
GitHub Actions > Narrative Radar Scanner > Run workflow. Scheduled runs may be delayed or skipped. Set repository variable SCANNER_ENABLED=false to pause. GitHub Actions needs Read and write workflow permissions to commit data.json.

## Accuracy
DEX profiles/boosts are not necessarily new launches. News candidate scores are heuristic and low-confidence, not verified trends. X, Pump.fun streaming, Pons, and GMGN are not connected and are explicitly marked offline. No trading or launch automation.

## Run locally
node scanner/scan.mjs
