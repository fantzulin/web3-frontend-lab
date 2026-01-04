import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther } from 'viem'
import React, { useState } from 'react'

export default function Day3(): JSX.Element {
  const { address, isConnected } = useAccount()
  const recipient = '0x000000000000000000000000000000000000dEaD'
  const amount = '0'

  const {
    data: hash,
    sendTransaction,
    isPending: isSending,
    error: sendError,
  } = useSendTransaction()

  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipient || !amount) return

    sendTransaction({
      to: recipient,
      value: parseEther(amount as `${number}`),
    })
  }

  return (
    <section>
      <h2>Day 3 — Transaction Flow</h2>
      <p>This transaction sends 0 ETH and is used only to demonstrate the transaction flow.</p>
      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <form onSubmit={handleSend} style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 12 }}>
                  <p><strong>Recipient Address:</strong> 0x000000000000000000000000000000000000dEaD</p>
            </div>
            <div style={{ marginBottom: 12 }}>
                <p><strong>Amount (ETH):</strong> 0</p>
            </div>
            <button
                type="submit"
                disabled={isSending || isConfirming}
                style={{
                padding: '10px 20px',
                fontSize: 16,
                backgroundColor: isSending || isConfirming ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isSending || isConfirming ? 'not-allowed' : 'pointer',
                }}
            >
                {isSending
                ? 'Sending...'
                : isConfirming
                ? 'Confirming...'
                : 'Send Transaction'}
            </button>
            {sendError && (
                <p style={{ color: 'red', marginTop: 8 }}>
                Error: {sendError.message}
                </p>
            )}
            {hash && (
                <p style={{ marginTop: 8 }}>
                  Transaction Hash:{' '}
                  {chainId === 1 ? (
                      <a
                          href={`https://etherscan.io/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#007bff' }}
                      >
                          {hash}
                      </a>
                  ) : chainId === 42161 ? (
                      <a
                          href={`https://arbiscan.io/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#007bff' }}
                      >
                          {hash}
                      </a>
                  ) : (
                    <a
                        href={`https://etherscan.io/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#007bff' }}
                    >
                        {hash}
                    </a>
                  )}
                </p>
            )}
            {isConfirmed && (
                <p style={{ color: 'green', marginTop: 8 }}>
                ✓ Transaction confirmed!
                </p>
            )}
          </form>
        </>
      ) : (
        <p>Not connected. Use the Connect button above to connect a wallet.</p>
      )}

      <p style={{ marginTop: 12 }}>
        This demo uses wagmi's <code>useSendTransaction</code> hook to send
        basic ETH transactions.
      </p>
    </section>
  )
}