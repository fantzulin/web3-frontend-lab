import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useChainId,
  useEstimateGas,
  useEstimateFeesPerGas,
} from 'wagmi'
import {
  parseEther,
  formatEther,
  formatGwei
} from 'viem'
import React, { useState, useEffect } from 'react'

export default function Day4(): JSX.Element {
  const { address, isConnected } = useAccount()
  const recipient = '0x000000000000000000000000000000000000dEaD'
  const amount = '0'

  const chainId = useChainId()

  const { data: gasEstimate, isLoading: isEstimatingGas } = useEstimateGas({
    to: recipient as `0x${string}`,
    value: parseEther(amount as `${number}`),
    query: {
      enabled: isConnected && !!recipient,
    },
  })

  const { data: feeData, isLoading: isEstimatingFees, error: feeError } = useEstimateFeesPerGas({
    chainId,
    query: {
      enabled: isConnected,
    },
  })

  const {
    data: hash,
    sendTransaction,
    isPending: isSending,
    error: sendError,
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

  const [openModal, setOpenModal] = useState(false)
  const [ethPrice, setEthPrice] = useState<number | null>(null)

  const handleConfirmSend = () => {
    if (!recipient || !amount) return

    sendTransaction({
      to: recipient as `0x${string}`,
      value: parseEther(amount as `${number}`),
    })
    setOpenModal(false)
  }

  const handleOpenModal = (e: React.FormEvent) => {
    e.preventDefault()
    setOpenModal(true)
  }

  // Calculate estimated fee - support both EIP-1559 (maxFeePerGas) and legacy (gasPrice)
  // For EIP-1559 chains, use maxFeePerGas; for legacy chains, use gasPrice
  const gasPrice = feeData 
    ? (feeData.gasPrice ?? feeData.maxFeePerGas ?? null)
    : null
  
  const estimatedFee = gasEstimate && gasPrice
    ? formatEther(gasEstimate * gasPrice)
    : null

  // Fetch ETH price from CoinGecko
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
        const data = await response.json()
        if (data.ethereum?.usd) {
          setEthPrice(data.ethereum.usd)
        }
      } catch (error) {
        console.error('Failed to fetch ETH price:', error)
      }
    }

    fetchEthPrice()
    // Refresh price every 60 seconds
    const interval = setInterval(fetchEthPrice, 60000)
    return () => clearInterval(interval)
  }, [])

  // Calculate USD value
  const estimatedFeeUSD = estimatedFee && ethPrice
    ? (parseFloat(estimatedFee) * ethPrice).toFixed(5)
    : null

  const Modal = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
    if (!open) return null
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ marginTop: 0 }}>Transaction Details</h2>
          <div style={{ marginBottom: '16px' }}>
            <p><strong>Recipient:</strong> {recipient}</p>
            <p><strong>Amount:</strong> {amount} ETH</p>
            <p><strong>Chain ID:</strong> {chainId}</p>
            {isEstimatingGas || isEstimatingFees ? (
              <p>Estimating gas...</p>
            ) : feeError ? (
              <p style={{ color: 'red' }}>Error estimating fees: {feeError.message}</p>
            ) : (
              <>
                <p><strong>Estimated Gas:</strong> {gasEstimate ? gasEstimate.toString() : '—'}</p>
                {feeData?.gasPrice && (
                  <p><strong>Gas Price:</strong> {formatGwei(feeData.gasPrice as bigint) + ' gwei'}</p>
                )}
                {feeData?.maxFeePerGas && (
                  <p><strong>Max Fee Per Gas:</strong> {formatGwei(feeData.maxFeePerGas as bigint) + ' gwei'}</p>
                )}
                {feeData?.maxPriorityFeePerGas && (
                  <p><strong>Max Priority Fee Per Gas:</strong> {formatGwei(feeData.maxPriorityFeePerGas as bigint) + ' gwei'}</p>
                )}
                <p><strong>Estimated Fee:</strong> {estimatedFee ? `${estimatedFee} ETH${estimatedFeeUSD ? ` ($${estimatedFeeUSD})` : ''}` : '—'}</p>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ccc',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSend}
              disabled={isSending || isEstimatingGas || isEstimatingFees}
              style={{
                padding: '8px 16px',
                backgroundColor: isSending ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSending ? 'not-allowed' : 'pointer',
              }}
            >
              {isSending ? 'Sending...' : 'Confirm & Send'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section>
      <h2>Day 4 — Gas Estimator</h2>
      <p>This transaction sends 0 ETH and is used only to demonstrate the transaction flow.</p>
      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <form onSubmit={handleOpenModal} style={{ marginTop: 16 }}>
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
              : 'Estimate Gas & Send'}
            </button>
            {sendError && (
                <p style={{ color: 'red', marginTop: 8 }}>
                Error: {sendError.message}
                </p>
            )}
            <Modal open={openModal} onClose={() => setOpenModal(false)} />
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
        This demo uses wagmi's <code>useEstimateGas</code> and <code>useEstimateFeesPerGas</code> hooks
        to estimate transaction gas fees before sending.
      </p>
    </section>
  )
}