import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId } from 'wagmi'
import { formatEther, formatGwei } from 'viem'
import { mainnet, arbitrum } from 'viem/chains'
import React, { useState, useEffect } from 'react'

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  gasUsed: string
  gasPrice: string
  isError?: string
  txreceipt_status?: string
  methodId?: string
  functionName?: string
}

export default function Day7(): JSX.Element {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get explorer API URL based on chain (V2 API)
  // Currently only supports Ethereum Mainnet
  const getExplorerApiUrl = (chainId: number): string | null => {
    if (chainId === mainnet.id) return 'https://api.etherscan.io/v2/api'
    return null
  }

  // Get chain ID for API
  // Currently only supports Ethereum Mainnet
  const getChainIdForApi = (chainId: number): number | null => {
    if (chainId === mainnet.id) return 1
    return null
  }

  // Get explorer URL for transaction links
  const getExplorerUrl = (chainId: number, txHash: string): string => {
    if (chainId === mainnet.id) return `https://etherscan.io/tx/${txHash}`
    if (chainId === arbitrum.id) return `https://arbiscan.io/tx/${txHash}`
    return `https://etherscan.io/tx/${txHash}`
  }

  // Get chain name for display
  const getChainName = (chainId: number): string => {
    if (chainId === mainnet.id) return 'Ethereum'
    if (chainId === arbitrum.id) return 'Arbitrum'
    return 'Unknown'
  }

  // Fetch transaction history
  useEffect(() => {
    if (!isConnected || !address) {
      setTransactions([])
      return
    }

    // Currently only support Ethereum Mainnet
    if (chainId !== mainnet.id) {
      setError('Transaction history is currently only available on Ethereum Mainnet. Support for other chains will be added in the future.')
      setTransactions([])
      setIsLoading(false)
      return
    }

    const apiUrl = getExplorerApiUrl(chainId)
    if (!apiUrl) {
      setError('Transaction history is only available on Ethereum Mainnet.')
      return
    }

    const fetchTransactions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch normal transactions using V2 API
        // Note: In Next.js, client components can only access env vars with NEXT_PUBLIC_ prefix
        // If using NEXT_ETHERSCAN_API_KEY, it won't be accessible in client components
        const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'YourApiKeyToken'
        const chainIdForApi = getChainIdForApi(chainId)
        console.log('chainIdForApi', chainIdForApi)
        if (!chainIdForApi) {
          setError('Unsupported chain for transaction history')
          return
        }

        // V2 API format according to official docs: https://docs.etherscan.io/api-reference/endpoint/txlist
        // Required params: chainid, module, action, address, apikey
        const params = new URLSearchParams({
          chainid: chainIdForApi.toString(),
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: '0',
          endblock: '99999999',
          page: '1',
          offset: '10',
          sort: 'desc',
          apikey: apiKey,
        })
        
        const requestUrl = `${apiUrl}?${params.toString()}`
        
        console.log('Fetching transactions from (V2 API):', requestUrl)
        
        const normalTxResponse = await fetch(requestUrl)
        const normalTxData = await normalTxResponse.json()

        console.log('API Response:', normalTxData)
        console.log('API Status:', normalTxData.status)
        console.log('API Message:', normalTxData.message)
        console.log('API Result:', normalTxData.result)

        if (normalTxData.status === '1' && normalTxData.result) {
          console.log('Number of transactions:', normalTxData.result.length)
          
          // Filter out failed transactions if needed, or show all
          const txList = normalTxData.result.map((tx: any) => {
            console.log('Processing transaction:', tx.hash, tx)
            return {
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              timeStamp: tx.timeStamp,
              gasUsed: tx.gasUsed,
              gasPrice: tx.gasPrice,
              isError: tx.isError,
              txreceipt_status: tx.txreceipt_status,
              methodId: tx.methodId,
              functionName: tx.functionName,
            }
          })

          console.log('Processed transaction list:', txList)
          setTransactions(txList)
        } else if (normalTxData.status === '0' && normalTxData.message === 'No transactions found') {
          console.log('No transactions found for address')
          setTransactions([])
        } else {
          // Handle NOTOK or other errors
          const errorMessage = normalTxData.message || normalTxData.result || 'Failed to fetch transactions'
          console.error('API Error:', errorMessage)
          console.error('Full API Response:', normalTxData)
          setError(errorMessage)
        }
      } catch (err) {
        console.error('Failed to fetch transactions:', err)
        setError('Failed to fetch transaction history. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [address, chainId, isConnected])

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(parseInt(timestamp) * 1000)
    return date.toLocaleString()
  }

  // Format address (shorten)
  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Check if transaction is successful
  const isSuccess = (tx: Transaction): boolean => {
    return tx.isError === '0' && (tx.txreceipt_status === '1' || !tx.txreceipt_status)
  }

  return (
    <section>
      <h2>Day 7 — Transaction History</h2>

      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <p>
            <strong>Address:</strong> {address}
          </p>
          <p>
            <strong>Chain:</strong> {getChainName(chainId)}
          </p>

          {chainId !== mainnet.id ? (
            <p style={{ color: 'orange', marginTop: 12 }}>
              Transaction history is currently only available on Ethereum Mainnet. Please switch to Ethereum Mainnet to view your transaction history. Support for other chains will be added in the future.
            </p>
          ) : (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Recent Transactions</h3>

              {isLoading ? (
                <p>Loading transaction history...</p>
              ) : error ? (
                <div style={{ color: 'red', padding: '12px', backgroundColor: '#ffe6e6', borderRadius: '8px' }}>
                  <p><strong>Error:</strong> {error}</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>
                    Note: Etherscan/Arbiscan API may require an API key for higher rate limits. 
                    Check the browser console for detailed error information.
                  </p>
                </div>
              ) : transactions.length === 0 ? (
                <p style={{ color: '#666' }}>No transactions found for this address.</p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    maxHeight: '600px',
                    overflowY: 'auto',
                    padding: '8px',
                  }}
                >
                  {transactions.map((tx) => (
                    <div
                      key={tx.hash}
                      style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: '#f9f9f9',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: '4px' }}>
                            <strong>Hash:</strong>{' '}
                            <a
                              href={getExplorerUrl(chainId, tx.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#007bff', textDecoration: 'none' }}
                            >
                              {formatAddress(tx.hash)}
                            </a>
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                            <strong>From:</strong> {formatAddress(tx.from)}
                            {tx.from.toLowerCase() === address?.toLowerCase() && (
                              <span style={{ marginLeft: '8px', color: '#28a745', fontSize: '12px' }}>(You)</span>
                            )}
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                            <strong>To:</strong> {formatAddress(tx.to)}
                            {tx.to.toLowerCase() === address?.toLowerCase() && (
                              <span style={{ marginLeft: '8px', color: '#28a745', fontSize: '12px' }}>(You)</span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: isSuccess(tx) ? '#d4edda' : '#f8d7da',
                            color: isSuccess(tx) ? '#155724' : '#721c24',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {isSuccess(tx) ? 'Success' : 'Failed'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666' }}>
                        <div>
                          <strong>Value:</strong> {formatEther(BigInt(tx.value))} ETH
                        </div>
                        <div>
                          <strong>Time:</strong> {formatTimestamp(tx.timeStamp)}
                        </div>
                      </div>
                      {tx.gasUsed && tx.gasPrice && (
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          Gas Used: {tx.gasUsed} | Gas Price: {formatGwei(BigInt(tx.gasPrice))} Gwei
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p>Not connected. Use the Connect button above to connect a wallet.</p>
      )}

      <p style={{ marginTop: 12 }}>
        This demo fetches transaction history from Etherscan API V2. It displays the most recent 10 transactions
        for the connected wallet address on Ethereum Mainnet. Click on transaction hashes to view them on Etherscan.
        Support for other chains (Arbitrum, etc.) will be added in the future.
      </p>
    </section>
  )
}
