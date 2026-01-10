import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance } from 'wagmi'
import React from 'react'

export default function Day8(): JSX.Element {
  const { address, isConnected } = useAccount()
  const { data: balanceData, isLoading } = useBalance({ address })

  return (
    <section>
      <h2>Day 8 — Chain Selector</h2>

      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <p>
            <strong>Address:</strong> {address}
          </p>
        </>
      ) : (
        <p>Not connected. Use the Connect button above to connect a wallet.</p>
      )}

      <p style={{ marginTop: 12 }}>
        This demo uses RainbowKit's <code>ConnectButton</code> with wagmi.
      </p>
    </section>
  )
}
