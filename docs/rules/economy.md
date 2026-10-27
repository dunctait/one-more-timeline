# Economy

The economy covers resources, prices, rewards, losses, and exchanges.

All economic quantities MUST have named units, bounded precision, and explicit versioned rules. The engine MUST use exact or otherwise deterministic arithmetic; display rounding MUST NOT alter the underlying result.

Costs MUST be visible before commitment. Rewards MUST identify their source. A resource MAY be scarce, but scarcity MUST be part of the stated game rule rather than an undisclosed service intervention.

The economy MUST NOT sell competitive advantage for real money in a way that undermines the experiment thesis. If monetisation is added later, it MUST be documented separately, tested against the anti-goals, and kept outside the deterministic core.

Layer 0 resource rules are implemented and tested in `src/engine/`. No hosted economy service or real-money monetisation is currently provided by this repository.
