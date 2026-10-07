# Future participant rewards from realised revenue — proposal only

QuantumEngine is immutable and has no payout, reward, withdrawal, administration or upgrade mechanism. `observe` records a label; it never transfers or mints QOBS. `advanceEpoch` changes the probability vector; it pays nobody. Gas is paid by the caller. The website implements no rewards, claims, reward accounting or automatic profit, and there is no active reward program.

## Funding before commitment

A future program must be separate from the current engine and funded only from realised project revenue actually received by the project. Identify the revenue source and its rightful recipient using verifiable receipts and accounting. The existence of a pool, its advertised fees, trading volume, expected future revenue, token appreciation or an unrealised treasury gain does not establish funds available for rewards. Do not divert participant balances, existing pool liquidity or token supply to fund this proposal.

For each proposed period, publish gross receipts, deductions, operating costs, taxes or other liabilities, reserves, and the resulting distributable amount in its actual asset. A possible cap is `reward budget <= max(0, received revenue - obligations - reserves)`, additionally limited by the liquid balance already set aside. The allocation rate and reserve policy remain decisions for an accountable future operator; no rate or promised return is set here. If realised available revenue is zero, the funded reward budget is zero. Do not accrue unfunded participant entitlements or advertise estimated yield.

## Separate program and accountable distribution

Before launch, establish responsible governance, custody and signer controls; publish eligibility, period boundaries, budget and asset, a fixed allocation method, exclusions, dispute process and claim expiry. Obtain applicable professional advice for the actual jurisdiction and program. This document is an engineering proposal, not a legal determination. Publish funding proofs and independent review before accepting participation on a reward basis.

Observation logs can provide public evidence of participation, but one address is not one person. The current 1-QOBS threshold permits token recycling, borrowed balances and Sybil addresses; 1,024 slots can be filled by bots. Raw observation count is therefore not a fair or manipulation-resistant reward score by itself. Define abuse controls with privacy protections, disclose exclusions, and test them before promising allocations. Do not retroactively imply that current observations earn anything.

A separately reviewed distributor or an accountable manual distribution process would hold only the pre-funded budget. This assignment neither deploys such a distributor nor repurposes any existing distributor. A future interface must distinguish participation, eligibility and claimable funded balances, show receipt/proof links, and never infer a claim from model probabilities. There must be no route to modify QuantumEngine or re-mint QOBS.

Close each period with total funded, allocated, paid, unclaimed and remaining balances, public transaction references, reconciliation and the published handling of unclaimed funds. Stop new periods if funding or verification fails; honor only already funded commitments under their published terms. There is no guarantee of future revenue, token value, rewards or profit.
