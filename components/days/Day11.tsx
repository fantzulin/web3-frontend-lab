import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
} from 'wagmi'
import React, { useState } from 'react'
import { erc20Abi, formatUnits, parseAbiItem } from 'viem'

interface TransferEvent {
  from: string
  to: string
  value: bigint
  transactionHash: string
}

export default function Day11(): JSX.Element {
  const { address, isConnected } = useAccount()
  const { data: balanceData, isLoading } = useBalance({ address })
  const chainId = useChainId()
  const uniswapV3RouterAddress = {
    mainnet: '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af',
    arbitrum: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  }
  const usdcAddress = {
    mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  }

  const currentUsdcAddress = chainId === 1
  ? usdcAddress.mainnet
  : chainId === 42161
  ? usdcAddress.arbitrum
  : null

  const currentRouterAddress = chainId === 1
    ? uniswapV3RouterAddress.mainnet
    : chainId === 42161
    ? uniswapV3RouterAddress.arbitrum
    : null
  
  // 用 useState 來儲存監聽到的 events
  const [transferEvents, setTransferEvents] = useState<TransferEvent[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)

  // 獲取 public client 來讀取歷史 events
  const publicClient = usePublicClient()

  // 點擊時手動獲取最近的 Transfer events
  const getTransferEvents = async () => {
    if (!currentUsdcAddress || !publicClient) {
      alert('Please connect wallet and ensure you are on a supported chain')
      return
    }

    setIsLoadingEvents(true)
    try {
      // 獲取最近 200 個區塊內的 Transfer events（USDC 交易量大，範圍不能太大）
      const latestBlock = await publicClient.getBlockNumber()
      const fromBlock = latestBlock - BigInt(200)

      const logs = await publicClient.getLogs({
        address: currentUsdcAddress as `0x${string}`,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        fromBlock: fromBlock > 0n ? fromBlock : 0n,
        toBlock: latestBlock,
      })

      // 取最近 10 筆，並轉換格式
      const newEvents: TransferEvent[] = logs
        .slice(-10)
        .reverse()
        .map((log) => ({
          from: log.args.from as string,
          to: log.args.to as string,
          value: log.args.value as bigint,
          transactionHash: log.transactionHash,
        }))

      setTransferEvents(newEvents)
    } catch (error) {
      console.error('Error fetching transfer events:', error)
      alert('Error fetching events. Check console for details.')
    } finally {
      setIsLoadingEvents(false)
    }
  }
  return (
    <section>
      <h2>Day 11 — Event Listener</h2>

      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <p>Listen to ERC20 Transfer events in real-time</p>
          <p>USDC Address: {currentUsdcAddress || 'N/A (Unsupported chain)'}</p>

          <div style={{ marginTop: 16 }}>
            <h4>Recent Transfer Events ({transferEvents.length})</h4>
            <button onClick={getTransferEvents} disabled={isLoadingEvents}>
              {isLoadingEvents ? 'Loading...' : 'Get Transfer Events'}
            </button>
            {transferEvents.length === 0 ? (
              <p style={{ color: '#666' }}>Click the button to fetch Transfer events</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, maxHeight: 400, overflow: 'auto' }}>
                {transferEvents.map((event, index) => (
                  <li key={`${event.transactionHash}-${index}`} style={{ 
                    padding: 8, 
                    marginBottom: 8, 
                    backgroundColor: '#f5f5f5',
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    <p><strong>From:</strong> {event.from}</p>
                    <p><strong>To:</strong> {event.to}</p>
                    <p><strong>Value:</strong> {formatUnits(event.value, 6)} USDC</p>
                    <a
                      href={
                        chainId === 1 
                        ? `https://etherscan.io/tx/${event.transactionHash}`
                        : chainId === 42161
                        ? `https://arbiscan.io/tx/${event.transactionHash}`
                        : `https://etherscan.io/tx/${event.transactionHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#007bff' }}
                    >
                      <p>View on Explorer</p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <p>Not connected. Use the Connect button above to connect a wallet.</p>
      )}

      <p style={{ marginTop: 12 }}>
        This demo uses wagmi's <code>usePublicClient</code> hook to read the ERC20 Transfer events.
      </p>
    </section>
  )
}
