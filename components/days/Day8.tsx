import { ConnectButton, useChainModal } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { mainnet, arbitrum } from 'viem/chains'
import React from 'react'

export default function Day8(): JSX.Element {
  const { address, isConnected } = useAccount()
  const { data: balanceData, isLoading } = useBalance({ address })
  const chainId = useChainId()
  const { openChainModal } = useChainModal()
  const { switchChain } = useSwitchChain()

  // Get chain name for display
  const getChainName = (chainId: number): string => {
    if (chainId === mainnet.id) return 'Ethereum Mainnet'
    if (chainId === arbitrum.id) return 'Arbitrum One'
    return 'Unknown Chain'
  }

  const setChain = (chainId: number) => {
    switchChain?.({ chainId })
  }

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
          <p>
            <strong>Current Chain:</strong> {getChainName(chainId)} (ID: {chainId})
          </p>
          
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setChain(mainnet.id)}
              style={{
                marginRight: '10px',
                padding: '8px 16px',
                backgroundColor: 'gray',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Ethereum Mainnet
            </button>
            <button
              onClick={() => setChain(arbitrum.id)}
              style={{
                padding: '8px 16px',
                backgroundColor: 'dodgerblue',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >Arbitrum One</button>
          </div>
        </>
      ) : (
        <p>Not connected. Use the Connect button above to connect a wallet.</p>
      )}

      <p style={{ marginTop: 12 }}>
        This demo uses RainbowKit's <code>ConnectButton</code> and <code>useChainModal</code> with wagmi.
      </p>
    </section>
  )
}
