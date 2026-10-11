import { useState } from "react";

const WALLETS = [
  { chain: "Solana", symbol: "SOL", address: "61rFz8rC1xGr7CxtZbPfZFzQv1XWaHCmNzosrUE8sbge" },
  { chain: "Ethereum", symbol: "ETH", address: "0x39C312eB7eCbE378b0f42a1B56f14815f4324Be0" },
  { chain: "Bitcoin (Taproot)", symbol: "BTC", address: "bc1p5wddgzcqsgrnf5t35pylcn5cvhlwsyqxce9lhfeq8g2m873338sqnlseqe" },
  { chain: "Bitcoin (Native SegWit)", symbol: "BTC", address: "bc1qruvry6nplqlangnse6wwdnl4lwkdxtgqz0qvlf" },
];

export function SupportCard() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(address: string, symbol: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(symbol);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback: do nothing on unsupported environments.
    }
  }

  return (
    <div className="surface rounded-2xl p-6 text-center">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">Support the project</p>
      <h2 className="mt-2 text-3xl">Keep the lights on</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        17-0 is free to play. If you want to help cover hosting and keep new
        features coming, send a crypto tip to one of the addresses below.
      </p>

      <div className="mt-6 space-y-3 text-left">
        {WALLETS.map((w) => (
          <div
            key={w.address}
            className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold">{w.chain}</p>
              <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                {w.address}
              </p>
            </div>
            <button
              onClick={() => copy(w.address, w.symbol + w.address)}
              className="btn-ghost shrink-0 self-start px-4 py-2 text-xs"
            >
              {copied === w.symbol + w.address ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
